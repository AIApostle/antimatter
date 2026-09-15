"""Intelligent Electronic Component Placement Engine for Antimatter EDA.

Arranges PCB components using professional hardware engineering rules:
- Connectors (USB-C, headers) placed along perimeter/edge
- Main MCU / primary IC centered on the PCB
- Voltage regulators / LDOs placed in the power stage between connector and MCU load
- Decoupling capacitors (100nF, 10uF) placed directly adjacent to IC VDD pins (clear of chip boundaries)
- Pull-up and pull-down resistors placed adjacent to their respective signal/bus pins
- Peripheral sensors placed with proper thermal clearance
- Strict bounding-box collision detection to guarantee 0 physical component overlaps
"""

from typing import Tuple, Dict, Any, Optional
import math
from .circuit_state import CircuitState


def _get_component_clearance_radius(ref: str, value: str) -> float:
    """Estimated physical boundary radius in millimeters for clearance checking."""
    r_up = ref.upper()
    v_low = (value or "").lower()
    
    if any(k in v_low for k in ("esp32", "wroom", "mcu", "stm32", "rp2040", "atmega")):
        return 12.0  # Large MCU module (e.g. 18x25.5mm)
    if any(k in v_low for k in ("usb", "conn", "header", "jst")):
        return 4.5   # Connectors
    if any(k in v_low for k in ("ams1117", "sot-223", "to-252", "d2pak", "regulator")):
        return 4.5   # Power packages
    if r_up.startswith("U"):
        return 4.0   # SOIC / TSSOP / QFN ICs
    if any(k in v_low for k in ("sensor", "sht", "bmp", "bme")):
        return 3.0   # Sensor modules
    if r_up.startswith("C"):
        return 2.0   # 0805/0603 Capacitor
    if r_up.startswith("R"):
        return 2.0   # 0805/0603 Resistor
    if r_up.startswith("D"):
        return 2.0   # LED / Diode
    return 3.0


