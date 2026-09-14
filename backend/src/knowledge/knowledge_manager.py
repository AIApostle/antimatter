"""Antimatter Hardware Engineering Knowledge Base & Organizational SOPs.

Provides:
- Open-Source Hardware Design Standards & Physics Guidelines (IPC-2221, IPC-7351, High-Speed, PDN, RF, DFM)
- Microcontroller & Power IC Application Bringup Knowledge
- Organizational Knowledge Base & Custom Engineering SOPs (with CRUD and persistence)
- AI Hardware Systems Architect Prompt Recipes
"""

from typing import List, Dict, Any, Optional
import json
import time
from pathlib import Path
from pydantic import BaseModel, Field

from ..eda.component_library import LIBRARY

DATA_DIR = Path(__file__).resolve().parent.parent.parent / "data"
KNOWLEDGE_SOPS_FILE = DATA_DIR / "knowledge_sops.json"


OPEN_SOURCE_STANDARDS: List[Dict[str, Any]] = [
    {
        "id": "ipc-2221b-clearance",
        "title": "IPC-2221B Voltage Spacing & Clearances",
        "standard": "IPC-2221B Table 6-1",
        "category": "Standards & Safety",
        "rule": "0.13mm (<15V) • 0.25mm (15-30V) • 0.50mm (31-50V) on external bare copper",
        "scope": "Open-Source Standard",
        "description": "Fundamental generic clearance distance between conductors to prevent dielectric breakdown, galvanic corrosion, and flashover arcing under atmospheric pressure.",
        "checklist": [
            "Maintain at least 0.20mm (8 mil) trace-to-trace spacing for DC rails up to 24V",
            "Maintain 0.50mm minimum creepage around AC or high-voltage switching nodes",
            "Ensure solder mask dams between SMD pads are at least 0.10mm (4 mil)",
        ],
        "agent_rule": "Enforce minimum 0.20mm trace-to-trace clearance across all signal nets; expand to 0.40mm for high-voltage and unregulated DC rails."
    },
    {
        "id": "ipc-7351-land-patterns",
        "title": "IPC-7351B SMT Generic Land Pattern Discipline",
        "standard": "IPC-7351B / IEC 61188-5-1",
        "category": "Standards & Footprints",
        "rule": "Nominal Density Level B (SMD resistors/capacitors 0603/0805, SOIC, QFN, SOT-23)",
        "scope": "Open-Source Standard",
        "description": "Standardized mathematical footprint calculation ensuring adequate heel, toe, and side solder fillets for automated surface mount pick-and-place and reflow soldering.",
        "checklist": [
            "Use 0805 (2012 Metric) or 0603 (1608 Metric) packages for rapid hand-reworkable prototypes",
            "Thermal pad on bottom of QFN ICs must have 4-9 thermal vias directly to internal ground plane",
            "Keep component-to-component body clearance >= 0.50mm to allow optical inspection (AOI)",
        ],
        "agent_rule": "Assign standard IPC-7351B 0805 or 0603 footprints for passives; verify pin 1 dot orientation on silkscreen."
    },
    {
        "id": "high-speed-diff-pairs",
        "title": "High-Speed Differential Impedance (USB 2.0 & Ethernet)",
        "standard": "USB-IF / IEEE 802.3",
        "category": "High-Speed & Signal Integrity",
        "rule": "90Ω ±10% differential (USB D+/D-) • 100Ω ±10% (Ethernet / PCIe)",
        "scope": "Open-Source Standard",
        "description": "Controlled impedance differential signaling rules to suppress common-mode noise, eliminate EMI emissions, and avoid signal reflections at Gigabit data rates.",
        "checklist": [
            "Route differential pairs tightly coupled on the top copper layer directly over an unbroken GND plane",
            "Skew and length matching between D+ and D- must be tightly constrained within 0.15mm (6 mil)",
            "Do not route differential signals across splits in the ground return plane",
            "Avoid 90° sharp corners; use 45° mitered bends or curved traces",
        ],
        "agent_rule": "When routing USB_D+ and USB_D-, route them parallel with matched trace lengths (<0.15mm mismatch) and 90-ohm differential geometry."
    },
    {
        "id": "power-integrity-pdn-decoupling",
        "title": "Power Distribution Network (PDN) & Decoupling",
        "standard": "TI / NXP PDN Application Guide",
        "category": "Power Electronics",
        "rule": "100nF ceramic within 3mm of VDD pin • 10μF-47μF bulk reservoir at regulator output",
        "scope": "Open-Source Standard",
        "description": "Low-impedance power delivery architecture providing high-frequency transient current spikes to digital switching cores while preventing voltage rail ripple.",
        "checklist": [
            "Place 100nF high-frequency bypass ceramic capacitor as close as physically possible to each IC power pin (<3mm)",
            "Connect the capacitor ground pad directly to the solid ground plane with adjacent stitching via",
            "Sequence bulk filtering capacitors from largest (10μF) to smallest (100nF) along the power delivery branch",
        ],
        "agent_rule": "Always pair every IC VDD/VCC pin with a dedicated 100nF bypass capacitor placed adjacent to the pin before routing to the main rail."
    },
    {
        "id": "rf-24ghz-antenna-keepout",
        "title": "RF 2.4GHz Wi-Fi / BLE Antenna Keepout",
        "standard": "Espressif / Nordic RF Guidelines",
        "category": "RF & Wireless",
        "rule": "15mm copper keepout zone on all layers beneath and around PCB trace antenna",
        "scope": "Open-Source Standard",
        "description": "Electromagnetic clearance discipline for onboard PCB antennas (ESP32-C3, nRF52) to preserve omnidirectional radiation pattern and prevent detuning.",
        "checklist": [
            "Place RF module with antenna hanging slightly over the board edge or in the corner",
            "Prohibit all copper fills, ground planes, traces, and metal components within 15mm of antenna",
            "Stitch ground plane perimeter with vias spaced λ/20 (~3mm) to suppress spurious harmonic emissions",
        ],
        "agent_rule": "Orient wireless modules with antennas along the outer PCB edge and configure a strict copper keepout zone underneath the antenna."
    },
    {
        "id": "thermal-relief-heatsink",
        "title": "Thermal Relief & Copper Pour Dissipation",
        "standard": "IPC-7095 / JEDEC JESD51",
        "category": "Thermal Engineering",
        "rule": "4-spoke thermal relief pads on internal planes • Solid copper flood on high-dissipation power tabs",
        "scope": "Open-Source Standard",
        "description": "Balancing soldering heat transfer (preventing cold solder joints during reflow) while maximizing thermal conductivity away from power regulators and MOSFETs.",
        "checklist": [
            "Use thermal relief connections for through-hole pins connecting to large ground planes for hand solderability",
            "Use solid copper connections with multiple thermal vias (0.3mm drill) beneath linear regulators (AMS1117, AP2112)",
            "Ensure 1oz copper pours on bottom layer provide heat-sink area of at least 150mm² per Watt of heat",
        ],
        "agent_rule": "Add thermal stitching arrays beneath power regulators and LDOs; ensure heat spreader copper polygons connect to GND."
    },
    {
        "id": "dfm-low-cost-fabs",
        "title": "Low-Cost Fabrication DFM Constraints (6/6 mil)",
        "standard": "JLCPCB / PCBWay Standard Spec",
        "category": "Manufacturing DFM",
        "rule": "Min trace: 0.15mm (6 mil) • Min space: 0.15mm • Min drill: 0.30mm (12 mil) • Annular ring: 0.15mm",
        "scope": "Open-Source Standard",
        "description": "Design for Manufacturability (DFM) threshold rules for standard 2-layer and 4-layer rapid prototyping fabs avoiding costly tooling upcharges.",
        "checklist": [
            "Keep trace widths above 0.25mm (10 mil) for signals and 0.50mm (20 mil) for power for 100% yield",
            "Maintain board edge clearance of at least 0.30mm for traces and 0.50mm for copper fills to survive V-cut milling",
            "Silkscreen minimum text height: 1.0mm, minimum line stroke: 0.15mm for legible legibility",
        ],
        "agent_rule": "Validate that all traces, clearances, and drill sizes comply with standard 0.15mm/0.30mm manufacturing thresholds."
    },
]

