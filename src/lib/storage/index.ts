import fs from 'fs';
import path from 'path';
import { z } from 'zod';
import { Agent, Approval, OfficeData } from '@/components/office/types';

// Zod Validation Schemas
export const ApprovalRequestSchema = z.object({
  approvalId: z.string().min(1, 'approvalId is required'),
  action: z.enum(['approve', 'reject']),
});

export const TriggerRequestSchema = z.object({
  agentId: z.string().min(1, 'agentId is required'),
  taskDescription: z.string().optional(),
  actionName: z.string().optional(),
});

export const AgentUpdateSchema = z.object({
  status: z.enum(['active', 'working', 'idle', 'awaiting_approval', 'done']).optional(),
  sub_state: z.string().optional(),
  current_task: z.string().optional(),
  current_file: z.string().optional(),
  terminal_preview: z.string().optional(),
  progress_pct: z.number().min(0).max(100).optional(),
  last_action: z.string().optional(),
});

// Room desk coordinates grid (supporting 38+ desks dynamically)
export interface RoomDeskSlot {
  id: string;
  room: string;
  x: number;
  y: number;
  facing: 'left' | 'right';
  monitors: number;
}

export const ROOM_DESK_SLOTS: Record<string, RoomDeskSlot[]> = {
  'Engineering Core': [
    { id: 'eng-1', room: 'Engineering Core', x: 200, y: 340, facing: 'right', monitors: 3 }, // Josiah (Triple monitor)
    { id: 'eng-2', room: 'Engineering Core', x: 280, y: 340, facing: 'right', monitors: 2 }, // Arwin
    { id: 'eng-3', room: 'Engineering Core', x: 360, y: 340, facing: 'right', monitors: 2 }, // Neil Mar
    { id: 'eng-4', room: 'Engineering Core', x: 440, y: 340, facing: 'left', monitors: 2 },  // Nelmar
    { id: 'eng-5', room: 'Engineering Core', x: 280, y: 410, facing: 'right', monitors: 2 }, // Bonnie
    { id: 'eng-6', room: 'Engineering Core', x: 360, y: 410, facing: 'right', monitors: 2 }, // John Lloyd
    { id: 'eng-7', room: 'Engineering Core', x: 440, y: 410, facing: 'left', monitors: 2 },  // Exp slot 1
    { id: 'eng-8', room: 'Engineering Core', x: 200, y: 410, facing: 'right', monitors: 2 }, // Exp slot 2
  ],
  'QA & SecOps NOC': [
    { id: 'qa-1', room: 'QA & SecOps NOC', x: 620, y: 410, facing: 'right', monitors: 2 },   // Khent
    { id: 'qa-2', room: 'QA & SecOps NOC', x: 700, y: 410, facing: 'right', monitors: 2 },   // John Arvy
    { id: 'qa-3', room: 'QA & SecOps NOC', x: 780, y: 410, facing: 'left', monitors: 2 },    // Gian
    { id: 'qa-4', room: 'QA & SecOps NOC', x: 620, y: 470, facing: 'right', monitors: 2 },   // Exp slot 1
    { id: 'qa-5', room: 'QA & SecOps NOC', x: 700, y: 470, facing: 'right', monitors: 2 },   // Exp slot 2
    { id: 'qa-6', room: 'QA & SecOps NOC', x: 780, y: 470, facing: 'left', monitors: 2 },    // Exp slot 3
  ],
  'Operations Hub': [
    { id: 'ops-1', room: 'Operations Hub', x: 230, y: 130, facing: 'right', monitors: 2 },  // Mary Grace
    { id: 'ops-2', room: 'Operations Hub', x: 310, y: 130, facing: 'right', monitors: 2 },  // Anthony
    { id: 'ops-3', room: 'Operations Hub', x: 250, y: 190, facing: 'right', monitors: 2 },  // Blaze
    { id: 'ops-4', room: 'Operations Hub', x: 330, y: 190, facing: 'left', monitors: 2 },   // Ferwin
    { id: 'ops-5', room: 'Operations Hub', x: 410, y: 160, facing: 'left', monitors: 2 },   // Exp slot 1
    { id: 'ops-6', room: 'Operations Hub', x: 410, y: 220, facing: 'left', monitors: 2 },   // Exp slot 2
  ],
  'Growth Lab': [
    { id: 'growth-1', room: 'Growth Lab', x: 95, y: 200, facing: 'right', monitors: 2 },   // Jo Vincent
    { id: 'growth-2', room: 'Growth Lab', x: 165, y: 230, facing: 'right', monitors: 2 },  // Jesmond
    { id: 'growth-3', room: 'Growth Lab', x: 95, y: 270, facing: 'right', monitors: 2 },   // Kin
    { id: 'growth-4', room: 'Growth Lab', x: 165, y: 290, facing: 'right', monitors: 2 },  // Exp slot 1
    { id: 'growth-5', room: 'Growth Lab', x: 95, y: 340, facing: 'right', monitors: 2 },   // Exp slot 2
    { id: 'growth-6', room: 'Growth Lab', x: 165, y: 360, facing: 'right', monitors: 2 },  // Exp slot 3
  ],
  'Intelligence Lab': [
    { id: 'intel-1', room: 'Intelligence Lab', x: 720, y: 120, facing: 'right', monitors: 2 }, // Roy Jhan
    { id: 'intel-2', room: 'Intelligence Lab', x: 800, y: 120, facing: 'left', monitors: 2 },  // Gabriel
    { id: 'intel-3', room: 'Intelligence Lab', x: 720, y: 180, facing: 'right', monitors: 2 }, // Keiru
    { id: 'intel-4', room: 'Intelligence Lab', x: 800, y: 180, facing: 'left', monitors: 2 },  // Ryan
    { id: 'intel-5', room: 'Intelligence Lab', x: 880, y: 150, facing: 'left', monitors: 2 },  // Exp slot 1
    { id: 'intel-6', room: 'Intelligence Lab', x: 720, y: 240, facing: 'right', monitors: 2 }, // Exp slot 2
  ],
  'Command Center': [
    { id: 'cmd-1', room: 'Command Center', x: 670, y: 350, facing: 'left', monitors: 2 },  // Gloria
    { id: 'cmd-2', room: 'Command Center', x: 760, y: 350, facing: 'right', monitors: 2 }, // JB
    { id: 'cmd-3', room: 'Command Center', x: 715, y: 290, facing: 'right', monitors: 2 }, // Julian
    { id: 'cmd-4', room: 'Command Center', x: 630, y: 290, facing: 'left', monitors: 2 },  // Exp slot 1
    { id: 'cmd-5', room: 'Command Center', x: 800, y: 290, facing: 'right', monitors: 2 }, // Exp slot 2
    { id: 'cmd-6', room: 'Command Center', x: 715, y: 390, facing: 'left', monitors: 2 },  // Exp slot 3
  ],
};

