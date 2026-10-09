/**
 * Islamic occasions: combines the calculated calendar with administrator
 * records of officially announced dates.
 *
 * Precedence for an occasion's Gregorian date:
 *   1. `confirmed` record  – officially announced (e.g. by the Sultan of Sokoto / NSCIA)
 *   2. `expected` record   – an expected date recorded by an administrator
 *   3. calculation         – estimate from the Hijri provider
 * A `cancelled` record is ignored (the occasion falls back to the next source).
 *
 * Only basis === 'confirmed' may ever produce wording that states an occasion
 * HAS begun / IS today. Everything else is phrased as expected/estimated.
 */
import { addDays, diffDays, formatLong, type IsoDate } from '../dates'
import { addHijriMonths, compareHijri, type HijriDate, type HijriProvider } from './provider'
import { formatHijri, hijriMonthName } from './names'

export type OccasionKey = 'islamic_new_year' | 'ramadan_start' | 'eid_al_fitr' | 'eid_al_adha'
export type OccasionRecordStatus = 'expected' | 'confirmed' | 'cancelled'
export type DateBasis = 'confirmed' | 'expected' | 'calculated'

export interface OccasionDefinition {
  key: OccasionKey
  name: string
  hijriMonth: number
  hijriDay: number
  description: string
}

export const OCCASIONS: readonly OccasionDefinition[] = [
  {
    key: 'islamic_new_year',
    name: 'Islamic New Year',
    hijriMonth: 1,
    hijriDay: 1,
    description: 'The first day of Muharram, which opens the new year of the Hijri calendar.',
  },
  {
    key: 'ramadan_start',
    name: 'Beginning of Ramadan',
    hijriMonth: 9,
    hijriDay: 1,
    description: 'The first day of Ramadan, the month of fasting.',
  },
  {
    key: 'eid_al_fitr',
    name: 'Eid al-Fitr',
    hijriMonth: 10,
    hijriDay: 1,
    description: 'The festival marking the end of Ramadan, on the first day of Shawwal.',
  },
  {
    key: 'eid_al_adha',
    name: 'Eid al-Adha',
    hijriMonth: 12,
    hijriDay: 10,
    description: 'The festival of sacrifice, on the tenth day of Dhu al-Hijjah.',
  },
] as const

/** Shape of a row in `public.islamic_occasions` (only the fields the calendar needs). */
export interface OccasionRecord {
  id?: string
  occasion_key: OccasionKey
  hijri_year: number
  status: OccasionRecordStatus
  gregorian_date: IsoDate
  source: string | null
  confirmed_on: IsoDate | null
  corrected_from: IsoDate | null
  announcement: string | null
  publish_announcement: boolean
  announcement_expires_on: IsoDate | null
  updated_at: string
}

export interface ResolvedOccasion {
  def: OccasionDefinition
  hijriYear: number
  hijri: HijriDate
  /** Date used for display: confirmed > expected > calculated. Null if it cannot be determined. */
  date: IsoDate | null
  calculatedDate: IsoDate | null
  basis: DateBasis
  record: OccasionRecord | null
  /** True when an official date was changed after first being confirmed. */
  corrected: boolean
}

export function recordKey(key: OccasionKey, year: number) {
  return `${key}:${year}`
}

export function indexRecords(records: readonly OccasionRecord[]): Map<string, OccasionRecord> {
  const map = new Map<string, OccasionRecord>()
  for (const r of records) map.set(recordKey(r.occasion_key, r.hijri_year), r)
  return map
}

export function resolveOccasion(
  def: OccasionDefinition,
  hijriYear: number,
  provider: HijriProvider,
  records: Map<string, OccasionRecord>,
): ResolvedOccasion {
  const hijri = { year: hijriYear, month: def.hijriMonth, day: def.hijriDay }
  const calculatedDate = provider.toGregorian(hijri)
  const record = records.get(recordKey(def.key, hijriYear)) ?? null
  if (record && record.status === 'confirmed') {
    return { def, hijriYear, hijri, date: record.gregorian_date, calculatedDate, basis: 'confirmed', record, corrected: !!record.corrected_from }
  }
  if (record && record.status === 'expected') {
    return { def, hijriYear, hijri, date: record.gregorian_date, calculatedDate, basis: 'expected', record, corrected: false }
  }
  return { def, hijriYear, hijri, date: calculatedDate, calculatedDate, basis: 'calculated', record, corrected: false }
}

