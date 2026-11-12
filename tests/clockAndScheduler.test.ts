import { describe, it, expect, beforeEach } from 'vitest'
import {
  getPHTParts,
  formatIloiloClock,
  calculateSolarTimes,
  computeSolarLighting,
} from '../src/lib/office/clock'
import {
  resolveActiveScheduleBlock,
  isMinuteInInterval,
  timeStringToMinutes,
  DEFAULT_SCHEDULE_BLOCKS,
} from '../src/lib/office/schedule'
import {
  getActiveMapVersion,
  saveMapVersion,
  undoMapVersion,
  resetMapVersionsForTest,
} from '../src/lib/office/mapVersionManager'
import {
  acquireOrRenewLeaderLease,
  releaseLeaderLease,
  executeWorldTick,
  verifyCronSecret,
  resetSchedulerForTest,
} from '../src/lib/office/scheduler'

describe('Phase K1: Real Iloilo Clock, Solar Model, and Timezone Tests', () => {
  it('1. correctly converts UTC timestamps to PHT (Asia/Manila, UTC+8) regardless of host timezone', () => {
    // 00:00:00 UTC on Nov 12, 2026 is 08:00:00 PHT on Nov 12, 2026
    const testUtc = new Date(Date.UTC(2026, 10, 12, 0, 0, 0))
    const pht = getPHTParts(testUtc)

    expect(pht.year).toBe(2026)
    expect(pht.month).toBe(11)
    expect(pht.day).toBe(12)
    expect(pht.hour).toBe(8)
    expect(pht.minute).toBe(0)
    expect(pht.weekday).toBe('Thu')

    const clockFormatted = formatIloiloClock(testUtc)
    expect(clockFormatted).toContain('Thu 12 Nov')
    expect(clockFormatted).toContain('8:00 AM PHT · Iloilo')
  })

  it('2. accurately computes Iloilo City sunrise and sunset times matching verified astronomical data', () => {
    // Mid-November in Iloilo City (lat: 10.72° N, lng: 122.56° E)
    // Reference astronomical range: Sunrise ~05:40 - 05:45 AM PHT; Sunset ~17:25 - 17:35 PM PHT
    const testDate = new Date(Date.UTC(2026, 10, 12, 4, 0, 0)) // 12:00 PM PHT
    const solar = calculateSolarTimes(testDate)

    expect(solar.sunrisePHT).toMatch(/^05:4[0-9]/) // Between 05:40 and 05:49
    expect(solar.sunsetPHT).toMatch(/^17:2[0-9]|^17:3[0-5]/) // Between 17:20 and 17:35

    // Day length should be ~11.7 hours (~11h 40m - 11h 50m)
    const dayLengthHours = solar.sunsetDecimal - solar.sunriseDecimal
    expect(dayLengthHours).toBeGreaterThan(11.5)
    expect(dayLengthHours).toBeLessThan(12.0)

    // At 12:00 PM PHT, sun should be high in the sky (solar altitude > 55°)
    expect(solar.solarAltitudeDeg).toBeGreaterThan(55)
    expect(solar.isDaylight).toBe(true)
    expect(solar.isNight).toBe(false)
  })

  it('3. drives realistic 3D lighting phases for Iloilo City solar positions', () => {
    // Midday (12:00 PM PHT) -> Full bright daylight, lamps off
    const midday = new Date(Date.UTC(2026, 10, 12, 4, 0, 0))
    const dayLight = computeSolarLighting(midday)
    expect(dayLight.phase).toBe('day')
    expect(dayLight.sunIntensity).toBeGreaterThan(1.5)
    expect(dayLight.interiorLampsOn).toBe(false)

    // Midnight (00:00 AM PHT) -> Deep night mode, interior lamps on, cool moonlight
    const midnight = new Date(Date.UTC(2026, 10, 11, 16, 0, 0))
    const nightLight = computeSolarLighting(midnight)
    expect(nightLight.phase).toBe('night')
    expect(nightLight.interiorLampsOn).toBe(true)
    expect(nightLight.sunColor).toBe('#60a5fa')
  })
})

