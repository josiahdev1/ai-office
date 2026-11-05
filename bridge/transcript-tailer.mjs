#!/usr/bin/env node

/**
 * EasyUp AI Office — Transcript Tailer Fallback
 * Read-only watcher that enriches live session status by tailing session transcripts.
 */

import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import readline from 'node:readline'

export function findAntigravityTranscripts() {
  const home = os.homedir()
  const brainDir = path.join(home, '.gemini', 'antigravity-cli', 'brain')
  if (!fs.existsSync(brainDir)) return []

  const conversations = fs.readdirSync(brainDir)
  const results = []
  for (const convId of conversations) {
    const logPath = path.join(brainDir, convId, '.system_generated', 'logs', 'transcript.jsonl')
    if (fs.existsSync(logPath)) {
      results.push({ convId, path: logPath })
    }
  }
  return results
}

export async function tailLastJsonlLine(filePath) {
  if (!fs.existsSync(filePath)) return null
  try {
    const fileStream = fs.createReadStream(filePath, { encoding: 'utf8' })
    const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity })
    let lastLine = ''
    for await (const line of rl) {
      if (line.trim()) lastLine = line.trim()
    }
    if (!lastLine) return null
    return JSON.parse(lastLine)
  } catch {
    return null
  }
}
