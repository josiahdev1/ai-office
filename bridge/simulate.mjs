#!/usr/bin/env node

/**
 * EasyUp AI Office — Bridge Simulator
 * Simulates a live guest coding agent session sending real events to /api/office/ingest.
 * 
 * Usage:
 *   node bridge/simulate.mjs [claude-code | antigravity | codex]
 */

import http from 'node:http'
import https from 'node:https'
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

function loadConfig() {
  const envPath = path.join(__dirname, '.env.local')
  const defaults = {
    url: process.env.OFFICE_INGEST_URL || 'http://localhost:3000/api/office/ingest',
    token: process.env.OFFICE_INGEST_TOKEN || 'easyup_bridge_dev_secret_2026',
  }

  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf8').split('\n')
    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      const [k, ...v] = trimmed.split('=')
      const val = v.join('=').trim().replace(/^["']|["']$/g, '')
      if (k === 'OFFICE_INGEST_URL') defaults.url = val
      if (k === 'OFFICE_INGEST_TOKEN') defaults.token = val
    }
  }

  return defaults
}

async function sendEvent(eventPayload) {
  const config = loadConfig()
  return new Promise((resolve, reject) => {
    try {
      const parsed = new URL(config.url)
      const isHttps = parsed.protocol === 'https:'
      const client = isHttps ? https : http

      const postData = JSON.stringify(eventPayload)
      const req = client.request(
        {
          hostname: parsed.hostname,
          port: parsed.port || (isHttps ? 443 : 80),
          path: parsed.pathname,
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(postData),
            'Authorization': `Bearer ${config.token}`,
          },
          timeout: 2000,
        },
        (res) => {
          let body = ''
          res.on('data', (c) => (body += c))
          res.on('end', () => {
            resolve({ status: res.statusCode, body })
          })
        }
      )

      req.on('error', (err) => reject(err))
      req.on('timeout', () => {
        req.destroy()
        reject(new Error('Request timeout'))
      })

      req.write(postData)
      req.end()
    } catch (e) {
      reject(e)
    }
  })
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function runSimulation() {
  const targetCli = process.argv[2] || 'claude-code'
  const sessionId = `sim_${crypto.randomBytes(4).toString('hex')}`
  const cwdHash = crypto.createHash('sha256').update(process.cwd()).digest('hex').slice(0, 16)

  console.log(`\n======================================================`)
  console.log(`Starting Live Bridge Simulation`)
  console.log(`CLI:        ${targetCli}`)
  console.log(`Session ID: ${sessionId}`)
  console.log(`======================================================\n`)

  // 1. Session Start (Agent enters via elevator, claims guest desk)
  console.log(`[1/6] Sending "session_start"...`)
  await sendEvent({
    event: 'session_start',
    cli: targetCli,
    session_id: sessionId,
    cwd_hash: cwdHash,
  })
  console.log(`✓ Guest agent walked into the office and claimed a guest desk!`)
  await sleep(1500)

  // 2. Tool Start: File Edit (Blue monitor glow)
  console.log(`\n[2/6] Sending "tool_start" (edit_file)...`)
  await sendEvent({
    event: 'tool_start',
    cli: targetCli,
    session_id: sessionId,
    tool: 'edit_file',
  })
  console.log(`✓ Agent typing code — monitor glowing Blue!`)
  await sleep(1500)

  // 3. Token Usage (Paper stack grows on desk)
  console.log(`\n[3/6] Sending "token_usage" (+3400 tokens)...`)
  await sendEvent({
    event: 'token_usage',
    cli: targetCli,
    session_id: sessionId,
    tokens: 3400,
    total_tokens: 3400,
  })
  console.log(`✓ Paper sheets dropped onto desk token stack!`)
  await sleep(1200)

  // 4. Tool End & Tool Start: Terminal Shell (Orange monitor glow)
  console.log(`\n[4/6] Sending "tool_start" (run_command: vitest)...`)
  await sendEvent({
    event: 'tool_start',
    cli: targetCli,
    session_id: sessionId,
    tool: 'run_command',
  })
  console.log(`✓ Terminal command executing — monitor glowing Orange!`)
  await sleep(1500)

  // 5. Waiting Approval (Status glyph "?" above head)
  console.log(`\n[5/6] Sending "waiting_approval" (Deploy Go-Signal)...`)
  await sendEvent({
    event: 'waiting_approval',
    cli: targetCli,
    session_id: sessionId,
    prompt: 'Approve production deployment?',
  })
  console.log(`✓ Status glyph "?" appeared above agent head!`)
  await sleep(1800)

  // 6. Session End (Agent completes, heads to elevator, departs)
  console.log(`\n[6/6] Sending "session_end"...`)
  await sendEvent({
    event: 'session_end',
    cli: targetCli,
    session_id: sessionId,
  })
  console.log(`✓ Session completed — guest agent walked to elevator and exited.`)
  console.log(`\n🎉 Bridge simulation finished successfully!\n`)
}

runSimulation().catch((err) => {
  console.error(`Simulation failed:`, err.message)
})
