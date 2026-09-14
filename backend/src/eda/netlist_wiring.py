"""Dynamic Circuit Netlist Auto-Wiring Engine for Antimatter EDA.

Autonomously resolves and connects electrical nets based on generic electronic pinout
properties, pin types, and bus topologies (Power, Ground, I2C, SPI, UART, Decoupling).
Completely dynamic with zero hardcoded part names.
"""

from typing import Dict, Any
import logging
from .circuit_state import CircuitState

logger = logging.getLogger("antimatter.netlist_wiring")


def wire_standard_circuit_nets(state: CircuitState) -> int:
    """Dynamically analyze component pin metadata and connect electrical nets based on pin roles."""
    connections_made = 0

    # Discover active power rails present on board
    primary_vcc_rail = "+3V3"
    primary_vin_rail = "VBUS"

    for ref, comp in state.components.items():
        for p_num, p in comp.pins.items():
            name_u = p.name.upper()
            if name_u in ("VBUS", "USB_VBUS", "+5V", "5V", "VBAT"):
                primary_vin_rail = name_u if "+" in name_u or name_u.startswith("V") else f"+{name_u}"
            elif name_u in ("+3V3", "3V3", "VDD_3V3", "3.3V"):
                primary_vcc_rail = "+3V3"
            elif name_u in ("+1V8", "1V8"):
                primary_vcc_rail = "+1V8"

    # Route generic pin roles across all placed components
    for ref, comp in state.components.items():
        ref_upper = ref.upper()
        prefix = "".join(c for c in ref_upper if c.isalpha())

        # 1. Inspect every physical pin
        for p_num, p in comp.pins.items():
            if p.net:
                continue  # already connected

            name_u = p.name.upper()
            ptype = getattr(p, "pin_type", "").lower()

            # --- Ground Connections ---
            if name_u in ("GND", "VSS", "GND1", "GND2", "EP", "THERMAL_PAD", "SHIELD") or (ptype == "power_in" and "GND" in name_u):
                if state.connect_pin(ref, p_num, "GND"):
                    connections_made += 1

            # --- Input Power (VBUS / VIN / 5V) ---
            elif name_u in ("VBUS", "VIN", "VI", "IN", "VBUS1", "VBUS2"):
                if state.connect_pin(ref, p_num, primary_vin_rail):
                    connections_made += 1

            # --- Core VDD / VCC Power Rail ---
            elif name_u in ("VDD", "VCC", "+3V3", "3V3", "3.3V", "VDD_IO", "AVDD", "DVDD"):
                if state.connect_pin(ref, p_num, primary_vcc_rail):
                    connections_made += 1

            # --- Regulated Power Output (LDO / Buck VOUT) ---
            elif name_u in ("VOUT", "VO", "OUT", "OUT_3V3") and ptype in ("power_out", "output", ""):
                if state.connect_pin(ref, p_num, primary_vcc_rail):
                    connections_made += 1

            # --- I2C Bus ---
            elif name_u in ("SDA", "I2C_SDA", "SDA0", "SDA1"):
                if state.connect_pin(ref, p_num, "I2C_SDA"):
                    connections_made += 1
            elif name_u in ("SCL", "I2C_SCL", "SCL0", "SCL1"):
                if state.connect_pin(ref, p_num, "I2C_SCL"):
                    connections_made += 1

            # --- SPI Bus ---
            elif name_u in ("MOSI", "SPI_MOSI", "SDI"):
                if state.connect_pin(ref, p_num, "SPI_MOSI"):
                    connections_made += 1
            elif name_u in ("MISO", "SPI_MISO", "SDO"):
                if state.connect_pin(ref, p_num, "SPI_MISO"):
                    connections_made += 1
            elif name_u in ("SCK", "SPI_SCK", "SCLK"):
                if state.connect_pin(ref, p_num, "SPI_SCK"):
                    connections_made += 1

            # --- UART Serial ---
            elif name_u in ("TX", "TXD", "UART_TX"):
                if state.connect_pin(ref, p_num, "UART_TX"):
                    connections_made += 1
            elif name_u in ("RX", "RXD", "UART_RX"):
                if state.connect_pin(ref, p_num, "UART_RX"):
                    connections_made += 1

            # --- USB-C CC Lines ---
            elif name_u in ("CC1", "USB_CC1"):
                if state.connect_pin(ref, p_num, "USB_CC1"):
                    connections_made += 1
            elif name_u in ("CC2", "USB_CC2"):
                if state.connect_pin(ref, p_num, "USB_CC2"):
                    connections_made += 1

        # 2. Generic Passives Handling (Decoupling Capacitors & Pull-up/down Resistors)
        if prefix == "C" and len(comp.pins) == 2:
            p1, p2 = list(comp.pins.keys())[:2]
            if not comp.pins[p2].net:
                state.connect_pin(ref, p2, "GND")
                connections_made += 1
            if not comp.pins[p1].net:
                state.connect_pin(ref, p1, primary_vcc_rail)
                connections_made += 1

        elif prefix == "R" and len(comp.pins) == 2:
            p1, p2 = list(comp.pins.keys())[:2]
            val_u = comp.value.upper()
            if "5.1K" in val_u:
                # Standard USB-C CC pull-down
                if not comp.pins[p2].net:
                    state.connect_pin(ref, p2, "GND")
                    connections_made += 1
                if not comp.pins[p1].net:
                    state.connect_pin(ref, p1, "USB_CC1" if "1" in ref else "USB_CC2")
                    connections_made += 1

    logger.info("⚡ [Netlist Wiring] Autonomously connected %d component pins to circuit nets.", connections_made)
    return connections_made
