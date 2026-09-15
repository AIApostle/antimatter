"""Antimotion Project Manager.

Manages active circuit states, project serialization, seeding default circuits,
and bundling complete KiCad project ZIP archives (.kicad_sch, .kicad_pcb, .kicad_pro, bom.csv).
"""

from __future__ import annotations
import io
import zipfile
import csv
import uuid
import os
import subprocess
import tempfile
import shutil
import logging
from pathlib import Path
from typing import Dict, Optional, Any
from .circuit_state import CircuitState, BoardSetup, Component, Pin, Net, TrackSegment, Via
from .component_library import lookup_component
from .sexpr_generator import generate_schematic_sexpr, generate_pcb_sexpr

logger = logging.getLogger("antimatter.project_manager")


class ProjectManager:
    """In-memory and persistent project manager."""

    def __init__(self):
        self.projects: Dict[str, CircuitState] = {}
        # Initialize primary clean project with dynamic ID and name 'antimatter'
        clean_id = f"antimatter-{uuid.uuid4().hex[:8]}"
        self.default_project_id = clean_id
        clean_state = self.create_project(project_id=clean_id, name="antimatter")
        self.projects[clean_id] = clean_state

    def create_project(
        self,
        project_id: Optional[str] = None,
        name: str = "antimatter",
        width: float = 50.0,
        height: float = 35.0,
        layers: int = 2,
        mask_color: str = "black",
        finish: str = "ENIG",
    ) -> CircuitState:
        """Create a clean, fresh circuit project starting with an empty slate."""
        pid = project_id if project_id and project_id.strip() else f"antimatter-{uuid.uuid4().hex[:8]}"
        state = CircuitState(
            project_id=pid,
            project_name=name or "antimatter",
            board=BoardSetup(
                width=width,
                height=height,
                corner_radius=2.5,
                layer_count=layers,
                mask_color=mask_color,
                finish=finish,
            ),
            components={},
            nets={},
            tracks=[],
            vias=[],
            drc_errors=[],
            pending_eco=None,
        )
        state.schematic_sexpr = generate_schematic_sexpr(state)
        state.pcb_sexpr = generate_pcb_sexpr(state)
        self.projects[pid] = state
        return state

    def _hydrate_state_from_dict(self, pid: str, p: Dict[str, Any]) -> CircuitState:
        board_data = p.get("board") or p.get("board_config") or {}
        st = CircuitState(
            project_id=pid,
            project_name=p.get("project_name") or p.get("name") or pid,
            revision=p.get("revision", 1),
            board=BoardSetup(
                width=board_data.get("width", 50.0),
                height=board_data.get("height", 35.0),
                corner_radius=board_data.get("corner_radius", 2.5),
                layer_count=board_data.get("layer_count", 2),
                thickness=board_data.get("thickness", 1.6),
                mask_color=board_data.get("mask_color", "black"),
                finish=board_data.get("finish", "ENIG"),
            ),
            schematic_sexpr=p.get("schematic_sexpr"),
            pcb_sexpr=p.get("pcb_sexpr"),
        )
        comps = p.get("components")
        if isinstance(comps, dict):
            for cref, cdata in comps.items():
                if isinstance(cdata, dict):
                    try:
                        st.components[cref] = Component(**cdata)
                    except Exception:
                        pass
        nets = p.get("nets")
        if isinstance(nets, dict):
            for nname, ndata in nets.items():
                if isinstance(ndata, dict):
                    try:
                        st.nets[nname] = Net(**ndata)
                    except Exception:
                        pass
        peco = p.get("pending_eco")
        if isinstance(peco, dict):
            try:
                if not peco.get("project_id"):
                    peco["project_id"] = pid
                if peco.get("project_id") == pid:
                    st.pending_eco = ECOProposal(**peco)
            except Exception:
                pass
        return st

    def list_projects(self) -> list[Dict[str, Any]]:
        """List all active and stored projects with summary metrics."""
        from ..db.supabase import db_manager

        # Hydrate all stored projects from db_manager
        db_projs = db_manager.list_projects()
        for p in db_projs:
            pid = p.get("project_id") or p.get("id")
            if not pid:
                continue
            if pid not in self.projects:
                self.projects[pid] = self._hydrate_state_from_dict(pid, p)
            else:
                name = p.get("project_name") or p.get("name")
                if name and name != "antimatter" and self.projects[pid].project_name == "antimatter":
                    self.projects[pid].project_name = name

        results = []
        for pid, state in self.projects.items():
            results.append({
                "project_id": state.project_id,
                "project_name": state.project_name,
                "revision": state.revision,
                "width": state.board.width,
                "height": state.board.height,
                "layer_count": state.board.layer_count,
                "mask_color": state.board.mask_color,
                "finish": state.board.finish,
                "component_count": len(state.components),
                "net_count": len(state.nets),
                "track_count": len(state.tracks),
                "drc_errors": len(state.drc_errors),
                "drc_pass": len(state.drc_errors) == 0,
            })

        # Rank projects: active designs with components / higher revisions first
        results.sort(key=lambda x: (x["component_count"] > 0, x["revision"], x["project_name"] != "antimatter"), reverse=True)
        return results

    def delete_project(self, project_id: str) -> bool:
        """Delete project from active cache and persistent database."""
        self.projects.pop(project_id, None)
        from ..db.supabase import db_manager
        return db_manager.delete_project(project_id)

    def get_project(self, project_id: Optional[str] = None) -> CircuitState:
        """Get or create project by ID starting with a clean slate."""
        pid = project_id if project_id and project_id.strip() else getattr(self, "default_project_id", "antimatter-main")
        if pid not in self.projects:
            # Check database and disk first
            from ..db.supabase import db_manager
            db_proj = db_manager.get_project(pid)
            if db_proj:
                st = self._hydrate_state_from_dict(pid, db_proj)
                self.projects[pid] = st
                return st

            # Otherwise initialize clean project with name 'antimatter'
            st = self.create_project(project_id=pid, name="antimatter")
            return st

        return self.projects[pid]

    def export_kicad_zip(self, project_id: str) -> bytes:
        """Bundle full KiCad project as an in-memory zip archive."""
        state = self.get_project(project_id)
        sch_text = generate_schematic_sexpr(state)
        pcb_text = generate_pcb_sexpr(state)

        # Minimal KiCad project file (.kicad_pro)
        pro_text = f"""{{
  "meta": {{
    "filename": "{state.project_id}.kicad_pro",
    "version": 1
  }},
  "project": {{
    "name": "{state.project_name}"
  }},
  "schematic": {{
    "drawing": {{
      "dashed_lines_dash_length_ratio": 12.0,
      "dashed_lines_gap_length_ratio": 3.0
    }}
  }},
  "sheets": [
    [
      "d0b1a2c3-4e5f-6a7b-8c9d-0e1f2a3b4c5d",
      ""
    ]
  ]
}}"""

        # Generate BOM CSV
        bom_buffer = io.StringIO()
        writer = csv.writer(bom_buffer)
        writer.writerow(["Reference", "Value", "Footprint", "Description", "Quantity"])
        for comp in sorted(state.components.values(), key=lambda c: c.ref):
            writer.writerow([comp.ref, comp.value, comp.footprint, comp.description, 1])

        # Zip bundle
        zip_buffer = io.BytesIO()
        with zipfile.ZipFile(zip_buffer, "w", zipfile.ZIP_DEFLATED) as zf:
            zf.writestr(f"{state.project_id}.kicad_sch", sch_text)
            zf.writestr(f"{state.project_id}.kicad_pcb", pcb_text)
            zf.writestr(f"{state.project_id}.kicad_pro", pro_text)
            zf.writestr("bom.csv", bom_buffer.getvalue())
            zf.writestr(
                "README.md",
                f"# {state.project_name}\n\nGenerated automatically by Antimotion AI EDA Platform.\n"
                f"- Dimensions: {state.board.width}x{state.board.height}mm\n"
                f"- Components: {len(state.components)}\n"
                f"- Nets: {len(state.nets)}\n"
            )

        zip_buffer.seek(0)
        return zip_buffer.getvalue()

    def export_kicad_glb(self, project_id: str) -> Optional[bytes]:
        """Export the active .kicad_pcb to a photorealistic binary GLTF (.glb) using KiCad CLI.
        
        Includes physical copper tracks, SMD/THT pads, zones, silkscreen, soldermask,
        and genuine 3D component models.
        """
        state = self.get_project(project_id)
        if not state:
            return None

        pcb_text = state.pcb_sexpr or generate_pcb_sexpr(state)
        kicad_cli = "/usr/bin/kicad-cli"
        if not os.path.exists(kicad_cli):
            kicad_cli = shutil.which("kicad-cli") or "kicad-cli"

        with tempfile.TemporaryDirectory() as td:
            pcb_path = Path(td) / f"{project_id}.kicad_pcb"
            pcb_path.write_text(pcb_text, encoding="utf-8")
            glb_path = Path(td) / f"{project_id}.glb"

            cmd = [
                kicad_cli, "pcb", "export", "glb",
                "--include-tracks",
                "--include-pads",
                "--include-zones",
                "--include-silkscreen",
                "--include-soldermask",
                "--subst-models",
                "--force",
                "-o", str(glb_path),
                str(pcb_path),
            ]
            try:
                res = subprocess.run(cmd, capture_output=True, text=True, timeout=15)
                if res.returncode == 0 and glb_path.exists():
                    return glb_path.read_bytes()
                logger.warning("kicad-cli export glb returned non-zero (%d): %s", res.returncode, res.stderr)
            except Exception as e:
                logger.error("Failed to run kicad-cli glb export for project %s: %s", project_id, e)
            return None


# Global project manager singleton
project_manager = ProjectManager()
