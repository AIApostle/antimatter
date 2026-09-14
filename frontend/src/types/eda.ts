export interface Pin {
  number: string;
  name: string;
  net?: string | null;
  pin_type: string;
  x_offset?: number;
  y_offset?: number;
}

export interface ComponentItem {
  ref: string;
  value: string;
  footprint: string;
  symbol: string;
  description: string;
  x: number;
  y: number;
  rotation: number;
  layer: string;
  pins: Record<string, Pin>;
  uuid: string;
}

export interface NetItem {
  name: string;
  nodes: [string, string][]; // [ref, pin_number]
}

export interface TrackItem {
  start: [number, number];
  end: [number, number];
  width: number;
  layer: string;
  net_name: string;
  uuid: string;
}

export interface BoardSetup {
  width: number;
  height: number;
  corner_radius: number;
  layer_count: number;
  thickness: number;
  mask_color: string;
  finish: string;
}

export interface DRCError {
  rule: string;
  severity: 'error' | 'warning' | 'info';
  message: string;
  items: string[];
}

export interface ECOProposal {
  id: string;
  project_id?: string;
  title: string;
  description: string;
  status: 'pending' | 'approved' | 'rejected';
  additions: Array<{ ref?: string; value?: string; footprint?: string; [key: string]: any }>;
  modifications: Array<{ net?: string; change?: string; [key: string]: any }>;
  removals: Array<{ ref?: string; reason?: string; [key: string]: any }>;
  timestamp: string;
}

export interface CircuitState {
  project_id: string;
  project_name: string;
  revision: number;
  board: BoardSetup;
  components: Record<string, ComponentItem>;
  nets: Record<string, NetItem>;
  tracks: TrackItem[];
  vias: any[];
  drc_errors: DRCError[];
  pending_eco: ECOProposal | null;
  schematic_sexpr?: string;
  pcb_sexpr?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  thoughts?: string[];
  toolCalls?: Array<{ tool: string; input: any }>;
  imageUrl?: string;
}

export interface AIModel {
  id: string;
  name: string;
  provider: string;
  multimodal: boolean;
}

export interface SupabaseStatus {
  connected: boolean;
  supabase_url?: string | null;
  mode: string;
  description: string;
}

export interface HumanDecisionRequest {
  type: 'human_decision_required';
  decision_id: string;
  question: string;
  options: string[];
  context?: string;
  recommended_option?: string;
}

export type ApprovalMode = 'request_approval' | 'review' | 'auto_approve';