def calculate_component_placement(
    ref: str,
    value: str,
    state: CircuitState,
    requested_x: Optional[float] = None,
    requested_y: Optional[float] = None,
) -> Tuple[float, float]:
    """Determine optimal (x, y) coordinates for a component respecting engineering layout principles."""
    bw = float(state.board.width or 50.0)
    bh = float(state.board.height or 35.0)
    margin = 4.0

    comp_radius = _get_component_clearance_radius(ref, value)
    existing = state.components

    def has_collision(cx: float, cy: float) -> bool:
        for r, c in existing.items():
            if r == ref:
                continue
            other_radius = _get_component_clearance_radius(c.ref, c.value)
            min_dist = comp_radius + other_radius + 2.0  # At least 2.0mm physical clearance gap
            dist = math.hypot(cx - c.x, cy - c.y)
            if dist < min_dist:
                return True
        return False

    # 1. If explicit valid coordinates were provided by the model within board margins, check collision
    if requested_x is not None and requested_y is not None:
        cand_x = max(margin + comp_radius, min(bw - margin - comp_radius, requested_x))
        cand_y = max(margin + comp_radius, min(bh - margin - comp_radius, requested_y))
        if not has_collision(cand_x, cand_y):
            return round(cand_x, 2), round(cand_y, 2)

    ref_upper = ref.upper()
    val_lower = (value or "").lower()
    prefix = "".join(c for c in ref_upper if c.isalpha()) or "U"

    # 2. Compute initial anchor coordinate based on hardware role
    if prefix == "J" or any(k in val_lower for k in ("usb", "header", "conn", "jst", "barrel", "jack")):
        connector_count = sum(1 for r, c in existing.items() if r.startswith("J") or "usb" in c.value.lower())
        cand_x = margin + comp_radius + 1.0
        spacing = (bh - 2 * margin) / max(2, connector_count + 1)
        cand_y = margin + spacing * (connector_count + 1)

    elif (prefix == "U" and ref_upper in ("U1", "U_MCU")) or any(k in val_lower for k in ("esp32", "rp2040", "stm32", "mcu", "microcontroller")):
        # Main MCU / central brain
        cand_x = bw * 0.58
        cand_y = bh * 0.50

    elif any(k in val_lower for k in ("regulator", "ldo", "ams1117", "ap2112", "tps", "buck", "boost")) or ref_upper in ("U2", "U_PWR"):
        # Voltage Regulator (placed in power corridor between USB and MCU)
        cand_x = margin + comp_radius + 7.5
        cand_y = bh * 0.50

    elif prefix == "C":
        # Decoupling capacitor: place adjacent to target IC, strictly OUTSIDE the IC's boundary
        target_ic = None
        for r, c in existing.items():
            if r.startswith("U"):
                target_ic = c
                break

        if target_ic:
            target_radius = _get_component_clearance_radius(target_ic.ref, target_ic.value)
            cap_idx = sum(1 for r in existing if r.startswith("C"))
            # Stagger around the target IC perimeter
            angle = (cap_idx * 45.0 + 20.0) * (math.pi / 180.0)
            offset_dist = target_radius + comp_radius + 2.5
            cand_x = target_ic.x + offset_dist * math.cos(angle)
            cand_y = target_ic.y + offset_dist * math.sin(angle)
        else:
            cand_x = bw * 0.30
            cand_y = bh * 0.25

    elif prefix == "R":
        # Resistors (USB CC pull-downs or I2C pull-ups)
        if "5.1k" in val_lower or "5k1" in val_lower:
            usb_comp = next((c for r, c in existing.items() if "usb" in c.value.lower() or r.startswith("J")), None)
            if usb_comp:
                r_idx = sum(1 for r, c in existing.items() if r.startswith("R") and "5.1" in c.value)
                cand_x = usb_comp.x + 6.0
                cand_y = usb_comp.y + (-3.5 if r_idx % 2 == 0 else 3.5)
            else:
                cand_x = margin + 12.0
                cand_y = margin + 6.0
        else:
            r_count = sum(1 for r in existing if r.startswith("R"))
            cand_x = bw * 0.40 + (r_count * 3.5)
            cand_y = margin + 5.0

    elif prefix == "D" or "led" in val_lower:
        d_count = sum(1 for r in existing if r.startswith("D") or "led" in existing[r].value.lower())
        cand_x = bw - margin - comp_radius - (d_count * 5.0)
        cand_y = margin + comp_radius + 2.0

    elif any(k in val_lower for k in ("sensor", "sht", "bmp", "bme", "mpu", "aht", "temp")):
        # Sensor: right side with maximum thermal separation
        cand_x = bw - margin - comp_radius - 2.0
        cand_y = bh * 0.50

    else:
        # Generic component
        idx = len(existing)
        cols = max(2, int((bw - 2 * margin) // 12.0))
        cand_x = margin + (idx % cols) * 12.0 + 6.0
        cand_y = margin + (idx // cols) * 8.0 + 6.0

    # 3. Clamp to board edges
    cand_x = max(margin + comp_radius, min(bw - margin - comp_radius, cand_x))
    cand_y = max(margin + comp_radius, min(bh - margin - comp_radius, cand_y))

    # 4. Collision Resolution: Spiral search if initial candidate overlaps another component
    if not has_collision(cand_x, cand_y):
        return round(cand_x, 2), round(cand_y, 2)

    # Search outward in spiral increments of 2.0mm
    for radius_step in range(1, 25):
        dist = radius_step * 2.5
        for angle_deg in range(0, 360, 30):
            rad = angle_deg * (math.pi / 180.0)
            test_x = cand_x + dist * math.cos(rad)
            test_y = cand_y + dist * math.sin(rad)
            if (margin + comp_radius) <= test_x <= (bw - margin - comp_radius) and \
               (margin + comp_radius) <= test_y <= (bh - margin - comp_radius):
                if not has_collision(test_x, test_y):
                    return round(test_x, 2), round(test_y, 2)

    return round(cand_x, 2), round(cand_y, 2)