describe('Phase K1: Schedule Block & Calendar Resolution', () => {
  it('1. correctly parses time strings and intervals including overnight wraps', () => {
    expect(timeStringToMinutes('08:30')).toBe(510)
    expect(timeStringToMinutes('22:00')).toBe(1320)
    expect(timeStringToMinutes('06:00')).toBe(360)

    // 09:00 falls in 08:00 - 10:00
    expect(isMinuteInInterval(540, '08:00', '10:00')).toBe(true)
    // 10:30 does not fall in 08:00 - 10:00
    expect(isMinuteInInterval(630, '08:00', '10:00')).toBe(false)

    // 23:30 (1410m) falls in overnight 22:00 - 06:00
    expect(isMinuteInInterval(1410, '22:00', '06:00')).toBe(true)
    // 04:15 (255m) falls in overnight 22:00 - 06:00
    expect(isMinuteInInterval(255, '22:00', '06:00')).toBe(true)
    // 14:00 (840m) does NOT fall in overnight 22:00 - 06:00
    expect(isMinuteInInterval(840, '22:00', '06:00')).toBe(false)
  })

  it('2. resolves weekday schedule blocks (work, coffee break, lunch, gym, night rest)', () => {
    // Thursday 09:30 AM PHT -> work
    const workTime = new Date(Date.UTC(2026, 10, 12, 1, 30, 0))
    const workRes = resolveActiveScheduleBlock(workTime, 'ENGINEERING')
    expect(workRes.dayKind).toBe('workday')
    expect(workRes.activeBlock.kind).toBe('work')
    expect(workRes.isWorkHours).toBe(true)

    // Thursday 10:05 AM PHT -> coffee break
    const coffeeTime = new Date(Date.UTC(2026, 10, 12, 2, 5, 0))
    const coffeeRes = resolveActiveScheduleBlock(coffeeTime, 'ENGINEERING')
    expect(coffeeRes.activeBlock.kind).toBe('coffee_break')
    expect(coffeeRes.isBreakOrMeal).toBe(true)

    // Thursday 12:30 PM PHT -> lunch
    const lunchTime = new Date(Date.UTC(2026, 10, 12, 4, 30, 0))
    const lunchRes = resolveActiveScheduleBlock(lunchTime, 'ENGINEERING')
    expect(lunchRes.activeBlock.kind).toBe('lunch')

    // Thursday 23:00 PM PHT -> night_rest
    const nightTime = new Date(Date.UTC(2026, 10, 12, 15, 0, 0))
    const nightRes = resolveActiveScheduleBlock(nightTime, 'ENGINEERING')
    expect(nightRes.activeBlock.kind).toBe('night_rest')
    expect(nightRes.isNightRest).toBe(true)
  })

  it('3. resolves weekend and holiday calendar overrides without forced work blocks', () => {
    // Saturday 14:00 PM PHT -> weekend available
    const satDate = new Date(Date.UTC(2026, 10, 14, 6, 0, 0))
    const satRes = resolveActiveScheduleBlock(satDate, 'ENGINEERING')
    expect(satRes.dayKind).toBe('weekend')
    expect(satRes.activeBlock.kind).toBe('available')
    expect(satRes.isWorkHours).toBe(false)

    // Custom holiday override on a Thursday
    const holidayDate = new Date(Date.UTC(2026, 10, 12, 1, 30, 0))
    const holidayRes = resolveActiveScheduleBlock(
      holidayDate,
      'ENGINEERING',
      DEFAULT_SCHEDULE_BLOCKS,
      [{ date: '2026-11-12', kind: 'holiday', label: 'Iloilo Liberation Day' }]
    )
    expect(holidayRes.dayKind).toBe('holiday')
    expect(holidayRes.dayLabel).toBe('Iloilo Liberation Day')
    expect(holidayRes.activeBlock.kind).toBe('available')
    expect(holidayRes.isWorkHours).toBe(false)
  })
})

