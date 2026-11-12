#!/usr/bin/env node

/**
 * EasyUp AI Office — Bridge Setup CLI
 * Usage:
 *   node bridge/setup.mjs connect claude-code [--yes]
 *   node bridge/setup.mjs connect antigravity [--yes]
 *   node bridge/setup.mjs disconnect [claude-code | antigravity]
 *   node bridge/setup.mjs status
 */

import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import http from 'node:http'
import https from 'node:https'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const hookScriptPath = path.resolve(__dirname, 'office-hook.mjs')

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

async function pingIngestEndpoint(url, token) {
  return new Promise((resolve) => {
    try {
      const parsed = new URL(url)
      const isHttps = parsed.protocol === 'https:'
      const client = isHttps ? https : http

      const req = client.request(
        {
          hostname: parsed.hostname,
          port: parsed.port || (isHttps ? 443 : 80),
          path: parsed.pathname,
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          timeout: 1000,
        },
        (res) => {
          resolve({ ok: res.statusCode !== 401 && res.statusCode !== 403 && res.statusCode !== 404, status: res.statusCode })
        }
      )

      req.on('error', (err) => resolve({ ok: false, error: err.message }))
      req.on('timeout', () => {
        req.destroy()
        resolve({ ok: false, error: 'Timeout' })
      })

      // Send a ping event
      req.write(JSON.stringify({ event: 'session_start', cli: 'other', session_id: 'ping_test' }))
      req.end()
    } catch (e) {
      resolve({ ok: false, error: e.message })
    }
  })
}

// Target configuration paths
function getTargetConfigs() {
  const home = os.homedir()
  return {
    'claude-code': {
      name: 'Claude Code',
      path: path.join(home, '.claude', 'settings.json'),
      verified: true,
      kind: 'hooks',
    },
    antigravity: {
      name: 'Antigravity CLI',
      path: path.join(home, '.gemini', 'config', 'plugins', 'easyup-office.json'),
      verified: true,
      kind: 'plugin',
    },
  }
}

async function handleConnect(targetCli, autoConfirm) {
  if (autoConfirm) {
    console.log(`Auto-confirmation enabled (--yes).`)
  }
  const targets = getTargetConfigs()
  const target = targets[targetCli]
  if (!target) {
    console.error(`❌ Unknown target CLI: "${targetCli}". Supported: claude-code, antigravity`)
    process.exit(1)
  }

  console.log(`\n======================================================`)
  console.log(`EasyUp AI Office Bridge — Connecting: ${target.name}`)
  console.log(`======================================================`)
  console.log(`Target config file: ${target.path}`)
  console.log(`Hook shim binary:   ${hookScriptPath}`)

  const dir = path.dirname(target.path)
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }

  // Backup existing file if present
  if (fs.existsSync(target.path)) {
    const backupPath = `${target.path}.bak`
    fs.copyFileSync(target.path, backupPath)
    console.log(`✓ Backed up existing configuration to: ${backupPath}`)
  }

  // Generate hook configuration
  if (targetCli === 'claude-code') {
    let settings = {}
    if (fs.existsSync(target.path)) {
      try {
        settings = JSON.parse(fs.readFileSync(target.path, 'utf8'))
      } catch {}
    }

    settings.hooks = settings.hooks || {}
    settings.hooks.on_event = `node "${hookScriptPath}"`
    settings.hooks.pre_tool_call = `node "${hookScriptPath}"`
    settings.hooks.post_tool_call = `node "${hookScriptPath}"`

    fs.writeFileSync(target.path, JSON.stringify(settings, null, 2))
  } else if (targetCli === 'antigravity') {
    const pluginConfig = {
      name: 'easyup-office-bridge',
      version: '1.0.0',
      description: 'Sends live session events to EasyUp AI Office HQ',
      hook: `node "${hookScriptPath}"`,
      events: ['session_start', 'tool_start', 'tool_end', 'waiting_approval', 'session_end'],
    }
    fs.writeFileSync(target.path, JSON.stringify(pluginConfig, null, 2))
  }

  console.log(`✓ Hook configuration successfully installed!`)
  console.log(`Your ${target.name} sessions will now appear as guest coworkers in the office.\n`)
}

async function handleDisconnect(targetCli) {
  const targets = getTargetConfigs()
  const target = targets[targetCli]
  if (!target) {
    console.error(`❌ Unknown target CLI: "${targetCli}". Supported: claude-code, antigravity`)
    process.exit(1)
  }

  console.log(`\nDisconnecting ${target.name}...`)
  const backupPath = `${target.path}.bak`
  if (fs.existsSync(backupPath)) {
    fs.copyFileSync(backupPath, target.path)
    console.log(`✓ Restored configuration from backup: ${backupPath}`)
  } else if (fs.existsSync(target.path)) {
    fs.unlinkSync(target.path)
    console.log(`✓ Removed hook configuration file: ${target.path}`)
  }
  console.log(`✓ Disconnected ${target.name}.\n`)
}

async function handleStatus() {
  const config = loadConfig()
  const targets = getTargetConfigs()

  console.log(`\n======================================================`)
  console.log(`EasyUp AI Office Bridge Status`)
  console.log(`======================================================`)
  console.log(`Ingest Endpoint: ${config.url}`)

  console.log(`\nTesting connection to Ingest API...`)
  const ping = await pingIngestEndpoint(config.url, config.token)
  if (ping.ok) {
    console.log(`✓ Ingest endpoint is ONLINE and responding (Status: ${ping.status})`)
  } else {
    console.log(`⚠️  Ingest endpoint ping failed: ${ping.error || ping.status}`)
    console.log(`   (Ensure Next.js dev server or Vercel deployment is running)`)
  }

  console.log(`\nConfigured Agent Hook Status:`)
  for (const [key, target] of Object.entries(targets)) {
    const isInstalled = fs.existsSync(target.path)
    const statusIcon = isInstalled ? '🟢 CONNECTED' : '⚪ DISCONNECTED'
    console.log(`- ${target.name} (${key}): ${statusIcon}`)
    console.log(`  Path: ${target.path}`)
  }
  console.log(``)
}

// Parse arguments
const args = process.argv.slice(2)
const command = args[0] || 'status'

if (command === 'connect') {
  const target = args[1]
  const autoConfirm = args.includes('--yes') || args.includes('-y')
  if (!target) {
    console.error('Usage: node bridge/setup.mjs connect <claude-code | antigravity> [--yes]')
    process.exit(1)
  }
  handleConnect(target, autoConfirm)
} else if (command === 'disconnect') {
  const target = args[1]
  if (!target) {
    console.error('Usage: node bridge/setup.mjs disconnect <claude-code | antigravity>')
    process.exit(1)
  }
  handleDisconnect(target)
} else if (command === 'status') {
  handleStatus()
} else {
  console.log(`Available commands: connect, disconnect, status`)
}
