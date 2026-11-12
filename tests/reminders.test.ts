import { describe, it, expect, beforeEach } from 'vitest'
import {
  parseReminderNaturalLanguage,
  phtToUtcDate,
} from '@/lib/reminders/parse'
import {
  ReminderManager,
} from '@/lib/reminders/reminderEngine'
import { executeJarvisTool } from '@/lib/jarvis/orchestrator'

describe('JARVIS Reminders & Natural Language Parser (Phase K8)', () => {
  // Reference date: Thursday, Nov 12, 2026 at 10:00:00 AM PHT (02:00:00 UTC)
  const refMorningPHT = phtToUtcDate(2026, 11, 12, 10, 0, 0)
  // Reference date: Thursday, Nov 12, 2026 at 17:00:00 PM PHT (09:00:00 UTC)
  const refEveningPHT = phtToUtcDate(2026, 11, 12, 17, 0, 0)

  describe('1. Natural Language Time Parser (Asia/Manila PHT Math)', () => {
    it('parses "2pm" and "2:30 pm" in PHT', () => {
      const res2pm = parseReminderNaturalLanguage('call me at 2pm', {
        referenceDate: refMorningPHT,
      })
      expect(res2pm.ok).toBe(true)
      expect(res2pm.triggerKind).toBe('time')
      expect(res2pm.dueAt).toBeDefined()
      // 2:00 PM PHT = 14:00 PHT = 06:00 UTC
      expect(new Date(res2pm.dueAt!).toISOString()).toBe('2026-11-12T06:00:00.000Z')
      expect(res2pm.readBack).toContain('2:00 PM Philippine time')

      const res230 = parseReminderNaturalLanguage('remind me at 2:30 pm', {
        referenceDate: refMorningPHT,
      })
      expect(res230.ok).toBe(true)
      expect(new Date(res230.dueAt!).toISOString()).toBe('2026-11-12T06:30:00.000Z')
      expect(res230.readBack).toContain('2:30 PM Philippine time')
    })

    it('parses 24-hour time "14:00"', () => {
      const res = parseReminderNaturalLanguage('call me at 14:00', {
        referenceDate: refMorningPHT,
      })
      expect(res.ok).toBe(true)
      expect(new Date(res.dueAt!).toISOString()).toBe('2026-11-12T06:00:00.000Z')
    })

    it('parses relative offsets "in 10 minutes" and "in 2 hours"', () => {
      const res10m = parseReminderNaturalLanguage('remind me in 10 minutes to review PR', {
        referenceDate: refMorningPHT,
      })
      expect(res10m.ok).toBe(true)
      // 10:00 AM + 10 mins = 10:10 AM PHT (02:10 UTC)
      expect(new Date(res10m.dueAt!).toISOString()).toBe('2026-11-12T02:10:00.000Z')
      expect(res10m.title).toBe('review PR')

      const res2h = parseReminderNaturalLanguage('call me in 2 hours', {
        referenceDate: refMorningPHT,
      })
      expect(res2h.ok).toBe(true)
      // 10:00 AM + 2 hours = 12:00 PM PHT (04:00 UTC)
      expect(new Date(res2h.dueAt!).toISOString()).toBe('2026-11-12T04:00:00.000Z')
    })

    it('parses "tomorrow at 9" and "tomorrow at 9am"', () => {
      const res = parseReminderNaturalLanguage('call me tomorrow at 9', {
        referenceDate: refMorningPHT,
      })
      expect(res.ok).toBe(true)
      // Tomorrow Nov 13 at 9:00 AM PHT = 01:00 UTC Nov 13
      expect(new Date(res.dueAt!).toISOString()).toBe('2026-11-13T01:00:00.000Z')
      expect(res.readBack).toContain('tomorrow, Friday 13 November, at 9:00 AM Philippine time')
    })

    it('parses "next Monday at 3pm"', () => {
      const res = parseReminderNaturalLanguage('call me next Monday at 3pm', {
        referenceDate: refMorningPHT,
      })
      expect(res.ok).toBe(true)
      // Thursday Nov 12 -> next Monday is Nov 16 at 3:00 PM PHT (07:00 UTC)
      expect(new Date(res.dueAt!).toISOString()).toBe('2026-11-16T07:00:00.000Z')
      expect(res.readBack).toContain('Monday 16 November, at 3:00 PM Philippine time')
    })

    it('parses "every weekday at 8:30" (recurring)', () => {
      const res = parseReminderNaturalLanguage('every weekday at 8:30 call me about the standup', {
        referenceDate: refMorningPHT,
      })
      expect(res.ok).toBe(true)
      expect(res.triggerKind).toBe('recurring')
      expect(res.recurrence?.pattern).toBe('weekdays')
      expect(res.recurrence?.hour).toBe(8)
      expect(res.recurrence?.minute).toBe(30)
      expect(res.readBack).toContain('every weekday at 8:30 AM Philippine time')
    })

    it('distinguishes midnight / 12am (00:00) vs 12pm (12:00 noon)', () => {
      const resNoon = parseReminderNaturalLanguage('call me at 12pm', {
        referenceDate: refMorningPHT,
      })
      expect(resNoon.ok).toBe(true)
      // 12:00 PM PHT = 04:00 UTC
      expect(new Date(resNoon.dueAt!).toISOString()).toBe('2026-11-12T04:00:00.000Z')

      const resMidnight = parseReminderNaturalLanguage('call me tomorrow at midnight', {
        referenceDate: refMorningPHT,
      })
      expect(resMidnight.ok).toBe(true)
      // Tomorrow Nov 13 midnight PHT = Nov 12 16:00 UTC
      expect(new Date(resMidnight.dueAt!).toISOString()).toBe('2026-11-12T16:00:00.000Z')
    })

    it('rolls over a time already past today to tomorrow with explicit read-back', () => {
      // Current time is 5:00 PM PHT (17:00)
      // User requests "call me at 2pm" (which was 3 hours ago today)
      const res = parseReminderNaturalLanguage('call me at 2pm', {
        referenceDate: refEveningPHT,
      })
      expect(res.ok).toBe(true)
      expect(res.isRolledOver).toBe(true)
      // Rolls over to tomorrow Nov 13 at 2:00 PM PHT (06:00 UTC Nov 13)
      expect(new Date(res.dueAt!).toISOString()).toBe('2026-11-13T06:00:00.000Z')
      expect(res.readBack).toContain('already passed today')
      expect(res.readBack).toContain('tomorrow, Friday 13 November, at 2:00 PM Philippine time')
    })

    it('handles month and year boundaries correctly', () => {
      // Month boundary: Nov 30 at 10 PM -> tomorrow at 9 AM is Dec 1
      const refNov30 = phtToUtcDate(2026, 11, 30, 22, 0, 0)
      const resMonth = parseReminderNaturalLanguage('call me tomorrow at 9am', {
        referenceDate: refNov30,
      })
      expect(resMonth.ok).toBe(true)
      expect(resMonth.readBack).toContain('1 December')

      // Year boundary: Dec 31 at 10 PM -> tomorrow at 9 AM is Jan 1, 2027
      const refDec31 = phtToUtcDate(2026, 12, 31, 22, 0, 0)
      const resYear = parseReminderNaturalLanguage('call me tomorrow at 9am', {
        referenceDate: refDec31,
      })
      expect(resYear.ok).toBe(true)
      expect(resYear.readBack).toContain('1 January')
    })

    it('rejects explicit past times and asks for clarification on ambiguous input', () => {
      const resPast = parseReminderNaturalLanguage('call me yesterday at 2pm', {
        referenceDate: refMorningPHT,
      })
      expect(resPast.ok).toBe(false)
      expect(resPast.error).toBe('past_time_rejected')

      const resAmbiguous = parseReminderNaturalLanguage('call me sometime soon', {
        referenceDate: refMorningPHT,
      })
      expect(resAmbiguous.ok).toBe(false)
      expect(resAmbiguous.clarificationNeeded).toBe(true)
      expect(resAmbiguous.clarifyingQuestion).toBeDefined()
    })
  })

  describe('2. ReminderManager Engine & Delivery Lifecycle', () => {
    let rm: ReminderManager

    beforeEach(() => {
      rm = new ReminderManager()
    })

    it('transitions through status lifecycle: scheduled -> due -> ringing -> answered -> acknowledged', () => {
      const rem = rm.createReminder({
        title: 'Check Redis Cluster',
        message: 'Ensure sentinel failover completed.',
        triggerKind: 'time',
        dueAt: new Date(Date.now() + 60000).toISOString(),
        createdBy: 'ui',
      })
      expect(rem.status).toBe('scheduled')

      // 1. Claim
      const claimed = rm.claimDueOccurrence(rem.id, 'occ_1', 'tab_alpha')
      expect(claimed).toBe(true)
      expect(rem.status).toBe('due')

      // 2. Ringing
      rm.triggerRinging(rem.id, 'occ_1')
      expect(rem.status).toBe('ringing')
      expect(rm.getCurrentRingingReminder()?.id).toBe(rem.id)

      // 3. Answer
      const answered = rm.answerCall(rem.id)
      expect(answered?.status).toBe('answered')

      // 4. Acknowledge
      const ack = rm.acknowledgeReminder(rem.id)
      expect(ack?.status).toBe('acknowledged')
      expect(rm.getCurrentRingingReminder()).toBeNull()
    })

    it('atomic claim: two simulated tabs racing on the same occurrence -> exactly 1 succeeds', () => {
      const rem = rm.createReminder({
        title: 'Deploy Hotfix',
        message: 'Check build status.',
        triggerKind: 'time',
        dueAt: new Date().toISOString(),
      })

      const occKey = `${rem.id}:unique_due_tick`

      const tab1Claim = rm.claimDueOccurrence(rem.id, occKey, 'tab_alpha')
      const tab2Claim = rm.claimDueOccurrence(rem.id, occKey, 'tab_beta')

      // Exactly one tab wins the atomic claim
      expect(tab1Claim).toBe(true)
      expect(tab2Claim).toBe(false)
    })

    it('snoozes a reminder for 10 minutes and computes next due timestamp', () => {
      const rem = rm.createReminder({
        title: 'Standup Sync',
        message: 'Daily standup.',
        triggerKind: 'time',
        dueAt: new Date().toISOString(),
      })

      const snoozed = rm.snoozeReminder(rem.id, 10)
      expect(snoozed?.status).toBe('snoozed')
      expect(snoozed?.next_due_at).toBeDefined()
      const diffMs = new Date(snoozed!.next_due_at!).getTime() - Date.now()
      expect(diffMs).toBeGreaterThan(9 * 60 * 1000)
    })

    it('handles missed calls when offline gap is detected and records honest audit event', () => {
      // Schedule reminder 10 minutes in the past
      const pastTime = new Date(Date.now() - 600000).toISOString()
      const rem = rm.createReminder({
        title: 'Morning Briefing',
        message: 'Missed briefing.',
        triggerKind: 'time',
        dueAt: pastTime,
      })

      // Scheduler tick runs
      const res = rm.checkScheduledReminders(new Date())
      expect(res.missedReminders.some((m) => m.id === rem.id)).toBe(true)
      expect(rem.status).toBe('missed')

      const events = rm.getReminderEvents()
      const missedEvent = events.find((e) => e.reminder_id === rem.id && e.kind === 'missed')
      expect(missedEvent).toBeDefined()
      expect(missedEvent?.detail).toContain('You missed a call from JARVIS')
    })

    it('triggers immediately on task completion event', () => {
      const rem = rm.createReminder({
        title: 'Review QA Regression',
        message: 'QA report is complete.',
        triggerKind: 'task_complete',
        condition: { taskKeyword: 'QA report' },
      })

      // Real task completion event arrives
      const triggered = rm.onTaskCompleted('Run full QA report regression verification')
      expect(triggered.length).toBe(1)
      expect(triggered[0].id).toBe(rem.id)
      expect(triggered[0].status).toBe('ringing')
    })

    it('triggers immediately when an approval waits longer than threshold', () => {
      const rem = rm.createReminder({
        title: 'Stalled Approval Alert',
        message: 'An approval needs your review.',
        triggerKind: 'approval_waiting',
        condition: { approvalMaxWaitMins: 30 },
      })

      const pending = [{ id: 'appr_critical_99', waitMinutes: 35 }]
      const triggered = rm.onApprovalWaitingCheck(pending)
      expect(triggered.length).toBe(1)
      expect(triggered[0].id).toBe(rem.id)
    })

    it('sanitizes secrets and credentials from reminder text', () => {
      const rem = rm.createReminder({
        title: 'Secret Token Alert',
        message: 'Here is your api_key=sk-123456789012345678901234 and ghp_abcdefghijklmnopqrstu.',
        triggerKind: 'time',
      })
      expect(rem.message).not.toContain('sk-123456789012345678901234')
      expect(rem.message).not.toContain('ghp_abcdefghijklmnopqrstu')
      expect(rem.message).toContain('[REDACTED_SECRET]')
    })

    it('manages web push subscriptions and exports clean RFC-4180 CSV', () => {
      const sub = rm.registerPushSubscription({
        endpoint: 'https://fcm.googleapis.com/fcm/send/test_sub_endpoint_1',
        keys: { p256dh: 'p256dh_key_data', auth: 'auth_key_data' },
        userAgent: 'Mozilla/5.0 Vitest Test Agent',
      })
      expect(sub.endpoint).toBe('https://fcm.googleapis.com/fcm/send/test_sub_endpoint_1')
      expect(rm.getSubscriptions().length).toBe(1)

      rm.removePushSubscription(sub.endpoint)
      expect(rm.getSubscriptions().length).toBe(0)

      const csv = rm.exportEventsCSV()
      expect(csv).toContain('Timestamp (PHT)')
      expect(csv).toContain('Reminder ID')
      expect(csv).toContain('Occurrence Key')
    })
  })

  describe('3. JARVIS Function Calling Tool Execution', () => {
    it('executes create_reminder with natural time "call me at 2pm"', () => {
      const res = executeJarvisTool('create_reminder', {
        natural_time: 'call me at 2pm about database index migration',
        title: 'Database Index Migration',
      })
      expect(res.output).toBeDefined()
      expect(res.output.ok).toBe(true)
      expect(res.output.reminderId).toBeDefined()
      expect(res.output.readBack).toContain('Philippine time')
    })

    it('executes list_reminders and returns active count', () => {
      const res = executeJarvisTool('list_reminders', { limit: 5 })
      expect(res.output).toBeDefined()
      expect(res.output.totalActive).toBeGreaterThanOrEqual(1)
      expect(Array.isArray(res.output.reminders)).toBe(true)
    })

    it('executes snooze_reminder and cancel_reminder', () => {
      const createRes = executeJarvisTool('create_reminder', {
        title: 'Cancel Test Reminder',
        natural_time: 'in 15 minutes',
      })
      const remId = createRes.output.reminderId as string

      const snoozeRes = executeJarvisTool('snooze_reminder', {
        reminder_id: remId,
        minutes: 10,
      })
      expect(snoozeRes.output.ok).toBe(true)

      const cancelRes = executeJarvisTool('cancel_reminder', {
        reminder_id: remId,
      })
      expect(cancelRes.output.ok).toBe(true)
    })
  })
})
