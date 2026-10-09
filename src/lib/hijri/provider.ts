/**
 * Hijri date provider.
 *
 * The calculation source is isolated behind the `HijriProvider` interface so it
 * can be swapped (e.g. for a different library or a published local table)
 * without touching the UI.
 *
 * The default implementation uses the ECMAScript Internationalization API
 * (`Intl.DateTimeFormat` with an Islamic calendar), backed by the ICU library
 * that ships with every modern browser and Node.js. No network, no API key.
 *
 * IMPORTANT: these are CALCULATED dates. In Nigeria the start of Ramadan and
 * the two Eids are determined by moon sighting and announced by the Sultan of
 * Sokoto / NSCIA. A calculation is never treated as an official announcement;
 * see `occasions.ts` for how administrator confirmations take precedence.
 */
import { addDays, isoToUtcNoon, utcNoonToIso, type IsoDate } from '../dates'

export type HijriCalendarId = 'islamic-umalqura' | 'islamic-civil' | 'islamic-tbla'

export const CALENDAR_LABELS: Record<HijriCalendarId, string> = {
  'islamic-umalqura': 'Umm al-Qura calendar (Saudi Arabia)',
  'islamic-civil': 'tabular Islamic calendar (civil epoch)',
  'islamic-tbla': 'tabular Islamic calendar (astronomical epoch)',
}

export interface HijriDate {
  year: number
  month: number // 1..12
  day: number // 1..30
}

export interface HijriProvider {
  readonly calendar: HijriCalendarId
  /** Whole-day adjustment applied to the calculation (-2..+2). */
  readonly adjustmentDays: number
  toHijri(iso: IsoDate): HijriDate
  /** Gregorian date of a Hijri date, or null if that Hijri date does not exist (e.g. day 30 of a 29-day month). */
  toGregorian(h: HijriDate): IsoDate | null
}

export function isCalendarSupported(calendar: HijriCalendarId): boolean {
  try {
    const resolved = new Intl.DateTimeFormat(`en-u-ca-${calendar}`, { timeZone: 'UTC' }).resolvedOptions()
    return resolved.calendar === calendar
  } catch {
    return false
  }
}

export function compareHijri(a: HijriDate, b: HijriDate): number {
  return a.year - b.year || a.month - b.month || a.day - b.day
}

export function addHijriMonths(year: number, month: number, delta: number): { year: number; month: number } {
  const index = year * 12 + (month - 1) + delta
  return { year: Math.floor(index / 12), month: (index % 12) + 1 }
}

/** Approximate Gregorian date of a Hijri date using the tabular (civil) arithmetic. Used only as a search seed. */
function approximateGregorian(h: HijriDate): IsoDate {
  const jd =
    h.day +
    Math.ceil(29.5 * (h.month - 1)) +
    (h.year - 1) * 354 +
    Math.floor((3 + 11 * h.year) / 30) +
    1948439.5 -
    1
  const ms = (jd - 2440587.5) * 86_400_000
  return utcNoonToIso(new Date(ms))
}

export class UnsupportedCalendarError extends Error {
  constructor(calendar: string) {
    super(`This browser cannot calculate the ${calendar} calendar.`)
    this.name = 'UnsupportedCalendarError'
  }
}

export function createIntlHijriProvider(
  calendar: HijriCalendarId = 'islamic-umalqura',
  adjustmentDays = 0,
): HijriProvider {
  if (!isCalendarSupported(calendar)) throw new UnsupportedCalendarError(calendar)
  if (!Number.isInteger(adjustmentDays) || adjustmentDays < -2 || adjustmentDays > 2) {
    throw new RangeError('Hijri adjustment must be a whole number between -2 and +2 days.')
  }
  const fmt = new Intl.DateTimeFormat(`en-u-ca-${calendar}-nu-latn`, {
    timeZone: 'UTC',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
  })
  const cache = new Map<IsoDate, HijriDate>()

  function raw(iso: IsoDate): HijriDate {
    const parts = fmt.formatToParts(isoToUtcNoon(iso))
    const num = (t: string) => Number(parts.find((p) => p.type === t)?.value)
    const result = { year: num('year'), month: num('month'), day: num('day') }
    if (!Number.isFinite(result.year) || !Number.isFinite(result.month) || !Number.isFinite(result.day)) {
      throw new UnsupportedCalendarError(calendar)
    }
    return result
  }

  const provider: HijriProvider = {
    calendar,
    adjustmentDays,
    toHijri(iso) {
      let hit = cache.get(iso)
      if (!hit) {
        // A +1 adjustment means the Hijri date runs one day AHEAD of the calculation.
        hit = raw(addDays(iso, adjustmentDays))
        cache.set(iso, hit)
      }
      return hit
    },
    toGregorian(h) {
      const seed = approximateGregorian(h)
      for (let offset = 0; offset <= 8; offset++) {
        for (const candidate of offset === 0 ? [seed] : [addDays(seed, offset), addDays(seed, -offset)]) {
          if (compareHijri(provider.toHijri(candidate), h) === 0) return candidate
        }
      }
      return null
    },
  }
  return provider
}

/** All days of a Hijri month under the given provider. */
export function hijriMonthDays(provider: HijriProvider, year: number, month: number): { iso: IsoDate; day: number }[] {
  const start = provider.toGregorian({ year, month, day: 1 })
  if (!start) return []
  const days: { iso: IsoDate; day: number }[] = []
  for (let i = 0; i < 31; i++) {
    const iso = addDays(start, i)
    const h = provider.toHijri(iso)
    if (h.month !== month || h.year !== year) break
    days.push({ iso, day: h.day })
  }
  return days
}

