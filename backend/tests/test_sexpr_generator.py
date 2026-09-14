"""Unit tests for KiCad 7/8 S-Expression generator."""

from src.eda.project_manager import project_manager
from src.eda.sexpr_generator import generate_schematic_sexpr, generate_pcb_sexpr


def test_default_clean_project_sexpr():
    state = project_manager.create_project(name="antimatter")
    assert state.project_name == "antimatter"

    # Add components dynamically
    state.add_component(ref="U1", value="AP2112K-3.3", footprint="Package_TO_SOT_SMD:SOT-23-5", symbol="Regulator_Linear:AP2112K-3.3")
    state.add_component(ref="J1", value="USB-C-16P", footprint="Connector_USB:USB_C_Receptacle_HRO_TYPE-C-31-M-12", symbol="Connector:USB_C_Receptacle_USB2.0")

    sch = generate_schematic_sexpr(state)
    assert sch.startswith("(kicad_sch")
    assert "(lib_symbols" in sch
    assert "AP2112K-3.3" in sch
    assert "USB_C" in sch
    assert sch.endswith(")\n)") or sch.endswith(")")

    pcb = generate_pcb_sexpr(state)
    assert pcb.startswith("(kicad_pcb")
    assert "(layers" in pcb
    assert "Edge.Cuts" in pcb
    assert "footprint" in pcb
