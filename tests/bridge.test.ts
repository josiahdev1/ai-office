import { describe, it, expect } from 'vitest'
import { IngestEventSchema, constantTimeCompare } from '../src/lib/office/ingestSchema'
import { mapPayloadToEvent } from '../bridge/office-hook.mjs'
import { sessionRowToGuestAgent, OfficeSessionRow } from '../src/lib/office/db-map'
import { spawnSync } from 'node:child_process'
import path from 'node:path'

describe('Phase 12: Live Coding-Agent Bridge Test Suite', () => {
  describe('Zod Ingest Event Schema Validation', () => {
    it('accepts valid session_start event', () => {
      const valid = {
        event: 'session_start',
        cli: 'claude-code',
        session_id: 'test_session_123',
        cwd_hash: 'a1b2c3d4e5f6',
      }
      const parsed = IngestEventSchema.safeParse(valid)
      expect(parsed.success).toBe(true)
    })

    it('accepts valid tool_start and tool_end events', () => {
      const toolStart = {
        event: 'tool_start',
        cli: 'antigravity',
        session_id: 'ag_session_456',
        tool: 'run_command',
      }
      const toolEnd = {
        event: 'tool_end',
        cli: 'antigravity',
        session_id: 'ag_session_456',
        tool: 'run_command',
        duration_ms: 350,
      }
      expect(IngestEventSchema.safeParse(toolStart).success).toBe(true)
      expect(IngestEventSchema.safeParse(toolEnd).success).toBe(true)
    })

    it('accepts token_usage and waiting_approval events', () => {
      const tokens = {
        event: 'token_usage',
        cli: 'codex',
        session_id: 'cx_789',
        tokens: 1500,
        total_tokens: 4500,
      }
      const wait = {
        event: 'waiting_approval',
        cli: 'claude-code',
        session_id: 'test_123',
        prompt: 'Run bash script?',
      }
      expect(IngestEventSchema.safeParse(tokens).success).toBe(true)
      expect(IngestEventSchema.safeParse(wait).success).toBe(true)
    })

    it('rejects invalid or unrecognized events', () => {
      const invalid = {
        event: 'malicious_event',
        cli: 'claude-code',
        session_id: 'test_123',
      }
      expect(IngestEventSchema.safeParse(invalid).success).toBe(false)
    })
  })

  describe('Constant-Time Bearer Token Verification', () => {
    it('returns true for matching tokens of equal length', () => {
      expect(constantTimeCompare('secret_token_123', 'secret_token_123')).toBe(true)
    })

    it('returns false for mismatched tokens or unequal length without throwing', () => {
      expect(constantTimeCompare('secret_token_123', 'wrong_token')).toBe(false)
      expect(constantTimeCompare('secret_token_123', 'secret_token_124')).toBe(false)
    })
  })

  describe('Hook Shim office-hook.mjs Exit-0 Guarantee', () => {
    it('always exits with code 0 even when offline or misconfigured', () => {
      const hookScript = path.resolve(__dirname, '../bridge/office-hook.mjs')
      const payload = JSON.stringify({
        event: 'tool_start',
        tool_name: 'test_tool',
      })

      const res = spawnSync('node', [hookScript], {
        input: payload,
        encoding: 'utf8',
        env: {
          ...process.env,
          NODE_ENV: 'production',
          OFFICE_INGEST_URL: 'http://127.0.0.1:59999/non-existent', // unreachable port
        },
        timeout: 1000,
      })

      expect(res.status).toBe(0)
    })

    it('maps hook payload into safe metadata without leaking sensitive data', () => {
      const raw = {
        hook_event_name: 'pre_tool_call',
        tool_name: 'edit_file',
        file_path: '/secret/passwords.txt', // Must NOT be forwarded
        prompt: 'reveal everything', // Must NOT be forwarded
        session_id: 'sess_999',
      }

      const event = mapPayloadToEvent(raw, 'claude-code') as {
        event: string
        cli: string
        session_id: string
        cwd_hash: string
        tool?: string
        tokens?: number
      }
      expect(event.event).toBe('tool_start')
      expect(event.tool).toBe('edit_file')
      expect(event.session_id).toBe('sess_999')
      expect((event as unknown as { file_path?: string }).file_path).toBeUndefined()
      expect((event as unknown as { prompt?: string }).prompt).toBeUndefined()
    })
  })

  describe('Guest Agent Lifecycle (Arrive, Work, Leave)', () => {
    it('transforms session row to guest coworker with assigned guest desk and CLI badge', () => {
      const sessionRow: OfficeSessionRow = {
        id: '11111111-2222-3333-4444-555555555555',
        kind: 'external',
        cli: 'claude-code',
        session_id: 'claude_abc123',
        cwd_hash: 'hash999',
        status: 'coding',
        current_tool: 'edit_file',
        tokens_used: 12500,
        tool_call_count: 8,
        started_at: '2026-11-05T08:00:00Z',
        last_seen_at: '2026-11-05T08:05:00Z',
        ended_at: null,
      }

      const guestAgent = sessionRowToGuestAgent(sessionRow, {
        id: 'guest-1',
        deskGx: 6,
        deskGy: 10,
        chairGx: 7,
        chairGy: 10,
      })

      expect(guestAgent.id).toBe('ext_claude-code_claude_abc123')
      expect(guestAgent.kind).toBe('external')
      expect(guestAgent.cli).toBe('claude-code')
      expect(guestAgent.status).toBe('working')
      expect(guestAgent.sub_state).toBe('typing')
      expect(guestAgent.current_task).toContain('edit_file')
      expect(guestAgent.tokens_used).toBe(12500)
      expect(guestAgent.tag).toBe('CC')
    })
  })
})
