'use client'

import React, { useState, useEffect, useMemo } from 'react'
import {
  reminderManager,
  ReminderEventKind,
} from '@/lib/reminders/reminderEngine'
import {
  parseReminderNaturalLanguage,
} from '@/lib/reminders/parse'
import {
  Bell,
  Clock,
  Phone,
  PhoneCall,
  Volume2,
  Calendar,
  X,
  Plus,
  Download,
  AlertTriangle,
  CheckCircle,
  ShieldAlert,
} from 'lucide-react'

interface RemindersDrawerProps {
  isOpen: boolean
  onClose: () => void
}

const KIND_COLORS: Record<ReminderEventKind, { bg: string; text: string }> = {
  scheduled: { bg: 'bg-cyan-500/10 border-cyan-500/30', text: 'text-cyan-300' },
  claimed: { bg: 'bg-blue-500/10 border-blue-500/30', text: 'text-blue-300' },
  ringing: { bg: 'bg-amber-500/10 border-amber-500/30', text: 'text-amber-300' },
  answered: { bg: 'bg-emerald-500/10 border-emerald-500/30', text: 'text-emerald-300' },
  declined: { bg: 'bg-rose-500/10 border-rose-500/30', text: 'text-rose-300' },
  acknowledged: { bg: 'bg-teal-500/10 border-teal-500/30', text: 'text-teal-300' },
  snoozed: { bg: 'bg-yellow-500/10 border-yellow-500/30', text: 'text-yellow-300' },
  escalated: { bg: 'bg-orange-500/10 border-orange-500/30', text: 'text-orange-300' },
  push_sent: { bg: 'bg-indigo-500/10 border-indigo-500/30', text: 'text-indigo-300' },
  channel_sent: { bg: 'bg-purple-500/10 border-purple-500/30', text: 'text-purple-300' },
  missed: { bg: 'bg-rose-600/20 border-rose-500/40', text: 'text-rose-400' },
  failed: { bg: 'bg-red-500/10 border-red-500/30', text: 'text-red-300' },
  cancelled: { bg: 'bg-slate-800 border-slate-700', text: 'text-slate-400' },
  edited: { bg: 'bg-cyan-800/20 border-cyan-700/40', text: 'text-cyan-400' },
}

