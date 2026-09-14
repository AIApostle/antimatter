"""Unit tests for CircuitState, Component, Net, and DRC validations."""

import pytest
from src.eda.circuit_state import CircuitState, BoardSetup
from src.eda.component_library import lookup_component


def test_circuit_state_initialization():
    state = CircuitState(project_id="test-proj", project_name="Test Circuit")
    assert state.project_id == "test-proj"
    assert len(state.components) == 0
    assert len(state.nets) == 0


def test_add_and_connect_components():
    state = CircuitState()
    reg = lookup_component("AMS1117-3.3")
    state.add_component(
        ref="U1",
        value="AMS1117-3.3",
        footprint=reg["footprint"],
        symbol=reg["symbol"],
        pins=reg["pins"],
    )
    assert "U1" in state.components
    assert len(state.components["U1"].pins) >= 3

    # Connect pin 1 to GND
    ok = state.connect_pin("U1", "1", "GND")
    assert ok is True
    assert state.components["U1"].pins["1"].net == "GND"
    assert "GND" in state.nets
    assert ("U1", "1") in state.nets["GND"].nodes


def test_drc_checks():
    state = CircuitState()
    # Add component with no pins connected
    state.add_component(ref="R1", value="10k", footprint="R_0805", symbol="Device:R")
    errors = state.run_drc()
    assert isinstance(errors, list)
