/**
 * Human-like Workday Schedule & Calendar Block Resolution Engine
 *
 * Resolves current active block (work, coffee_break, lunch, gym, night_rest, available)
 * based on real Philippine Standard Time, department, calendar rules, and custom blocks.
 */

import { getPHTParts } from './clock'

export type ScheduleBlockKind =
  | 'work'
  | 'coffee_break'
  | 'lunch'
  | 'gym'
  | 'night_rest'
  | 'social'
  | 'available'

export interface OfficeScheduleBlock {
  id: string
  kind: ScheduleBlockKind
  days: string[] // ['mon', 'tue', ...]
  startTime: string // "HH:MM" e.g. "08:00"
  endTime: string // "HH:MM" e.g. "17:00"
  department: string // 'ALL' or specific department
  enabled: boolean
}

export interface OfficeCalendarDay {
  date: string // "YYYY-MM-DD"
  kind: 'workday' | 'weekend' | 'holiday'
  label: string
}

export interface ActiveScheduleResolution {
  datePHT: string // "YYYY-MM-DD"
  timePHT: string // "HH:MM"
  dayKind: 'workday' | 'weekend' | 'holiday'
  dayLabel: string
  activeBlock: OfficeScheduleBlock
  isWorkHours: boolean
  isNightRest: boolean
  isBreakOrMeal: boolean
}

/**
 * Standard default schedule blocks (in PHT) seeded in Supabase
 */
export const DEFAULT_SCHEDULE_BLOCKS: OfficeScheduleBlock[] = [
  {
    id: 'night-rest-daily',
    kind: 'night_rest',
    days: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'],
    startTime: '22:00',
    endTime: '06:00',
    department: 'ALL',
    enabled: true,
  },
  {
    id: 'morning-standby-weekdays',
    kind: 'available',
    days: ['mon', 'tue', 'wed', 'thu', 'fri'],
    startTime: '06:00',
    endTime: '08:00',
    department: 'ALL',
    enabled: true,
  },
  {
    id: 'morning-work-block-1',
    kind: 'work',
    days: ['mon', 'tue', 'wed', 'thu', 'fri'],
    startTime: '08:00',
    endTime: '10:00',
    department: 'ALL',
    enabled: true,
  },
  {
    id: 'morning-coffee-break',
    kind: 'coffee_break',
    days: ['mon', 'tue', 'wed', 'thu', 'fri'],
    startTime: '10:00',
    endTime: '10:15',
    department: 'ALL',
    enabled: true,
  },
  {
    id: 'morning-work-block-2',
    kind: 'work',
    days: ['mon', 'tue', 'wed', 'thu', 'fri'],
    startTime: '10:15',
    endTime: '12:00',
    department: 'ALL',
    enabled: true,
  },
  {
    id: 'lunch-window',
    kind: 'lunch',
    days: ['mon', 'tue', 'wed', 'thu', 'fri'],
    startTime: '12:00',
    endTime: '13:00',
    department: 'ALL',
    enabled: true,
  },
  {
    id: 'afternoon-work-block-1',
    kind: 'work',
    days: ['mon', 'tue', 'wed', 'thu', 'fri'],
    startTime: '13:00',
    endTime: '15:00',
    department: 'ALL',
    enabled: true,
  },
  {
    id: 'afternoon-coffee-break',
    kind: 'coffee_break',
    days: ['mon', 'tue', 'wed', 'thu', 'fri'],
    startTime: '15:00',
    endTime: '15:15',
    department: 'ALL',
    enabled: true,
  },
  {
    id: 'afternoon-work-block-2',
    kind: 'work',
    days: ['mon', 'tue', 'wed', 'thu', 'fri'],
    startTime: '15:15',
    endTime: '17:00',
    department: 'ALL',
    enabled: true,
  },
  {
    id: 'evening-gym-slot',
    kind: 'gym',
    days: ['mon', 'tue', 'wed', 'thu', 'fri'],
    startTime: '17:00',
    endTime: '18:00',
    department: 'ALL',
    enabled: true,
  },
  {
    id: 'evening-social-lounge',
    kind: 'social',
    days: ['mon', 'tue', 'wed', 'thu', 'fri'],
    startTime: '18:00',
    endTime: '22:00',
    department: 'ALL',
    enabled: true,
  },
  {
    id: 'weekend-available-day',
    kind: 'available',
    days: ['sat', 'sun'],
    startTime: '06:00',
    endTime: '22:00',
    department: 'ALL',
    enabled: true,
  },
]

/**
 * Converts "HH:MM" string to minutes from midnight
 */
export function timeStringToMinutes(hhMm: string): number {
  const [h, m] = hhMm.split(':').map((s) => parseInt(s, 10))
  return (h || 0) * 60 + (m || 0)
}

/**
 * Checks if current minute falls within [startTime, endTime),
 * correctly handling overnight wraps (e.g. 22:00 to 06:00).
 */
