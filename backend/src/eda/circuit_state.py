"""Antimotion Circuit State Manager & Unified Circuit Graph.

Maintains continuous, real-time awareness of schematic symbols, nets,
pins, PCB footprints, placement coordinates, tracks, and DRC diagnostics.
"""

from __future__ import annotations
import uuid
from typing import Dict, List, Optional, Tuple, Any
from pydantic import BaseModel, Field


class Pin(BaseModel):
    number: str
    name: str
    net: Optional[str] = None
    pin_type: str = "passive"  # power_in, power_out, input, output, bidirectional, passive
    x_offset: float = 0.0
    y_offset: float = 0.0


class Component(BaseModel):
    ref: str  # e.g., "U1", "R1", "C1"
    value: str  # e.g., "AMS1117-3.3", "10k", "100nF"
    footprint: str  # e.g., "Package_TO_SOT_SMD:SOT-223-3_TabPin2"
    symbol: str  # e.g., "Regulator_Linear:AMS1117-3.3"
    description: str = ""
    x: float = 0.0  # PCB placement X in mm
    y: float = 0.0  # PCB placement Y in mm
    rotation: float = 0.0  # degrees
    layer: str = "F.Cu"  # F.Cu (top) or B.Cu (bottom)
    pins: Dict[str, Pin] = Field(default_factory=dict)
    properties: Dict[str, str] = Field(default_factory=dict)
    uuid: str = Field(default_factory=lambda: str(uuid.uuid4()))


class Net(BaseModel):
    name: str
    nodes: List[Tuple[str, str]] = Field(default_factory=list)  # (ref, pin_number)


class TrackSegment(BaseModel):
    start: Tuple[float, float]
    end: Tuple[float, float]
    width: float = 0.25  # mm
    layer: str = "F.Cu"
    net_name: str = ""
    uuid: str = Field(default_factory=lambda: str(uuid.uuid4()))


class Via(BaseModel):
    x: float
    y: float
    size: float = 0.8  # mm outer diameter
    drill: float = 0.4  # mm drill hole
    layers: Tuple[str, str] = ("F.Cu", "B.Cu")
    net_name: str = ""
    uuid: str = Field(default_factory=lambda: str(uuid.uuid4()))


class BoardSetup(BaseModel):
    width: float = 60.0  # mm
    height: float = 45.0  # mm
    corner_radius: float = 3.0  # mm
    layer_count: int = 2
    thickness: float = 1.6  # mm
    mask_color: str = "black"  # black, green, blue, purple, red, white
    finish: str = "ENIG"  # ENIG (gold), HASL (silver)


class DRCError(BaseModel):
    rule: str
    severity: str  # "error", "warning", "info"
    message: str
    items: List[str] = Field(default_factory=list)


class ECOProposal(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4())[:8])
    project_id: str = ""
    title: str
    description: str
    status: str = "pending"  # "pending", "approved", "rejected"
    additions: List[Dict[str, Any]] = Field(default_factory=list)
    modifications: List[Dict[str, Any]] = Field(default_factory=list)
    removals: List[Dict[str, Any]] = Field(default_factory=list)
    timestamp: str = Field(default_factory=lambda: "now")


