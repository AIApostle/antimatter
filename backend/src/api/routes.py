"""Antimotion FastAPI REST & Server-Sent Events (SSE) Routes.

Provides streaming chat with EDA AI agents, circuit state synchronization,
human-in-the-loop ECO approvals, and KiCad project ZIP exports.
"""

import json
import asyncio
import logging
from typing import Optional, Dict, Any
from fastapi import APIRouter, HTTPException, Query, Response, WebSocket, WebSocketDisconnect, Depends, Header
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from ..eda.circuit_state import Pin
from ..eda.component_library import lookup_component
from ..eda.component_placement import calculate_component_placement
from ..eda.project_manager import project_manager
from ..eda.sexpr_generator import generate_schematic_sexpr, generate_pcb_sexpr
from ..eda.netlist_wiring import wire_standard_circuit_nets
from ..agents.pcb_agent import pcb_agent, resolve_decision, detect_user_intent
from ..mcp.frontend_bridge import kicanvas_bridge
from ..db.supabase import db_manager
from ..connectors.connector_manager import connector_manager
from ..knowledge.knowledge_manager import knowledge_manager
from ..auth.dependencies import get_current_user, verify_supabase_token
from ..agents.openrouter_catalog import get_all_openrouter_models

logger = logging.getLogger("antimatter.routes")
router = APIRouter(prefix="/api")


@router.websocket("/ws/chat")
async def chat_websocket(websocket: WebSocket):
    """Bidirectional WebSocket endpoint for streaming EDA reasoning thoughts, tool calls, circuit deltas, and HITL decisions."""
    await websocket.accept()
    active_stream_task: Optional[asyncio.Task] = None

    async def run_prompt_stream(payload: Dict[str, Any]):
        prompt = payload.get("prompt", "")
        project_id = payload.get("project_id", "default-power-delivery")
        model = payload.get("model", "openrouter/auto")
        image_data = payload.get("image_data")
        approval_mode = payload.get("approval_mode", "request_approval")
        hitl_mode = payload.get("hitl_mode", approval_mode == "request_approval")
        api_key = payload.get("api_key")
        base_url = payload.get("base_url")
        token = payload.get("token")

        user = verify_supabase_token(token) if token else None
        user_id = user["id"] if user else None

        # Auto-name clean project only when user actually provides a hardware design requirement
        state = project_manager.get_project(project_id)
        intent = detect_user_intent(prompt)
        if intent == "hardware_design" and state and (state.project_name.lower() in ("antimatter", "new project") or state.project_name.startswith("antimatter-")):
            words = prompt.strip().split()
            if words:
                skip_words = {"i", "want", "to", "create", "a", "an", "the", "build", "please", "design", "make", "can", "you", "spin", "up", "we", "need"}
                meaningful = []
                for w in words:
                    clean_w = w.strip(".,?!:;\"'")
                    if not meaningful and clean_w.lower() in skip_words:
                        continue
                    meaningful.append(clean_w)
                    if len(meaningful) >= 5:
                        break
                clean_title = " ".join(meaningful or words[:5]).title()
                state.project_name = clean_title[:36]
                db_manager.save_project(project_id, state.model_dump(), user_id=user_id)
                await websocket.send_json({
                    "type": "project_updated",
                    "project_id": project_id,
                    "project_name": state.project_name,
                })

        try:
            async for event in pcb_agent.run_stream(
                prompt=prompt,
                project_id=project_id,
                image_data=image_data,
                model_override=model,
                require_permission=(approval_mode == "request_approval"),
                approval_mode=approval_mode,
                api_key=api_key,
                base_url=base_url,
                user_id=user_id,
            ):
                await websocket.send_json(event)
        except asyncio.CancelledError:
            pass
        except Exception as e:
            try:
                await websocket.send_json({"type": "error", "message": str(e)})
            except Exception:
                pass

    try:
        while True:
            raw = await websocket.receive_text()
            data = json.loads(raw)

            # Check if this is an action command (HITL decision or Stop)
            action = data.get("action")
            if action == "stop":
                logger.info("⏹️  [WS Stop Requested] Halting active agent stream.")
                if active_stream_task and not active_stream_task.done():
                    active_stream_task.cancel()
                await websocket.send_json({
                    "type": "stopped",
                    "message": "Agent execution halted by user.",
                })
                continue

            if action == "human_decision_response":
                decision_id = data.get("decision_id", "")
                selection = data.get("selection", "")
                resolved = resolve_decision(decision_id, selection)
                logger.info("⚡ [WS Decision Handled] ID=%s | Selection='%s' | Resolved=%s", decision_id, selection, resolved)
                await websocket.send_json({
                    "type": "decision_acknowledged",
                    "decision_id": decision_id,
                    "resolved": resolved,
                })
                continue

            # New prompt: launch stream in background task to keep websocket reader active
            if active_stream_task and not active_stream_task.done():
                active_stream_task.cancel()
            active_stream_task = asyncio.create_task(run_prompt_stream(data))

    except WebSocketDisconnect:
        logger.info("🔌 [WS Disconnect] Client closed chat WebSocket connection.")
        if active_stream_task and not active_stream_task.done():
            active_stream_task.cancel()
    except Exception as e:
        logger.warning("⚠️  [WS Exception] %s", e)
        if active_stream_task and not active_stream_task.done():
            active_stream_task.cancel()