// ---------------------------------------------------------------------------
// Today's Hijri date, aligned to confirmed month starts when available
// ---------------------------------------------------------------------------

interface MonthAnchor {
  year: number
  month: number
  /** Gregorian date of day 1 of that Hijri month, derived from a confirmed occasion. */
  start: IsoDate
  key: OccasionKey
}

function confirmedAnchors(records: Map<string, OccasionRecord>): MonthAnchor[] {
  const anchors: MonthAnchor[] = []
  for (const r of records.values()) {
    if (r.status !== 'confirmed') continue
    const def = OCCASIONS.find((o) => o.key === r.occasion_key)
    if (!def) continue
    anchors.push({
      year: r.hijri_year,
      month: def.hijriMonth,
      start: addDays(r.gregorian_date, -(def.hijriDay - 1)),
      key: r.occasion_key,
    })
  }
  return anchors
}

export interface TodayHijri {
  hijri: HijriDate
  /** 'confirmed' when the day number is counted from an officially confirmed month start. */
  basis: 'calculated' | 'confirmed'
  anchorKey?: OccasionKey
}

/**
 * Hijri date for a Gregorian day. If an administrator has confirmed the start of
 * the relevant month (e.g. 1 Ramadan), days are counted from that confirmed date
 * instead of the calculation, so the site follows the local announcement.
 */
export function hijriForDate(iso: IsoDate, provider: HijriProvider, records: Map<string, OccasionRecord>): TodayHijri {
  const calc = provider.toHijri(iso)
  for (const a of confirmedAnchors(records)) {
    const offset = diffDays(a.start, iso)
    const monthDistance = (a.year * 12 + a.month) - (calc.year * 12 + calc.month)
    if (Math.abs(monthDistance) > 1) continue

    if (offset >= 0 && offset <= 28) {
      return { hijri: { year: a.year, month: a.month, day: offset + 1 }, basis: 'confirmed', anchorKey: a.key }
    }
    if (offset === 29 && monthDistance >= 0) {
      // Day 30 exists only if the calculation does not already place us in the next month.
      return { hijri: { year: a.year, month: a.month, day: 30 }, basis: 'confirmed', anchorKey: a.key }
    }
    if (offset < 0 && offset >= -2 && monthDistance <= 0) {
      // Just before a confirmed month start we are in the previous month. Assume the
      // previous month was shifted by the same amount as the confirmed start.
      const calcStart = provider.toGregorian({ year: a.year, month: a.month, day: 1 })
      if (calcStart) {
        const shift = diffDays(calcStart, a.start)
        const shifted = provider.toHijri(addDays(iso, -shift))
        const prev = addHijriMonths(a.year, a.month, -1)
        if (shifted.year === prev.year && shifted.month === prev.month) return { hijri: shifted, basis: 'calculated' }
      }
    }
  }
  return { hijri: calc, basis: 'calculated' }
}

// ---------------------------------------------------------------------------
// Relative status & wording
// ---------------------------------------------------------------------------

export type Relative = 'today' | 'tomorrow' | 'upcoming' | 'past'

export function relativeTo(today: IsoDate, date: IsoDate): { relative: Relative; days: number } {
  const days = diffDays(today, date)
  if (days === 0) return { relative: 'today', days }
  if (days === 1) return { relative: 'tomorrow', days }
  if (days > 1) return { relative: 'upcoming', days }
  return { relative: 'past', days }
}

export interface StatusChip {
  label: string
  tone: 'highlight' | 'confirmed' | 'expected' | 'neutral'
}

/** The short status chip for an occasion. "Today"/"Tomorrow" are reserved for confirmed dates. */
export function statusChip(o: ResolvedOccasion, today: IsoDate): StatusChip {
  if (!o.date) return { label: 'Date unavailable', tone: 'neutral' }
  const { relative, days } = relativeTo(today, o.date)
  if (o.basis === 'confirmed') {
    if (relative === 'today') return { label: 'Today', tone: 'highlight' }
    if (relative === 'tomorrow') return { label: 'Tomorrow', tone: 'confirmed' }
    if (relative === 'upcoming') return { label: `In ${days} days`, tone: 'confirmed' }
    return { label: 'Past', tone: 'neutral' }
  }
  if (relative === 'past') return { label: 'Past', tone: 'neutral' }
  if (relative === 'upcoming' && days > 1) return { label: `Expected in ~${days} days`, tone: 'expected' }
  return { label: 'Awaiting confirmation', tone: 'expected' }
}