class CircuitState(BaseModel):
    project_id: str = Field(default_factory=lambda: f"antimatter-{uuid.uuid4().hex[:8]}")
    project_name: str = "antimatter"
    board: BoardSetup = Field(default_factory=BoardSetup)
    components: Dict[str, Component] = Field(default_factory=dict)
    nets: Dict[str, Net] = Field(default_factory=dict)
    tracks: List[TrackSegment] = Field(default_factory=list)
    vias: List[Via] = Field(default_factory=list)
    drc_errors: List[DRCError] = Field(default_factory=list)
    pending_eco: Optional[ECOProposal] = None
    schematic_sexpr: Optional[str] = None
    pcb_sexpr: Optional[str] = None
    revision: int = 1

    def add_component(
        self,
        ref: str,
        value: str,
        footprint: str,
        symbol: str,
        description: str = "",
        pins: Optional[Dict[str, Pin]] = None,
        x: float = 0.0,
        y: float = 0.0,
        rotation: float = 0.0,
    ) -> Component:
        """Add or overwrite a component in the circuit."""
        if not pins:
            from .component_library import lookup_component
            spec = lookup_component(value or ref)
            if spec and spec.get("pins"):
                pins = {
                    pn: Pin(number=p.number, name=p.name, pin_type=p.pin_type, x_offset=p.x_offset, y_offset=p.y_offset)
                    for pn, p in spec["pins"].items()
                }
            else:
                ref_prefix = "".join(c for c in ref.upper() if c.isalpha())
                if ref_prefix in ("R", "C", "D", "L", "SW"):
                    pins = {
                        "1": Pin(number="1", name="1", pin_type="passive", x_offset=-0.8, y_offset=0.0),
                        "2": Pin(number="2", name="2", pin_type="passive", x_offset=0.8, y_offset=0.0),
                    }

        comp = Component(
            ref=ref,
            value=value,
            footprint=footprint,
            symbol=symbol,
            description=description,
            pins=pins or {},
            x=x,
            y=y,
            rotation=rotation,
        )
        self.components[ref] = comp
        self.revision += 1
        return comp

    def remove_component(self, ref: str) -> Optional[Component]:
        """Remove component and detach from all nets."""
        if ref not in self.components:
            return None
        comp = self.components.pop(ref)
        # Detach from nets
        for net in self.nets.values():
            net.nodes = [n for n in net.nodes if n[0] != ref]
        self.revision += 1
        return comp

    def connect_pin(self, ref: str, pin_num: str, net_name: str) -> bool:
        """Connect a specific component pin to a named net."""
        if ref not in self.components:
            return False
        comp = self.components[ref]
        if pin_num not in comp.pins:
            # Auto create pin if not present
            comp.pins[pin_num] = Pin(number=pin_num, name=f"Pin_{pin_num}")
        comp.pins[pin_num].net = net_name

        if net_name not in self.nets:
            self.nets[net_name] = Net(name=net_name, nodes=[])

        net = self.nets[net_name]
        node = (ref, pin_num)
        if node not in net.nodes:
            net.nodes.append(node)

        self.revision += 1
        return True

    def place_component(self, ref: str, x: float, y: float, rotation: float = 0.0) -> bool:
        """Update PCB coordinate and orientation for a component."""
        if ref not in self.components:
            return False
        comp = self.components[ref]
        comp.x = x
        comp.y = y
        comp.rotation = rotation
        self.revision += 1
        return True

    def add_track(self, start: Tuple[float, float], end: Tuple[float, float], width: float = 0.25, layer: str = "F.Cu", net_name: str = "") -> TrackSegment:
        """Add a routed copper track segment."""
        seg = TrackSegment(start=start, end=end, width=width, layer=layer, net_name=net_name)
        self.tracks.append(seg)
        self.revision += 1
        return seg

    def run_drc(self) -> List[DRCError]:
        """Run DRC (Design Rules Check) and ERC (Electrical Rules Check)."""
        errors: List[DRCError] = []

        # 1. Check for floating / unassigned pins on ICs and connectors
        unconnected: List[str] = []
        for ref, comp in self.components.items():
            for p_num, pin in comp.pins.items():
                if not pin.net and pin.pin_type not in ("no_connect", "nc"):
                    unconnected.append(f"{ref}.{p_num} ({pin.name})")

        if unconnected:
            errors.append(DRCError(
                rule="UnconnectedPins",
                severity="warning",
                message=f"{len(unconnected)} pin(s) are floating with no net assigned.",
                items=unconnected[:10],
            ))

        # 2. Check for power-ground short (VCC/VIN connected directly to GND in same net)
        for net_name, net in self.nets.items():
            upper = net_name.upper()
            if ("GND" in upper or "VSS" in upper) and ("VCC" in upper or "3V3" in upper or "5V" in upper or "VIN" in upper):
                errors.append(DRCError(
                    rule="PowerGroundShort",
                    severity="error",
                    message=f"Dangerous power-ground short detected in net '{net_name}'!",
                    items=[f"{r}.{p}" for r, p in net.nodes],
                ))

        # 3. Check for components placed out of board boundary
        out_of_bounds: List[str] = []
        hw = self.board.width / 2.0
        hh = self.board.height / 2.0
        for ref, comp in self.components.items():
            # Allow origin centered boards (-hw to hw, -hh to hh) or (0 to width, 0 to height)
            if not ((-hw <= comp.x <= hw and -hh <= comp.y <= hh) or (0 <= comp.x <= self.board.width and 0 <= comp.y <= self.board.height)):
                out_of_bounds.append(f"{ref} at ({comp.x}, {comp.y}) mm")

        if out_of_bounds:
            errors.append(DRCError(
                rule="OutOfBounds",
                severity="warning",
                message=f"{len(out_of_bounds)} component(s) are placed outside board edges.",
                items=out_of_bounds,
            ))

        # 4. Check for nets with only 1 pin (dangling net)
        single_pin_nets = [net_name for net_name, net in self.nets.items() if len(net.nodes) == 1]
        if single_pin_nets:
            errors.append(DRCError(
                rule="SingleNodeNet",
                severity="info",
                message=f"{len(single_pin_nets)} net(s) have only 1 pin connected.",
                items=single_pin_nets[:8],
            ))

        self.drc_errors = errors
        return errors

    def get_summary(self) -> str:
        """Compact markdown summary of circuit state for continuous agent prompt injection."""
        lines = [
            f"### Active Board: {self.project_name} (rev {self.revision})",
            f"- Dimensions: {self.board.width}mm x {self.board.height}mm, {self.board.layer_count}-layer, Finish: {self.board.finish}, Mask: {self.board.mask_color}",
            f"- Components ({len(self.components)}):",
        ]
        for ref, comp in sorted(self.components.items()):
            conn_str = ", ".join(f"{p_num}:{p.net or 'float'}" for p_num, p in sorted(comp.pins.items())[:5])
            if len(comp.pins) > 5:
                conn_str += f" (+{len(comp.pins)-5} more)"
            lines.append(f"  - **{ref}**: {comp.value} [{comp.footprint}] at ({comp.x:.1f}, {comp.y:.1f}) rot={comp.rotation}° | {conn_str}")

        lines.append(f"- Nets ({len(self.nets)}):")
        for net_name, net in sorted(self.nets.items()):
            pins_str = ", ".join(f"{r}.{p}" for r, p in net.nodes)
            lines.append(f"  - `{net_name}`: {pins_str}")

        lines.append(f"- Tracks: {len(self.tracks)} routed segments | Vias: {len(self.vias)}")
        self.run_drc()
        if self.drc_errors:
            lines.append(f"- DRC Status: {len(self.drc_errors)} issue(s)")
            for err in self.drc_errors:
                lines.append(f"  - [{err.severity.upper()}] {err.rule}: {err.message}")
        else:
            lines.append("- DRC Status: PASSED (0 errors, 0 warnings)")

        return "\n".join(lines)