class DecisionSubmission(BaseModel):
    decision_id: str
    selection: str


@router.post("/chat/decision")
async def submit_human_decision(req: DecisionSubmission):
    """Resolve a pending Human-in-the-Loop architectural decision."""
    resolved = resolve_decision(req.decision_id, req.selection)
    logger.info("📥 [REST Decision Handled] ID=%s | Selection='%s' | Resolved=%s", req.decision_id, req.selection, resolved)
    return {
        "status": "ok",
        "decision_id": req.decision_id,
        "selection": req.selection,
        "resolved": resolved,
        "message": "Decision resolved" if resolved else "Decision already processed",
    }


@router.websocket("/mcp/kicanvas/ws")
async def kicanvas_mcp_ws(websocket: WebSocket):
    """WebSocket endpoint connecting frontend KiCanvas MCP Server to the backend."""
    await kicanvas_bridge.connect(websocket)
    try:
        while True:
            data_text = await websocket.receive_text()
            data = json.loads(data_text)
            kicanvas_bridge.handle_frontend_response(data)
    except WebSocketDisconnect:
        kicanvas_bridge.disconnect(websocket)
    except Exception:
        kicanvas_bridge.disconnect(websocket)


class ChatRequest(BaseModel):
    prompt: str
    project_id: str = "default-power-delivery"
    model: str = "openrouter/auto"
    image_data: Optional[str] = None  # Base64 data URL or image URI
    hitl_mode: bool = True  # Human-in-the-loop: ask permission before modifying
    approval_mode: str = "request_approval"  # "request_approval" | "review" | "auto_approve"
    api_key: Optional[str] = None
    base_url: Optional[str] = None
    token: Optional[str] = None  # Supabase access token


class ApprovalRequest(BaseModel):
    project_id: str = "default-power-delivery"
    eco_id: str
    action: str  # "approve" | "reject" | "modify" | "approve_all"
    feedback: Optional[str] = None
    token: Optional[str] = None


@router.get("/supabase/status")
async def get_supabase_status():
    """Retrieve active status of the Supabase persistence layer."""
    return {
        "connected": db_manager.is_connected,
        "supabase_url": db_manager.config.supabase_url if db_manager.is_connected else None,
        "mode": "live_supabase" if db_manager.is_connected else "local_fallback",
        "description": "Connected to cloud Supabase project" if db_manager.is_connected else "Running with local persistence fallback (configure SUPABASE_URL & SUPABASE_KEY in .env to activate cloud sync)",
    }


