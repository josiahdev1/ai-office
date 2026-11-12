/**
 * Natural Language Time & Reminder Parser for JARVIS (Phase K8)
 *
 * Implements deterministic date math in Asia/Manila (PHT, UTC+8).
 * Never relies on host server local timezone (which is UTC on Vercel/cloud).
 *
 * Handles:
 * - "2pm", "2:30 pm", "14:00"
 * - "in 10 minutes", "in 2 hours", "in 30 mins"
 * - "tomorrow at 9", "tomorrow at 9am"
 * - "next Monday at 3pm"
 * - "every weekday at 8:30"
 * - "midnight" / "12am" (00:00) vs "12pm" (12:00)
 * - Past time detection & automatic roll-over to next day with explicit read-back
 * - Month and year boundaries (Nov 30 -> Dec 1, Dec 31 -> Jan 1)
 * - Confirmation read-back text with words and numbers
 */

import { getPHTParts } from '@/lib/office/clock'

export type ReminderTriggerKind = 'time' | 'recurring' | 'task_complete' | 'approval_waiting'

export interface ParsedReminderResult {
  ok: boolean
  triggerKind: ReminderTriggerKind
  dueAt: string | null // ISO string in UTC
  dueAtPHT: string | null // Human readable formatted PHT string
  readBack: string // Formatted verbal readback
  title: string
  message: string
  recurrence?: {
    pattern: 'weekdays' | 'daily' | 'weekly' | 'none'
    hour: number
    minute: number
    daysOfWeek?: number[] // 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat, 0=Sun
  }
  condition?: {
    taskKeyword?: string
    approvalMaxWaitMins?: number
  }
  isRolledOver?: boolean
  clarificationNeeded?: boolean
  clarifyingQuestion?: string
  error?: string
}

export interface ParseOptions {
  referenceDate?: Date // Allows test injection of "now"
  timezone?: string // Default 'Asia/Manila'
}

/**
 * Converts a PHT calendar date (year, month 1-12, day 1-31, hour 0-23, min, sec)
 * to a standard UTC Date instance.
 * Asia/Manila is fixed UTC+8 with zero daylight savings.
 */
export function phtToUtcDate(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number = 0,
  second: number = 0
): Date {
  // PHT is UTC+8, so UTC hour = PHT hour - 8
  return new Date(Date.UTC(year, month - 1, day, hour - 8, minute, second, 0))
}

const MONTH_NAMES_FULL = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

/**
 * Formats a 12-hour time string from hour (0-23) and minute (0-59)
 */
export function formatTime12h(hour: number, minute: number): string {
  const ampm = hour >= 12 ? 'PM' : 'AM'
  const h12 = hour % 12 === 0 ? 12 : hour % 12
  const minStr = minute === 0 ? ':00' : `:${String(minute).padStart(2, '0')}`
  return `${h12}${minStr} ${ampm}`
}

/**
 * Parses natural language input string into a structured reminder specification.
 */
