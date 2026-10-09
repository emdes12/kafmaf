/**
 * Calendar-date helpers.
 *
 * Every "day" on this site is a calendar date in the Africa/Lagos timezone
 * (WAT, UTC+1, no daylight saving). We represent such a day as an ISO string
 * `YYYY-MM-DD` and do arithmetic on it via UTC-noon Date objects so that no
 * host-machine timezone can shift a date across midnight.
 */

export const SITE_TIMEZONE = 'Africa/Lagos'

export type IsoDate = string // YYYY-MM-DD

const ISO_RE = /^(\d{4})-(\d{2})-(\d{2})$/

export function isIsoDate(value: unknown): value is IsoDate {
  if (typeof value !== 'string') return false
  const m = ISO_RE.exec(value)
  if (!m) return false
  const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3], 12))
  return d.getUTCFullYear() === +m[1] && d.getUTCMonth() === +m[2] - 1 && d.getUTCDate() === +m[3]
}

/** UTC-noon Date for an ISO date — safe for formatting with timeZone: 'UTC'. */
export function isoToUtcNoon(iso: IsoDate): Date {
  const m = ISO_RE.exec(iso)
  if (!m) throw new Error(`Invalid ISO date: ${iso}`)
  return new Date(Date.UTC(+m[1], +m[2] - 1, +m[3], 12))
}

export function utcNoonToIso(d: Date): IsoDate {
  const y = d.getUTCFullYear()
  const mo = String(d.getUTCMonth() + 1).padStart(2, '0')
  const da = String(d.getUTCDate()).padStart(2, '0')
  return `${y}-${mo}-${da}`
}

export function addDays(iso: IsoDate, days: number): IsoDate {
  const d = isoToUtcNoon(iso)
  d.setUTCDate(d.getUTCDate() + days)
  return utcNoonToIso(d)
}

/** Whole days from a to b (b - a). */
export function diffDays(a: IsoDate, b: IsoDate): number {
  return Math.round((isoToUtcNoon(b).getTime() - isoToUtcNoon(a).getTime()) / 86_400_000)
}

/** The calendar date of `instant` in the given timezone (default Africa/Lagos). */
export function dateInZone(instant: Date = new Date(), timeZone: string = SITE_TIMEZONE): IsoDate {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(instant)
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? ''
  return `${get('year')}-${get('month')}-${get('day')}`
}

/** Milliseconds until the next midnight in the site timezone (for refreshing "today"). */
export function msUntilNextLagosMidnight(now: Date = new Date()): number {
  const today = dateInZone(now)
  // Lagos is UTC+1 year-round: midnight Lagos = 23:00 UTC of the previous day.
  const nextMidnightUtc = isoToUtcNoon(addDays(today, 1)).getTime() - 13 * 3_600_000
  return Math.max(1_000, nextMidnightUtc - now.getTime())
}

const longFmt = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'UTC',
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
})
const mediumFmt = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'UTC',
  day: 'numeric',
  month: 'short',
  year: 'numeric',
})

/** "Friday, 9 October 2026" */
export function formatLong(iso: IsoDate): string {
  return longFmt.format(isoToUtcNoon(iso))
}

/** "9 Oct 2026" */
export function formatMedium(iso: IsoDate): string {
  return mediumFmt.format(isoToUtcNoon(iso))
}

/** "09/10/2026" — the DD/MM/YYYY format used on the ID card. */
export function formatCardDate(iso: IsoDate | null | undefined): string {
  if (!iso || !isIsoDate(iso)) return '—'
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

export function formatTimestamp(ts: string | null | undefined): string {
  if (!ts) return '—'
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: SITE_TIMEZONE,
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(ts))
}
