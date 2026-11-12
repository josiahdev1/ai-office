/**
 * Real Iloilo Standard Time (PHT, Asia/Manila, UTC+8) & Astronomical Solar Model
 *
 * Implements pure mathematical NOAA solar position & sunrise/sunset calculation
 * for Iloilo City, Philippines (10.7202° N, 122.5621° E).
 *
 * All time conversions strictly use Intl.DateTimeFormat with timeZone: 'Asia/Manila'.
 * Never trusts server local timezone (which runs UTC on Vercel).
 */

export interface IloiloCoordinates {
  latitude: number
  longitude: number
  timezone: string
  cityLabel: string
}

export const ILOILO_COORDINATES: IloiloCoordinates = {
  latitude: 10.7202,
  longitude: 122.5621,
  timezone: 'Asia/Manila',
  cityLabel: 'Iloilo City',
}

export interface SolarTimes {
  sunrisePHT: string // e.g. "05:42"
  sunsetPHT: string // e.g. "17:28"
  solarNoonPHT: string // e.g. "11:35"
  sunriseDecimal: number // e.g. 5.7
  sunsetDecimal: number // e.g. 17.46
  solarAltitudeDeg: number // elevation above horizon (-90 to +90)
  solarAzimuthDeg: number // compass heading (0 to 360)
  isDaylight: boolean
  isGoldenHour: boolean
  isTwilight: boolean
  isNight: boolean
}

export interface SolarLightingSpec {
  phase: 'day' | 'golden_hour' | 'twilight' | 'night'
  sunPosition: [number, number, number]
  sunColor: string
  sunIntensity: number
  ambientColor: string
  ambientIntensity: number
  skyColor: string
  windowGlowColor: string
  windowGlowIntensity: number
  interiorLampsOn: boolean
}

export interface PHTDateParts {
  year: number
  month: number // 1-12
  day: number // 1-31
  hour: number // 0-23
  minute: number // 0-59
  second: number // 0-59
  weekday: string // 'Mon', 'Tue', etc.
  weekdayFull: string // 'Monday', 'Tuesday', etc.
  monthName: string // 'Jan', 'Feb', etc.
  decimalHour: number // e.g. 17.5 for 5:30 PM
}

/**
 * Extracts exact year, month, day, hour, minute, second in PHT (Asia/Manila)
 * using Intl.DateTimeFormat regardless of the hosting system's local timezone.
 */
export function getPHTParts(date: Date = new Date()): PHTDateParts {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Manila',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    hour12: false,
    weekday: 'short',
  })

  const fullWeekdayFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Manila',
    weekday: 'long',
  })

  const monthNameFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Manila',
    month: 'short',
  })

  const parts = formatter.formatToParts(date)
  let year = date.getUTCFullYear()
  let month = date.getUTCMonth() + 1
  let day = date.getUTCDate()
  let hour = date.getUTCHours()
  let minute = date.getUTCMinutes()
  let second = date.getUTCSeconds()
  let weekday = 'Thu'

  for (const p of parts) {
    if (p.type === 'year') year = parseInt(p.value, 10)
    if (p.type === 'month') month = parseInt(p.value, 10)
    if (p.type === 'day') day = parseInt(p.value, 10)
    if (p.type === 'hour') {
      const h = parseInt(p.value, 10)
      hour = h === 24 ? 0 : h
    }
    if (p.type === 'minute') minute = parseInt(p.value, 10)
    if (p.type === 'second') second = parseInt(p.value, 10)
    if (p.type === 'weekday') weekday = p.value
  }

  const weekdayFull = fullWeekdayFormatter.format(date)
  const monthName = monthNameFormatter.format(date)
  const decimalHour = hour + minute / 60 + second / 3600

  return {
    year,
    month,
    day,
    hour,
    minute,
    second,
    weekday,
    weekdayFull,
    monthName,
    decimalHour,
  }
}

/**
 * Formats the real-time PHT clock string as required:
 * e.g. "Thu 12 Nov · 5:22 PM PHT · Iloilo"
 */
export function formatIloiloClock(date: Date = new Date()): string {
  const parts = getPHTParts(date)
  const hour12 = parts.hour % 12 === 0 ? 12 : parts.hour % 12
  const ampm = parts.hour >= 12 ? 'PM' : 'AM'
  const minStr = parts.minute.toString().padStart(2, '0')

  return `${parts.weekday} ${parts.day} ${parts.monthName} · ${hour12}:${minStr} ${ampm} PHT · Iloilo`
}

