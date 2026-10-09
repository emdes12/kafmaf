# Hijri calendar — method and limitations

## Source of calculated dates

- **Engine:** the ECMAScript Internationalization API (`Intl.DateTimeFormat` with
  `-u-ca-islamic-umalqura`), backed by ICU, built into every modern browser and Node.js.
  No dependency, no network request, no API key, no cost.
- **Default convention:** Umm al-Qura. Alternatives selectable in Admin → Settings: tabular Islamic
  calendar (civil or astronomical epoch).
- **Adjustment:** −2…+2 days (Admin → Settings) if the calculation consistently differs from local
  announcements.
- **Timezone:** every "today" is the calendar date in `Africa/Lagos` (UTC+1, no DST). The page
  re-computes at Lagos midnight and when the tab regains focus.
- **Modularity:** `src/lib/hijri/provider.ts` defines a `HijriProvider` interface; the rest of the
  site only uses that interface, so a different library or a published table can be swapped in.

Spot check: Umm al-Qura gives 1 Shawwal 1447 = 20 March 2026, the same day the Sultan of Sokoto
declared Eid al-Fitr in Nigeria. That agreement is not guaranteed for other months.

## Expected vs confirmed

Moon-sighting-dependent occasions (Ramadan, Eid al-Fitr, Eid al-Adha, and the Islamic New Year)
are resolved in this order:

1. **Confirmed** — an administrator recorded the officially announced date, with its **source and
   announcement date** (both required by the database).
2. **Expected** — an administrator recorded an expected date.
3. **Calculated** — the estimate from the calculation.

A *cancelled* record is ignored. Only *confirmed* dates may produce wording such as "Today is Eid
al-Fitr" or a "Today"/"Tomorrow" badge; everything else says "expected" and "awaiting official
confirmation". A date is never marked confirmed automatically.

When the start of a month is confirmed (1 Muharram, 1 Ramadan, 1 Shawwal, or 10 Dhu al-Hijjah),
today's Hijri day number and the month grid are counted from that confirmed date.

Corrections: changing a confirmed date keeps the first confirmed date in `corrected_from` and shows
"Corrected" publicly. Every change is in the audit log with the administrator's ID and time.

## Failure behaviour

- If confirmations cannot be loaded, the site shows the last confirmations it received (cached in
  the browser) with their timestamp. With no cache, it states that all dates are calculated estimates.
- If a browser cannot compute the Islamic calendar, the calendar shows an "unavailable" message —
  dates are never invented.

## Limitations

- Umm al-Qura is the Saudi calendar; Nigerian dates are decided by moon sighting and can differ by
  a day.
- ICU's Umm al-Qura data covers roughly 1300–1600 AH.
- Arabic month names are standard spellings; no religious text is displayed.

## Tests

`tests/unit/hijri.test.ts`: Lagos date boundary, midnight refresh, four-year round trip,
29/30-day months, month and year transitions, adjustment, the four occasions, precedence,
cancelled records, corrections, aligning to a confirmed month start, the month grid, published
announcements, and that unconfirmed dates never produce official wording.