@router.post("/chat/stream")
async def chat_stream(
    request: ChatRequest,
    current_user: Optional[Dict[str, Any]] = Depends(get_current_user),
):
    """Server-Sent Events (SSE) stream for multimodal natural language hardware design."""
    user_id = current_user["id"] if current_user else (
        verify_supabase_token(request.token)["id"] if request.token and verify_supabase_token(request.token) else None
    )

    approval_mode = request.approval_mode or ("request_approval" if request.hitl_mode else "auto_approve")

    async def event_generator():
        try:
            async for event in pcb_agent.run_stream(
                prompt=request.prompt,
                project_id=request.project_id,
                image_data=request.image_data,
                model_override=request.model,
                require_permission=(approval_mode == "request_approval"),
                approval_mode=approval_mode,
                api_key=request.api_key,
                base_url=request.base_url,
                user_id=user_id,
            ):
                payload = json.dumps(event)
                yield f"data: {payload}\n\n"
        except Exception as exc:
            err_payload = json.dumps({"type": "error", "message": str(exc)})
            yield f"data: {err_payload}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@router.post("/chat/approve")
async def approve_eco(req: ApprovalRequest):
    """Human-in-the-Loop approval endpoint for proposed Engineering Change Orders (ECO) and Supabase Design Plans."""
    state = project_manager.get_project(req.project_id)
    applied_count = 0
    plan_title = "Design Plan"

    def place_item(item: Dict[str, Any], idx: int = 0):
        ref = item.get("ref", "")
        val = item.get("value", "")
        fp = item.get("footprint", "")
        sym = item.get("symbol", "")
        if not ref:
            return

        spec = lookup_component(val or ref)
        prefix = "".join(c for c in ref if c.isalpha()).upper() or "U"
        default_fps = {
            "R": "Resistor_SMD:R_0805_2012Metric",
            "C": "Capacitor_SMD:C_0805_2012Metric",
            "D": "LED_SMD:LED_0805_2012Metric",
            "U": "Package_SOIC:SOIC-8_3.9x4.9mm_P1.27mm",
            "J": "Connector_PinHeader_2.54mm:PinHeader_1x02_P2.54mm_Vertical",
            "Q": "Package_TO_SOT_SMD:SOT-23",
            "SW": "Button_Switch_SMD:SW_Push_SPST_NO_Alps_SKRK",
        }
        default_syms = {
            "R": "Device:R",
            "C": "Device:C",
            "D": "Device:LED",
            "U": "Device:IC",
            "J": "Connector_Generic:Conn_01x02",
            "Q": "Device:Q_NMOS_GSD",
            "SW": "Switch:SW_Push",
        }

        use_fp = fp or spec.get("footprint") or default_fps.get(prefix, "Package_SOIC:SOIC-8_3.9x4.9mm_P1.27mm")
        use_sym = sym or spec.get("symbol") or default_syms.get(prefix, f"Device:{prefix}")

        x_coord, y_coord = calculate_component_placement(ref, val or ref, state)

        pins_copy = {}
        if spec.get("pins"):
            for p_num, p_obj in spec["pins"].items():
                pins_copy[p_num] = Pin(
                    number=p_obj.number,
                    name=p_obj.name,
                    pin_type=p_obj.pin_type,
                    x_offset=p_obj.x_offset,
                    y_offset=p_obj.y_offset,
                )

        state.add_component(
            ref=ref,
            value=val or spec.get("value", ref),
            footprint=use_fp,
            symbol=use_sym,
            x=round(x_coord, 2),
            y=round(y_coord, 2),
            pins=pins_copy or None,
        )

    if req.action in ("approve", "approve_all"):
        # 1. Check in-memory pending ECO (strictly verified for this project)
        if state.pending_eco and (not state.pending_eco.project_id or state.pending_eco.project_id == req.project_id) and (req.eco_id in ("all", "*") or state.pending_eco.id == req.eco_id or str(req.eco_id).isdigit()):
            plan_title = state.pending_eco.title
            for idx, item in enumerate(state.pending_eco.additions):
                place_item(item, idx)
                applied_count += 1
            state.pending_eco.status = "approved"

        # 2. Check Supabase design_plans
        plans = [p for p in (await db_manager.get_design_plans_async(req.project_id)) if p.get("project_id", req.project_id) == req.project_id]
        for p in plans:
            p_id = str(p.get("id"))
            p_status = p.get("status")
            if p_status in ("pending", "pending_approval") and (req.eco_id in ("all", "full_plan", "*") or p_id == str(req.eco_id)):
                plan_title = p.get("title", plan_title)
                comps = p.get("components") or []
                for idx, item in enumerate(comps):
                    place_item(item, applied_count + idx)
                    applied_count += 1

        # If nothing specifically matched, approve latest pending plan in Supabase
        if applied_count == 0:
            for p in plans:
                if p.get("status") in ("pending", "pending_approval"):
                    plan_title = p.get("title", plan_title)
                    comps = p.get("components") or []
                    for idx, item in enumerate(comps):
                        place_item(item, applied_count + idx)
                        applied_count += 1
                    break

        await db_manager.approve_design_plans_async(req.project_id, req.eco_id)
        wire_standard_circuit_nets(state)
        state.run_drc()
        state.schematic_sexpr = await asyncio.to_thread(generate_schematic_sexpr, state)
        state.pcb_sexpr = await asyncio.to_thread(generate_pcb_sexpr, state)
        state.revision += 1
        await db_manager.save_project_async(req.project_id, state.model_dump())

        return {
            "status": "approved",
            "message": f"Successfully approved plan '{plan_title}' with {applied_count} components committed to circuit.",
            "applied_count": applied_count,
            "state": state.model_dump(),
            "schematic_sexpr": state.schematic_sexpr,
            "pcb_sexpr": state.pcb_sexpr,
        }

    elif req.action == "reject":
        if state.pending_eco and (not state.pending_eco.project_id or state.pending_eco.project_id == req.project_id):
            state.pending_eco.status = "rejected"

        db_manager.reject_design_plans(req.project_id, req.eco_id)
        db_manager.save_project(req.project_id, state.model_dump())
        return {"status": "rejected", "message": "ECO proposal rejected by engineer."}

    else:
        return {"status": "modified", "message": f"Feedback received: {req.feedback}"}