export function basisLabel(basis: DateBasis): string {
  switch (basis) {
    case 'confirmed':
      return 'Officially confirmed'
    case 'expected':
      return 'Expected date'
    default:
      return 'Calculated estimate'
  }
}

export interface OccasionMessage {
  text: string
  /** True only when the message states an officially confirmed fact. */
  official: boolean
  emphasis: 'today' | 'soon' | 'info'
}

/**
 * Human sentence for an occasion close to today, or null when nothing is near.
 * Non-confirmed dates are always phrased as expectations awaiting confirmation.
 */
export function occasionMessage(o: ResolvedOccasion, today: IsoDate, horizonDays = 14): OccasionMessage | null {
  if (!o.date) return null
  const { relative, days } = relativeTo(today, o.date)
  if (relative === 'past' || days > horizonDays) return null
  const hijriText = `${o.def.hijriDay} ${hijriMonthName(o.def.hijriMonth)}`
  const isBeginning = o.def.key === 'ramadan_start'
  const subject = isBeginning ? 'Ramadan' : o.def.name

  if (o.basis === 'confirmed') {
    if (relative === 'today') {
      return {
        text: isBeginning ? `Today is ${hijriText} — the first day of Ramadan.` : `Today is ${hijriText} — ${o.def.name}.`,
        official: true,
        emphasis: 'today',
      }
    }
    if (relative === 'tomorrow') {
      return {
        text: isBeginning ? 'Ramadan begins tomorrow (officially confirmed).' : `${o.def.name} is tomorrow (officially confirmed).`,
        official: true,
        emphasis: 'soon',
      }
    }
    return {
      text: `${o.def.name} is confirmed for ${formatLong(o.date)}.`,
      official: true,
      emphasis: 'info',
    }
  }

  const qualifier = o.basis === 'expected' ? 'awaiting official confirmation' : 'calculated estimate — awaiting the official moon-sighting announcement'
  if (relative === 'today') {
    return {
      text: isBeginning
        ? `Ramadan is expected to begin around today (${qualifier}).`
        : `${subject} is expected around today (${qualifier}).`,
      official: false,
      emphasis: 'soon',
    }
  }
  if (relative === 'tomorrow') {
    return {
      text: isBeginning
        ? `Ramadan is expected to begin tomorrow (${qualifier}).`
        : `${subject} is expected tomorrow (${qualifier}).`,
      official: false,
      emphasis: 'soon',
    }
  }
  return {
    text: `${subject} is approaching — expected around ${formatLong(o.date)} (${qualifier}).`,
    official: false,
    emphasis: 'info',
  }
}

/** All four occasions for the given Hijri years, sorted by date. */
export function occasionsForYears(
  years: number[],
  provider: HijriProvider,
  records: Map<string, OccasionRecord>,
): ResolvedOccasion[] {
  const all = years.flatMap((y) => OCCASIONS.map((def) => resolveOccasion(def, y, provider, records)))
  return all.sort((a, b) => compareHijri(a.hijri, b.hijri))
}

/** Upcoming occasions (today or later), nearest first. */
export function upcomingOccasions(
  today: IsoDate,
  provider: HijriProvider,
  records: Map<string, OccasionRecord>,
  limit = 4,
): ResolvedOccasion[] {
  const year = provider.toHijri(today).year
  return occasionsForYears([year - 1, year, year + 1], provider, records)
    .filter((o) => o.date && diffDays(today, o.date) >= 0)
    .sort((a, b) => (a.date! < b.date! ? -1 : a.date! > b.date! ? 1 : 0))
    .slice(0, limit)
}

/** Announcements an administrator chose to publish and that have not expired. */
export function activeAnnouncements(records: readonly OccasionRecord[], today: IsoDate): OccasionRecord[] {
  return records.filter(
    (r) =>
      r.publish_announcement &&
      r.status !== 'cancelled' &&
      !!r.announcement?.trim() &&
      (!r.announcement_expires_on || diffDays(today, r.announcement_expires_on) >= 0),
  )
}

export function describeOccasionHijri(o: ResolvedOccasion): string {
  return formatHijri(o.hijri)
}
