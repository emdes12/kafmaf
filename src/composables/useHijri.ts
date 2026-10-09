import { computed, onScopeDispose, ref, shallowRef, getCurrentScope } from 'vue'
import { dateInZone, msUntilNextLagosMidnight, type IsoDate } from '@/lib/dates'
import {
  createIntlHijriProvider,
  indexRecords,
  hijriForDate,
  type HijriProvider,
  type OccasionRecord,
} from '@/lib/hijri'
import { supabase } from '@/lib/supabase'
import { useSettings } from './useSettings'

// ---------------------------------------------------------------------------
// "Today" in Africa/Lagos, refreshed automatically at Lagos midnight.
// ---------------------------------------------------------------------------
const today = ref<IsoDate>(dateInZone())
let midnightTimer: ReturnType<typeof setTimeout> | null = null
let todaySubscribers = 0

function scheduleMidnight() {
  midnightTimer = setTimeout(() => {
    today.value = dateInZone()
    scheduleMidnight()
  }, msUntilNextLagosMidnight())
}

function onVisible() {
  if (document.visibilityState === 'visible') today.value = dateInZone()
}

export function useLagosToday() {
  if (getCurrentScope()) {
    if (todaySubscribers++ === 0) {
      scheduleMidnight()
      document.addEventListener('visibilitychange', onVisible)
    }
    onScopeDispose(() => {
      if (--todaySubscribers === 0) {
        if (midnightTimer) clearTimeout(midnightTimer)
        document.removeEventListener('visibilitychange', onVisible)
      }
    })
  }
  return today
}

// ---------------------------------------------------------------------------
// Administrator-confirmed occasion records, with last-known-good cache.
// ---------------------------------------------------------------------------
const CACHE_KEY = 'kafmaf.occasions.v1'
type RecordsState = 'idle' | 'loading' | 'live' | 'cached' | 'unavailable'

const records = shallowRef<OccasionRecord[]>([])
const recordsState = ref<RecordsState>('idle')
const recordsFetchedAt = ref<string | null>(null)
let recordsPromise: Promise<void> | null = null

function readCache(): { fetchedAt: string; rows: OccasionRecord[] } | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed?.rows) || typeof parsed?.fetchedAt !== 'string') return null
    return parsed
  } catch {
    return null
  }
}

function writeCache(rows: OccasionRecord[], fetchedAt: string) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ fetchedAt, rows }))
  } catch {
    /* storage unavailable: ignore */
  }
}

export function loadOccasionRecords(force = false): Promise<void> {
  if (recordsPromise && !force) return recordsPromise
  recordsPromise = (async () => {
    if (!supabase) {
      recordsState.value = 'unavailable'
      return
    }
    recordsState.value = 'loading'
    const { data, error } = await supabase
      .from('islamic_occasions')
      .select(
        'id, occasion_key, hijri_year, status, gregorian_date, source, confirmed_on, corrected_from, announcement, publish_announcement, announcement_expires_on, updated_at',
      )
    if (!error && data) {
      const fetchedAt = new Date().toISOString()
      records.value = data as OccasionRecord[]
      recordsFetchedAt.value = fetchedAt
      recordsState.value = 'live'
      writeCache(records.value, fetchedAt)
      return
    }
    // Fall back to the last successfully loaded confirmations, clearly labelled.
    const cached = readCache()
    if (cached) {
      records.value = cached.rows
      recordsFetchedAt.value = cached.fetchedAt
      recordsState.value = 'cached'
    } else {
      records.value = []
      recordsState.value = 'unavailable'
    }
  })()
  return recordsPromise
}

// ---------------------------------------------------------------------------
// Combined calendar state
// ---------------------------------------------------------------------------
export function useHijriCalendar() {
  const { settings } = useSettings()
  const todayRef = useLagosToday()

  const providerResult = computed<{ provider: HijriProvider | null; error: string | null }>(() => {
    try {
      return {
        provider: createIntlHijriProvider(settings.value.hijri_calendar, settings.value.hijri_adjustment_days),
        error: null,
      }
    } catch (e) {
      return { provider: null, error: e instanceof Error ? e.message : 'Hijri calendar unavailable.' }
    }
  })

  const recordMap = computed(() => indexRecords(records.value))

  const todayHijri = computed(() => {
    const p = providerResult.value.provider
    return p ? hijriForDate(todayRef.value, p, recordMap.value) : null
  })

  return {
    today: todayRef,
    provider: computed(() => providerResult.value.provider),
    providerError: computed(() => providerResult.value.error),
    records,
    recordMap,
    recordsState,
    recordsFetchedAt,
    todayHijri,
    settings,
    reloadRecords: () => loadOccasionRecords(true),
  }
}
