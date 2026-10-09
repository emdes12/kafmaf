<script setup lang="ts">
import { computed } from 'vue'
import HijriTodayCard from '@/components/hijri/HijriTodayCard.vue'
import HijriMonthGrid from '@/components/hijri/HijriMonthGrid.vue'
import OccasionCard from '@/components/hijri/OccasionCard.vue'
import { useHijriCalendar } from '@/composables/useHijri'
import { usePageMeta } from '@/composables/usePageMeta'
import { CALENDAR_LABELS, upcomingOccasions } from '@/lib/hijri'

usePageMeta({
  title: 'Hijri Calendar',
  description:
    "Today's Hijri date, a monthly Hijri calendar and upcoming Islamic occasions — Islamic New Year, Ramadan, Eid al-Fitr and Eid al-Adha — with expected and officially confirmed dates for Nigeria.",
})

const { today, provider, recordMap, todayHijri, settings } = useHijriCalendar()
const upcoming = computed(() => (provider.value ? upcomingOccasions(today.value, provider.value, recordMap.value, 4) : []))
</script>

<template>
  <div>
    <section class="container-page pt-10 sm:pt-14">
      <p class="eyebrow">Hijri calendar</p>
      <h1 class="display mt-2 text-5xl sm:text-6xl">Islamic calendar &amp; occasions</h1>
      <p class="mt-4 max-w-2xl text-base leading-7 text-muted">
        Dates follow the Africa/Lagos timezone. Occasions that depend on moon sighting are shown as expected until confirmed by
        {{ settings.hijri_authority_label }}.
      </p>
    </section>

    <section class="container-page mt-8">
      <HijriTodayCard variant="full" />
    </section>

    <section class="container-page mt-14" aria-labelledby="upcoming-heading">
      <h2 id="upcoming-heading" class="display text-4xl">Upcoming occasions</h2>
      <div v-if="upcoming.length" class="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <OccasionCard v-for="o in upcoming" :key="o.def.key + o.hijriYear" :occasion="o" :today="today" />
      </div>
      <p v-else class="mt-6 text-sm text-muted">Upcoming occasions are unavailable.</p>
    </section>

    <section v-if="provider && todayHijri" class="container-page mt-14">
      <HijriMonthGrid
        :provider="provider"
        :records="recordMap"
        :today="today"
        :initial-year="todayHijri.hijri.year"
        :initial-month="todayHijri.hijri.month"
      />
    </section>

    <section class="container-page mt-14" aria-labelledby="method-heading">
      <div class="card grid gap-8 p-6 sm:p-8 lg:grid-cols-2">
        <div>
          <h2 id="method-heading" class="display text-3xl">How these dates are worked out</h2>
          <div class="prose-kafmaf mt-4">
            <p>
              Ordinary Hijri dates are <strong>calculated</strong> in your browser using the
              {{ CALENDAR_LABELS[settings.hijri_calendar] }}<template v-if="settings.hijri_adjustment_days !== 0">
                with an adjustment of {{ settings.hijri_adjustment_days > 0 ? '+' : '' }}{{ settings.hijri_adjustment_days }}
                day(s)</template
              >. A calculation is an estimate: in Nigeria, the start of Ramadan and the dates of Eid are determined by moon sighting
              and announced by {{ settings.hijri_authority_label }}, and may differ from the calculation by a day.
            </p>
          </div>
        </div>
        <dl class="grid gap-4 text-sm">
          <div class="flex gap-3">
            <dt class="w-36 shrink-0"><span class="rounded-full bg-moss-soft px-2.5 py-1 text-xs font-semibold text-moss">Officially confirmed</span></dt>
            <dd class="text-muted">An administrator has recorded the officially announced date, with its source and announcement date.</dd>
          </div>
          <div class="flex gap-3">
            <dt class="w-36 shrink-0"><span class="rounded-full bg-amber-soft px-2.5 py-1 text-xs font-semibold text-amber">Expected date</span></dt>
            <dd class="text-muted">An administrator has recorded an expected date ahead of the official announcement.</dd>
          </div>
          <div class="flex gap-3">
            <dt class="w-36 shrink-0"><span class="rounded-full bg-paper-2 px-2.5 py-1 text-xs font-semibold text-ink-3">Calculated estimate</span></dt>
            <dd class="text-muted">No announcement has been recorded yet; the date comes from the calculation only.</dd>
          </div>
        </dl>
      </div>
    </section>
  </div>
</template>
