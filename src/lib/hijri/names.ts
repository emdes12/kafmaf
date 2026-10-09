import type { HijriDate } from './provider'

/** English transliterations used consistently across the site. */
export const HIJRI_MONTHS_EN = [
  'Muharram',
  'Safar',
  "Rabi' al-Awwal",
  "Rabi' al-Thani",
  'Jumada al-Ula',
  'Jumada al-Akhirah',
  'Rajab',
  "Sha'ban",
  'Ramadan',
  'Shawwal',
  "Dhu al-Qa'dah",
  'Dhu al-Hijjah',
] as const

export const HIJRI_MONTHS_AR = [
  'مُحَرَّم',
  'صَفَر',
  'رَبِيع الأَوَّل',
  'رَبِيع الآخِر',
  'جُمَادَى الأُولَى',
  'جُمَادَى الآخِرَة',
  'رَجَب',
  'شَعْبَان',
  'رَمَضَان',
  'شَوَّال',
  'ذُو القَعْدَة',
  'ذُو الحِجَّة',
] as const

export const WEEKDAYS_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const

const arabicDigits = new Intl.NumberFormat('ar-EG', { useGrouping: false })

export function hijriMonthName(month: number): string {
  return HIJRI_MONTHS_EN[month - 1] ?? `Month ${month}`
}

/** "28 Rabi' al-Thani 1448 AH" */
export function formatHijri(h: HijriDate): string {
  return `${h.day} ${hijriMonthName(h.month)} ${h.year} AH`
}

/** "٢٨ رَبِيع الآخِر ١٤٤٨ هـ" */
export function formatHijriArabic(h: HijriDate): string {
  return `${arabicDigits.format(h.day)} ${HIJRI_MONTHS_AR[h.month - 1]} ${arabicDigits.format(h.year)} هـ`
}
