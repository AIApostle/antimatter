"""Antimotion Standard Electronic Component Library.

Provides built-in symbols, pinouts, footprint designations, and physical package
metadata for standard electronic parts (microcontrollers, power management,
interfaces, passives, and discrete semiconductors).
"""

from typing import Dict, List, Any
from .circuit_state import Pin


LIBRARY: Dict[str, Dict[str, Any]] = {
    # Power Regulators
    "AMS1117-3.3": {
        "value": "AMS1117-3.3",
        "symbol": "Regulator_Linear:AMS1117-3.3",
        "footprint": "Package_TO_SOT_SMD:SOT-223-3_TabPin2",
        "description": "1A Low Dropout Positive Regulator 3.3V Output",
        "package_type": "sot223",
        "dimensions": {"width": 6.5, "length": 7.0, "height": 1.8},
        "pins": {
            "1": Pin(number="1", name="GND/ADJ", pin_type="power_in", x_offset=-2.3, y_offset=-3.1),
            "2": Pin(number="2", name="VOUT", pin_type="power_out", x_offset=0.0, y_offset=-3.1),
            "3": Pin(number="3", name="VIN", pin_type="power_in", x_offset=2.3, y_offset=-3.1),
            "4": Pin(number="4", name="VOUT_TAB", pin_type="power_out", x_offset=0.0, y_offset=3.1),
        }
    },
    "AP2112K-3.3": {
        "value": "AP2112K-3.3",
        "symbol": "Regulator_Linear:AP2112K-3.3",
        "footprint": "Package_TO_SOT_SMD:SOT-23-5",
        "description": "600mA Ultra-low noise LDO regulator",
        "package_type": "sot23_5",
        "dimensions": {"width": 2.9, "length": 2.8, "height": 1.45},
        "pins": {
            "1": Pin(number="1", name="VIN", pin_type="power_in", x_offset=-0.95, y_offset=-1.3),
            "2": Pin(number="2", name="GND", pin_type="power_in", x_offset=0.0, y_offset=-1.3),
            "3": Pin(number="3", name="EN", pin_type="input", x_offset=0.95, y_offset=-1.3),
            "4": Pin(number="4", name="NC", pin_type="no_connect", x_offset=0.95, y_offset=1.3),
            "5": Pin(number="5", name="VOUT", pin_type="power_out", x_offset=-0.95, y_offset=1.3),
        }
    },

    # Microcontrollers
    "ESP32-C3-WROOM-02": {
        "value": "ESP32-C3-WROOM-02",
        "symbol": "RF_Module:ESP32-C3-WROOM-02",
        "footprint": "RF_Module:ESP32-C3-WROOM-02",
        "description": "Wi-Fi + BLE 5.0 RISC-V Microcontroller Module",
        "package_type": "module",
        "dimensions": {"width": 18.0, "length": 20.0, "height": 3.2},
        "pins": {
            "1": Pin(number="1", name="GND", pin_type="power_in", x_offset=-9.0, y_offset=7.5),
            "2": Pin(number="2", name="3V3", pin_type="power_in", x_offset=-9.0, y_offset=6.0),
            "3": Pin(number="3", name="EN", pin_type="input", x_offset=-9.0, y_offset=4.5),
            "4": Pin(number="4", name="IO4", pin_type="bidirectional", x_offset=-9.0, y_offset=3.0),
            "5": Pin(number="5", name="IO5", pin_type="bidirectional", x_offset=-9.0, y_offset=1.5),
            "6": Pin(number="6", name="IO6", pin_type="bidirectional", x_offset=-9.0, y_offset=0.0),
            "7": Pin(number="7", name="IO7", pin_type="bidirectional", x_offset=-9.0, y_offset=-1.5),
            "8": Pin(number="8", name="IO8", pin_type="bidirectional", x_offset=-9.0, y_offset=-3.0),
            "9": Pin(number="9", name="IO9", pin_type="bidirectional", x_offset=-9.0, y_offset=-4.5),
            "10": Pin(number="10", name="GND", pin_type="power_in", x_offset=-9.0, y_offset=-6.0),
            "11": Pin(number="11", name="IO10", pin_type="bidirectional", x_offset=9.0, y_offset=-6.0),
            "12": Pin(number="12", name="IO18_USB_D-", pin_type="bidirectional", x_offset=9.0, y_offset=-4.5),
            "13": Pin(number="13", name="IO19_USB_D+", pin_type="bidirectional", x_offset=9.0, y_offset=-3.0),
            "14": Pin(number="14", name="IO20_RXD", pin_type="bidirectional", x_offset=9.0, y_offset=-1.5),
            "15": Pin(number="15", name="IO21_TXD", pin_type="bidirectional", x_offset=9.0, y_offset=0.0),
            "16": Pin(number="16", name="GND", pin_type="power_in", x_offset=9.0, y_offset=1.5),
            "17": Pin(number="17", name="EPAD_GND", pin_type="power_in", x_offset=0.0, y_offset=0.0),
        }
    },
    "RP2040": {
        "value": "RP2040",
        "symbol": "MCU_RaspberryPi:RP2040",
        "footprint": "Package_DFN_QFN:QFN-56-1EP_7x7mm_P0.4mm_EP3.2x3.2mm",
        "description": "Dual ARM Cortex-M0+ 133MHz Microcontroller",
        "package_type": "qfn56",
        "dimensions": {"width": 7.0, "length": 7.0, "height": 0.9},
        "pins": {
            "1": Pin(number="1", name="IOVDD", pin_type="power_in"),
            "2": Pin(number="2", name="GPIO0", pin_type="bidirectional"),
            "3": Pin(number="3", name="GPIO1", pin_type="bidirectional"),
            "4": Pin(number="4", name="GPIO2", pin_type="bidirectional"),
            "5": Pin(number="5", name="GPIO3", pin_type="bidirectional"),
            "19": Pin(number="19", name="GND", pin_type="power_in"),
            "20": Pin(number="20", name="XIN", pin_type="input"),
            "21": Pin(number="21", name="XOUT", pin_type="output"),
            "45": Pin(number="45", name="USB_DP", pin_type="bidirectional"),
            "46": Pin(number="46", name="USB_DM", pin_type="bidirectional"),
            "47": Pin(number="47", name="USB_VDD", pin_type="power_in"),
            "57": Pin(number="57", name="GND", pin_type="power_in"),
        }
    },

    # Connectors
    "USB-C-16P": {
        "value": "USB-C-16P",
        "symbol": "Connector:USB_C_Receptacle_USB2.0",
        "footprint": "Connector_USB:USB_C_Receptacle_HRO_TYPE-C-31-M-12",
        "description": "USB 2.0 Type-C Receptacle 16-Pin",
        "package_type": "connector_usbc",
        "dimensions": {"width": 8.94, "length": 7.35, "height": 3.16},
        "pins": {
            "A1": Pin(number="A1", name="GND", pin_type="power_in", x_offset=-2.75, y_offset=0.0),
            "A4": Pin(number="A4", name="VBUS", pin_type="power_out", x_offset=-1.75, y_offset=0.0),
            "A5": Pin(number="A5", name="CC1", pin_type="bidirectional", x_offset=-0.75, y_offset=0.0),
            "A6": Pin(number="A6", name="DP1", pin_type="bidirectional", x_offset=-0.25, y_offset=0.0),
            "A7": Pin(number="A7", name="DN1", pin_type="bidirectional", x_offset=0.25, y_offset=0.0),
            "A8": Pin(number="A8", name="SBU1", pin_type="bidirectional", x_offset=0.75, y_offset=0.0),
            "A9": Pin(number="A9", name="VBUS", pin_type="power_out", x_offset=1.75, y_offset=0.0),
            "A12": Pin(number="A12", name="GND", pin_type="power_in", x_offset=2.75, y_offset=0.0),
            "B1": Pin(number="B1", name="GND", pin_type="power_in", x_offset=2.75, y_offset=0.5),
            "B4": Pin(number="B4", name="VBUS", pin_type="power_out", x_offset=1.75, y_offset=0.5),
            "B5": Pin(number="B5", name="CC2", pin_type="bidirectional", x_offset=0.75, y_offset=0.5),
            "B6": Pin(number="B6", name="DP2", pin_type="bidirectional", x_offset=0.25, y_offset=0.5),
            "B7": Pin(number="B7", name="DN2", pin_type="bidirectional", x_offset=-0.25, y_offset=0.5),
            "B8": Pin(number="B8", name="SBU2", pin_type="bidirectional", x_offset=-0.75, y_offset=0.5),
            "B9": Pin(number="B9", name="VBUS", pin_type="power_out", x_offset=-1.75, y_offset=0.5),
            "B12": Pin(number="B12", name="GND", pin_type="power_in", x_offset=-2.75, y_offset=0.5),
            "SH": Pin(number="SH", name="SHIELD", pin_type="passive", x_offset=0.0, y_offset=-2.0),
        }
    },
    "PinHeader_1x4": {
        "value": "I2C_Header",
        "symbol": "Connector_Generic:Conn_01x04",
        "footprint": "Connector_PinHeader_2.54mm:PinHeader_1x04_P2.54mm_Vertical",
        "description": "Generic 4-pin 2.54mm header (VCC, GND, SDA, SCL)",
        "package_type": "pin_header",
        "dimensions": {"width": 10.16, "length": 2.54, "height": 8.5},
        "pins": {
            "1": Pin(number="1", name="VCC", pin_type="power_in", x_offset=-3.81, y_offset=0.0),
            "2": Pin(number="2", name="GND", pin_type="power_in", x_offset=-1.27, y_offset=0.0),
            "3": Pin(number="3", name="SDA", pin_type="bidirectional", x_offset=1.27, y_offset=0.0),
            "4": Pin(number="4", name="SCL", pin_type="bidirectional", x_offset=3.81, y_offset=0.0),
        }
    },

    # Passives (Resistors & Capacitors)
    "R_0805": {
        "value": "10k",
        "symbol": "Device:R",
        "footprint": "Resistor_SMD:R_0805_2012Metric",
        "description": "Resistor 0805 metric 2012",
        "package_type": "smd_0805",
        "dimensions": {"width": 2.0, "length": 1.25, "height": 0.6},
        "pins": {
            "1": Pin(number="1", name="~", pin_type="passive", x_offset=-0.95, y_offset=0.0),
            "2": Pin(number="2", name="~", pin_type="passive", x_offset=0.95, y_offset=0.0),
        }
    },
    "R_0603": {
        "value": "1k",
        "symbol": "Device:R",
        "footprint": "Resistor_SMD:R_0603_1608Metric",
        "description": "Resistor 0603 metric 1608",
        "package_type": "smd_0603",
        "dimensions": {"width": 1.6, "length": 0.8, "height": 0.45},
        "pins": {
            "1": Pin(number="1", name="~", pin_type="passive", x_offset=-0.75, y_offset=0.0),
            "2": Pin(number="2", name="~", pin_type="passive", x_offset=0.75, y_offset=0.0),
        }
    },
    "C_0805": {
        "value": "10uF",
        "symbol": "Device:C",
        "footprint": "Capacitor_SMD:C_0805_2012Metric",
        "description": "Capacitor 0805 metric 2012",
        "package_type": "smd_0805",
        "dimensions": {"width": 2.0, "length": 1.25, "height": 0.6},
        "pins": {
            "1": Pin(number="1", name="~", pin_type="passive", x_offset=-0.95, y_offset=0.0),
            "2": Pin(number="2", name="~", pin_type="passive", x_offset=0.95, y_offset=0.0),
        }
    },
    "C_0603": {
        "value": "100nF",
        "symbol": "Device:C",
        "footprint": "Capacitor_SMD:C_0603_1608Metric",
        "description": "Capacitor 0603 metric 1608",
        "package_type": "smd_0603",
        "dimensions": {"width": 1.6, "length": 0.8, "height": 0.45},
        "pins": {
            "1": Pin(number="1", name="~", pin_type="passive", x_offset=-0.75, y_offset=0.0),
            "2": Pin(number="2", name="~", pin_type="passive", x_offset=0.75, y_offset=0.0),
        }
    },
    "LED_0805": {
        "value": "Green",
        "symbol": "Device:LED",
        "footprint": "LED_SMD:LED_0805_2012Metric",
        "description": "Light Emitting Diode 0805",
        "package_type": "smd_0805",
        "dimensions": {"width": 2.0, "length": 1.25, "height": 0.8},
        "pins": {
            "1": Pin(number="1", name="K", pin_type="passive", x_offset=-1.0, y_offset=0.0),  # Cathode
            "2": Pin(number="2", name="A", pin_type="passive", x_offset=1.0, y_offset=0.0),   # Anode
        }
    },
    "SW_Push_Tactile": {
        "value": "SW_Push",
        "symbol": "Switch:SW_Push",
        "footprint": "Button_Switch_SMD:SW_SPST_PTS645",
        "description": "Push button tactile switch",
        "package_type": "switch_tactile",
        "dimensions": {"width": 6.0, "length": 6.0, "height": 4.3},
        "pins": {
            "1": Pin(number="1", name="1", pin_type="passive", x_offset=-3.0, y_offset=-2.0),
            "2": Pin(number="2", name="2", pin_type="passive", x_offset=3.0, y_offset=2.0),
        }
    },
}


def lookup_component(query: str) -> Dict[str, Any]:
    """Find the best matching component definition in the standard library."""
    query_lower = query.lower()
    for key, spec in LIBRARY.items():
        if key.lower() in query_lower or spec["value"].lower() in query_lower:
            return spec

    # Default fallback: 0805 passive
    if "res" in query_lower or query.startswith("R"):
        return LIBRARY["R_0805"]
    if "cap" in query_lower or query.startswith("C"):
        return LIBRARY["C_0805"]
    if "led" in query_lower or query.startswith("D"):
        return LIBRARY["LED_0805"]
    if "reg" in query_lower or "ldo" in query_lower:
        return LIBRARY["AMS1117-3.3"]
    if "esp" in query_lower:
        return LIBRARY["ESP32-C3-WROOM-02"]
    if "rp2040" in query_lower:
        return LIBRARY["RP2040"]
    if "usb" in query_lower:
        return LIBRARY["USB-C-16P"]

    return LIBRARY["R_0805"]
