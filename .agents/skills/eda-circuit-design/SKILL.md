---
name: eda-circuit-design
description: Hardware engineering best practices for electronic schematic generation, netlist topology, power supply regulation, decoupling capacitors, and PCB layout routing.
---

# Electronic Design Automation (EDA) Circuit Design Skill

This skill provides expert rules for electronic design and PCB layout.

---

## 1. Power Supply Topology
- Always place a bulk capacitor (e.g. 10uF 0805) near voltage regulator inputs and outputs.
- Add high-frequency bypass ceramic capacitors (100nF 0603) as close to IC VCC/VDD power pins as possible.
- Tie power ground pins directly to a unified low-impedance ground plane (`GND`).

## 2. Net Naming Conventions
- Power nets: `+3V3`, `+5V`, `VBUS`, `VIN`, `GND`.
- Signal nets: `SDA`, `SCL`, `TXD`, `RXD`, `USB_D+`, `USB_D-`.
- Avoid spaces or special punctuation in net names.

## 3. Trace Widths & Clearances
- Signal traces: 0.25mm width, 0.2mm clearance.
- Power traces (up to 1A): 0.5mm - 0.8mm width.
- High-current traces (>1A): 1.0mm - 2.0mm or dedicated copper pours.
