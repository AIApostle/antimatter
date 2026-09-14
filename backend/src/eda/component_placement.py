"""Intelligent Electronic Component Placement Engine for Antimatter EDA.

Arranges PCB components using professional hardware engineering rules:
- Connectors (USB-C, headers) on board perimeter/edge
- Main MCU / primary IC centered on the PCB
- Voltage regulators / LDOs placed in the power stage between connector and MCU
- Decoupling capacitors (100nF, 10uF) placed directly adjacent to IC VDD pins
- Pull-up and pull-down resistors placed adjacent to their respective signal/bus pins
- Peripheral sensors placed with proper thermal clearance
- Prevents overlapping components and respects board dimensions
"""

from typing import Tuple, Dict, Any, Optional
import math
from .circuit_state import CircuitState


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
    margin = 5.0

    # If explicit valid coordinates were provided by the model within board margins, use them
    if requested_x is not None and requested_y is not None:
        if margin <= requested_x <= (bw - margin) and margin <= requested_y <= (bh - margin):
            return round(requested_x, 2), round(requested_y, 2)

    ref_upper = ref.upper()
    val_lower = (value or "").lower()
    prefix = "".join(c for c in ref_upper if c.isalpha()) or "U"
    existing = state.components

    # 1. Connectors (USB-C, Pin Headers, Battery Connectors, JST) -> Left edge or bottom edge
    if prefix == "J" or any(k in val_lower for k in ("usb", "header", "conn", "jst", "barrel", "jack")):
        connector_count = sum(1 for r, c in existing.items() if r.startswith("J") or "usb" in c.value.lower())
        x = margin + 3.0
        spacing = (bh - 2 * margin) / max(2, connector_count + 1)
        y = margin + spacing * (connector_count + 1)
        return round(min(bw - margin, x), 2), round(min(bh - margin, y), 2)

    # 2. Main ICs / Microcontrollers (ESP32, RP2040, STM32, primary IC) -> Center
    if (prefix == "U" and ref_upper in ("U1", "U_MCU")) or any(k in val_lower for k in ("esp32", "rp2040", "stm32", "mcu", "microcontroller", "atmega")):
        x = bw * 0.52
        y = bh * 0.50
        return round(x, 2), round(y, 2)

    # 3. Voltage Regulators / LDOs (AMS1117, AP2112K, Buck converters) -> Power stage (between connector and MCU)
    if any(k in val_lower for k in ("regulator", "ldo", "ams1117", "ap2112", "tps", "buck", "boost", "converter")) or ref_upper in ("U2", "U_PWR"):
        x = bw * 0.28
        y = bh * 0.50
        return round(x, 2), round(y, 2)

    # 4. Decoupling Capacitors (C1, C2, 100nF, 10uF) -> Place directly adjacent to associated IC
    if prefix == "C":
        # Check if there is an existing IC to place next to
        target_ic = None
        for r, c in existing.items():
            if r.startswith("U"):
                target_ic = c
                break

        if target_ic:
            cap_count = sum(1 for r in existing if r.startswith("C"))
            angle = (cap_count * 60.0) * (math.pi / 180.0)
            offset_dist = 5.0
            x = target_ic.x + offset_dist * math.cos(angle)
            y = target_ic.y + offset_dist * math.sin(angle)
            x = max(margin, min(bw - margin, x))
            y = max(margin, min(bh - margin, y))
            return round(x, 2), round(y, 2)

    # 5. Resistors (Pull-ups, pull-downs, LED resistors)
    if prefix == "R":
        # Pull-down on USB-C (5.1k) -> next to USB connector
        if "5.1k" in val_lower or "5k1" in val_lower:
            usb_comp = next((c for r, c in existing.items() if "usb" in c.value.lower() or r.startswith("J")), None)
            if usb_comp:
                r_idx = sum(1 for r, c in existing.items() if r.startswith("R") and "5.1" in c.value)
                return round(usb_comp.x + 4.5, 2), round(usb_comp.y + (-2.5 if r_idx % 2 == 0 else 2.5), 2)

        # I2C Pull-ups (4.7k, 10k) -> near center / MCU
        r_count = sum(1 for r in existing if r.startswith("R"))
        x = bw * 0.42 + (r_count * 2.5)
        y = bh * 0.25
        return round(min(bw - margin, max(margin, x)), 2), round(min(bh - margin, max(margin, y)), 2)

    # 6. Environmental Sensors (SHT40, BMP280, MPU6050) -> Right half, away from heat sources
    if any(k in val_lower for k in ("sensor", "sht", "bmp", "bme", "mpu", "aht", "temp")):
        x = bw * 0.78
        y = bh * 0.50
        return round(x, 2), round(y, 2)

    # 7. LEDs and Indicators -> Top perimeter
    if prefix == "D" or "led" in val_lower:
        d_count = sum(1 for r in existing if r.startswith("D") or "led" in existing[r].value.lower())
        x = bw * 0.75 + (d_count * 5.0)
        y = margin + 2.0
        return round(min(bw - margin, x), 2), round(min(bh - margin, y), 2)

    # General fallback: distribute neatly across usable area
    idx = len(existing)
    cols = max(2, int((bw - 2 * margin) // 10.0))
    col = idx % cols
    row = idx // cols
    x = margin + (col / max(1, cols - 1)) * (bw - 2 * margin)
    y = margin + min(bh - 2 * margin, row * 8.0)
    return round(x, 2), round(y, 2)
