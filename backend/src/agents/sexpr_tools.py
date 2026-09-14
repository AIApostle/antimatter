"""Direct KiCad S-Expression (.kicad_sch and .kicad_pcb) Manipulation Tools.

Enables the LLM agent to inspect, generate, and directly modify KiCad 8
S-expressions for real-time rendering in KiCanvas and the 3D board viewer.
"""

from __future__ import annotations
import logging
from typing import Dict, Any
from strands import tool

from ..eda.project_manager import project_manager
from ..eda.sexpr_generator import generate_schematic_sexpr, generate_pcb_sexpr
from ..db.supabase import db_manager

logger = logging.getLogger(__name__)


def _validate_sexpr(sexpr: str, expected_tag: str) -> bool:
    """Check balanced parentheses and expected root tag."""
    s = sexpr.strip()
    if not s.startswith("(") or not s.endswith(")"):
        return False
    # Check parenthetical balance
    balance = 0
    for char in s:
        if char == "(":
            balance += 1
        elif char == ")":
            balance -= 1
            if balance < 0:
                return False
    return balance == 0


@tool
def get_active_sexpr(
    file_type: str = "schematic",
    project_id: str = "default-power-delivery",
) -> Dict[str, Any]:
    """Retrieve the current raw KiCad S-Expression for the schematic or PCB layout.

    Args:
        file_type: Either 'schematic' (for .kicad_sch) or 'pcb' (for .kicad_pcb)
        project_id: The active project ID (default: 'default-power-delivery')
    """
    state = project_manager.get_project(project_id)
    if file_type.lower() in ("schematic", "sch", "kicad_sch"):
        content = state.schematic_sexpr or generate_schematic_sexpr(state)
        return {
            "status": "success",
            "file_type": "schematic",
            "project_id": project_id,
            "revision": state.revision,
            "sexpr": content,
            "length": len(content),
        }
    else:
        content = state.pcb_sexpr or generate_pcb_sexpr(state)
        return {
            "status": "success",
            "file_type": "pcb",
            "project_id": project_id,
            "revision": state.revision,
            "sexpr": content,
            "length": len(content),
        }


@tool
def update_schematic_sexpr(
    sexpr: str,
    project_id: str = "default-power-delivery",
) -> Dict[str, Any]:
    """Directly update the KiCad 8 Schematic (.kicad_sch) S-Expression.

    Use this tool to place KiCad symbols, wires, nets, power flags, and global labels directly in the schematic.

    Args:
        sexpr: Valid KiCad 8 S-expression starting with '(kicad_sch ...)'
        project_id: Active project ID
    """
    state = project_manager.get_project(project_id)

    if not _validate_sexpr(sexpr, "kicad_sch"):
        return {
            "status": "error",
            "message": "Invalid S-expression: parentheses are unbalanced or format is malformed.",
        }

    state.schematic_sexpr = sexpr
    state.revision += 1
    db_manager.save_project(project_id, state.model_dump())

    return {
        "status": "success",
        "message": f"Updated schematic S-expression (rev {state.revision}). KiCanvas will re-render automatically.",
        "project_id": project_id,
        "revision": state.revision,
    }


@tool
def update_pcb_sexpr(
    sexpr: str,
    project_id: str = "default-power-delivery",
) -> Dict[str, Any]:
    """Directly update the KiCad 8 PCB Layout (.kicad_pcb) S-Expression.

    Use this tool to update board outline, footprints, copper traces (segments), vias, and pads directly.

    Args:
        sexpr: Valid KiCad 8 S-expression starting with '(kicad_pcb ...)'
        project_id: Active project ID
    """
    state = project_manager.get_project(project_id)

    if not _validate_sexpr(sexpr, "kicad_pcb"):
        return {
            "status": "error",
            "message": "Invalid S-expression: parentheses are unbalanced or format is malformed.",
        }

    state.pcb_sexpr = sexpr
    state.revision += 1
    db_manager.save_project(project_id, state.model_dump())

    return {
        "status": "success",
        "message": f"Updated PCB layout S-expression (rev {state.revision}). KiCanvas and 3D Viewport will re-render automatically.",
        "project_id": project_id,
        "revision": state.revision,
    }