// Global in-memory cache
let cachedOfficeData: OfficeData | null = null;

function resolveStatusPath(): string {
  return path.join(process.cwd(), 'brain', 'live_status.json');
}

/**
 * Assigns desks dynamically to any agents who do not have an assigned desk_coord,
 * ensuring seamless scaling to 30+ agents without collisions.
 */
export function autoAssignDesks(agents: Agent[]): Agent[] {
  const occupiedSlots = new Set<string>();

  // Mark already claimed slots
  agents.forEach((ag) => {
    if (ag.desk_id) {
      occupiedSlots.add(ag.desk_id);
    }
  });

  return agents.map((agent) => {
    if (agent.desk_coord && agent.desk_id) {
      return agent;
    }

    const roomSlots = ROOM_DESK_SLOTS[agent.room] || ROOM_DESK_SLOTS['Engineering Core'];
    const availableSlot = roomSlots.find((slot) => !occupiedSlots.has(slot.id));

    if (availableSlot) {
      occupiedSlots.add(availableSlot.id);
      return {
        ...agent,
        desk_id: availableSlot.id,
        desk_coord: { x: availableSlot.x, y: availableSlot.y },
      };
    }

    // Dynamic fallback offset within room
    const fallbackX = 400 + (agents.indexOf(agent) % 5) * 40;
    const fallbackY = 300 + Math.floor(agents.indexOf(agent) / 5) * 40;
    return {
      ...agent,
      desk_coord: { x: fallbackX, y: fallbackY },
    };
  });
}

/**
 * Reads the office state from memory cache, falling back to brain/live_status.json
 */