export function isMinuteInInterval(
  currentMin: number,
  startTime: string,
  endTime: string
): boolean {
  const start = timeStringToMinutes(startTime)
  const end = timeStringToMinutes(endTime)

  if (start <= end) {
    // Normal interval (e.g. 08:00 - 17:00)
    return currentMin >= start && currentMin < end
  }
  // Overnight interval (e.g. 22:00 - 06:00)
  return currentMin >= start || currentMin < end
}

/**
 * Resolves calendar day type (workday, weekend, holiday) for given date
 */
export function resolveCalendarDay(
  date: Date = new Date(),
  calendarRows: OfficeCalendarDay[] = []
): { kind: 'workday' | 'weekend' | 'holiday'; label: string; dateStr: string } {
  const pht = getPHTParts(date)
  const dateStr = `${pht.year}-${pht.month.toString().padStart(2, '0')}-${pht.day.toString().padStart(2, '0')}`

  // 1. Check custom calendar entries (holidays or special workdays)
  const matched = calendarRows.find((r) => r.date === dateStr)
  if (matched) {
    return { kind: matched.kind, label: matched.label, dateStr }
  }

  // 2. Default standard weekend vs workday
  const isWeekend = pht.weekday === 'Sat' || pht.weekday === 'Sun'
  return {
    kind: isWeekend ? 'weekend' : 'workday',
    label: isWeekend ? 'Weekend' : 'Regular Workday',
    dateStr,
  }
}

/**
 * Resolves the active schedule block for an agent given real PHT date, department,
 * schedule blocks list, and calendar overrides.
 */
export function resolveActiveScheduleBlock(
  date: Date = new Date(),
  department = 'ALL',
  blocks: OfficeScheduleBlock[] = DEFAULT_SCHEDULE_BLOCKS,
  calendarRows: OfficeCalendarDay[] = []
): ActiveScheduleResolution {
  const pht = getPHTParts(date)
  const dayNameLower = pht.weekday.toLowerCase().slice(0, 3) // 'mon', 'tue', etc.
  const currentMin = pht.hour * 60 + pht.minute
  const timeStr = `${pht.hour.toString().padStart(2, '0')}:${pht.minute.toString().padStart(2, '0')}`

  const calDay = resolveCalendarDay(date, calendarRows)

  // Filter enabled blocks that apply today
  const candidateBlocks = blocks.filter((b) => {
    if (!b.enabled) return false
    const appliesToDay = b.days.some((d) => d.toLowerCase() === dayNameLower)
    const appliesToDept =
      b.department === 'ALL' ||
      b.department.toUpperCase() === department.toUpperCase()
    return appliesToDay && appliesToDept
  })

  // If holiday or weekend, night_rest still applies at night, otherwise 'available'
  if (calDay.kind === 'holiday' || calDay.kind === 'weekend') {
    const nightBlock = candidateBlocks.find(
      (b) =>
        b.kind === 'night_rest' &&
        isMinuteInInterval(currentMin, b.startTime, b.endTime)
    )
    if (nightBlock) {
      return {
        datePHT: calDay.dateStr,
        timePHT: timeStr,
        dayKind: calDay.kind,
        dayLabel: calDay.label,
        activeBlock: nightBlock,
        isWorkHours: false,
        isNightRest: true,
        isBreakOrMeal: false,
      }
    }
    // Rest of weekend / holiday is leisure / available
    const availableBlock: OfficeScheduleBlock = {
      id: `cal-${calDay.kind}-${calDay.dateStr}`,
      kind: 'available',
      days: [dayNameLower],
      startTime: '06:00',
      endTime: '22:00',
      department: 'ALL',
      enabled: true,
    }
    return {
      datePHT: calDay.dateStr,
      timePHT: timeStr,
      dayKind: calDay.kind,
      dayLabel: calDay.label,
      activeBlock: availableBlock,
      isWorkHours: false,
      isNightRest: false,
      isBreakOrMeal: false,
    }
  }

  // Regular Workday: find matching schedule block
  // Sort priority: department-specific first, then break/meal, then work
  const matching = candidateBlocks.find((b) =>
    isMinuteInInterval(currentMin, b.startTime, b.endTime)
  )

  const activeBlock =
    matching ||
    ({
      id: 'fallback-available',
      kind: 'available',
      days: [dayNameLower],
      startTime: '00:00',
      endTime: '23:59',
      department: 'ALL',
      enabled: true,
    } as OfficeScheduleBlock)

  const isWorkHours = activeBlock.kind === 'work'
  const isNightRest = activeBlock.kind === 'night_rest'
  const isBreakOrMeal =
    activeBlock.kind === 'coffee_break' ||
    activeBlock.kind === 'lunch' ||
    activeBlock.kind === 'gym'

  return {
    datePHT: calDay.dateStr,
    timePHT: timeStr,
    dayKind: calDay.kind,
    dayLabel: calDay.label,
    activeBlock,
    isWorkHours,
    isNightRest,
    isBreakOrMeal,
  }
}
