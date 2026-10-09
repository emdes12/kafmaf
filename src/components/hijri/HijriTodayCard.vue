<script setup lang="ts">
import { computed } from 'vue'
import { formatLong, formatTimestamp } from '@/lib/dates'
import {
  CALENDAR_LABELS,
  activeAnnouncements,
  formatHijri,
  formatHijriArabic,
  hijriMonthName,
  occasionMessage,
  upcomingOccasions,
  OCCASIONS,
  resolveOccasion,
} from '@/lib/hijri'
import { useHijriCalendar } from '@/composables/useHijri'

const props = withDefaults(defineProps<{ variant?: 'compact' | 'full' }>(), { variant: 'compact' })

const { today, provider, providerError, recordMap, records, recordsState, recordsFetchedAt, todayHijri, settings } =
  useHijriCalendar()

/** Occasion whose (resolved) date is today, if any. */
const todaysOccasion = computed(() => {
  const p = provider.value
  const h = todayHijri.value
  if (!p || !h) return null
  const candidates = [h.hijri.year - 1, h.hijri.year, h.hijri.year + 1].flatMap((y) =>
    OCCASIONS.map((o) => resolveOccasion(o, y, p, recordMap.value)),
  )
  return candidates.find((o) => o.date === today.value) ?? null
})

const nextOccasion = computed(() => {
  const p = provider.value
  if (!p) return null
  return upcomingOccasions(today.value, p, recordMap.value, 2).find((o) => o.date !== today.value) ?? null
})

const messages = computed(() => {
  const list = [todaysOccasion.value, nextOccasion.value]
    .filter((o): o is NonNullable<typeof o> => !!o)
    .map((o) => occasionMessage(o, today.value))
    .filter((m): m is NonNullable<typeof m> => !!m)
  return list
})

const inRamadan = computed(() => todayHijri.value?.hijri.month === 9)
const announcements = computed(() => activeAnnouncements(records.value, today.value))
const methodNote = computed(() => {
  const adj = settings.value.hijri_adjustment_days
  const adjText = adj === 0 ? '' : ` adjusted ${adj > 0 ? '+' : ''}${adj} day${Math.abs(adj) === 1 ? '' : 's'}`
  return `${CALENDAR_LABELS[settings.value.hijri_calendar]}${adjText}`
})
const isFull = computed(() => props.variant === 'full')
</script>

<template>
  <section
    class="relative overflow-hidden rounded-2xl bg-ink text-paper"
    :class="isFull ? 'p-6 sm:p-10' : 'p-6 sm:p-8'"
    aria-labelledby="hijri-today-heading"
  >
    <div class="pattern-geometric absolute inset-0 opacity-70" aria-hidden="true" />
    <div class="absolute inset-y-0 right-0 w-1/2 bg-gradient-to-l from-brand/55 to-transparent" aria-hidden="true" />

    <div class="relative">
      <h2 id="hijri-today-heading" class="eyebrow !text-gold">Today in the Hijri calendar</h2>

      <div v-if="providerError" class="mt-4 rounded-lg border border-white/15 bg-white/5 p-4 text-sm text-paper/80" role="status">
        The Hijri calendar cannot be calculated in this browser. Please update your browser to see Hijri dates.
      </div>

      <template v-else-if="todayHijri">
        <div class="mt-4 grid gap-6" :class="isFull ? 'lg:grid-cols-[1.3fr_1fr]' : 'md:grid-cols-[1.2fr_1fr]'">
          <div>
            <p class="display text-5xl sm:text-6xl" :class="isFull && 'lg:text-7xl'">
              {{ todayHijri.hijri.day }} {{ hijriMonthName(todayHijri.hijri.month) }}
              <span class="text-gold">{{ todayHijri.hijri.year }} AH</span>
            </p>
            <p class="mt-3"><span class="font-arabic text-2xl text-paper/90" lang="ar" dir="rtl">{{ formatHijriArabic(todayHijri.hijri) }}</span></p>
            <p class="mt-3 text-base font-medium text-paper/85">
              <time :datetime="today">{{ formatLong(today) }}</time>
            </p>
            <p class="mt-2 text-xs text-paper/55">
              <template v-if="todayHijri.basis === 'confirmed'">
                Day count follows the officially confirmed start of {{ hijriMonthName(todayHijri.hijri.month) }}.
              </template>
              <template v-else>
                Calculated with the {{ methodNote }}. Local moon sighting may differ by a day.
              </template>
            </p>
            <p v-if="inRamadan && !todaysOccasion" class="mt-4 inline-flex rounded-full bg-gold/15 px-3 py-1 text-sm font-semibold text-gold">
              Month of Ramadan — day {{ todayHijri.hijri.day }}
            </p>
          </div>

          <div class="flex flex-col gap-3">
            <p
              v-for="m in messages"
              :key="m.text"
              class="rounded-lg border px-4 py-3 text-sm leading-6"
              :class="
                m.official && m.emphasis === 'today'
                  ? 'border-gold bg-gold text-ink font-semibold'
                  : m.official
                    ? 'border-moss/40 bg-moss/20 text-paper'
                    : 'border-white/15 bg-white/5 text-paper/85'
              "
            >
              <span v-if="m.official" class="mb-1 block text-[11px] font-bold tracking-[0.14em] uppercase opacity-80">
                Officially confirmed
              </span>
              {{ m.text }}
            </p>
            <div v-if="nextOccasion && messages.length === 0" class="rounded-lg border border-white/15 bg-white/5 px-4 py-3 text-sm">
              <p class="text-[11px] font-bold tracking-[0.14em] text-gold uppercase">Next occasion</p>
              <p class="mt-1 font-semibold">{{ nextOccasion.def.name }} · {{ formatHijri(nextOccasion.hijri) }}</p>
              <p class="mt-0.5 text-paper/70">
                {{ nextOccasion.basis === 'confirmed' ? 'Confirmed for' : 'Expected around' }}
                {{ nextOccasion.date ? formatLong(nextOccasion.date) : '—' }}
                <template v-if="nextOccasion.basis !== 'confirmed'"> · awaiting official confirmation</template>
              </p>
            </div>
            <div
              v-for="a in announcements"
              :key="a.occasion_key + a.hijri_year"
              class="rounded-lg border border-gold/40 bg-gold/10 px-4 py-3 text-sm"
            >
              <p class="text-[11px] font-bold tracking-[0.14em] text-gold uppercase">
                {{ settings.short_name }} announcement · {{ a.status === 'confirmed' ? 'Confirmed' : 'Expected' }}
              </p>
              <p class="mt-1 whitespace-pre-line text-paper/90">{{ a.announcement }}</p>
            </div>
          </div>
        </div>

        <p v-if="recordsState === 'cached'" class="mt-5 text-xs text-paper/55" role="status">
          Could not refresh official confirmations. Showing the last confirmations received
          {{ recordsFetchedAt ? formatTimestamp(recordsFetchedAt) : '' }}.
        </p>
        <p v-else-if="recordsState === 'unavailable'" class="mt-5 text-xs text-paper/55" role="status">
          Official confirmations are currently unavailable; all occasion dates shown are calculated estimates.
        </p>

        <div v-if="!isFull" class="mt-6">
          <RouterLink to="/hijri-calendar" class="btn-ghost-light btn-sm">Open the Hijri calendar →</RouterLink>
        </div>
      </template>
    </div>
  </section>
</template>
