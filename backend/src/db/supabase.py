"""Antimotion Supabase Database & Persistence Layer.

Provides unified database operations for:
- Projects & board configurations
- Electronic components & footprints
- Engineering design plans & change orders (ECO)
- Natural language chat message transcripts & tool calls
- KiCad S-expression archives (.kicad_sch, .kicad_pcb)

Automatically connects to Supabase when credentials are configured in .env,
and falls back to persistent local storage when running in offline/sandbox mode.
"""

from __future__ import annotations
import os
import json
import logging
from typing import Dict, Any, List, Optional
from pathlib import Path
from datetime import datetime, timezone
from pydantic_settings import BaseSettings, SettingsConfigDict

try:
    from supabase import create_client, Client
    SUPABASE_INSTALLED = True
except ImportError:
    SUPABASE_INSTALLED = False
    Client = Any

for name in ("httpx", "httpcore", "postgrest", "supabase"):
    _l = logging.getLogger(name)
    _l.setLevel(logging.WARNING)
    _l.propagate = False
logger = logging.getLogger(__name__)


class SupabaseConfig(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    supabase_url: Optional[str] = os.environ.get("SUPABASE_URL")
    supabase_key: Optional[str] = os.environ.get("SUPABASE_KEY")
    supabase_service_role_key: Optional[str] = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")


import concurrent.futures
import threading
import time

class DatabaseManager:
    """Manages cloud persistence with local non-blocking in-memory cache and debounced background sync."""

    def __init__(self):
        self.config = SupabaseConfig()
        self.client: Optional[Client] = None
        self._executor = concurrent.futures.ThreadPoolExecutor(max_workers=4, thread_name_prefix="db_sync")
        self._pending_upserts: Dict[str, Any] = {}
        self._scheduled_projects: set = set()
        self._upsert_lock = threading.Lock()
        self._init_client()
        # Local in-memory / cache fallback
        self._local_projects: Dict[str, Dict[str, Any]] = {}
        self._local_plans: Dict[str, List[Dict[str, Any]]] = {}
        self._local_chat: Dict[str, List[Dict[str, Any]]] = {}

    def _init_client(self):
        if SUPABASE_INSTALLED and self.config.supabase_url and self.config.supabase_key:
            try:
                self.client = create_client(self.config.supabase_url, self.config.supabase_key)
                logger.info("[Database] Connected to cloud storage")
            except Exception as e:
                logger.warning("[Database] Connection failed, using local storage: %s", e)
                self.client = None
        else:
            logger.info("[Database] Active in local storage mode.")

    @property
    def is_connected(self) -> bool:
        return self.client is not None

    def _debounced_flush_project(self, project_id: str):
        time.sleep(0.2)
        with self._upsert_lock:
            entry = self._pending_upserts.pop(project_id, None)
            self._scheduled_projects.discard(project_id)
        if not entry:
            return
        payload, updated_data = entry
        try:
            disk_projects = self._load_disk_projects()
            disk_projects[project_id] = updated_data
            self._save_disk_projects(disk_projects)
        except Exception as e:
            logger.debug("[Database] Disk cache write failed: %s", e)

        if self.client:
            try:
                self.client.table("projects").upsert(payload).execute()
            except Exception as e:
                logger.debug("[Database] Supabase debounced upsert failed: %s", e)

    def _bg_insert_plan(self, payload: Dict[str, Any]):
        if not self.client:
            return
        try:
            self.client.table("design_plans").insert(payload).execute()
        except Exception as e:
            logger.debug("[Database] Background insert plan failed: %s", e)

    def _bg_insert_chat(self, payload: Dict[str, Any]):
        if not self.client:
            return
        try:
            self.client.table("chat_messages").insert(payload).execute()
        except Exception as e:
            logger.debug("[Database] Background insert chat failed: %s", e)

    def _get_disk_projects_file(self) -> Path:
        p = Path(__file__).resolve().parent.parent.parent / "data" / "projects.json"
        p.parent.mkdir(parents=True, exist_ok=True)
        return p

    def _load_disk_projects(self) -> Dict[str, Dict[str, Any]]:
        f = self._get_disk_projects_file()
        if f.exists():
            try:
                with open(f, "r", encoding="utf-8") as fp:
                    return json.load(fp)
            except Exception as e:
                logger.debug("[Database] Failed reading disk projects: %s", e)
        return {}

    def _save_disk_projects(self, data: Dict[str, Dict[str, Any]]):
        f = self._get_disk_projects_file()
        try:
            with open(f, "w", encoding="utf-8") as fp:
                json.dump(data, fp, indent=2)
        except Exception as e:
            logger.debug("[Database] Failed saving disk projects: %s", e)

    def _get_disk_plans_file(self) -> Path:
        p = Path(__file__).resolve().parent.parent.parent / "data" / "design_plans.json"
        p.parent.mkdir(parents=True, exist_ok=True)
        return p

    def _load_disk_plans(self) -> Dict[str, List[Dict[str, Any]]]:
        f = self._get_disk_plans_file()
        if f.exists():
            try:
                with open(f, "r", encoding="utf-8") as fp:
                    data = json.load(fp)
                    if isinstance(data, dict):
                        return data
            except Exception as e:
                logger.debug("[Database] Failed reading disk plans: %s", e)
        return {}

    def _save_disk_plans(self, data: Dict[str, List[Dict[str, Any]]]):
        f = self._get_disk_plans_file()
        try:
            with open(f, "w", encoding="utf-8") as fp:
                json.dump(data, fp, indent=2, default=str)
        except Exception as e:
            logger.debug("[Database] Failed saving disk plans: %s", e)

    def save_project(self, project_id: str, data: Dict[str, Any], user_id: Optional[str] = None) -> bool:
        """Persist circuit state and KiCad S-expressions instantly with zero latency."""
        updated_data = {
            **data,
            "project_id": project_id,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }
        self._local_projects[project_id] = updated_data

        payload: Dict[str, Any] = {
            "id": project_id,
            "name": data.get("project_name", project_id),
            "revision": data.get("revision", 1),
            "board_config": data.get("board", {}),
            "components": data.get("components", {}),
            "nets": data.get("nets", {}),
            "schematic_sexpr": data.get("schematic_sexpr", ""),
            "pcb_sexpr": data.get("pcb_sexpr", ""),
            "updated_at": updated_data["updated_at"],
        }
        uid = user_id or data.get("user_id")
        if uid:
            payload["user_id"] = uid

        with self._upsert_lock:
            self._pending_upserts[project_id] = (payload, updated_data)
            if project_id not in self._scheduled_projects:
                self._scheduled_projects.add(project_id)
                self._executor.submit(self._debounced_flush_project, project_id)
        return True

    def list_projects(self, user_id: Optional[str] = None) -> List[Dict[str, Any]]:
        """Retrieve all stored projects from Supabase cloud database with disk cache fallback."""
        projects_map: Dict[str, Dict[str, Any]] = {}

        # 1. Load from disk projects
        for pid, pdata in self._load_disk_projects().items():
            projects_map[pid] = pdata

        # 2. Overlay in-memory cache
        for pid, pdata in self._local_projects.items():
            projects_map[pid] = pdata

        # 3. Fetch all from Supabase table if connected
        if self.client:
            try:
                res = self.client.table("projects").select("*").order("updated_at", desc=True).execute()
                if res.data:
                    for row in res.data:
                        pid = row.get("id")
                        if pid:
                            board_cfg = row.get("board_config") or {}
                            projects_map[pid] = {
                                "project_id": pid,
                                "project_name": row.get("name") or pid,
                                "revision": row.get("revision", 1),
                                "board": board_cfg,
                                "components": row.get("components") or {},
                                "nets": row.get("nets") or {},
                                "schematic_sexpr": row.get("schematic_sexpr", ""),
                                "pcb_sexpr": row.get("pcb_sexpr", ""),
                                "updated_at": row.get("updated_at") or "",
                            }
                    # Also write back to disk cache
                    self._save_disk_projects(projects_map)
            except Exception as e:
                logger.debug("[Database] Failed to list projects from cloud: %s", e)

        # Return list sorted by updated_at desc
        return sorted(
            projects_map.values(),
            key=lambda x: str(x.get("updated_at", "")),
            reverse=True,
        )

    def get_project(self, project_id: str) -> Optional[Dict[str, Any]]:
        """Retrieve project state from fast cache, falling back to disk and cloud."""
        if project_id in self._local_projects:
            return self._local_projects[project_id]

        disk_projects = self._load_disk_projects()
        if project_id in disk_projects:
            self._local_projects[project_id] = disk_projects[project_id]
            return disk_projects[project_id]

        if self.client:
            try:
                res = self.client.table("projects").select("*").eq("id", project_id).execute()
                if res.data and len(res.data) > 0:
                    row = res.data[0]
                    pdata = {
                        "project_id": row.get("id"),
                        "project_name": row.get("name") or project_id,
                        "revision": row.get("revision", 1),
                        "board": row.get("board_config") or {},
                        "components": row.get("components") or {},
                        "nets": row.get("nets") or {},
                        "schematic_sexpr": row.get("schematic_sexpr", ""),
                        "pcb_sexpr": row.get("pcb_sexpr", ""),
                        "updated_at": row.get("updated_at") or "",
                    }
                    self._local_projects[project_id] = pdata
                    return pdata
            except Exception as e:
                logger.debug("[Database] Failed to get project: %s", e)

        return self._local_projects.get(project_id)

    def delete_project(self, project_id: str) -> bool:
        """Delete project from cache, disk, and cloud."""
        self._local_projects.pop(project_id, None)
        self._local_plans.pop(project_id, None)
        self._local_chat.pop(project_id, None)

        disk_projects = self._load_disk_projects()
        if project_id in disk_projects:
            disk_projects.pop(project_id, None)
            self._save_disk_projects(disk_projects)

        disk_plans = self._load_disk_plans()
        if project_id in disk_plans:
            disk_plans.pop(project_id, None)
            self._save_disk_plans(disk_plans)

        if self.client:
            def _bg_delete():
                try:
                    self.client.table("chat_messages").delete().eq("project_id", project_id).execute()
                    self.client.table("design_plans").delete().eq("project_id", project_id).execute()
                    self.client.table("projects").delete().eq("id", project_id).execute()
                except Exception as e:
                    logger.debug("[Database] Failed to delete project: %s", e)
            self._executor.submit(_bg_delete)

        return True

    def save_design_plan(self, project_id: str, plan_data: Dict[str, Any], user_id: Optional[str] = None) -> bool:
        """Store an engineering proposal / design plan strictly isolated per project."""
        if not self._local_plans:
            self._local_plans = self._load_disk_plans()

        if project_id not in self._local_plans:
            self._local_plans[project_id] = []

        item = {
            "id": plan_data.get("id") or str(uuid.uuid4())[:8],
            **plan_data,
            "project_id": project_id,
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        self._local_plans[project_id].append(item)
        self._save_disk_plans(self._local_plans)

        if self.client:
            payload: Dict[str, Any] = {
                "project_id": project_id,
                "title": plan_data.get("title", ""),
                "rationale": plan_data.get("rationale", ""),
                "components": plan_data.get("components", []),
                "power_architecture": plan_data.get("power_architecture", ""),
                "status": plan_data.get("status", "pending"),
                "created_at": item["created_at"],
            }
            uid = user_id or plan_data.get("user_id")
            if uid:
                payload["user_id"] = uid
            self._executor.submit(self._bg_insert_plan, payload)

        return True

    def get_design_plans(self, project_id: str) -> List[Dict[str, Any]]:
        """Fetch history of design plans strictly isolated for a project."""
        if not self._local_plans:
            self._local_plans = self._load_disk_plans()

        if project_id in self._local_plans:
            return [p for p in self._local_plans[project_id] if p.get("project_id", project_id) == project_id]

        disk_plans = self._load_disk_plans()
        if project_id in disk_plans:
            self._local_plans[project_id] = disk_plans[project_id]
            return [p for p in disk_plans[project_id] if p.get("project_id", project_id) == project_id]

        if self.client:
            try:
                res = self.client.table("design_plans").select("*").eq("project_id", project_id).order("created_at").execute()
                if res.data is not None:
                    self._local_plans[project_id] = res.data
                    self._save_disk_plans(self._local_plans)
                    return [p for p in res.data if p.get("project_id", project_id) == project_id]
            except Exception as e:
                logger.debug("[Database] Failed to get design plans: %s", e)

        self._local_plans[project_id] = []
        return []

    def approve_design_plans(self, project_id: str, plan_id: str = "all") -> bool:
        """Mark design plans as approved for a specific project in local cache, disk, and cloud."""
        self.get_design_plans(project_id)
        if project_id in self._local_plans:
            for p in self._local_plans[project_id]:
                if plan_id in ("all", "full_plan", "*") or str(p.get("id")) == str(plan_id) or len(self._local_plans[project_id]) == 1:
                    p["status"] = "approved"
            self._save_disk_plans(self._local_plans)

        if self.client:
            def _bg_approve():
                try:
                    if plan_id not in ("all", "full_plan", "*") and (str(plan_id).isdigit() or "-" in str(plan_id)):
                        try:
                            self.client.table("design_plans").update({"status": "approved"}).eq("project_id", project_id).eq("id", plan_id).execute()
                            return
                        except Exception:
                            pass
                    self.client.table("design_plans").update({"status": "approved"}).eq("project_id", project_id).in_("status", ["pending", "pending_approval"]).execute()
                except Exception as e:
                    logger.debug("[Database] Failed to update approved plans: %s", e)
            self._executor.submit(_bg_approve)

        return True

    async def approve_design_plans_async(self, project_id: str, plan_id: str = "all") -> bool:
        """Asynchronously approve design plans without blocking the event loop."""
        import asyncio
        return await asyncio.to_thread(self.approve_design_plans, project_id, plan_id)

    async def save_project_async(self, project_id: str, data: Dict[str, Any], user_id: Optional[str] = None) -> bool:
        """Asynchronously persist project without blocking the event loop."""
        import asyncio
        return await asyncio.to_thread(self.save_project, project_id, data, user_id)

    async def get_design_plans_async(self, project_id: str) -> List[Dict[str, Any]]:
        """Asynchronously get design plans without blocking the event loop."""
        import asyncio
        return await asyncio.to_thread(self.get_design_plans, project_id)

    def reject_design_plans(self, project_id: str, plan_id: str = "all") -> bool:
        """Mark design plans as rejected for a specific project in local cache, disk, and cloud."""
        self.get_design_plans(project_id)
        if project_id in self._local_plans:
            for p in self._local_plans[project_id]:
                if plan_id in ("all", "full_plan", "*") or str(p.get("id")) == str(plan_id) or len(self._local_plans[project_id]) == 1:
                    p["status"] = "rejected"
            self._save_disk_plans(self._local_plans)

        if self.client:
            def _bg_reject():
                try:
                    if plan_id not in ("all", "full_plan", "*") and (str(plan_id).isdigit() or "-" in str(plan_id)):
                        try:
                            self.client.table("design_plans").update({"status": "rejected"}).eq("project_id", project_id).eq("id", plan_id).execute()
                            return
                        except Exception:
                            pass
                    self.client.table("design_plans").update({"status": "rejected"}).eq("project_id", project_id).in_("status", ["pending", "pending_approval"]).execute()
                except Exception as e:
                    logger.debug("[Database] Failed to update rejected plans: %s", e)
            self._executor.submit(_bg_reject)

        return True

    def save_chat_message(self, project_id: str, message: Dict[str, Any], user_id: Optional[str] = None) -> bool:
        """Log a chat conversation message with thoughts and tool calls without blocking."""
        if project_id not in self._local_chat:
            self._local_chat[project_id] = []
        self._local_chat[project_id].append({
            **message,
            "created_at": datetime.now(timezone.utc).isoformat(),
        })

        if self.client:
            payload: Dict[str, Any] = {
                "project_id": project_id,
                "role": message.get("role", "user"),
                "content": message.get("content", ""),
                "thoughts": message.get("thoughts", []),
                "tool_calls": message.get("tool_calls", []),
                "created_at": datetime.now(timezone.utc).isoformat(),
            }
            uid = user_id or message.get("user_id")
            if uid:
                payload["user_id"] = uid
            self._executor.submit(self._bg_insert_chat, payload)
        return True

    def get_chat_messages(self, project_id: str) -> List[Dict[str, Any]]:
        """Retrieve historical conversation messages for a project."""
        if self.client:
            try:
                res = (
                    self.client.table("chat_messages")
                    .select("*")
                    .eq("project_id", project_id)
                    .order("created_at", desc=False)
                    .execute()
                )
                if res.data:
                    return res.data
            except Exception as e:
                logger.warning("[Supabase] Failed to get chat messages: %s", e)

        return self._local_chat.get(project_id, [])

    def get_user_details(self, user_id: str) -> Optional[Dict[str, Any]]:
        """Fetch user profile and engineering details from Supabase."""
        if not user_id:
            return None
        if self.client:
            try:
                res = self.client.table("user_details").select("*").eq("id", user_id).maybe_single().execute()
                if res and res.data:
                    return res.data
            except Exception as e:
                logger.debug("[Supabase] Could not fetch user_details: %s", e)

            # Fallback to profiles table
            try:
                p_res = self.client.table("profiles").select("*").eq("id", user_id).maybe_single().execute()
                if p_res and p_res.data:
                    return p_res.data
            except Exception as e:
                logger.debug("[Supabase] Could not fetch profiles: %s", e)
        return None

    def save_user_details(self, user_id: str, details: Dict[str, Any]) -> bool:
        """Upsert user profile and engineering preferences."""
        if not user_id:
            return False
        if self.client:
            try:
                payload = {
                    "id": user_id,
                    "updated_at": datetime.now(timezone.utc).isoformat(),
                }
                for field in [
                    "email", "full_name", "role", "organization",
                    "experience_level", "preferred_eda", "preferred_mcu",
                    "bio", "avatar_url", "settings"
                ]:
                    if field in details and details[field] is not None:
                        payload[field] = details[field]
                self.client.table("user_details").upsert(payload).execute()

                # Also update profiles table for backward compatibility if present
                try:
                    prof_payload = {
                        "id": user_id,
                        "updated_at": datetime.now(timezone.utc).isoformat(),
                    }
                    if "email" in details:
                        prof_payload["email"] = details["email"]
                    if "full_name" in details:
                        prof_payload["full_name"] = details["full_name"]
                    if "bio" in details:
                        prof_payload["bio"] = details["bio"]
                    if "experience_level" in details:
                        prof_payload["preferred_level"] = details["experience_level"]
                    self.client.table("profiles").upsert(prof_payload).execute()
                except Exception:
                    pass

                return True
            except Exception as e:
                logger.warning("[Supabase] Failed to save user details: %s", e)
        return True


# Global database manager singleton
db_manager = DatabaseManager()
