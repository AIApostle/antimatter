"""Unit test validating Strands Agent SDK definition and AgentSkills plugin."""

import pytest
from src.agents.pcb_agent import pcb_agent, EDA_TOOLS, skills_plugin
from strands import Agent


def test_strands_agent_definition():
    # Verify tools
    assert len(EDA_TOOLS) >= 8
    tool_names = [getattr(t, "name", "") or getattr(t, "__name__", "") for t in EDA_TOOLS]
    assert "add_component" in tool_names
    assert "kicanvas_select" in tool_names

    # Verify skills plugin
    assert skills_plugin is not None
    skill_names = [s.name for s in skills_plugin.get_available_skills()]
    assert "kicanvas" in skill_names
    assert "strands-agent" in skill_names


@pytest.mark.anyio
async def test_pcb_agent_stream_execution():
    events = []
    async for event in pcb_agent.run_stream(
        prompt="Add a blue status LED with 1k resistor",
        project_id="default-power-delivery",
        require_permission=True,
    ):
        events.append(event)

    types = [e.get("type") for e in events]
    assert "thought" in types
    assert "circuit_delta" in types
    assert "final_message" in types


def test_hitl_intervention_handler():
    from unittest.mock import MagicMock
    from src.agents.pcb_agent import EDAApprovalInterventionHandler
    from strands.interventions import Confirm, Proceed

    # When HITL permission is required
    handler_strict = EDAApprovalInterventionHandler(require_permission=True)
    evt_sensitive = MagicMock()
    evt_sensitive.tool_use = {"name": "add_component", "input": {"ref": "C10"}}
    res_sensitive = handler_strict.before_tool_call(evt_sensitive)
    assert isinstance(res_sensitive, Confirm)
    assert "Human permission requested" in res_sensitive.prompt

    evt_read = MagicMock()
    evt_read.tool_use = {"name": "research_component_specs", "input": {"query": "ESP32"}}
    res_read = handler_strict.before_tool_call(evt_read)
    assert isinstance(res_read, Proceed)

    # When HITL permission is disabled (auto mode)
    handler_auto = EDAApprovalInterventionHandler(require_permission=False)
    res_auto = handler_auto.before_tool_call(evt_sensitive)
    assert isinstance(res_auto, Proceed)

