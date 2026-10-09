import { describe, expect, it } from 'vitest'
import { addDays, dateInZone, msUntilNextLagosMidnight } from '../../src/lib/dates'
import {
  createIntlHijriProvider,
  hijriMonthDays,
  addHijriMonths,
  formatHijri,
  formatHijriArabic,
  indexRecords,
  hijriForDate,
  occasionMessage,
  occasionsForYears,
  resolveOccasion,
  statusChip,
  upcomingOccasions,
  activeAnnouncements,
  buildMonthGrid,
  OCCASIONS,
  type OccasionRecord,
} from '../../src/lib/hijri'

const uq = createIntlHijriProvider('islamic-umalqura', 0)
const none = indexRecords([])
const def = (k: string) => OCCASIONS.find((o) => o.key === k)!

function rec(
  partial: Partial<OccasionRecord> & Pick<OccasionRecord, 'occasion_key' | 'hijri_year' | 'status' | 'gregorian_date'>,
): OccasionRecord {
  return {
    source: 'Test source',
    confirmed_on: null,
    corrected_from: null,
    announcement: null,
    publish_announcement: false,
    announcement_expires_on: null,
    updated_at: '2026-01-01T00:00:00Z',
    ...partial,
  }
}

describe('Africa/Lagos timezone', () => {
  it('uses the Lagos calendar date, not UTC or the host timezone', () => {
    // 23:30 UTC on 9 Oct is already 00:30 on 10 Oct in Lagos (UTC+1).
    expect(dateInZone(new Date('2026-10-09T23:30:00Z'))).toBe('2026-10-10')
    expect(dateInZone(new Date('2026-10-09T22:59:59Z'))).toBe('2026-10-09')
  })
  it('the Hijri date changes when the Lagos date changes', () => {
    const before = uq.toHijri(dateInZone(new Date('2026-10-09T22:59:59Z')))
    const after = uq.toHijri(dateInZone(new Date('2026-10-09T23:00:00Z')))
    expect(after.day).toBe(before.day + 1)
  })
  it('schedules refresh at Lagos midnight', () => {
    expect(msUntilNextLagosMidnight(new Date('2026-10-09T22:00:00Z'))).toBe(3_600_000)
  })
})

describe('Umm al-Qura conversion', () => {
  it('matches known Umm al-Qura dates', () => {
    expect(uq.toHijri('2026-02-18')).toEqual({ year: 1447, month: 9, day: 1 })
    expect(uq.toHijri('2026-03-20')).toEqual({ year: 1447, month: 10, day: 1 })
    expect(uq.toHijri('2026-06-16')).toEqual({ year: 1448, month: 1, day: 1 })
  })
  it('round-trips Gregorian -> Hijri -> Gregorian for every day across four years', () => {
    let iso = '2025-01-01'
    for (let i = 0; i < 1500; i++) {
      expect(uq.toGregorian(uq.toHijri(iso))).toBe(iso)
      iso = addDays(iso, 1)
    }
  })
  it('returns null for a non-existent day 30', () => {
    for (let m = 1; m <= 12; m++) {
      const len = hijriMonthDays(uq, 1448, m).length
      expect([29, 30]).toContain(len)
      if (len === 29) expect(uq.toGregorian({ year: 1448, month: m, day: 30 })).toBeNull()
    }
  })
  it('month and year transitions are contiguous', () => {
    const dh = hijriMonthDays(uq, 1447, 12)
    const mu = hijriMonthDays(uq, 1448, 1)
    expect(addDays(dh[dh.length - 1].iso, 1)).toBe(mu[0].iso)
    expect(uq.toHijri(mu[0].iso)).toEqual({ year: 1448, month: 1, day: 1 })
    expect(addHijriMonths(1447, 12, 1)).toEqual({ year: 1448, month: 1 })
    expect(addHijriMonths(1448, 1, -1)).toEqual({ year: 1447, month: 12 })
  })
  it('applies the day adjustment', () => {
    const minus1 = createIntlHijriProvider('islamic-umalqura', -1)
    expect(minus1.toHijri('2026-03-20')).toEqual({ year: 1447, month: 9, day: 30 })
    expect(minus1.toHijri('2026-03-21')).toEqual({ year: 1447, month: 10, day: 1 })
    expect(() => createIntlHijriProvider('islamic-umalqura', 3)).toThrow()
  })
  it('formats English and Arabic', () => {
    expect(formatHijri({ year: 1448, month: 9, day: 1 })).toBe('1 Ramadan 1448 AH')
    expect(formatHijriArabic({ year: 1448, month: 9, day: 1 })).toContain('١٤٤٨')
  })
})

