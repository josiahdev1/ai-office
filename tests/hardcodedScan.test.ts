import { describe, it, expect } from 'vitest'
import fs from 'fs'
import path from 'path'
import { isAgentActivelyWorking } from '../src/config/characterStyles'

describe('Hardcoded Data & Real Working Audit Scanner', () => {
  it('1. verifies isAgentActivelyWorking strictly requires a real task', () => {
    // Agent with empty task is NOT working
    expect(isAgentActivelyWorking({ status: 'working', current_task: '' })).toBe(false)
    expect(isAgentActivelyWorking({ status: 'working', current_task: '   ' })).toBe(false)
    expect(isAgentActivelyWorking({ status: 'working', current_task: null })).toBe(false)

    // Agent with idle/break/gym status is NOT working even if task text was leftover
    expect(
      isAgentActivelyWorking({ status: 'on_break', current_task: 'Fix auth bug' })
    ).toBe(false)
    expect(
      isAgentActivelyWorking({ status: 'at_gym', current_task: 'Fix auth bug' })
    ).toBe(false)
    expect(
      isAgentActivelyWorking({ status: 'idle', current_task: 'Fix auth bug' })
    ).toBe(false)

    // Agent with real task AND working/coding status is WORKING
    expect(
      isAgentActivelyWorking({
        status: 'working',
        current_task: 'Implement Real Iloilo solar clock and scheduler',
      })
    ).toBe(true)
    expect(
      isAgentActivelyWorking({
        status: 'coding',
        current_task: 'Implement Real Iloilo solar clock and scheduler',
      })
    ).toBe(true)
  })

  it('2. scans codebase to ensure no fake openTasks formulas or sample fixtures exist in page.tsx', () => {
    const pagePath = path.resolve(process.cwd(), 'src/app/page.tsx')
    const pageContent = fs.readFileSync(pagePath, 'utf8')

    // Must NOT contain the old hardcoded formula Math.max(8, ...)
    expect(pageContent).not.toContain('Math.max(8, Math.round(working * 0.35)')

    // Must count open tasks from real agent tasks & pending approvals
    expect(pageContent).toContain('agents.filter')
    expect(pageContent).toContain('current_task')
  })

  it('3. scans src/components to ensure no Math.random feeds displayed metrics or counters', () => {
    const componentsDir = path.resolve(process.cwd(), 'src/components')

    function scanDir(dir: string): string[] {
      const results: string[] = []
      const entries = fs.readdirSync(dir, { withFileTypes: true })
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name)
        if (entry.isDirectory()) {
          results.push(...scanDir(fullPath))
        } else if (entry.isFile() && (entry.name.endsWith('.tsx') || entry.name.endsWith('.ts'))) {
          results.push(fullPath)
        }
      }
      return results
    }

    const files = scanDir(componentsDir)
    const violations: string[] = []

    for (const file of files) {
      // Exclude audio synthesis which uses random for noise/particles/sfx
      if (file.includes('audio') || file.includes('sfx') || file.includes('lofiSynth')) continue

      const content = fs.readFileSync(file, 'utf8')
      const lines = content.split('\n')

      lines.forEach((line, idx) => {
        // Flag Math.random being used directly to invent counts, tasks, or token values
        if (
          line.includes('Math.random()') &&
          (line.includes('working') ||
            line.includes('openTasks') ||
            line.includes('progress') ||
            line.includes('count') ||
            line.includes('tokens'))
        ) {
          // Allow cosmetic visual particle or particle speed variety
          if (
            !line.includes('particle') &&
            !line.includes('audioLevel') &&
            !line.includes('waveform') &&
            !line.includes('spark')
          ) {
            violations.push(`${path.basename(file)}:${idx + 1}: ${line.trim()}`)
          }
        }
      })
    }

    expect(violations).toEqual([])
  })

  it('4. strictly verifies zero localStorage accesses in src (Supabase is single source of truth)', () => {
    function scanDir(dir: string): string[] {
      const results: string[] = []
      const entries = fs.readdirSync(dir, { withFileTypes: true })
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name)
        if (entry.isDirectory()) {
          results.push(...scanDir(fullPath))
        } else if (entry.isFile() && (entry.name.endsWith('.tsx') || entry.name.endsWith('.ts'))) {
          results.push(fullPath)
        }
      }
      return results
    }

    const files = scanDir(path.resolve(process.cwd(), 'src'))
    const localStorageViolations: string[] = []

    for (const file of files) {
      const content = fs.readFileSync(file, 'utf8')
      if (content.includes('localStorage')) {
        localStorageViolations.push(path.relative(process.cwd(), file))
      }
    }

    expect(localStorageViolations).toEqual([])
  })

  it('5. scans src to ensure no dummy, mock, lorem, or fake fixtures exist outside tests', () => {
    function scanDir(dir: string): string[] {
      const results: string[] = []
      const entries = fs.readdirSync(dir, { withFileTypes: true })
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name)
        if (entry.isDirectory()) {
          results.push(...scanDir(fullPath))
        } else if (entry.isFile() && (entry.name.endsWith('.tsx') || entry.name.endsWith('.ts'))) {
          results.push(fullPath)
        }
      }
      return results
    }

    const files = scanDir(path.resolve(process.cwd(), 'src'))
    const mockViolations: string[] = []

    for (const file of files) {
      const content = fs.readFileSync(file, 'utf8')
      const lines = content.split('\n')
      lines.forEach((line, idx) => {
        const lower = line.toLowerCase()
        // Ignore comments that mention sample algorithms or geometry sampling
        if (lower.includes('sample every other waypoint') || lower.includes('resample') || lower.includes('downsample')) return
        if (
          lower.includes('mockdata') ||
          lower.includes('dummydata') ||
          lower.includes('lorem ipsum') ||
          lower.includes('fakeagents') ||
          lower.includes('mock_agents')
        ) {
          mockViolations.push(`${path.relative(process.cwd(), file)}:${idx + 1}: ${line.trim()}`)
        }
      })
    }

    expect(mockViolations).toEqual([])
  })
})