DEFAULT_ORGANIZATION_SOPS: List[Dict[str, Any]] = [
    {
        "id": "sop-corp-101",
        "title": "Industrial IoT Microcontroller Routing Standard",
        "standard": "SOP-ELEC-101 (v3.2)",
        "category": "Organization SOP",
        "rule": "Mandatory 4-layer stackup for Wi-Fi/BLE MCUs • 0.1uF + 10uF per supply rail • Dedicated test points",
        "scope": "Company Mandatory",
        "author": "Principal Hardware Architect",
        "description": "Internal engineering policy required for all commercial IoT sensor nodes and embedded controllers before PCB sign-off.",
        "checklist": [
            "4-layer stackup (Signal - GND - Power - Signal) mandatory for all boards containing wireless transceivers",
            "Dedicated 1.0mm surface-mount circular test points (TP) required for UART TX/RX, I2C, and EN reset lines",
            "ESD protection TVS diode array required on all externally accessible pin headers and USB ports",
            "All power rails must have an inline SMD fuse (PTC resettable polyfuse) on the primary 5V/VBUS input",
        ],
        "agent_rule": "When designing for Industrial IoT products, place test points on debug lines, add TVS ESD protection diodes on connectors, and use a 4-layer ground reference stackup."
    },
    {
        "id": "sop-corp-102",
        "title": "Component Voltage & Current Derating Policy",
        "standard": "SOP-COMP-204 (v2.0)",
        "category": "Organization SOP",
        "rule": "Capacitor voltage rating >= 200% operating voltage • Resistor power derated 50%",
        "scope": "Company Mandatory",
        "author": "Reliability & Quality Assurance",
        "description": "Strict component stress reduction policy to ensure a Minimum Mean Time Between Failures (MTBF) exceeding 50,000 continuous hours in 60°C ambient environments.",
        "checklist": [
            "Ceramic capacitors on 5V rails must have a minimum voltage rating of 10V (16V or 25V preferred)",
            "Ceramic capacitors on 12V rails must have a minimum rating of 25V or 50V (due to MLCC DC-bias capacitance loss)",
            "Tantalum capacitors are prohibited on unregulated power input lines due to short-circuit ignition risk",
            "SMD resistors must operate at less than 50% of their rated power dissipation (e.g. max 62mW on 0805 125mW)",
        ],
        "agent_rule": "Derate all ceramic capacitor voltage ratings by at least 2x expected operating rail voltage; select 16V minimum for 5V rails and 25V for 12V."
    },
    {
        "id": "sop-corp-103",
        "title": "Automated SMT Assembly & Tooling Hole Standard",
        "standard": "SOP-MFG-305 (v1.8)",
        "category": "Organization SOP",
        "rule": "3.2mm non-plated tooling holes in 3 corners • 3x optical fiducials with 1.0mm copper / 2.0mm mask opening",
        "scope": "Company Recommended",
        "author": "Manufacturing & SMT Lead",
        "description": "Standardized panelization and fiducial alignment standard enabling automated high-speed Pick-and-Place feed and SMT reflow without custom mechanical fixtures.",
        "checklist": [
            "Provide 3x non-plated 3.2mm tooling holes at (X=5mm, Y=5mm) offsets from board corners for conveyor pins",
            "Place 3x global optical fiducial markers (1.0mm circular copper pad, 2.0mm mask opening) in an asymmetric L-pattern",
            "Local fiducials required for fine-pitch QFN and BGA packages (<0.5mm pin pitch)",
        ],
        "agent_rule": "Include 3 corner fiducials and 3.2mm unplated tooling holes along the PCB perimeter rails for SMT line conveyor indexing."
    },
]