describe('occasions', () => {
  it('identifies the four occasions on their Hijri dates', () => {
    const list = occasionsForYears([1448], uq, none)
    const byKey = Object.fromEntries(list.map((o) => [o.def.key, o]))
    for (const o of list) {
      expect(uq.toHijri(o.date!)).toEqual({ year: 1448, month: o.def.hijriMonth, day: o.def.hijriDay })
      expect(o.basis).toBe('calculated')
    }
    expect(byKey.islamic_new_year.hijri).toEqual({ year: 1448, month: 1, day: 1 })
    expect(byKey.ramadan_start.hijri).toEqual({ year: 1448, month: 9, day: 1 })
    expect(byKey.eid_al_fitr.hijri).toEqual({ year: 1448, month: 10, day: 1 })
    expect(byKey.eid_al_adha.hijri).toEqual({ year: 1448, month: 12, day: 10 })
  })

  it('confirmed record takes precedence over expected and calculated', () => {
    const calc = resolveOccasion(def('eid_al_fitr'), 1448, uq, none)
    const later = addDays(calc.date!, 1)
    const expected = indexRecords([rec({ occasion_key: 'eid_al_fitr', hijri_year: 1448, status: 'expected', gregorian_date: later })])
    expect(resolveOccasion(def('eid_al_fitr'), 1448, uq, expected).basis).toBe('expected')
    const confirmed = indexRecords([rec({ occasion_key: 'eid_al_fitr', hijri_year: 1448, status: 'confirmed', gregorian_date: later })])
    const r = resolveOccasion(def('eid_al_fitr'), 1448, uq, confirmed)
    expect(r.basis).toBe('confirmed')
    expect(r.date).toBe(later)
    expect(r.calculatedDate).toBe(calc.date)
  })

  it('cancelled records fall back to the calculation', () => {
    const records = indexRecords([rec({ occasion_key: 'eid_al_adha', hijri_year: 1448, status: 'cancelled', gregorian_date: '2027-01-01' })])
    const r = resolveOccasion(def('eid_al_adha'), 1448, uq, records)
    expect(r.basis).toBe('calculated')
    expect(r.date).not.toBe('2027-01-01')
  })

  it('never presents a calculated or expected date as official', () => {
    const expectedRecords = indexRecords(
      OCCASIONS.map((o) => {
        const calc = resolveOccasion(o, 1448, uq, none)
        return rec({ occasion_key: o.key, hijri_year: 1448, status: 'expected', gregorian_date: calc.date! })
      }),
    )
    for (const records of [none, expectedRecords]) {
      for (const o of occasionsForYears([1447, 1448, 1449], uq, records)) {
        for (const offset of [0, -1, -5, -14]) {
          const today = addDays(o.date!, offset)
          const msg = occasionMessage(o, today)
          if (msg) {
            expect(msg.official).toBe(false)
            expect(msg.text).not.toMatch(/^Today is/)
            expect(msg.text).toMatch(/expected|estimate|awaiting/i)
          }
          expect(['Today', 'Tomorrow']).not.toContain(statusChip(o, today).label)
        }
      }
    }
  })

  it('confirmed dates produce Today/Tomorrow wording', () => {
    const records = indexRecords([rec({ occasion_key: 'eid_al_fitr', hijri_year: 1448, status: 'confirmed', gregorian_date: '2027-03-10' })])
    const o = resolveOccasion(def('eid_al_fitr'), 1448, uq, records)
    expect(statusChip(o, '2027-03-10').label).toBe('Today')
    expect(statusChip(o, '2027-03-09').label).toBe('Tomorrow')
    expect(occasionMessage(o, '2027-03-10')).toMatchObject({ official: true, text: 'Today is 1 Shawwal — Eid al-Fitr.' })
    expect(occasionMessage(o, '2027-03-09')?.official).toBe(true)
    expect(occasionMessage(o, '2027-03-11')).toBeNull()
  })

  it('administrator corrections update the resolved date', () => {
    const first = indexRecords([rec({ occasion_key: 'ramadan_start', hijri_year: 1448, status: 'confirmed', gregorian_date: '2027-02-08' })])
    const corrected = indexRecords([
      rec({ occasion_key: 'ramadan_start', hijri_year: 1448, status: 'confirmed', gregorian_date: '2027-02-09', corrected_from: '2027-02-08' }),
    ])
    expect(resolveOccasion(def('ramadan_start'), 1448, uq, first).date).toBe('2027-02-08')
    const r = resolveOccasion(def('ramadan_start'), 1448, uq, corrected)
    expect(r.date).toBe('2027-02-09')
    expect(r.corrected).toBe(true)
  })

  it('aligns the current Hijri date to a confirmed month start', () => {
    // Calculation: 1 Ramadan 1448 = 2027-02-08. Suppose the start is confirmed as 2027-02-09.
    expect(uq.toHijri('2027-02-08')).toEqual({ year: 1448, month: 9, day: 1 })
    const records = indexRecords([rec({ occasion_key: 'ramadan_start', hijri_year: 1448, status: 'confirmed', gregorian_date: '2027-02-09' })])
    expect(hijriForDate('2027-02-08', uq, records).hijri).toEqual({ year: 1448, month: 8, day: 30 })
    expect(hijriForDate('2027-02-09', uq, records)).toMatchObject({ hijri: { year: 1448, month: 9, day: 1 }, basis: 'confirmed' })
    expect(hijriForDate('2027-02-23', uq, records).hijri).toEqual({ year: 1448, month: 9, day: 15 })
    expect(hijriForDate('2027-02-09', uq, none)).toMatchObject({ hijri: { year: 1448, month: 9, day: 2 }, basis: 'calculated' })
    const early = indexRecords([rec({ occasion_key: 'ramadan_start', hijri_year: 1448, status: 'confirmed', gregorian_date: '2027-02-07' })])
    expect(hijriForDate('2027-02-07', uq, early).hijri).toEqual({ year: 1448, month: 9, day: 1 })
  })

  it('expected records do not change the displayed current Hijri date', () => {
    const records = indexRecords([rec({ occasion_key: 'ramadan_start', hijri_year: 1448, status: 'expected', gregorian_date: '2027-02-09' })])
    expect(hijriForDate('2027-02-08', uq, records)).toMatchObject({ hijri: { month: 9, day: 1 }, basis: 'calculated' })
  })

  it('lists upcoming occasions nearest first', () => {
    const list = upcomingOccasions('2026-10-09', uq, none, 4)
    expect(list.map((o) => o.def.key)).toEqual(['ramadan_start', 'eid_al_fitr', 'eid_al_adha', 'islamic_new_year'])
    expect(list[0].date).toBe('2027-02-08')
  })

  it('builds a month grid that follows the calculation by default', () => {
    const grid = buildMonthGrid(1448, 9, uq, none)!
    expect(grid.days[0]).toMatchObject({ iso: '2027-02-08', hijriDay: 1 })
    expect(grid.days.map((d) => d.hijriDay)).toEqual(grid.days.map((_, i) => i + 1))
    expect(grid.leadingBlanks).toBe(0) // 8 Feb 2027 is a Monday
    expect(grid.days[0].occasions.map((o) => o.def.key)).toEqual(['ramadan_start'])
  })

  it('month grid shifts when the month start is officially confirmed', () => {
    const records = indexRecords([rec({ occasion_key: 'ramadan_start', hijri_year: 1448, status: 'confirmed', gregorian_date: '2027-02-09' })])
    const grid = buildMonthGrid(1448, 9, uq, records)!
    expect(grid.days[0]).toMatchObject({ iso: '2027-02-09', hijriDay: 1, confirmedBasis: true })
    expect(grid.days[0].occasions[0].basis).toBe('confirmed')
    const shaban = buildMonthGrid(1448, 8, uq, records)!
    expect(shaban.days[shaban.days.length - 1]).toMatchObject({ iso: '2027-02-08', hijriDay: 30 })
  })

  it('only shows published, unexpired, non-cancelled announcements', () => {
    const base = { occasion_key: 'eid_al_fitr' as const, hijri_year: 1448, gregorian_date: '2027-03-10' }
    const list = [
      rec({ ...base, status: 'confirmed', publish_announcement: true, announcement: 'A', announcement_expires_on: '2027-03-12' }),
      rec({ ...base, status: 'confirmed', publish_announcement: false, announcement: 'B' }),
      rec({ ...base, status: 'cancelled', publish_announcement: true, announcement: 'C' }),
      rec({ ...base, status: 'expected', publish_announcement: true, announcement: '   ' }),
    ]
    expect(activeAnnouncements(list, '2027-03-11').map((r) => r.announcement)).toEqual(['A'])
    expect(activeAnnouncements(list, '2027-03-13')).toEqual([])
  })
})
