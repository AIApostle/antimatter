---
name: strands-agent
description: Expert guide for defining, deploying, and managing AI agents using the Strands Agent SDK (strands-agents), including tool definitions, AgentSkills plugins, streaming events, and Human-in-the-Loop interventions.
---

# Strands Agent SDK Guide

This skill provides comprehensive instructions for constructing AI agents using the `strands-agents` Python SDK.

---

## 1. Agent Definition & Initialization

An agent in Strands is initialized using `strands.Agent`:

```python
from strands import Agent, tool
from strands.models.litellm import LiteLLMModel
from strands.vended_plugins.skills import AgentSkills

# Load skills using the AgentSkills plugin
skills_plugin = AgentSkills(skills=["../.agents/skills"])

# Define the agent with LiteLLM model, custom tools, and skills plugin
agent = Agent(
    model=LiteLLMModel(model_id="claude-3-7-sonnet"),
    tools=[add_component, connect_net, route_track, run_drc],
    plugins=[skills_plugin],
    system_prompt="You are Antimotion, an expert hardware EDA agent."
)
```

---

## 2. Tool Definition with `@tool`

Strands provides the `@tool` decorator to convert standard Python functions into agent tools with schema validation:

```python
from strands import tool

@tool
def add_component(ref: str, value: str, x: float = 0.0, y: float = 0.0) -> dict:
    """Add a component to the schematic and PCB layout.

    Args:
        ref: Reference designator (e.g. 'R1', 'U1', 'C1')
        value: Part value or model (e.g. '10k', 'AMS1117-3.3')
        x: X coordinate on PCB in mm
        y: Y coordinate on PCB in mm
    """
    return {"status": "success", "ref": ref}
```

---

## 3. Streaming Event Loop (`agent.stream_async`)

Strands agents process user input and yield typed events:

```python
async for event in agent.stream_async(prompt="Add a status LED on pin 1"):
    # event types include:
    # - ModelMessageEvent (text deltas, reasoning chunks)
    # - ToolResultEvent (tool execution and return values)
    # - ToolInterruptEvent (human approval checkpoints)
    # - EventLoopStopEvent
```

---

## 4. Skills Tool Integration

When `AgentSkills` is passed in `plugins=[...]`, Strands automatically injects:
1. Available skill metadata into the agent's system prompt.
2. A `skills` tool that the agent calls to activate specific domain skills on demand.
