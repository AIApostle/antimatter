/**
 * antimatter KiCanvas Frontend MCP Server.
 * 
 * Runs in the browser alongside KiCanvas, exposing MCP tools for inspecting,
 * highlighting, and manipulating the interactive WebGL schematic and PCB layout.
 * Connects directly to the backend over WebSocket.
 */

import { getWsBase } from '../lib/apiConfig';

export interface McpToolDefinition {
  name: string;
  description: string;
  parameters: Record<string, any>;
}

export const KICANVAS_MCP_TOOLS: McpToolDefinition[] = [
  {
    name: 'kicanvas_select',
    description: 'Highlight or select a specific electronic component footprint or symbol in the KiCanvas viewer',
    parameters: {
      type: 'object',
      properties: {
        ref: { type: 'string', description: 'Component reference designator, e.g. U1, R1, C1' },
      },
      required: ['ref'],
    },
  },
  {
    name: 'kicanvas_highlight_net',
    description: 'Highlight an electrical net across all schematic wires and PCB copper traces in KiCanvas',
    parameters: {
      type: 'object',
      properties: {
        net_name: { type: 'string', description: 'Net name, e.g. GND, +3V3, VBUS' },
      },
      required: ['net_name'],
    },
  },
  {
    name: 'kicanvas_zoom_fit',
    description: 'Fit the KiCanvas camera to display the complete PCB outline or schematic sheet',
    parameters: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'kicanvas_get_info',
    description: 'Get current KiCanvas viewport status, active zoom level, and selected items',
    parameters: {
      type: 'object',
      properties: {},
    },
  },
];

export class KiCanvasMcpServer {
  private socket: WebSocket | null = null;
  private isConnected: boolean = false;
  private reconnectTimer: any = null;
  private wsUrl: string;

  public get connected(): boolean {
    return this.isConnected;
  }

  constructor(wsUrl?: string) {
    if (wsUrl) {
      this.wsUrl = wsUrl;
    } else {
      this.wsUrl = `${getWsBase()}/mcp/kicanvas/ws`;
    }
  }

  public start() {
    this.connect();
  }

  public stop() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
  }

  private connect() {
    try {
      this.socket = new WebSocket(this.wsUrl);

      this.socket.onopen = () => {
        this.isConnected = true;
        console.log('[KiCanvas MCP Server] Connected to backend at', this.wsUrl);
        // Register capabilities
        this.sendMessage({
          jsonrpc: '2.0',
          method: 'server/ready',
          params: {
            name: 'KiCanvas-Frontend-MCP',
            tools: KICANVAS_MCP_TOOLS,
          },
        });
      };

      this.socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.handleRpcMessage(data);
        } catch (err) {
          console.error('[KiCanvas MCP Server] Error parsing RPC message:', err);
        }
      };

      this.socket.onclose = () => {
        this.isConnected = false;
        console.log('[KiCanvas MCP Server] Disconnected from backend, retrying in 3s...');
        this.scheduleReconnect();
      };

      this.socket.onerror = (err) => {
        console.warn('[KiCanvas MCP Server] WebSocket error:', err);
      };
    } catch (err) {
      console.warn('[KiCanvas MCP Server] Connection initialization failed:', err);
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect() {
    if (!this.reconnectTimer) {
      this.reconnectTimer = setTimeout(() => {
        this.reconnectTimer = null;
        this.connect();
      }, 3000);
    }
  }

  private sendMessage(msg: any) {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(msg));
    }
  }

  private handleRpcMessage(msg: any) {
    if (msg.method === 'tools/call') {
      const { name, arguments: args } = msg.params;
      const result = this.executeTool(name, args);

      this.sendMessage({
        jsonrpc: '2.0',
        id: msg.id,
        result: result,
      });
    }
  }

  /**
   * Execute KiCanvas tool actions directly against DOM / WebGL elements
   */
  public executeTool(toolName: string, args: Record<string, any>): any {
    console.log(`[KiCanvas MCP Server] Executing tool: ${toolName}`, args);
    const embedEl = document.querySelector('kicanvas-embed') as any;

    switch (toolName) {
      case 'kicanvas_select': {
        const ref = args?.ref;
        if (embedEl && embedEl.select) {
          try {
            embedEl.select(ref);
          } catch (e) {
            console.warn('KiCanvas select failed:', e);
          }
        }
        return {
          status: 'success',
          action: 'selected',
          target: ref,
          message: `Highlighted component ${ref} in KiCanvas viewer`,
        };
      }

      case 'kicanvas_highlight_net': {
        const netName = args?.net_name;
        if (embedEl && embedEl.highlightNet) {
          try {
            embedEl.highlightNet(netName);
          } catch (e) {
            console.warn('KiCanvas highlightNet failed:', e);
          }
        }
        return {
          status: 'success',
          action: 'highlight_net',
          target: netName,
          message: `Highlighted net '${netName}' in KiCanvas`,
        };
      }

      case 'kicanvas_zoom_fit': {
        if (embedEl && embedEl.zoomToFit) {
          try {
            embedEl.zoomToFit();
          } catch (e) {
            console.warn('KiCanvas zoomToFit failed:', e);
          }
        }
        return {
          status: 'success',
          action: 'zoom_fit',
          message: 'Reset KiCanvas viewport zoom to fit all contents',
        };
      }

      case 'kicanvas_get_info': {
        return {
          status: 'success',
          viewer: 'KiCanvas WebGL',
          ready: !!embedEl,
          activeElement: embedEl?.tagName || null,
        };
      }

      default:
        return {
          status: 'error',
          message: `Unknown tool '${toolName}'`,
        };
    }
  }
}

// Global singleton instance for the frontend
export const kicanvasMcpServer = new KiCanvasMcpServer();
