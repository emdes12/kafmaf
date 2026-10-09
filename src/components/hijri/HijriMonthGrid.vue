<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { formatMedium, isoToUtcNoon } from '@/lib/dates'
import {
  addHijriMonths,
  buildMonthGrid,
  hijriMonthName,
  HIJRI_MONTHS_AR,
  WEEKDAYS_SHORT,
  type HijriProvider,
  type OccasionRecord,
} from '@/lib/hijri'

const props = defineProps<{
  provider: HijriProvider
  records: Map<string, OccasionRecord>
  today: string
  initialYear: number
  initialMonth: number
}>()

const view = ref({ year: props.initialYear, month: props.initialMonth })
watch(
  () => [props.initialYear, props.initialMonth] as const,
  ([y, m]) => (view.value = { year: y, month: m }),
)

const grid = computed(() => buildMonthGrid(view.value.year, view.value.month, props.provider, props.records))

function go(delta: number) {
  view.value = addHijriMonths(view.value.year, view.value.month, delta)
}
function goToday() {
  view.value = { year: props.initialYear, month: props.initialMonth }
}

const gregorianRange = computed(() => {
  const days = grid.value?.days
  if (!days?.length) return ''
  return `${formatMedium(days[0].iso)} – ${formatMedium(days[days.length - 1].iso)}`
})

const dayFmt = new Intl.DateTimeFormat('en-GB', { timeZone: 'UTC', day: 'numeric' })
const monFmt = new Intl.DateTimeFormat('en-GB', { timeZone: 'UTC', month: 'short' })
function gDay(iso: string) {
  const d = isoToUtcNoon(iso)
  const day = dayFmt.format(d)
  return day === '1' || iso === grid.value?.days[0].iso ? `${day} ${monFmt.format(d)}` : day
}
const longFmt = new Intl.DateTimeFormat('en-GB', { timeZone: 'UTC', weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
</script>

<template>
  <section class="card overflow-hidden" aria-labelledby="month-heading">
    <header class="flex flex-wrap items-center justify-between gap-4 border-b border-line bg-paper-2/50 px-4 py-4 sm:px-6">
      <div>
        <h2 id="month-heading" class="font-display text-3xl font-bold uppercase">
          {{ hijriMonthName(view.month) }} <span class="text-brand">{{ view.year }} AH</span>
        </h2>
        <p class="text-sm text-muted">
          <span class="font-arabic text-base" lang="ar" dir="rtl">{{ HIJRI_MONTHS_AR[view.month - 1] }}</span>
          <span class="mx-2" aria-hidden="true">·</span>{{ gregorianRange }}
        </p>
      </div>
      <div class="flex items-center gap-2">
        <button type="button" class="btn-outline btn-sm" aria-label="Previous Hijri month" @click="go(-1)">←</button>
        <button type="button" class="btn-outline btn-sm" @click="goToday">This month</button>
        <button type="button" class="btn-outline btn-sm" aria-label="Next Hijri month" @click="go(1)">→</button>
      </div>
    </header>

    <div v-if="!grid" class="p-6 text-sm text-muted">This month cannot be calculated.</div>
    <div v-else class="p-2 sm:p-4">
      <div class="grid grid-cols-7 gap-1 sm:gap-2" role="grid" :aria-label="`${hijriMonthName(view.month)} ${view.year}`">
        <div
          v-for="w in WEEKDAYS_SHORT"
          :key="w"
          role="columnheader"
          class="pb-1 text-center text-[11px] font-semibold tracking-wide text-muted uppercase"
          :class="w === 'Fri' && 'text-brand'"
        >
          {{ w }}
        </div>
        <div v-for="n in grid.leadingBlanks" :key="'b' + n" aria-hidden="true" />
        <div
          v-for="d in grid.days"
          :key="d.iso"
          role="gridcell"
          :aria-current="d.iso === today ? 'date' : undefined"
          :aria-label="`${d.hijriDay} ${hijriMonthName(view.month)}, ${longFmt.format(isoToUtcNoon(d.iso))}${d.occasions.length ? ', ' + d.occasions.map((o) => `${o.def.name} (${o.basis})`).join(', ') : ''}`"
          class="relative flex min-h-16 flex-col rounded-lg border p-1.5 sm:min-h-24 sm:p-2.5"
          :class="[
            d.iso === today ? 'border-ink bg-ink text-paper' : 'border-line bg-white',
            d.occasions.some((o) => o.basis === 'confirmed') && d.iso !== today ? '!border-moss !bg-moss-soft' : '',
            d.occasions.length && d.occasions.every((o) => o.basis !== 'confirmed') && d.iso !== today ? '!border-amber/50 !bg-amber-soft' : '',
          ]"
        >
          <span class="font-display text-xl leading-none font-bold sm:text-2xl">{{ d.hijriDay }}</span>
          <span class="mt-0.5 text-[10px] sm:text-xs" :class="d.iso === today ? 'text-paper/70' : 'text-muted'">{{ gDay(d.iso) }}</span>
          <span
            v-for="o in d.occasions"
            :key="o.def.key"
            class="mt-auto hidden truncate rounded px-1 py-0.5 text-[10px] font-semibold sm:block"
            :class="o.basis === 'confirmed' ? 'bg-moss text-white' : 'bg-amber text-white'"
          >
            {{ o.def.name }}
          </span>
          <span
            v-if="d.occasions.length"
            class="absolute top-1.5 right-1.5 h-2 w-2 rounded-full sm:hidden"
            :class="d.occasions.some((o) => o.basis === 'confirmed') ? 'bg-moss' : 'bg-amber'"
            aria-hidden="true"
          />
        </div>
      </div>

      <ul class="mt-4 flex flex-wrap gap-x-5 gap-y-2 px-1 text-xs text-muted">
        <li class="flex items-center gap-1.5"><span class="h-3 w-3 rounded bg-ink" aria-hidden="true" />Today (Africa/Lagos)</li>
        <li class="flex items-center gap-1.5"><span class="h-3 w-3 rounded bg-moss" aria-hidden="true" />Officially confirmed occasion</li>
        <li class="flex items-center gap-1.5"><span class="h-3 w-3 rounded bg-amber" aria-hidden="true" />Expected / calculated — awaiting confirmation</li>
      </ul>

      <ul v-if="grid.occasions.length" class="mt-4 space-y-1 border-t border-line px-1 pt-4 text-sm">
        <li v-for="o in grid.occasions" :key="o.def.key">
          <span class="font-semibold">{{ o.def.name }}</span>
          — {{ o.date ? longFmt.format(isoToUtcNoon(o.date)) : 'date unavailable' }}
          <span class="text-muted">({{ o.basis === 'confirmed' ? 'officially confirmed' : o.basis === 'expected' ? 'expected — awaiting confirmation' : 'calculated estimate — awaiting confirmation' }})</span>
        </li>
      </ul>
    </div>
  </section>
</template>