describe('Phase K1: Map Version Manager & Undo System', () => {
  beforeEach(() => {
    resetMapVersionsForTest()
  })

  it('1. retrieves baseline version 1 map document', () => {
    const active = getActiveMapVersion()
    expect(active.version).toBe(1)
    expect(active.isActive).toBe(true)
    expect(active.mapData.zones.length).toBeGreaterThan(0)
    expect(active.mapData.desks.length).toBeGreaterThan(0)
  })

  it('2. validates and increments map version on modification', () => {
    const active = getActiveMapVersion()
    const modified = JSON.parse(JSON.stringify(active.mapData))

    // Valid modification (rename a zone label)
    modified.zones[0].label = 'Updated Engineering Core'

    const result = saveMapVersion(modified, 'Josiah', 'Updated zone label')
    expect(result.success).toBe(true)
    expect(result.versionRecord?.version).toBe(2)
    expect(result.versionRecord?.isActive).toBe(true)

    // Newly active map has version 2
    expect(getActiveMapVersion().version).toBe(2)
  })

  it('3. rejects invalid map modifications that violate spatial boundaries', () => {
    const active = getActiveMapVersion()
    const invalid = JSON.parse(JSON.stringify(active.mapData))

    // Move furniture outside boundary (gx = 999)
    invalid.furniture[0].gx = 999

    const result = saveMapVersion(invalid, 'Josiah', 'Invalid boundary test')
    expect(result.success).toBe(false)
    expect(result.errors?.length).toBeGreaterThan(0)

    // Current version remains unchanged at 1
    expect(getActiveMapVersion().version).toBe(1)
  })

  it('4. performs seamless undo to the previous map version', () => {
    const active = getActiveMapVersion()
    const modified = JSON.parse(JSON.stringify(active.mapData))
    modified.zones[0].label = 'Version 2 Zone'

    saveMapVersion(modified, 'Josiah', 'Created version 2')
    expect(getActiveMapVersion().version).toBe(2)

    // Perform Undo
    const undoRes = undoMapVersion()
    expect(undoRes.success).toBe(true)
    expect(getActiveMapVersion().version).toBe(1)
    expect(undoRes.activeVersion?.version).toBe(1)
  })
})

describe('Phase K1: Distributed Scheduler & Leader Lease Tests', () => {
  beforeEach(() => {
    resetSchedulerForTest()
  })

  it('1. elects single leader tab and prevents concurrent double-ticking', () => {
    const now = new Date('2026-11-12T08:00:00Z')

    // Tab A claims lease
    const claimA = acquireOrRenewLeaderLease('tab-a', 30, now)
    expect(claimA.isLeader).toBe(true)
    expect(claimA.currentLeader).toBe('tab-a')

    // Tab B attempts to claim while Tab A's lease is active -> Rejected!
    const claimB = acquireOrRenewLeaderLease('tab-b', 30, now)
    expect(claimB.isLeader).toBe(false)
    expect(claimB.currentLeader).toBe('tab-a')

    // Tab A renews lease -> Permitted!
    const renewA = acquireOrRenewLeaderLease('tab-a', 30, new Date('2026-11-12T08:00:10Z'))
    expect(renewA.isLeader).toBe(true)

    // Tab A explicitly releases lease -> Tab B can now claim!
    releaseLeaderLease('tab-a')
    const claimBAfterRelease = acquireOrRenewLeaderLease('tab-b', 30, new Date('2026-11-12T08:00:11Z'))
    expect(claimBAfterRelease.isLeader).toBe(true)
    expect(claimBAfterRelease.currentLeader).toBe('tab-b')
  })

  it('2. executes world tick and detects gaps honestly without fake backfill', () => {
    const t0 = new Date('2026-11-12T08:00:00Z')
    const tick1 = executeWorldTick('leader_tab', t0)
    expect(tick1.success).toBe(true)
    expect(tick1.tickCount).toBe(1)
    expect(tick1.gapDetected).toBe(false)

    // Normal tick 60s later -> No gap
    const t1 = new Date('2026-11-12T08:01:00Z')
    const tick2 = executeWorldTick('leader_tab', t1)
    expect(tick2.tickCount).toBe(2)
    expect(tick2.gapDetected).toBe(false)

    // Gap of 2 hours (7,200s) -> Honest catch-up log without fabricated ticks
    const t2 = new Date('2026-11-12T10:01:00Z')
    const tickGap = executeWorldTick('cron', t2)
    expect(tickGap.tickCount).toBe(3)
    expect(tickGap.gapDetected).toBe(true)
    expect(tickGap.gapDurationS).toBe(7200)
    expect(tickGap.gapSummary).toContain('No tick for 2h 0m: needs recomputed from schedule rules')
  })

  it('3. timing-safe verification protects CRON_SECRET against timing attacks', () => {
    const secret = 'super-secret-key-12345'
    expect(verifyCronSecret(secret, secret)).toBe(true)
    expect(verifyCronSecret('wrong-secret', secret)).toBe(false)
    expect(verifyCronSecret('', secret)).toBe(false)
    expect(verifyCronSecret(null, secret)).toBe(false)
    expect(verifyCronSecret(undefined, secret)).toBe(false)
  })
})
