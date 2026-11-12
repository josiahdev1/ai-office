'use client'

import React, { useState } from 'react'
import {
  DepartmentRecord,
  validateAndCreateDepartment,
  AddDepartmentInput,
} from '@/lib/office/wellnessWing'
import { officeSupabase } from '@/lib/supabase/officeService'

export interface AddDepartmentModalProps {
  isOpen: boolean
  onClose: () => void
  onDepartmentCreated?: (dept: DepartmentRecord) => void
}

const PRESET_COLORS = [
  '#6366f1', // Indigo
  '#22c55e', // Emerald
  '#3b82f6', // Blue
  '#06b6d4', // Cyan
  '#a855f7', // Purple
  '#ec4899', // Pink
  '#f59e0b', // Amber
  '#10b981', // Teal
  '#f43f5e', // Rose
]

export function AddDepartmentModal({
  isOpen,
  onClose,
  onDepartmentCreated,
}: AddDepartmentModalProps) {
  const [name, setName] = useState('')
  const [deptId, setDeptId] = useState('')
  const [color, setColor] = useState('#6366f1')
  const [kind, setKind] = useState<'open_office' | 'lab' | 'studio' | 'meeting'>('open_office')
  const [deskCount, setDeskCount] = useState(4)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  if (!isOpen) return null

  const handleNameChange = (val: string) => {
    setName(val)
    if (!deptId || deptId === name.toUpperCase().replace(/[^A-Z0-9_]/g, '_')) {
      setDeptId(val.toUpperCase().replace(/[^A-Z0-9_]/g, '_').slice(0, 16))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)
    setSuccessMsg(null)

    const input: AddDepartmentInput = {
      id: deptId.trim(),
      name: name.trim(),
      color,
      kind,
      deskCount,
    }

    const validation = validateAndCreateDepartment(input)
    if (!validation.valid || !validation.department) {
      setErrorMsg(validation.error || 'Invalid department configuration')
      return
    }

    setIsSubmitting(true)

    try {
      // 1. Persist to Supabase office_departments
      const dept = validation.department
      const { error: dbError } = await officeSupabase
        .getClient()
        .from('office_departments')
        .upsert(
          {
            id: dept.id,
            name: dept.name,
            color: dept.color,
            room_id: dept.roomId,
            kind: dept.kind,
          },
          { onConflict: 'id' }
        )

      if (dbError) {
        console.warn('Could not insert department into office_departments:', dbError.message)
      }

      // 2. Persist audit log
      await officeSupabase.getClient().from('office_logs').insert({
        category: 'department',
        message: `Department "${dept.name}" (${dept.id}) provisioned with ${deskCount} desks under kind ${dept.kind}.`,
        level: 'info',
        details: { department: dept, deskCount },
      })

      setSuccessMsg(`Department "${dept.name}" created successfully!`)
      onDepartmentCreated?.(dept)

      setTimeout(() => {
        onClose()
      }, 900)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      setErrorMsg(`Failed to save department: ${msg}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-md">
      <div
        data-testid="add-department-modal"
        className="w-full max-w-lg rounded-2xl border border-cyan-500/40 bg-slate-900/95 p-6 shadow-2xl backdrop-blur-xl transition-all"
      >
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2.5">
            <span className="h-3 w-3 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_10px_#00e5ff]" />
            <h2 className="font-mono text-sm font-bold tracking-wider text-slate-100 uppercase">
              ADD NEW DEPARTMENT WIZARD
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-slate-100 transition-colors cursor-pointer"
          >
            <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path
                fillRule="evenodd"
                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4 font-mono text-xs">
          {errorMsg && (
            <div className="rounded-lg border border-rose-500/40 bg-rose-950/40 p-2.5 text-rose-300">
              {errorMsg}
            </div>
          )}
          {successMsg && (
            <div className="rounded-lg border border-emerald-500/40 bg-emerald-950/40 p-2.5 text-emerald-300">
              {successMsg}
            </div>
          )}

          <div>
            <label className="block text-slate-400 mb-1 font-semibold">DEPARTMENT NAME</label>
            <input
              type="text"
              required
              placeholder="e.g. Mobile Engineering, Customer Success"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-950/80 px-3 py-2 text-slate-100 placeholder-slate-600 focus:border-cyan-400 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-slate-400 mb-1 font-semibold">DEPARTMENT ID (IDENTIFIER)</label>
            <input
              type="text"
              required
              placeholder="e.g. MOBILE_ENG"
              value={deptId}
              onChange={(e) => setDeptId(e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, '_'))}
              className="w-full rounded-lg border border-slate-700 bg-slate-950/80 px-3 py-2 text-slate-100 font-mono focus:border-cyan-400 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-slate-400 mb-1 font-semibold">DEPARTMENT ACCENT COLOR</label>
            <div className="flex items-center gap-2 mb-2">
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="h-8 w-12 rounded cursor-pointer border border-slate-700 bg-transparent p-0"
              />
              <input
                type="text"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="w-28 rounded-lg border border-slate-700 bg-slate-950/80 px-2.5 py-1.5 text-slate-100 font-mono text-center focus:border-cyan-400 focus:outline-none"
              />
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              {PRESET_COLORS.map((pc) => (
                <button
                  key={pc}
                  type="button"
                  onClick={() => setColor(pc)}
                  className={`h-6 w-6 rounded-full cursor-pointer transition-transform ${
                    color === pc ? 'scale-125 ring-2 ring-white ring-offset-2 ring-offset-slate-900' : 'hover:scale-110'
                  }`}
                  style={{ backgroundColor: pc }}
                />
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-400 mb-1 font-semibold">ROOM TEMPLATE</label>
              <select
                value={kind}
                onChange={(e) => setKind(e.target.value as AddDepartmentInput['kind'])}
                className="w-full rounded-lg border border-slate-700 bg-slate-950/80 px-3 py-2 text-slate-100 focus:border-cyan-400 focus:outline-none"
              >
                <option value="open_office">Open Office Space</option>
                <option value="lab">Technical Lab / NOC</option>
                <option value="studio">Creative Studio</option>
                <option value="meeting">Executive Meeting Room</option>
              </select>
            </div>
            <div>
              <label className="block text-slate-400 mb-1 font-semibold">DESK COUNT</label>
              <input
                type="number"
                min={2}
                max={12}
                value={deskCount}
                onChange={(e) => setDeskCount(parseInt(e.target.value) || 4)}
                className="w-full rounded-lg border border-slate-700 bg-slate-950/80 px-3 py-2 text-slate-100 focus:border-cyan-400 focus:outline-none"
              />
            </div>
          </div>

          {/* Live Preview Card */}
          <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span
                className="h-8 w-8 rounded-lg flex items-center justify-center font-bold text-white shadow-md text-xs"
                style={{ backgroundColor: color }}
              >
                {deptId.slice(0, 2) || 'DP'}
              </span>
              <div>
                <div className="font-bold text-slate-100">{name || 'New Department Preview'}</div>
                <div className="text-[10px] text-slate-400">
                  {deptId || 'ID'} • {kind.replace('_', ' ').toUpperCase()} • {deskCount} DESKS
                </div>
              </div>
            </div>
            <span className="rounded-full px-2 py-0.5 text-[9px] font-bold border border-cyan-500/30 text-cyan-300">
              NEW WING READY
            </span>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-4 py-2 font-mono text-xs text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors cursor-pointer"
            >
              CANCEL
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-lg bg-cyan-500 px-5 py-2 font-mono text-xs font-bold text-slate-950 hover:bg-cyan-400 disabled:opacity-50 transition-colors shadow-lg shadow-cyan-500/20 cursor-pointer"
            >
              {isSubmitting ? 'PROVISIONING...' : 'CREATE DEPARTMENT'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