/**
 * Formats full timestamp with seconds:
 * e.g. "Thu 12 Nov · 05:22:45 PM PHT · Iloilo"
 */
export function formatIloiloClockWithSeconds(date: Date = new Date()): string {
  const parts = getPHTParts(date)
  const hour12 = parts.hour % 12 === 0 ? 12 : parts.hour % 12
  const ampm = parts.hour >= 12 ? 'PM' : 'AM'
  const minStr = parts.minute.toString().padStart(2, '0')
  const secStr = parts.second.toString().padStart(2, '0')

  return `${parts.weekday} ${parts.day} ${parts.monthName} · ${hour12}:${minStr}:${secStr} ${ampm} PHT · Iloilo`
}

/**
 * Standard Astronomical Solar Algorithm (NOAA / Spencer formulation)
 * Computes exact sunrise, sunset, and solar elevation/azimuth for given coordinates.
 */
export function calculateSolarTimes(
  date: Date = new Date(),
  latitude = ILOILO_COORDINATES.latitude,
  longitude = ILOILO_COORDINATES.longitude
): SolarTimes {
  const pht = getPHTParts(date)

  // Day of year (1-366)
  const startOfYear = new Date(Date.UTC(pht.year, 0, 1))
  const currentDate = new Date(Date.UTC(pht.year, pht.month - 1, pht.day))
  const dayOfYear =
    Math.floor((currentDate.getTime() - startOfYear.getTime()) / 86400000) + 1

  // Fractional year (radians)
  const gamma = ((2 * Math.PI) / 365) * (dayOfYear - 1 + (pht.hour - 12) / 24)

  // Equation of Time (minutes)
  const eqtime =
    229.18 *
    (0.000075 +
      0.001868 * Math.cos(gamma) -
      0.032077 * Math.sin(gamma) -
      0.014615 * Math.cos(2 * gamma) -
      0.040849 * Math.sin(2 * gamma))

  // Solar declination angle (radians)
  const decl =
    0.006918 -
    0.399912 * Math.cos(gamma) +
    0.070257 * Math.sin(gamma) -
    0.006758 * Math.cos(2 * gamma) +
    0.000907 * Math.sin(2 * gamma) -
    0.002697 * Math.cos(3 * gamma) +
    0.00148 * Math.sin(3 * gamma)

  const latRad = (latitude * Math.PI) / 180

  // Hour angle for sunrise/sunset (90.833° for atmospheric refraction)
  const zenithRad = (90.833 * Math.PI) / 180
  const cosHa =
    Math.cos(zenithRad) / (Math.cos(latRad) * Math.cos(decl)) -
    Math.tan(latRad) * Math.tan(decl)

  // Clamp for polar regions (not relevant in tropics but mathematically sound)
  const clampedCosHa = Math.max(-1, Math.min(1, cosHa))
  const haRad = Math.acos(clampedCosHa)
  const haDeg = (haRad * 180) / Math.PI

  // Solar noon in PHT minutes from midnight
  // Timezone offset for PHT is UTC+8 (+480 min)
  const solarNoonMin = 720 - 4 * longitude - eqtime + 480
  const sunriseMin = solarNoonMin - haDeg * 4
  const sunsetMin = solarNoonMin + haDeg * 4

  const sunriseDecimal = sunriseMin / 60
  const sunsetDecimal = sunsetMin / 60
  const solarNoonDecimal = solarNoonMin / 60

  const formatHhMm = (decimalHourVal: number) => {
    const totalMin = Math.round(decimalHourVal * 60)
    const h = Math.floor(totalMin / 60) % 24
    const m = totalMin % 60
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`
  }

  // True solar time and current solar altitude & azimuth
  const timeOffset = eqtime + 4 * longitude - 480
  const trueSolarTimeMin = pht.decimalHour * 60 + timeOffset
  const currentHaDeg = (trueSolarTimeMin / 4) - 180
  const currentHaRad = (currentHaDeg * Math.PI) / 180

  // Solar zenith & altitude
  const cosZenith =
    Math.sin(latRad) * Math.sin(decl) +
    Math.cos(latRad) * Math.cos(decl) * Math.cos(currentHaRad)
  const currentZenithRad = Math.acos(Math.max(-1, Math.min(1, cosZenith)))
  const solarAltitudeDeg = 90 - (currentZenithRad * 180) / Math.PI

  // Solar azimuth
  const cosAzimuth =
    (Math.sin(decl) - Math.sin(latRad) * Math.cos(currentZenithRad)) /
    (Math.cos(latRad) * Math.sin(currentZenithRad))
  let azimuthDeg = (Math.acos(Math.max(-1, Math.min(1, cosAzimuth))) * 180) / Math.PI
  if (currentHaDeg > 0) {
    azimuthDeg = 360 - azimuthDeg
  }

  const isDaylight = solarAltitudeDeg > 0
  const isGoldenHour = solarAltitudeDeg >= -4 && solarAltitudeDeg <= 10
  const isTwilight = solarAltitudeDeg < -4 && solarAltitudeDeg >= -12
  const isNight = solarAltitudeDeg < -12

  return {
    sunrisePHT: formatHhMm(sunriseDecimal),
    sunsetPHT: formatHhMm(sunsetDecimal),
    solarNoonPHT: formatHhMm(solarNoonDecimal),
    sunriseDecimal,
    sunsetDecimal,
    solarAltitudeDeg,
    solarAzimuthDeg: azimuthDeg,
    isDaylight,
    isGoldenHour,
    isTwilight,
    isNight,
  }
}

/**
 * Computes physically based 3D environmental lighting driven by the real solar position in Iloilo.
 */
export function computeSolarLighting(
  date: Date = new Date(),
  latitude = ILOILO_COORDINATES.latitude,
  longitude = ILOILO_COORDINATES.longitude
): SolarLightingSpec {
  const solar = calculateSolarTimes(date, latitude, longitude)
  const pht = getPHTParts(date)

  // Map solar azimuth and altitude to 3D directional light vector
  const dist = 70
  const altRad = Math.max(0.1, (Math.max(0, solar.solarAltitudeDeg) * Math.PI) / 180)
  const azRad = (solar.solarAzimuthDeg * Math.PI) / 180

  const sunX = dist * Math.cos(altRad) * Math.sin(azRad)
  const sunY = Math.max(15, dist * Math.sin(altRad))
  const sunZ = dist * Math.cos(altRad) * Math.cos(azRad)

  // Golden Hour (Around sunrise ~05:30-06:30 and sunset ~17:15-18:15 in Iloilo)
  if (solar.isGoldenHour) {
    return {
      phase: 'golden_hour',
      sunPosition: [sunX, sunY, sunZ],
      sunColor: '#f97316', // Warm amber-orange
      sunIntensity: 1.45,
      ambientColor: '#fed7aa',
      ambientIntensity: 0.6,
      skyColor: '#fdba74',
      windowGlowColor: '#fb923c',
      windowGlowIntensity: 0.45,
      interiorLampsOn: true,
    }
  }

  // Twilight (Civil/Nautical dusk or dawn)
  if (solar.isTwilight) {
    return {
      phase: 'twilight',
      sunPosition: [sunX, 15, sunZ],
      sunColor: '#c084fc', // Purple dusk / dawn
      sunIntensity: 0.75,
      ambientColor: '#475569',
      ambientIntensity: 0.45,
      skyColor: '#1e1b4b',
      windowGlowColor: '#fbbf24',
      windowGlowIntensity: 0.85,
      interiorLampsOn: true,
    }
  }

  // Night Mode (Sun deeply below horizon)
  if (solar.isNight || !solar.isDaylight) {
    return {
      phase: 'night',
      sunPosition: [25, 35, 30],
      sunColor: '#60a5fa', // Cool blue moonlight
      sunIntensity: 0.45,
      ambientColor: '#1e293b',
      ambientIntensity: 0.35,
      skyColor: '#030712',
      windowGlowColor: '#38bdf8',
      windowGlowIntensity: 1.0,
      interiorLampsOn: true,
    }
  }

  // Full Daylight (Sunny Philippine tropical sun)
  // Higher intensity near noon
  const noonProximity = 1 - Math.min(1, Math.abs(pht.decimalHour - solar.sunsetDecimal / 2) / 6)
  const dayIntensity = 1.6 + noonProximity * 0.4

  return {
    phase: 'day',
    sunPosition: [sunX, sunY, sunZ],
    sunColor: '#fffbeb', // Crisp bright daylight
    sunIntensity: dayIntensity,
    ambientColor: '#cbd5e1',
    ambientIntensity: 0.75,
    skyColor: '#38bdf8',
    windowGlowColor: '#fef08a',
    windowGlowIntensity: 0.15,
    interiorLampsOn: false,
  }
}
