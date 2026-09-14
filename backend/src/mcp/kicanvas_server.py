"""Antimotion FastMCP KiCanvas & EDA Server.

Exposes electronic design automation tools to AI agents:
- Circuit summary & netlist inspection
- Component instantiation & library matching
- Schematic pin netting & wiring
- PCB footprint placement and trace routing
- Board outline configuration
- DRC / ERC validation
- Human-in-the-loop ECO (Engineering Change Order) proposals
"""

from typing import Dict, Any, List, Optional
from fastmcp import FastMCP
from ..eda.project_manager import project_manager
from ..eda.component_library import lookup_component
from ..eda.circuit_state import ECOProposal

# Initialize FastMCP Server
mcp_server = FastMCP(
    name="Antimotion EDA Server",
)


@mcp_server.tool()
def get_circuit_summary(project_id: str = "default-power-delivery") -> str:
    """Inspect current schematic, netlist, footprint placements, and DRC status."""
    state = project_manager.get_project(project_id)
    return state.get_summary()


@mcp_server.tool()
def add_component(
    ref: str,
    value: str,
    footprint: str = "",
    symbol: str = "",
    description: str = "",
    x: float = 20.0,
    y: float = 20.0,
    rotation: float = 0.0,
    project_id: str = "default-power-delivery",
) -> Dict[str, Any]:
    """Add an electronic component to the active circuit state and PCB layout.

    Args:
        ref: Designator (e.g. 'U2', 'R3', 'C4', 'D2')
        value: Component value or part number (e.g. '10k', 'ESP32-C3-WROOM-02', '10uF')
        footprint: KiCad footprint name (optional; auto-matched if empty)
        symbol: KiCad symbol name (optional; auto-matched if empty)
        description: Functional description
        x: PCB X coordinate in mm
        y: PCB Y coordinate in mm
        rotation: Angle in degrees
        project_id: Active project ID
    """
    state = project_manager.get_project(project_id)
    lib_spec = lookup_component(value if value else ref)

    fp = footprint or lib_spec.get("footprint", "Resistor_SMD:R_0805_2012Metric")
    sym = symbol or lib_spec.get("symbol", "Device:R")
    desc = description or lib_spec.get("description", "")
    pins = lib_spec.get("pins", {})

    comp = state.add_component(
        ref=ref,
        value=value,
        footprint=fp,
        symbol=sym,
        description=desc,
        pins=pins,
        x=x,
        y=y,
        rotation=rotation,
    )
    return {
        "status": "success",
        "message": f"Added component {ref} ({value}) at ({x}, {y})",
        "component": comp.model_dump(),
    }


@mcp_server.tool()
def connect_pin_to_net(
    ref: str,
    pin: str,
    net_name: str,
    project_id: str = "default-power-delivery",
) -> Dict[str, Any]:
    """Connect a component pin to a named electrical net (e.g. GND, +3V3, VBUS, SDA, SCL).

    Args:
        ref: Component reference designator (e.g. 'U1', 'R1')
        pin: Pin number or name (e.g. '1', '2', 'A4')
        net_name: Name of the electrical net
        project_id: Active project ID
    """
    state = project_manager.get_project(project_id)
    success = state.connect_pin(ref, pin, net_name)
    if not success:
        return {"status": "error", "message": f"Component {ref} not found"}
    return {
        "status": "success",
        "message": f"Connected {ref}.{pin} to net '{net_name}'",
        "net": net_name,
    }


@mcp_server.tool()
def place_footprint(
    ref: str,
    x: float,
    y: float,
    rotation: float = 0.0,
    project_id: str = "default-power-delivery",
) -> Dict[str, Any]:
    """Relocate component footprint position and orientation on the PCB.

    Args:
        ref: Component reference designator
        x: X coordinate in mm
        y: Y coordinate in mm
        rotation: Rotation in degrees (0, 90, 180, 270)
        project_id: Active project ID
    """
    state = project_manager.get_project(project_id)
    success = state.place_component(ref, x, y, rotation)
    if not success:
        return {"status": "error", "message": f"Component {ref} not found"}
    return {
        "status": "success",
        "message": f"Placed {ref} at ({x}, {y}) rot={rotation}°",
    }


@mcp_server.tool()
def route_track(
    start_x: float,
    start_y: float,
    end_x: float,
    end_y: float,
    net_name: str,
    width: float = 0.25,
    layer: str = "F.Cu",
    project_id: str = "default-power-delivery",
) -> Dict[str, Any]:
    """Draw a copper track segment between two coordinates on the PCB.

    Args:
        start_x: Starting X coordinate in mm
        start_y: Starting Y coordinate in mm
        end_x: Ending X coordinate in mm
        end_y: Ending Y coordinate in mm
        net_name: Net name associated with this copper trace
        width: Track width in mm (default 0.25 for signal, 0.5+ for power)
        layer: Copper layer ('F.Cu' for top, 'B.Cu' for bottom)
        project_id: Active project ID
    """
    state = project_manager.get_project(project_id)
    seg = state.add_track(
        start=(start_x, start_y),
        end=(end_x, end_y),
        width=width,
        layer=layer,
        net_name=net_name,
    )
    return {
        "status": "success",
        "message": f"Routed {layer} track for net '{net_name}'",
        "track": seg.model_dump(),
    }


@mcp_server.tool()
def configure_board(
    width: float,
    height: float,
    corner_radius: float = 2.5,
    mask_color: str = "black",
    finish: str = "ENIG",
    project_id: str = "default-power-delivery",
) -> Dict[str, Any]:
    """Configure PCB outline dimensions, corner rounding, solder mask color, and surface finish.

    Args:
        width: Width in mm
        height: Height in mm
        corner_radius: Corner rounding radius in mm
        mask_color: Solder mask color ('black', 'green', 'blue', 'purple')
        finish: Surface finish ('ENIG', 'HASL')
        project_id: Active project ID
    """
    state = project_manager.get_project(project_id)
    state.board.width = width
    state.board.height = height
    state.board.corner_radius = corner_radius
    state.board.mask_color = mask_color
    state.board.finish = finish
    state.revision += 1
    return {
        "status": "success",
        "message": f"Board resized to {width}x{height}mm (Mask: {mask_color}, Finish: {finish})",
        "board": state.board.model_dump(),
    }


@mcp_server.tool()
def run_drc(project_id: str = "default-power-delivery") -> Dict[str, Any]:
    """Run full Design Rules Check (DRC) and Electrical Rules Check (ERC)."""
    state = project_manager.get_project(project_id)
    errors = state.run_drc()
    return {
        "status": "success",
        "error_count": len(errors),
        "errors": [e.model_dump() for e in errors],
    }


@mcp_server.tool()
def propose_eco(
    title: str,
    description: str,
    additions: Optional[List[Dict[str, Any]]] = None,
    modifications: Optional[List[Dict[str, Any]]] = None,
    removals: Optional[List[Dict[str, Any]]] = None,
    project_id: str = "default-power-delivery",
) -> Dict[str, Any]:
    """Propose an Engineering Change Order (ECO) requiring human engineer approval.

    Use this tool whenever making significant architecture changes (swapping microcontrollers,
    changing power topologies, rewiring critical buses).
    """
    state = project_manager.get_project(project_id)
    eco = ECOProposal(
        title=title,
        description=description,
        status="pending",
        additions=additions or [],
        modifications=modifications or [],
        removals=removals or [],
    )
    state.pending_eco = eco
    return {
        "status": "pending_approval",
        "message": f"ECO '{title}' submitted for human engineer approval.",
        "eco": eco.model_dump(),
    }
