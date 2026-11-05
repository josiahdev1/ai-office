export type AgentStatus = 'active' | 'working' | 'idle' | 'awaiting_approval' | 'done';

export type AgentSubState =
  | 'typing'
  | 'reading_logs'
  | 'seated'
  | 'documenting'
  | 'analyzing'
  | 'hologram_review'
  | 'coffee_break'
  | 'walking';

export interface Agent {
  id: string;
  name: string;
  avatar?: string;
  role: string;
  room: string;
  tag?: string;
  status: AgentStatus;
  sub_state?: AgentSubState;
  current_task?: string;
  current_file?: string;
  terminal_preview?: string;
  progress_pct?: number;
  last_action?: string;
  updated_at: string;
  color?: string;
  hair?: string;
  skin?: string;
  desk_id?: string;
  desk_coord?: { x: number; y: number };
}

export interface Approval {
  id: string;
  agent_id: string;
  agent_name: string;
  room?: string;
  type: string;
  title: string;
  summary: string;
  created_at: string;
  status?: 'pending' | 'approved' | 'rejected';
}

export interface OfficeData {
  company_name: string;
  playback_speed: string;
  agents: Agent[];
  approvals: Approval[];
  logs: string[];
}
