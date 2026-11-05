import { describe, it, expect } from 'vitest'
import {
  dbRowToAgent,
  agentToDbRow,
  dbRowToApproval,
  approvalToDbRow,
  dbRowToLogString,
  logToDbRow,
  departmentToRoom,
  roomToDepartment,
  OfficeAgentRow,
  OfficeApprovalRow,
  OfficeLogRow,
} from '../src/lib/office/db-map'

describe('Supabase db-map Adapter Tests', () => {
  it('correctly maps office_agents db row to Agent domain object', () => {
    const row: OfficeAgentRow = {
      id: 'josiah',
      name: 'Josiah',
      role: 'Founder & Lead Architect',
      department: 'ENGINEERING',
      desk_x: 2,
      desk_y: 10,
      current_x: 2,
      current_y: 10,
      status: 'coding',
      current_task: 'Core Architecture',
      current_room: 'Engineering Core',
      model: 'claude-3-7-sonnet',
      color: '#3b82f6',
      sub_state: 'typing',
      progress: 75,
      seat_id: 'eng-1',
      last_active_at: '2026-11-05T08:00:00Z',
      updated_at: '2026-11-05T08:00:00Z',
    }

    const agent = dbRowToAgent(row)

    expect(agent.id).toBe('josiah')
    expect(agent.name).toBe('Josiah')
    expect(agent.role).toBe('Founder & Lead Architect')
    expect(agent.room).toBe('Engineering Core')
    expect(agent.tag).toBe('ENGINEERING')
    expect(agent.status).toBe('working')
    expect(agent.sub_state).toBe('typing')
    expect(agent.current_task).toBe('Core Architecture')
    expect(agent.progress_pct).toBe(75)
    expect(agent.desk_coord).toEqual({ x: 2, y: 10 })
    expect(agent.color).toBe('#3b82f6')
  })

  it('correctly maps partial Agent back to office_agents db row', () => {
    const partialAgent = {
      id: 'arwin',
      name: 'Arwin',
      role: 'Lead Backend Engineer',
      room: 'Engineering Core',
      status: 'working' as const,
      sub_state: 'typing' as const,
      desk_coord: { x: 2, y: 11 },
    }

    const row = agentToDbRow(partialAgent)

    expect(row.id).toBe('arwin')
    expect(row.name).toBe('Arwin')
    expect(row.department).toBe('ENGINEERING')
    expect(row.desk_x).toBe(2)
    expect(row.desk_y).toBe(11)
    expect(row.status).toBe('coding')
    expect(row.sub_state).toBe('typing')
  })

  it('correctly converts between rooms and departments', () => {
    expect(departmentToRoom('ENGINEERING')).toBe('Engineering Core')
    expect(departmentToRoom('QA & SECOPS')).toBe('QA & SecOps NOC')
    expect(departmentToRoom('GROWTH')).toBe('Growth Lab')
    expect(departmentToRoom('INTELLIGENCE')).toBe('Intelligence Lab')
    expect(departmentToRoom('OPERATIONS')).toBe('Operations Hub')
    expect(departmentToRoom('COMMAND')).toBe('Command Center')

    expect(roomToDepartment('Engineering Core')).toBe('ENGINEERING')
    expect(roomToDepartment('QA & SecOps NOC')).toBe('QA & SECOPS')
    expect(roomToDepartment('Growth Lab')).toBe('GROWTH')
    expect(roomToDepartment('Intelligence Lab')).toBe('INTELLIGENCE')
    expect(roomToDepartment('Operations Hub')).toBe('OPERATIONS')
    expect(roomToDepartment('Command Center')).toBe('COMMAND')
  })

  it('correctly maps office_approvals db row to Approval domain object', () => {
    const row: OfficeApprovalRow = {
      id: 'appr-1234',
      title: 'Deploy Hotfix to Production',
      description: 'Zero-downtime canvas optimization patch',
      category: 'deployment',
      requested_by: 'Neil Mar',
      status: 'pending',
      impact_level: 'high',
      resolved_by: null,
      resolved_at: null,
      created_at: '2026-11-05T08:00:00Z',
    }

    const approval = dbRowToApproval(row)

    expect(approval.id).toBe('appr-1234')
    expect(approval.agent_name).toBe('Neil Mar')
    expect(approval.title).toBe('Deploy Hotfix to Production')
    expect(approval.summary).toBe('Zero-downtime canvas optimization patch')
    expect(approval.type).toBe('deployment')
    expect(approval.status).toBe('pending')
  })

  it('correctly maps Approval back to office_approvals db row', () => {
    const row = approvalToDbRow({
      id: 'appr-5678',
      agent_id: 'neil_mar',
      agent_name: 'Neil Mar',
      title: 'Database Schema Migration',
      summary: 'Add office_settings table',
      type: 'migration',
      status: 'pending',
      created_at: '2026-11-05T08:00:00Z',
    })

    expect(row.id).toBe('appr-5678')
    expect(row.title).toBe('Database Schema Migration')
    expect(row.requested_by).toBe('Neil Mar')
    expect(row.status).toBe('pending')
  })

  it('correctly formats office_logs into human-readable telemetry strings', () => {
    const row: OfficeLogRow = {
      id: 'log-1',
      agent_id: 'bonnie',
      agent_name: 'Bonnie',
      level: 'info',
      category: 'task',
      message: 'GitHub CI matrix deployment verified.',
      details: { run_id: 123 },
      created_at: '2026-11-05T08:30:00Z',
    }

    const logStr = dbRowToLogString(row)
    expect(logStr).toContain('[INFO]')
    expect(logStr).toContain('[TASK]')
    expect(logStr).toContain('Bonnie: GitHub CI matrix deployment verified.')
  })

  it('creates valid log insert row with defaults', () => {
    const insertRow = logToDbRow({
      category: 'system',
      message: 'Office serverless runtime synced.',
    })

    expect(insertRow.category).toBe('system')
    expect(insertRow.message).toBe('Office serverless runtime synced.')
    expect(insertRow.level).toBe('info')
    expect(insertRow.agent_id).toBeNull()
    expect(insertRow.agent_name).toBeNull()
  })
})