export async function getOfficeState(): Promise<OfficeData> {
  if (cachedOfficeData) {
    return cachedOfficeData;
  }

  const filePath = resolveStatusPath();
  if (fs.existsSync(filePath)) {
    try {
      const raw = fs.readFileSync(filePath, 'utf8');
      const parsed: OfficeData = JSON.parse(raw);
      parsed.agents = autoAssignDesks(parsed.agents || []);
      cachedOfficeData = parsed;
      return cachedOfficeData;
    } catch (err) {
      console.warn('Failed to parse live_status.json, initializing default state:', err);
    }
  }

  // Minimal fallback state
  cachedOfficeData = {
    company_name: 'EasyUp Software Solution',
    playback_speed: '1x',
    agents: [],
    approvals: [],
    logs: ['[BOOT] EasyUp Software Solution HQ telemetry initialized.'],
  };

  return cachedOfficeData;
}

/**
 * Safely persists office state to memory and disk (if filesystem is writable)
 */
export async function saveOfficeState(state: OfficeData): Promise<void> {
  cachedOfficeData = state;

  try {
    const filePath = resolveStatusPath();
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(filePath, JSON.stringify(state, null, 2), 'utf8');
  } catch (err) {
    // Graceful fallback for read-only / serverless deployment environments (e.g. Vercel)
    console.warn('[Storage] Filesystem write skipped or unavailable in serverless environment:', err);
  }
}

/**
 * Updates a specific agent's properties
 */
export async function updateAgent(agentId: string, partial: Partial<Agent>): Promise<OfficeData> {
  const state = await getOfficeState();
  state.agents = state.agents.map((ag) => {
    if (ag.id === agentId) {
      return {
        ...ag,
        ...partial,
        updated_at: new Date().toISOString(),
      };
    }
    return ag;
  });

  await saveOfficeState(state);
  return state;
}

/**
 * Resolves a pending Human-in-the-Loop Go-Signal approval
 */
export async function resolveApproval(
  approvalId: string,
  action: 'approve' | 'reject'
): Promise<{ remaining: Approval[]; logs: string[]; resolvedItem?: Approval }> {
  const state = await getOfficeState();
  const item = state.approvals.find((a) => a.id === approvalId);

  state.approvals = state.approvals.filter((a) => a.id !== approvalId);

  const timestamp = new Date().toLocaleTimeString();
  const logEntry = `[${timestamp}] [GO-SIGNAL] ${action.toUpperCase()} granted for "${item?.title || approvalId}".`;
  state.logs = [logEntry, ...(state.logs || [])].slice(0, 25);

  // If approved and associated with an agent, advance their state
  if (item && action === 'approve') {
    state.agents = state.agents.map((ag) => {
      if (ag.id === item.agent_id) {
        return {
          ...ag,
          status: 'working',
          sub_state: 'typing',
          last_action: `Executing approved Go-Signal: ${item.title}`,
          progress_pct: 10,
          updated_at: new Date().toISOString(),
        };
      }
      return ag;
    });
  }

  await saveOfficeState(state);

  // Write audit trail if possible
  try {
    const auditDir = path.join(process.cwd(), 'brain', 'logs');
    if (!fs.existsSync(auditDir)) fs.mkdirSync(auditDir, { recursive: true });
    fs.appendFileSync(
      path.join(auditDir, 'audit.log'),
      `[${new Date().toISOString()}] ${action.toUpperCase()} | id: ${approvalId} | title: ${item?.title || 'Unknown'}\n`
    );
  } catch (err) {
    console.warn('[Storage] Audit log write skipped:', err);
  }

  return {
    remaining: state.approvals,
    logs: state.logs,
    resolvedItem: item,
  };
}

/**
 * Dispatches a directive / task to an agent
 */
export async function triggerTask(agentId: string, task: string): Promise<OfficeData> {
  const state = await getOfficeState();
  const timestamp = new Date().toLocaleTimeString();

  state.agents = state.agents.map((ag) => {
    if (ag.id === agentId) {
      return {
        ...ag,
        status: 'working',
        sub_state: 'typing',
        current_task: task,
        last_action: `Executing: ${task}`,
        progress_pct: 0,
        updated_at: new Date().toISOString(),
      };
    }
    return ag;
  });

  const logEntry = `[${timestamp}] [TASK TRIGGERED] ${agentId.toUpperCase()} initiated: "${task}".`;
  state.logs = [logEntry, ...(state.logs || [])].slice(0, 25);

  await saveOfficeState(state);
  return state;
}

/**
 * Appends a log entry to the office activity log
 */
export async function addOfficeLog(message: string): Promise<string[]> {
  const state = await getOfficeState();
  const timestamp = new Date().toLocaleTimeString();
  const logEntry = `[${timestamp}] ${message}`;
  state.logs = [logEntry, ...(state.logs || [])].slice(0, 25);
  await saveOfficeState(state);
  return state.logs;
}