export function RemindersDrawer({ isOpen, onClose }: RemindersDrawerProps) {
  const [activeTab, setActiveTab] = useState<'upcoming' | 'events' | 'settings'>('upcoming')
  const [tick, setTick] = useState(0)

  // Creation form state
  const [naturalInput, setNaturalInput] = useState('')
  const [previewParse, setPreviewParse] = useState<ReturnType<typeof parseReminderNaturalLanguage> | null>(null)
  const [isCreatingManual, setIsCreatingManual] = useState(false)
  const [manualTitle, setManualTitle] = useState('')
  const [manualMessage, setManualMessage] = useState('')
  const [manualDue, setManualDue] = useState('')

  // Settings state
  const settings = reminderManager.getSettings()
  const [ringDuration, setRingDuration] = useState(settings.ringDurationSecs)
  const [snoozeMins, setSnoozeMins] = useState(settings.snoozeMinutes)
  const [volume, setVolume] = useState(settings.ringtoneVolume)
  const [audioUnlocked, setAudioUnlocked] = useState(reminderManager.isAudioActive())

  // Events filter
  const [selectedKind, setSelectedKind] = useState<string>('ALL')

  useEffect(() => {
    const unsub = reminderManager.subscribe(() => setTick((t) => t + 1))
    return unsub
  }, [])

  const reminders = useMemo(() => {
    void tick
    return reminderManager.getActiveReminders()
  }, [tick])

  const missedReminders = useMemo(() => {
    void tick
    return reminderManager.getUnacknowledgedMissed()
  }, [tick])

  const events = useMemo(() => {
    void tick
    return reminderManager.getReminderEvents(100)
  }, [tick])

  const filteredEvents = useMemo(() => {
    if (selectedKind === 'ALL') return events
    return events.filter((e) => e.kind === selectedKind)
  }, [events, selectedKind])

  const handleNaturalInputPreview = (val: string) => {
    setNaturalInput(val)
    if (!val.trim()) {
      setPreviewParse(null)
      return
    }
    const parsed = parseReminderNaturalLanguage(val)
    setPreviewParse(parsed)
  }

  const handleConfirmNaturalReminder = () => {
    if (!previewParse || !previewParse.ok) return
    reminderManager.createReminder({
      title: previewParse.title,
      message: previewParse.message,
      triggerKind: previewParse.triggerKind,
      dueAt: previewParse.dueAt,
      recurrence: previewParse.recurrence,
      condition: previewParse.condition,
      createdBy: 'ui',
    })
    setNaturalInput('')
    setPreviewParse(null)
  }

  const handleCreateManualReminder = (e: React.FormEvent) => {
    e.preventDefault()
    if (!manualTitle.trim()) return

    reminderManager.createReminder({
      title: manualTitle,
      message: manualMessage || manualTitle,
      triggerKind: 'time',
      dueAt: manualDue ? new Date(manualDue).toISOString() : new Date(Date.now() + 600000).toISOString(),
      createdBy: 'ui',
    })

    setManualTitle('')
    setManualMessage('')
    setManualDue('')
    setIsCreatingManual(false)
  }

  const handleUnlockAudioAndPush = async () => {
    const unlocked = reminderManager.unlockAudio()
    setAudioUnlocked(unlocked)

    if (typeof window !== 'undefined' && 'Notification' in window) {
      try {
        await Notification.requestPermission()
      } catch {
        // no-op
      }
    }
  }

  const handleExportCSV = () => {
    const csv = reminderManager.exportEventsCSV()
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `jarvis_reminders_${new Date().toISOString().substring(0, 10)}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-y-0 right-0 z-50 flex w-full max-w-xl flex-col border-l border-cyan-500/30 bg-slate-950/95 text-slate-100 shadow-2xl backdrop-blur-xl animate-in slide-in-from-right duration-200">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-cyan-500/20 px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-cyan-500/40 bg-cyan-950/50 shadow-[0_0_15px_rgba(6,182,212,0.3)]">
            <Bell className="h-5 w-5 text-cyan-400" />
          </div>
          <div>
            <h2 className="text-lg font-bold tracking-tight text-white flex items-center gap-2">
              JARVIS REMINDERS & CALLS
              {missedReminders.length > 0 && (
                <span className="rounded-full bg-rose-500/20 border border-rose-500/40 px-2 py-0.5 text-xs text-rose-300 font-semibold">
                  {missedReminders.length} Missed
                </span>
              )}
            </h2>
            <p className="text-xs text-slate-400">
              Natural voice reminders & incoming Web Audio calls
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-800 px-6">
        <button
          type="button"
          onClick={() => setActiveTab('upcoming')}
          className={`flex items-center gap-2 border-b-2 px-4 py-3 text-xs font-semibold uppercase tracking-wider transition-colors ${
            activeTab === 'upcoming'
              ? 'border-cyan-400 text-cyan-300'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Clock className="h-4 w-4" />
          Upcoming ({reminders.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('events')}
          className={`flex items-center gap-2 border-b-2 px-4 py-3 text-xs font-semibold uppercase tracking-wider transition-colors ${
            activeTab === 'events'
              ? 'border-cyan-400 text-cyan-300'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Calendar className="h-4 w-4" />
          Calls Log ({events.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('settings')}
          className={`flex items-center gap-2 border-b-2 px-4 py-3 text-xs font-semibold uppercase tracking-wider transition-colors ${
            activeTab === 'settings'
              ? 'border-cyan-400 text-cyan-300'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Volume2 className="h-4 w-4" />
          Audio & Channels
        </button>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {activeTab === 'upcoming' && (
          <div className="space-y-6">
            {/* Missed Calls Alert */}
            {missedReminders.length > 0 && (
              <div className="rounded-xl border border-rose-500/40 bg-rose-950/20 p-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-rose-300">
                  <ShieldAlert className="h-4 w-4 text-rose-400" />
                  Missed Incoming Calls
                </div>
                <div className="mt-2 space-y-2">
                  {missedReminders.map((m) => (
                    <div
                      key={m.id}
                      className="flex items-center justify-between rounded-lg border border-rose-500/20 bg-rose-900/20 p-3"
                    >
                      <div>
                        <div className="text-sm font-medium text-white">{m.title}</div>
                        <div className="text-xs text-rose-200">{m.message}</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => reminderManager.acknowledgeReminder(m.id)}
                        className="rounded-lg bg-rose-500/20 px-3 py-1.5 text-xs font-semibold text-rose-300 hover:bg-rose-500/30"
                      >
                        Acknowledge
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Quick Natural Voice Parser Box */}
            <div className="rounded-xl border border-cyan-500/30 bg-slate-900/80 p-4 space-y-3">
              <label className="text-xs font-semibold text-cyan-300 uppercase tracking-wider block">
                Quick Schedule (Natural Language)
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder='Try: "call me at 2pm" or "remind me in 30 mins to test build"'
                  value={naturalInput}
                  onChange={(e) => handleNaturalInputPreview(e.target.value)}
                  className="flex-1 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-cyan-400 focus:outline-none"
                />
              </div>

              {previewParse && previewParse.ok && (
                <div className="rounded-lg border border-emerald-500/30 bg-emerald-950/20 p-3 space-y-2 text-xs">
                  <div className="text-emerald-300 font-medium">
                    {previewParse.readBack}
                  </div>
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-slate-400">
                      Target: {previewParse.dueAtPHT || 'Event Trigger'}
                    </span>
                    <button
                      type="button"
                      onClick={handleConfirmNaturalReminder}
                      className="flex items-center gap-1.5 rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-white shadow-md hover:bg-emerald-400"
                    >
                      <CheckCircle className="h-3.5 w-3.5" />
                      Confirm & Schedule
                    </button>
                  </div>
                </div>
              )}

              {previewParse && !previewParse.ok && (
                <div className="rounded-lg border border-amber-500/30 bg-amber-950/20 p-3 text-xs text-amber-300 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  {previewParse.clarifyingQuestion || 'Please enter a valid time.'}
                </div>
              )}
            </div>

            {/* Upcoming List */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Active Reminders
                </span>
                <button
                  type="button"
                  onClick={() => setIsCreatingManual(!isCreatingManual)}
                  className="flex items-center gap-1 text-xs text-cyan-400 hover:text-cyan-300"
                >
                  <Plus className="h-3.5 w-3.5" />
                  {isCreatingManual ? 'Cancel Manual' : 'Add Manually'}
                </button>
              </div>

              {isCreatingManual && (
                <form
                  onSubmit={handleCreateManualReminder}
                  className="rounded-xl border border-slate-800 bg-slate-900/90 p-4 space-y-3"
                >
                  <div>
                    <label className="text-xs text-slate-400">Title</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Check Deployment"
                      value={manualTitle}
                      onChange={(e) => setManualTitle(e.target.value)}
                      className="w-full mt-1 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white focus:border-cyan-400 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400">Message / Details</label>
                    <textarea
                      placeholder="Spoken by JARVIS during incoming call"
                      value={manualMessage}
                      onChange={(e) => setManualMessage(e.target.value)}
                      className="w-full mt-1 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white focus:border-cyan-400 focus:outline-none"
                      rows={2}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400">Due Date & Time</label>
                    <input
                      type="datetime-local"
                      value={manualDue}
                      onChange={(e) => setManualDue(e.target.value)}
                      className="w-full mt-1 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white focus:border-cyan-400 focus:outline-none"
                    />
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setIsCreatingManual(false)}
                      className="rounded-lg px-3 py-1.5 text-xs text-slate-400 hover:bg-slate-800"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="rounded-lg bg-cyan-500 px-4 py-1.5 text-xs font-semibold text-white hover:bg-cyan-400"
                    >
                      Create Reminder
                    </button>
                  </div>
                </form>
              )}

              {reminders.length === 0 ? (
                <div className="rounded-xl border border-slate-800 p-8 text-center text-xs text-slate-500">
                  No upcoming reminders. Say &ldquo;call me at 2pm&rdquo; to schedule one.
                </div>
              ) : (
                reminders.map((r) => (
                  <div
                    key={r.id}
                    className="rounded-xl border border-slate-800/80 bg-slate-900/60 p-4 transition-colors hover:border-slate-700 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-cyan-400" />
                        <span className="font-semibold text-sm text-white">{r.title}</span>
                      </div>
                      <span className="rounded-full border border-cyan-500/30 bg-cyan-500/10 px-2 py-0.5 text-xs text-cyan-300 font-mono">
                        {r.status}
                      </span>
                    </div>

                    <p className="text-xs text-slate-300">{r.message}</p>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-800/60 text-xs">
                      <span className="text-slate-400 flex items-center gap-1 font-mono">
                        <Clock className="h-3.5 w-3.5 text-slate-500" />
                        {r.due_at ? new Date(r.due_at).toLocaleTimeString() : 'Event Triggered'}
                      </span>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => reminderManager.snoozeReminder(r.id, 10)}
                          className="rounded px-2 py-1 text-slate-400 hover:bg-slate-800 hover:text-amber-300"
                        >
                          Snooze 10m
                        </button>
                        <button
                          type="button"
                          onClick={() => reminderManager.cancelReminder(r.id)}
                          className="rounded px-2 py-1 text-slate-400 hover:bg-slate-800 hover:text-rose-400"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {activeTab === 'events' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <select
                value={selectedKind}
                onChange={(e) => setSelectedKind(e.target.value)}
                className="rounded-lg border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs text-slate-300 focus:outline-none"
              >
                <option value="ALL">All Event Outcomes</option>
                <option value="scheduled">Scheduled</option>
                <option value="ringing">Ringing</option>
                <option value="answered">Answered</option>
                <option value="snoozed">Snoozed</option>
                <option value="missed">Missed</option>
                <option value="cancelled">Cancelled</option>
              </select>

              <button
                type="button"
                onClick={handleExportCSV}
                className="flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs text-slate-300 hover:border-slate-700 hover:text-white"
              >
                <Download className="h-3.5 w-3.5" />
                Export CSV
              </button>
            </div>

            <div className="space-y-2">
              {filteredEvents.map((ev) => {
                const badge = KIND_COLORS[ev.kind] || { bg: 'bg-slate-800', text: 'text-slate-300' }
                return (
                  <div
                    key={ev.id}
                    className="rounded-lg border border-slate-800/80 bg-slate-900/40 p-3 space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className={`rounded px-2 py-0.5 text-xs font-mono font-medium border ${badge.bg} ${badge.text}`}>
                        {ev.kind.toUpperCase()}
                      </span>
                      <span className="text-xs text-slate-400 font-mono">{ev.ts_pht}</span>
                    </div>
                    <div className="text-xs text-slate-300">{ev.detail}</div>
                    {ev.tab_id && (
                      <div className="text-[10px] text-slate-500 font-mono">
                        Claimed Tab: {ev.tab_id}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="space-y-6 text-sm">
            {/* Audio & Notification Unlocking */}
            <div className="rounded-xl border border-cyan-500/30 bg-cyan-950/20 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-semibold text-white">Audio & Web Push Permissions</h4>
                  <p className="text-xs text-slate-400">
                    Required for synthesized Web Audio ringtone and notifications
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleUnlockAudioAndPush}
                  className="rounded-lg bg-cyan-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-cyan-400"
                >
                  {audioUnlocked ? 'Audio Active ✓' : 'Enable Audio & Calls'}
                </button>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-cyan-500/20">
                <span className="text-xs text-slate-300">Test Incoming Call</span>
                <button
                  type="button"
                  onClick={() => reminderManager.triggerTestCall()}
                  className="flex items-center gap-1.5 rounded-lg border border-cyan-500/40 bg-cyan-500/10 px-3 py-1.5 text-xs font-semibold text-cyan-300 hover:bg-cyan-500/20"
                >
                  <PhoneCall className="h-3.5 w-3.5" />
                  Test Ringtone Now
                </button>
              </div>
            </div>

            {/* Ring & Snooze Controls */}
            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 space-y-4">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-300">Ring Duration</span>
                  <span className="text-cyan-300 font-mono">{ringDuration} seconds</span>
                </div>
                <input
                  type="range"
                  min={15}
                  max={120}
                  step={5}
                  value={ringDuration}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10)
                    setRingDuration(val)
                    reminderManager.updateSettings({ ringDurationSecs: val })
                  }}
                  className="w-full"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-300">Default Snooze Length</span>
                  <span className="text-cyan-300 font-mono">{snoozeMins} minutes</span>
                </div>
                <input
                  type="range"
                  min={5}
                  max={60}
                  step={5}
                  value={snoozeMins}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10)
                    setSnoozeMins(val)
                    reminderManager.updateSettings({ snoozeMinutes: val })
                  }}
                  className="w-full"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-300">Ringtone Volume</span>
                  <span className="text-cyan-300 font-mono">{Math.round(volume * 100)}%</span>
                </div>
                <input
                  type="range"
                  min={0.1}
                  max={1}
                  step={0.05}
                  value={volume}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value)
                    setVolume(val)
                    reminderManager.updateSettings({ ringtoneVolume: val })
                  }}
                  className="w-full"
                />
              </div>
            </div>

            {/* Channels Status */}
            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 space-y-3">
              <h4 className="font-semibold text-white text-xs uppercase tracking-wider">
                External Channels Status
              </h4>
              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between rounded border border-slate-800 p-2">
                  <span>Web Audio Incoming Call</span>
                  <span className="text-emerald-400 font-semibold">ALWAYS ACTIVE</span>
                </div>
                <div className="flex items-center justify-between rounded border border-slate-800 p-2">
                  <span>Browser Web Push</span>
                  <span className="text-cyan-400 font-semibold">ACTIVE</span>
                </div>
                <div className="flex items-center justify-between rounded border border-slate-800 p-2">
                  <span>Telegram Bot (@ai_office_bot)</span>
                  <span className="text-slate-500">STANDBY (OPTIONAL)</span>
                </div>
                <div className="flex items-center justify-between rounded border border-slate-800 p-2">
                  <span>Discord Webhook</span>
                  <span className="text-slate-500">STANDBY (OPTIONAL)</span>
                </div>
                <div className="flex items-center justify-between rounded border border-slate-800 p-2">
                  <span>Phone Call / SMS (Twilio)</span>
                  <span className="text-slate-500">DISABLED (SEE DOCS/REMINDERS.MD)</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