export function parseReminderNaturalLanguage(
  input: string,
  options: ParseOptions = {}
): ParsedReminderResult {
  const refDate = options.referenceDate || new Date()
  const phtNow = getPHTParts(refDate)
  const text = input.trim()
  const lower = text.toLowerCase()

  if (!text) {
    return {
      ok: false,
      triggerKind: 'time',
      dueAt: null,
      dueAtPHT: null,
      readBack: '',
      title: 'Reminder',
      message: '',
      clarificationNeeded: true,
      clarifyingQuestion: 'What time would you like me to call you?',
      error: 'empty_input',
    }
  }

  // 1. Check for Event-Based Triggers (Task Completion or Approval Waiting)
  const taskCompleteMatch = lower.match(/(?:call|remind)\s+me\s+when\s+(?:the\s+)?(.+?)\s+(?:is\s+)?(?:done|complete|finishes)/i)
  if (taskCompleteMatch) {
    const taskKeyword = taskCompleteMatch[1].trim()
    const msg = `Task '${taskKeyword}' has completed.`
    return {
      ok: true,
      triggerKind: 'task_complete',
      dueAt: null,
      dueAtPHT: null,
      readBack: `I will call you immediately when the '${taskKeyword}' task is completed. Shall I?`,
      title: `Task Alert: ${taskKeyword}`,
      message: msg,
      condition: { taskKeyword },
    }
  }

  const approvalWaitingMatch = lower.match(/(?:call|remind)\s+me\s+if\s+(?:an?\s+)?approval\s+waits?\s+(?:more\s+than\s+)?(\d+)\s*(?:min|minute|mins)/i)
  if (approvalWaitingMatch) {
    const waitMins = parseInt(approvalWaitingMatch[1], 10)
    return {
      ok: true,
      triggerKind: 'approval_waiting',
      dueAt: null,
      dueAtPHT: null,
      readBack: `I will call you if any pending approval waits longer than ${waitMins} minutes. Shall I?`,
      title: 'Approval Wait Escalation',
      message: `An approval has been waiting for more than ${waitMins} minutes.`,
      condition: { approvalMaxWaitMins: waitMins },
    }
  }

  // 2. Extract Message / Subject if provided
  let userMessage = ''
  let userTitle = 'JARVIS Reminder'

  const aboutMatch = text.match(/(?:about|to|for)\s+(.+)$/i)
  if (aboutMatch) {
    userMessage = aboutMatch[1].trim()
    userTitle = userMessage.length > 40 ? `${userMessage.substring(0, 37)}...` : userMessage
  }

  // 3. Check for Recurrence ("every weekday at 8:30", "every day at 9")
  const recurringWeekdayMatch = lower.match(/every\s+weekday\s+(?:at\s+)?(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i)
  if (recurringWeekdayMatch) {
    let hour = parseInt(recurringWeekdayMatch[1], 10)
    const minute = recurringWeekdayMatch[2] ? parseInt(recurringWeekdayMatch[2], 10) : 0
    const ampm = recurringWeekdayMatch[3] ? recurringWeekdayMatch[3].toLowerCase() : null

    if (ampm === 'pm' && hour < 12) hour += 12
    if (ampm === 'am' && hour === 12) hour = 0

    // Compute first occurrence in PHT
    const targetYear = phtNow.year
    const targetMonth = phtNow.month
    const targetDay = phtNow.day

    const isTodayPastTime =
      phtNow.hour > hour || (phtNow.hour === hour && phtNow.minute >= minute)

    let testDate = phtToUtcDate(targetYear, targetMonth, targetDay, hour, minute)
    let testParts = getPHTParts(testDate)

    // Weekdays are Mon-Fri (1-5 in JS getUTCDay() for PHT parts)
    const isWeekend = testParts.weekday === 'Sat' || testParts.weekday === 'Sun'
    if (isTodayPastTime || isWeekend) {
      // Find next weekday
      for (let i = 1; i <= 7; i++) {
        const nextDate = new Date(testDate.getTime() + i * 24 * 60 * 60 * 1000)
        const nextParts = getPHTParts(nextDate)
        if (nextParts.weekday !== 'Sat' && nextParts.weekday !== 'Sun') {
          testDate = nextDate
          testParts = nextParts
          break
        }
      }
    }

    const time12 = formatTime12h(hour, minute)
    return {
      ok: true,
      triggerKind: 'recurring',
      dueAt: testDate.toISOString(),
      dueAtPHT: `${testParts.weekdayFull}, ${testParts.day} ${MONTH_NAMES_FULL[testParts.month - 1]} at ${time12}`,
      readBack: `I will call you every weekday at ${time12} Philippine time, starting ${testParts.weekdayFull} ${testParts.day} ${MONTH_NAMES_FULL[testParts.month - 1]}. Shall I?`,
      title: userTitle || 'Daily Standup Reminder',
      message: userMessage || 'Scheduled weekday reminder from JARVIS.',
      recurrence: {
        pattern: 'weekdays',
        hour,
        minute,
        daysOfWeek: [1, 2, 3, 4, 5],
      },
    }
  }

  // 4. Relative Offsets ("in 10 minutes", "in 2 hours", "in 30 mins")
  const relativeMatch = lower.match(/in\s+(\d+)\s*(minute|min|mins|minutes|hour|hours|hr|hrs)/i)
  if (relativeMatch) {
    const amount = parseInt(relativeMatch[1], 10)
    const unit = relativeMatch[2].toLowerCase()
    const isHours = unit.startsWith('h')
    const addMs = amount * (isHours ? 3600000 : 60000)
    const targetDate = new Date(refDate.getTime() + addMs)
    const targetPHT = getPHTParts(targetDate)
    const time12 = formatTime12h(targetPHT.hour, targetPHT.minute)

    const isToday =
      targetPHT.day === phtNow.day &&
      targetPHT.month === phtNow.month &&
      targetPHT.year === phtNow.year

    const dayLabel = isToday ? 'today' : 'tomorrow'
    const readBack = `I will call you ${dayLabel}, ${targetPHT.weekdayFull} ${targetPHT.day} ${MONTH_NAMES_FULL[targetPHT.month - 1]}, at ${time12} Philippine time. Shall I?`

    return {
      ok: true,
      triggerKind: 'time',
      dueAt: targetDate.toISOString(),
      dueAtPHT: `${targetPHT.weekdayFull}, ${targetPHT.day} ${MONTH_NAMES_FULL[targetPHT.month - 1]} at ${time12}`,
      readBack,
      title: userTitle || 'Reminder',
      message: userMessage || `Relative reminder scheduled for ${time12}.`,
    }
  }

  // 5. Day Specification (Today, Tomorrow, or Specific Weekday)
  let dayOffset = 0
  let isTomorrowExplicit = false
  let isSpecificWeekday = false

  if (lower.includes('tomorrow')) {
    dayOffset = 1
    isTomorrowExplicit = true
  } else {
    for (let i = 0; i < DAY_NAMES.length; i++) {
      const dayName = DAY_NAMES[i].toLowerCase()
      if (lower.includes(`next ${dayName}`) || lower.includes(`on ${dayName}`)) {
        isSpecificWeekday = true
        // Calculate offset to next target weekday
        const currentDayIndex = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'].indexOf(
          phtNow.weekday.toLowerCase()
        )
        let diff = i - currentDayIndex
        if (diff <= 0) diff += 7
        dayOffset = diff
        break
      }
    }
  }

  // 6. Time Matching
  // Patterns:
  // - "midnight" / "12am" -> 00:00
  // - "noon" / "12pm" -> 12:00
  // - "2:30 pm", "2:30pm", "2pm", "2 pm", "14:00"
  // - "at 9", "at 9am"
  let parsedHour: number | null = null
  let parsedMinute: number = 0

  if (lower.includes('midnight') || lower.includes('12am') || lower.includes('12 am')) {
    parsedHour = 0
    parsedMinute = 0
  } else if (lower.includes('noon') || lower.includes('12pm') || lower.includes('12 pm')) {
    parsedHour = 12
    parsedMinute = 0
  } else {
    // Check 24-hour time "14:00" or "09:30"
    const militaryMatch = lower.match(/(?:at\s+)?([01]?\d|2[0-3]):([0-5]\d)(?!\s*[ap]m)/i)
    if (militaryMatch) {
      parsedHour = parseInt(militaryMatch[1], 10)
      parsedMinute = parseInt(militaryMatch[2], 10)
    } else {
      // Check 12-hour time "2:30 pm", "2pm", "9am", "at 9"
      const time12Match = lower.match(/(?:at\s+)?(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i)
      if (time12Match) {
        let rawHour = parseInt(time12Match[1], 10)
        parsedMinute = time12Match[2] ? parseInt(time12Match[2], 10) : 0
        const ampm = time12Match[3] ? time12Match[3].toLowerCase() : null

        if (ampm === 'pm') {
          if (rawHour < 12) rawHour += 12
        } else if (ampm === 'am') {
          if (rawHour === 12) rawHour = 0
        } else if (!ampm) {
          // Default: if <= 6, assume afternoon PM (e.g. "at 2" -> 2 PM = 14)
          // If between 7 and 11, assume AM (e.g. "at 9" -> 9 AM)
          if (rawHour >= 1 && rawHour <= 6) {
            rawHour += 12
          }
        }
        parsedHour = rawHour
      }
    }
  }

  if (parsedHour === null || isNaN(parsedHour) || parsedHour < 0 || parsedHour > 23) {
    return {
      ok: false,
      triggerKind: 'time',
      dueAt: null,
      dueAtPHT: null,
      readBack: '',
      title: userTitle,
      message: userMessage,
      clarificationNeeded: true,
      clarifyingQuestion: 'What time would you like me to call you? (e.g. 2:00 PM)',
      error: 'ambiguous_time',
    }
  }

  // 7. Calculate Candidate Target Date
  const targetYear = phtNow.year
  const targetMonth = phtNow.month
  const targetDay = phtNow.day + dayOffset

  // Handle month rollover if dayOffset pushed beyond days in current month
  // Create test date in UTC using phtToUtcDate
  let candidateDate = phtToUtcDate(targetYear, targetMonth, targetDay, parsedHour, parsedMinute)
  let candidatePHT = getPHTParts(candidateDate)

  let isRolledOver = false

  // Check if target is already in past today (and no explicit tomorrow or future weekday was stated)
  if (!isTomorrowExplicit && !isSpecificWeekday && dayOffset === 0) {
    const isPastTimeToday =
      candidateDate.getTime() <= refDate.getTime()

    if (isPastTimeToday) {
      // Roll over to tomorrow at the exact same hour/minute
      candidateDate = new Date(candidateDate.getTime() + 24 * 60 * 60 * 1000)
      candidatePHT = getPHTParts(candidateDate)
      isRolledOver = true
    }
  }

  // Reject explicitly requested past dates
  if (lower.includes('yesterday')) {
    return {
      ok: false,
      triggerKind: 'time',
      dueAt: null,
      dueAtPHT: null,
      readBack: 'I cannot schedule a reminder in the past.',
      title: userTitle,
      message: userMessage,
      error: 'past_time_rejected',
    }
  }

  const time12Str = formatTime12h(candidatePHT.hour, candidatePHT.minute)
  const isToday =
    candidatePHT.day === phtNow.day &&
    candidatePHT.month === phtNow.month &&
    candidatePHT.year === phtNow.year

  let daySpoken = isToday ? 'today' : isRolledOver ? 'tomorrow' : candidatePHT.weekdayFull
  if (!isToday && isTomorrowExplicit) daySpoken = 'tomorrow'

  let readBack = ''
  if (isRolledOver) {
    readBack = `I noticed ${time12Str} has already passed today. I will call you tomorrow, ${candidatePHT.weekdayFull} ${candidatePHT.day} ${MONTH_NAMES_FULL[candidatePHT.month - 1]}, at ${time12Str} Philippine time. Shall I?`
  } else {
    readBack = `I will call you ${daySpoken}, ${candidatePHT.weekdayFull} ${candidatePHT.day} ${MONTH_NAMES_FULL[candidatePHT.month - 1]}, at ${time12Str} Philippine time. Shall I?`
  }

  return {
    ok: true,
    triggerKind: 'time',
    dueAt: candidateDate.toISOString(),
    dueAtPHT: `${candidatePHT.weekdayFull}, ${candidatePHT.day} ${MONTH_NAMES_FULL[candidatePHT.month - 1]} at ${time12Str}`,
    readBack,
    title: userTitle || 'Call with JARVIS',
    message: userMessage || `Reminder call from JARVIS scheduled for ${time12Str}.`,
    isRolledOver,
  }
}