@router.get("/projects/{project_id}/state")
async def get_project_state(project_id: str):
    """Retrieve active circuit graph, DRC status, and KiCad S-expressions."""
    state = project_manager.get_project(project_id)
    pending_eco_data = state.pending_eco.model_dump() if state.pending_eco else None

    return {
        "project_id": state.project_id,
        "project_name": state.project_name,
        "revision": state.revision,
        "board": state.board.model_dump(),
        "components": {k: v.model_dump() for k, v in state.components.items()},
        "nets": {k: v.model_dump() for k, v in state.nets.items()},
        "tracks": [t.model_dump() for t in state.tracks],
        "vias": [v.model_dump() for v in state.vias],
        "drc_errors": [e.model_dump() for e in state.drc_errors],
        "pending_eco": pending_eco_data,
        "schematic_sexpr": state.schematic_sexpr or generate_schematic_sexpr(state),
        "pcb_sexpr": state.pcb_sexpr or generate_pcb_sexpr(state),
    }


@router.get("/projects/{project_id}/messages")
async def get_project_messages(project_id: str):
    """Retrieve historical conversation messages for a project."""
    messages = db_manager.get_chat_messages(project_id)
    return {"project_id": project_id, "messages": messages}


@router.delete("/projects/{project_id}")
async def delete_project(project_id: str):
    """Delete a project and its chat history and design plans."""
    success = project_manager.delete_project(project_id)
    return {"status": "success" if success else "error", "message": f"Project '{project_id}' deleted."}


