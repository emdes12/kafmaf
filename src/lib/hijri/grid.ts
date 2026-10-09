import { addDays, isoToUtcNoon, type IsoDate } from '../dates'
import type { HijriProvider } from './provider'
import { hijriForDate, OCCASIONS, resolveOccasion, type OccasionRecord, type ResolvedOccasion } from './occasions'

export interface GridDay {
  iso: IsoDate
  hijriDay: number
  /** Day counted from an officially confirmed month start. */
  confirmedBasis: boolean
  occasions: ResolvedOccasion[]
}

export interface MonthGrid {
  year: number
  month: number
  days: GridDay[]
  /** Number of empty cells before day 1 in a Monday-first week. */
  leadingBlanks: number
  /** Occasions belonging to this Hijri month (by Hijri date), even if their resolved date is outside the grid. */
  occasions: ResolvedOccasion[]
}

/**
 * Days of a Hijri month. Each day is labelled with `hijriForDate`, so when an
 * administrator has confirmed the month start the grid follows that date.
 */
export function buildMonthGrid(
  year: number,
  month: number,
  provider: HijriProvider,
  records: Map<string, OccasionRecord>,
): MonthGrid | null {
  const calcStart = provider.toGregorian({ year, month, day: 1 })
  if (!calcStart) return null

  const occasions = OCCASIONS.filter((o) => o.hijriMonth === month).map((o) => resolveOccasion(o, year, provider, records))
  // Occasions from any month may land in this grid if their confirmed date was moved.
  const allNearby = [year - 1, year, year + 1].flatMap((y) => OCCASIONS.map((o) => resolveOccasion(o, y, provider, records)))

  const days: GridDay[] = []
  for (let i = -3; i <= 33; i++) {
    const iso = addDays(calcStart, i)
    const h = hijriForDate(iso, provider, records)
    if (h.hijri.year !== year || h.hijri.month !== month) continue
    days.push({
      iso,
      hijriDay: h.hijri.day,
      confirmedBasis: h.basis === 'confirmed',
      occasions: allNearby.filter((o) => o.date === iso),
    })
  }
  if (days.length === 0) return null
  const weekday = isoToUtcNoon(days[0].iso).getUTCDay() // 0 = Sunday
  return { year, month, days, leadingBlanks: (weekday + 6) % 7, occasions }
}
