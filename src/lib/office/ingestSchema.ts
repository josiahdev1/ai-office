import crypto from 'node:crypto'
import { z } from 'zod'

// =============================================================================
// Constant-Time Token Comparator
// =============================================================================
export function constantTimeCompare(a: string, b: string): boolean {
  if (typeof a !== 'string' || typeof b !== 'string') return false
  const bufA = Buffer.from(a)
  const bufB = Buffer.from(b)
  if (bufA.length !== bufB.length) return false
  return crypto.timingSafeEqual(bufA, bufB)
}

// =============================================================================
// Event Validation Schemas
// =============================================================================
const BaseEvent = z.object({
  cli: z.enum([
    'claude-code',
    'antigravity',
    'codex',
    'opencode',
    'cursor',
    'other',
  ]),
  session_id: z.string().min(1).max(128),
  cwd_hash: z.string().max(64).optional(),
})

const SessionStartEvent = BaseEvent.extend({
  event: z.literal('session_start'),
})

const ToolStartEvent = BaseEvent.extend({
  event: z.literal('tool_start'),
  tool: z.string().min(1).max(64),
})

const ToolEndEvent = BaseEvent.extend({
  event: z.literal('tool_end'),
  tool: z.string().min(1).max(64),
  duration_ms: z.number().nonnegative().optional(),
})

const WaitingApprovalEvent = BaseEvent.extend({
  event: z.literal('waiting_approval'),
  prompt: z.string().max(256).optional(),
})

const TokenUsageEvent = BaseEvent.extend({
  event: z.literal('token_usage'),
  tokens: z.number().int().nonnegative(),
  total_tokens: z.number().int().nonnegative().optional(),
})

const SessionEndEvent = BaseEvent.extend({
  event: z.literal('session_end'),
})

export const IngestEventSchema = z.discriminatedUnion('event', [
  SessionStartEvent,
  ToolStartEvent,
  ToolEndEvent,
  WaitingApprovalEvent,
  TokenUsageEvent,
  SessionEndEvent,
])

export type IngestEvent = z.infer<typeof IngestEventSchema>
