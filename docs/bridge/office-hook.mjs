#!/usr/bin/env node

/**
 * EasyUp AI Office — Lightweight Hook Shim
 * Zero runtime dependencies (Pure Node.js standard library).
 * 
 * Invoked by coding agents (Claude Code, Antigravity CLI) via hook configuration.
 * Reads JSON payload from stdin, maps to safe event schema, and POSTs to office ingest.
 * 
 * INVARIANT: Must ALWAYS exit 0 within ~300ms.
 * Never blocks, crashes, or slows down the developer's coding agent under ANY condition.
 */

import http from 'node:http'
import https from 'node:https'
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

// Always guarantee exit 0
if (process.env.NODE_ENV !== 'test') {
  process.on('uncaughtException', () => process.exit(0))
  process.on('unhandledRejection', () => process.exit(0))

  // Hard watchdog timer: force exit 0 after 280ms
  const watchdog = setTimeout(() => {
    process.exit(0)
  }, 280)
  if (watchdog.unref) watchdog.unref()
}

// Load local bridge config if present
function loadBridgeConfig() {
  const defaults = {
    url: process.env.OFFICE_INGEST_URL || 'http://localhost:3000/api/office/ingest',
    token: process.env.OFFICE_INGEST_TOKEN || 'easyup_bridge_dev_secret_2026',
    cli: process.env.OFFICE_CLI_OVERRIDE || 'claude-code',
  }

  try {
    const __dirname = path.dirname(fileURLToPath(import.meta.url))
    const envPath = path.join(__dirname, '.env.local')
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf8')
      for (const line of content.split('\n')) {
        const trimmed = line.trim()
        if (!trimmed || trimmed.startsWith('#')) continue
        const [k, ...v] = trimmed.split('=')
        const val = v.join('=').trim().replace(/^["']|["']$/g, '')
        if (k.trim() === 'OFFICE_INGEST_URL') defaults.url = val
        if (k.trim() === 'OFFICE_INGEST_TOKEN') defaults.token = val
        if (k.trim() === 'OFFICE_CLI') defaults.cli = val
      }
    }
  } catch {}

  return defaults
}

// Compute safe hash of current working directory (never leak actual filepath)
function hashCwd(cwd) {
  if (!cwd) return 'none'
  return crypto.createHash('sha256').update(cwd).digest('hex').slice(0, 16)
}

// Map hook payload from CLI into safe event payload
export function mapPayloadToEvent(raw, detectedCli) {
  const cli = raw.cli || detectedCli || 'claude-code'
  const sessionId = String(raw.session_id || raw.conversation_id || raw.sessionId || 'session-default')
  const cwdHash = hashCwd(raw.cwd || process.cwd())

  // Event type resolution
  let eventType = 'session_start'
  let tool = undefined
  let tokens = undefined

  const hookEvent = String(raw.hook_event_name || raw.event || raw.type || '').toLowerCase()

  if (hookEvent.includes('pre_tool') || hookEvent.includes('tool_start') || hookEvent.includes('tool_call')) {
    eventType = 'tool_start'
    tool = String(raw.tool_name || raw.tool || 'command').slice(0, 48)
  } else if (hookEvent.includes('post_tool') || hookEvent.includes('tool_end') || hookEvent.includes('tool_result')) {
    eventType = 'tool_end'
    tool = String(raw.tool_name || raw.tool || 'command').slice(0, 48)
  } else if (hookEvent.includes('wait') || hookEvent.includes('approval') || hookEvent.includes('permission')) {
    eventType = 'waiting_approval'
  } else if (hookEvent.includes('token') || raw.tokens !== undefined || raw.tokens_used !== undefined) {
    eventType = 'token_usage'
    tokens = Number(raw.tokens || raw.tokens_used || 0)
  } else if (hookEvent.includes('end') || hookEvent.includes('exit') || hookEvent.includes('stop')) {
    eventType = 'session_end'
  } else if (raw.tool_name) {
    eventType = 'tool_start'
    tool = String(raw.tool_name).slice(0, 48)
  }

  const payload = {
    event: eventType,
    cli,
    session_id: sessionId,
    cwd_hash: cwdHash,
  }

  if (tool) payload.tool = tool
  if (tokens !== undefined && !Number.isNaN(tokens)) payload.tokens = tokens

  return payload
}

// Main execution reading from stdin
async function main() {
  let stdinData = ''
  process.stdin.setEncoding('utf8')

  process.stdin.on('data', (chunk) => {
    stdinData += chunk
  })

  process.stdin.on('end', async () => {
    try {
      let rawJson = {}
      if (stdinData.trim()) {
        try {
          rawJson = JSON.parse(stdinData)
        } catch {
          rawJson = { text: stdinData.trim() }
        }
      }

      const config = loadBridgeConfig()
      const eventPayload = mapPayloadToEvent(rawJson, config.cli)

      // POST to Ingest endpoint with 220ms hard timeout
      const postData = JSON.stringify(eventPayload)
      const parsedUrl = new URL(config.url)
      const isHttps = parsedUrl.protocol === 'https:'
      const client = isHttps ? https : http

      const options = {
        hostname: parsedUrl.hostname,
        port: parsedUrl.port || (isHttps ? 443 : 80),
        path: parsedUrl.pathname + parsedUrl.search,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData),
          'Authorization': `Bearer ${config.token}`,
        },
        timeout: 220,
      }

      const req = client.request(options, () => {
        process.exit(0)
      })

      req.on('error', () => process.exit(0))
      req.on('timeout', () => {
        req.destroy()
        process.exit(0)
      })

      req.write(postData)
      req.end()
    } catch {
      process.exit(0)
    }
  })
}

// In unit tests, export helper functions without running stdin
if (process.env.NODE_ENV !== 'test') {
  main().catch(() => process.exit(0))
}
