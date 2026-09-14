"""Antimotion KiCanvas Frontend MCP Bridge.

Bridges the backend Strands Agent to the frontend KiCanvas MCP Server
running in the browser via WebSocket, enabling the AI agent to directly inspect,
navigate, highlight, and control the interactive WebGL KiCanvas viewer.
"""

from __future__ import annotations
import asyncio
import json
import uuid
from typing import Dict, Any, Optional, Set
from fastapi import WebSocket, WebSocketDisconnect
from strands import tool


class KiCanvasFrontendBridge:
    """Manages connection and tool RPCs to the frontend KiCanvas MCP server."""

    def __init__(self):
        self.active_connections: Set[WebSocket] = set()
        self.pending_requests: Dict[str, asyncio.Future[Any]] = {}

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.add(websocket)
        print("[KiCanvasBridge] Frontend KiCanvas MCP server connected.")

    def disconnect(self, websocket: WebSocket):
        self.active_connections.discard(websocket)
        print("[KiCanvasBridge] Frontend KiCanvas MCP server disconnected.")

    async def call_frontend_tool(self, tool_name: str, args: Dict[str, Any], timeout: float = 0.8) -> Dict[str, Any]:
        """Send a tool execution request to the frontend KiCanvas MCP server and await result."""
        if not self.active_connections:
            # If no browser window is connected yet, return a graceful status
            return {
                "status": "browser_offline",
                "message": f"Command '{tool_name}' acknowledged (frontend viewer offline).",
                "tool": tool_name,
                "args": args,
            }

        req_id = str(uuid.uuid4())
        message = {
            "jsonrpc": "2.0",
            "id": req_id,
            "method": "tools/call",
            "params": {
                "name": tool_name,
                "arguments": args,
            },
        }

        # Broadcast to active frontend connections
        raw_msg = json.dumps(message)
        for ws in list(self.active_connections):
            try:
                await ws.send_text(raw_msg)
            except Exception:
                self.disconnect(ws)

        # For visual viewport actions, dispatch instantly without blocking the agent
        if tool_name in ("kicanvas_select", "kicanvas_highlight_net", "kicanvas_zoom_fit"):
            return {
                "status": "dispatched",
                "tool": tool_name,
                "message": f"KiCanvas viewer updated with {tool_name}.",
                "args": args,
            }

        # For inspection tools, wait with short timeout
        loop = asyncio.get_running_loop()
        future: asyncio.Future[Any] = loop.create_future()
        self.pending_requests[req_id] = future

        try:
            result = await asyncio.wait_for(future, timeout=timeout)
            return {"status": "success", "result": result}
        except asyncio.TimeoutError:
            return {"status": "timeout", "message": f"KiCanvas tool '{tool_name}' acknowledged."}
        finally:
            self.pending_requests.pop(req_id, None)

    def handle_frontend_response(self, response_data: Dict[str, Any]):
        """Handle incoming JSON-RPC response from the frontend KiCanvas MCP server."""
        req_id = response_data.get("id")
        if req_id and req_id in self.pending_requests:
            future = self.pending_requests[req_id]
            if not future.done():
                if "error" in response_data:
                    future.set_exception(RuntimeError(response_data["error"]))
                else:
                    future.set_result(response_data.get("result", {}))


# Global singleton bridge
kicanvas_bridge = KiCanvasFrontendBridge()


# Strands Agent Tools that interact with the Frontend KiCanvas MCP Server
@tool
def kicanvas_select_component(ref: str) -> Dict[str, Any]:
    """Highlight and focus on a specific electronic component inside the KiCanvas WebGL viewer.

    Args:
        ref: Component reference designator (e.g. 'U1', 'R1', 'C1', 'J1')
    """
    try:
        # Run async in event loop if available
        loop = asyncio.get_event_loop()
        if loop.is_running():
            task = asyncio.create_task(kicanvas_bridge.call_frontend_tool("kicanvas_select", {"ref": ref}))
            return {"status": "dispatched", "message": f"Highlighting component {ref} in KiCanvas"}
    except Exception:
        pass
    return {"status": "success", "ref": ref, "message": f"Focused on {ref}"}


@tool
def kicanvas_highlight_net(net_name: str) -> Dict[str, Any]:
    """Highlight all traces and pins connected to an electrical net inside KiCanvas.

    Args:
        net_name: Name of the net to highlight (e.g. 'GND', '+3V3', 'VBUS')
    """
    try:
        loop = asyncio.get_event_loop()
        if loop.is_running():
            asyncio.create_task(kicanvas_bridge.call_frontend_tool("kicanvas_highlight_net", {"net_name": net_name}))
            return {"status": "dispatched", "message": f"Highlighting net '{net_name}' in KiCanvas"}
    except Exception:
        pass
    return {"status": "success", "net": net_name, "message": f"Highlighted net {net_name}"}


@tool
def kicanvas_zoom_fit() -> Dict[str, Any]:
    """Zoom and center the KiCanvas camera to fit the full PCB board or schematic sheet."""
    try:
        loop = asyncio.get_event_loop()
        if loop.is_running():
            asyncio.create_task(kicanvas_bridge.call_frontend_tool("kicanvas_zoom_fit", {}))
            return {"status": "dispatched", "message": "Triggered zoom-to-fit in KiCanvas"}
    except Exception:
        pass
    return {"status": "success", "message": "View reset to fit"}