@router.get("/projects/{project_id}/plans")
async def get_project_design_plans(project_id: str):
    """Retrieve all engineering design plans and proposals strictly isolated for this project."""
    plans = db_manager.get_design_plans(project_id)
    isolated_plans = [p for p in plans if p.get("project_id", project_id) == project_id]
    return {"project_id": project_id, "plans": isolated_plans}


@router.get("/projects/{project_id}/export")
async def export_project_zip(project_id: str):
    """Download entire project as a native KiCad 8 ZIP archive."""
    zip_bytes = project_manager.export_kicad_zip(project_id)
    return Response(
        content=zip_bytes,
        media_type="application/zip",
        headers={
            "Content-Disposition": f"attachment; filename={project_id}_kicad.zip"
        },
    )


@router.get("/projects/{project_id}/glb")
async def get_project_glb(project_id: str):
    """Serve native KiCad 3D GLB model with physical copper traces, pads, silkscreen, and component geometry."""
    glb_bytes = project_manager.export_kicad_glb(project_id)
    if not glb_bytes:
        raise HTTPException(status_code=404, detail="GLB model generation failed or project not found")
    return Response(
        content=glb_bytes,
        media_type="model/gltf-binary",
        headers={
            "Cache-Control": "no-cache, no-store, must-revalidate",
            "Content-Disposition": f"inline; filename={project_id}.glb",
        },
    )



class CreateProjectRequest(BaseModel):
    project_id: str
    project_name: str
    width: float = 50.0
    height: float = 35.0
    layers: int = 2
    mask_color: str = "black"
    finish: str = "ENIG"


@router.get("/projects")
async def list_projects():
    """List all circuit projects with summary metrics."""
    return {"projects": project_manager.list_projects()}


@router.post("/projects")
async def create_new_project(req: CreateProjectRequest):
    """Create a new circuit project."""
    state = project_manager.create_project(
        project_id=req.project_id,
        name=req.project_name,
        width=req.width,
        height=req.height,
        layers=req.layers,
        mask_color=req.mask_color,
        finish=req.finish,
    )
    db_manager.save_project(req.project_id, state.model_dump())
    return {
        "status": "success",
        "message": f"Project '{req.project_name}' initialized.",
        "project": state.model_dump(),
    }


@router.get("/connectors")
async def list_connectors():
    """Retrieve external hardware service integrations (sourcing, fab, simulation, MCAD)."""
    return {"connectors": connector_manager.list_connectors()}


@router.post("/connectors")
async def configure_or_add_connector(payload: Dict[str, Any]):
    """Configure credentials for an external service or register a custom organization connector."""
    if payload.get("is_custom") or not payload.get("id") or payload.get("action") == "add_custom":
        return connector_manager.add_custom_connector(payload)
    return connector_manager.configure_connector(payload.get("id"), payload)


@router.post("/connectors/{connector_id}/test")
async def test_connector_connection(connector_id: str):
    """Test ping and verify handshake with an external service."""
    return connector_manager.test_connection(connector_id)


@router.get("/knowledge")
async def get_knowledge_base():
    """Retrieve open-source standards, organization SOPs, and component reference library."""
    return knowledge_manager.get_all_knowledge()


@router.post("/knowledge/sop")
async def create_or_update_sop(payload: Dict[str, Any]):
    """Register or update an organization-specific engineering SOP."""
    return knowledge_manager.add_custom_sop(payload)


@router.delete("/knowledge/sop/{sop_id}")
async def delete_sop(sop_id: str):
    """Remove a custom organization SOP."""
    success = knowledge_manager.delete_custom_sop(sop_id)
    return {"status": "success" if success else "not_found", "sop_id": sop_id}


@router.get("/models")
async def list_models():
    """List all 400+ OpenRouter multimodal and reasoning foundation models."""
    models = get_all_openrouter_models()
    return {"models": models, "count": len(models)}

