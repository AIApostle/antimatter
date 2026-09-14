"""Unit tests for FastMCP EDA server tools and FastAPI routes."""

import pytest
from fastapi.testclient import TestClient
from main import app
from src.mcp import kicanvas_server


def test_mcp_tools():
    # Test circuit summary
    summary = kicanvas_server.get_circuit_summary("default-power-delivery")
    assert "Active Board:" in summary
    assert "Components" in summary

    # Test adding component
    res = kicanvas_server.add_component(
        ref="C99",
        value="10uF",
        x=15.0,
        y=15.0,
        project_id="default-power-delivery",
    )
    assert res["status"] == "success"
    assert res["component"]["ref"] == "C99"

    # Test connect net
    net_res = kicanvas_server.connect_pin_to_net(
        ref="C99",
        pin="1",
        net_name="+3V3",
        project_id="default-power-delivery",
    )
    assert net_res["status"] == "success"

    # Test DRC
    drc_res = kicanvas_server.run_drc("default-power-delivery")
    assert drc_res["status"] == "success"


def test_api_endpoints():
    client = TestClient(app)

    # Health check
    resp = client.get("/health")
    assert resp.status_code == 200
    assert resp.json()["status"] == "online"

    # Models
    resp = client.get("/api/models")
    assert resp.status_code == 200
    assert len(resp.json()["models"]) >= 3

    # Project state
    resp = client.get("/api/projects/default-power-delivery/state")
    assert resp.status_code == 200
    data = resp.json()
    assert "components" in data
    assert "schematic_sexpr" in data
    assert "pcb_sexpr" in data

    # Export KiCad ZIP
    resp = client.get("/api/projects/default-power-delivery/export")
    assert resp.status_code == 200
    assert resp.headers["content-type"] == "application/zip"
    assert len(resp.content) > 500  # valid non-empty zip

    # Supabase status
    resp = client.get("/api/supabase/status")
    assert resp.status_code == 200
    supabase_data = resp.json()
    assert "connected" in supabase_data
    assert "mode" in supabase_data

    # List Projects
    resp = client.get("/api/projects")
    assert resp.status_code == 200
    projects_data = resp.json()
    assert len(projects_data["projects"]) >= 2

    # Create New Project
    resp = client.post("/api/projects", json={
        "project_id": "test-sensor-v1",
        "project_name": "Test Sensor Board",
        "width": 60.0,
        "height": 40.0,
        "layers": 2,
        "mask_color": "purple",
    })
    assert resp.status_code == 200
    assert resp.json()["status"] == "success"

    # Connectors Hub
    resp = client.get("/api/connectors")
    assert resp.status_code == 200
    connectors_data = resp.json()
    assert len(connectors_data["connectors"]) >= 4
    connector_ids = [c["id"] for c in connectors_data["connectors"]]
    assert "octopart-nexar" in connector_ids
    assert "jlcpcb-cloud" in connector_ids

    # Knowledge Base
    resp = client.get("/api/knowledge")
    assert resp.status_code == 200
    knowledge_data = resp.json()
    assert len(knowledge_data["components"]) >= 5
    assert len(knowledge_data["standards"]) >= 5
    assert len(knowledge_data["organization_sops"]) >= 3


def test_chat_decision_idempotent():
    """Verify that resolving a decision is idempotent and /api/chat/decision returns 200 (never 404)."""
    client = TestClient(app)
    resp = client.post("/api/chat/decision", json={
        "decision_id": "dec_nonexistent_or_already_resolved",
        "selection": "Option A",
    })
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "ok"
    assert data["resolved"] is False
    assert "Decision already processed" in data["message"]


def test_project_plans_and_eco_isolation():
    """Verify that design plans and ECO proposals are strictly isolated between projects."""
    from src.db.supabase import db_manager
    from src.eda.circuit_state import ECOProposal
    from src.eda.project_manager import project_manager

    client = TestClient(app)

    pid_a = "test-iso-project-alpha"
    pid_b = "test-iso-project-beta"

    # 1. Initialize two isolated projects
    project_manager.create_project(project_id=pid_a, name="Alpha Project")
    project_manager.create_project(project_id=pid_b, name="Beta Project")

    # 2. Add design plans to Alpha and Beta
    db_manager.save_design_plan(pid_a, {
        "id": "plan-alpha-1",
        "title": "Alpha 3.3V Power Delivery",
        "rationale": "High-efficiency buck converter for Alpha",
        "components": [{"ref": "U1", "value": "AP2112K-3.3"}],
        "status": "pending",
    })
    db_manager.save_design_plan(pid_b, {
        "id": "plan-beta-1",
        "title": "Beta Motor Driver H-Bridge",
        "rationale": "High-current driver for Beta",
        "components": [{"ref": "U2", "value": "DRV8833"}],
        "status": "pending",
    })

    # 3. Assign pending ECO to Alpha only
    st_a = project_manager.get_project(pid_a)
    st_a.pending_eco = ECOProposal(
        id="eco-alpha-1",
        project_id=pid_a,
        title="Alpha ECO Only",
        description="Add decoupling to Alpha",
        status="pending",
        additions=[{"ref": "C1", "value": "100nF"}],
    )

    # 4. Fetch plans for Alpha -> should ONLY have Alpha's plans
    resp_a = client.get(f"/api/projects/{pid_a}/plans")
    assert resp_a.status_code == 200
    plans_a = resp_a.json()["plans"]
    assert len(plans_a) >= 1
    for p in plans_a:
        assert p.get("project_id") == pid_a
        assert "Beta" not in p.get("title", "")

    # 5. Fetch plans for Beta -> should ONLY have Beta's plans
    resp_b = client.get(f"/api/projects/{pid_b}/plans")
    assert resp_b.status_code == 200
    plans_b = resp_b.json()["plans"]
    assert len(plans_b) >= 1
    for p in plans_b:
        assert p.get("project_id") == pid_b
        assert "Alpha" not in p.get("title", "")

    # 6. Approve Alpha's plan via /api/chat/approve
    resp_approve = client.post("/api/chat/approve", json={
        "project_id": pid_a,
        "eco_id": "plan-alpha-1",
        "action": "approve",
    })
    assert resp_approve.status_code == 200
    assert resp_approve.json()["status"] == "approved"

    # Verify Beta's plan is still strictly pending and untouched
    resp_b_after = client.get(f"/api/projects/{pid_b}/plans")
    plans_b_after = resp_b_after.json()["plans"]
    assert any(p["id"] == "plan-beta-1" and p["status"] in ("pending", "pending_approval") for p in plans_b_after)