class KnowledgeManager:
    """Manages open-source EDA standards and organization custom engineering SOPs."""

    def __init__(self):
        DATA_DIR.mkdir(parents=True, exist_ok=True)
        self._custom_sops: Dict[str, Dict[str, Any]] = {}
        self._load_data()

    def _load_data(self):
        if KNOWLEDGE_SOPS_FILE.exists():
            try:
                with open(KNOWLEDGE_SOPS_FILE, "r", encoding="utf-8") as f:
                    self._custom_sops = json.load(f)
            except Exception:
                pass

    def _save_data(self):
        try:
            with open(KNOWLEDGE_SOPS_FILE, "w", encoding="utf-8") as f:
                json.dump(self._custom_sops, f, indent=2)
        except Exception:
            pass

    def get_all_knowledge(self) -> Dict[str, Any]:
        """Return combined open-source standards, organization SOPs, and component reference library."""
        all_sops = list(DEFAULT_ORGANIZATION_SOPS)
        for sop in self._custom_sops.values():
            all_sops.append(sop)

        return {
            "standards": OPEN_SOURCE_STANDARDS,
            "design_rules": OPEN_SOURCE_STANDARDS,
            "organization_sops": all_sops,
            "components": [
                {
                    "id": k,
                    "value": v["value"],
                    "footprint": v["footprint"],
                    "symbol": v["symbol"],
                    "description": v["description"],
                    "pin_count": len(v["pins"]),
                    "pins": {num: p.name for num, p in v["pins"].items()},
                }
                for k, v in LIBRARY.items()
            ],
            "agent_prompts": [
                {
                    "category": "Power Electronics",
                    "title": "USB-C 5V to 3.3V LDO Power Tree",
                    "prompt": "Design a 5V USB-C input to 3.3V LDO power delivery circuit using AP2112K-3.3, 10uF bulk capacitors, 100nF decoupling, and an emerald status LED with 1k resistor.",
                },
                {
                    "category": "Microcontroller",
                    "title": "ESP32-C3 Thermal & Environmental Node",
                    "prompt": "Design an ESP32-C3 wireless telemetry node with 3.3V power regulator, EN pull-up resistor, boot switch, and I2C temperature sensor with 4.7k pull-ups.",
                },
                {
                    "category": "High-Speed & RF",
                    "title": "Differential Pair Routing & 50Ω RF Antenna",
                    "prompt": "Route USB D+ and D- with 90-ohm differential impedance and enforce a 15mm copper keepout zone around the wireless module PCB antenna.",
                },
                {
                    "category": "Organization SOP Application",
                    "title": "Apply SOP-ELEC-101 Industrial IoT Standard",
                    "prompt": "Enforce Company SOP-ELEC-101 on this project: add 1.0mm test points on UART and reset lines, insert a TVS diode array on USB pins, and configure an unbroken ground reference plane.",
                },
            ]
        }

    def add_custom_sop(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Create or update a custom organizational engineering SOP."""
        sop_id = data.get("id") or f"sop-custom-{int(time.time())}"
        sop = {
            "id": sop_id,
            "title": data.get("title", "Custom Engineering SOP"),
            "standard": data.get("standard", "Internal Standard"),
            "category": data.get("category", "Organization SOP"),
            "rule": data.get("rule", "Custom engineering constraint"),
            "scope": data.get("scope", "Company Mandatory"),
            "author": data.get("author", "Hardware Engineering Team"),
            "description": data.get("description", "Custom organizational procedure and design checklist."),
            "checklist": data.get("checklist", []),
            "agent_rule": data.get("agent_rule", "Follow this company rule when laying out the circuit."),
            "created_at": time.strftime("%Y-%m-%d %H:%M:%S"),
            "is_custom": True,
        }
        self._custom_sops[sop_id] = sop
        self._save_data()
        return {"status": "success", "sop": sop}

    def delete_custom_sop(self, sop_id: str) -> bool:
        """Remove a custom organizational SOP."""
        if sop_id in self._custom_sops:
            del self._custom_sops[sop_id]
            self._save_data()
            return True
        return False


knowledge_manager = KnowledgeManager()
