<script setup lang="ts">
import { computed } from 'vue'
import { formatLong, formatMedium } from '@/lib/dates'
import { basisLabel, formatHijri, statusChip, type ResolvedOccasion } from '@/lib/hijri'

const props = defineProps<{ occasion: ResolvedOccasion; today: string; compact?: boolean }>()

const chip = computed(() => statusChip(props.occasion, props.today))
const isToday = computed(() => props.occasion.basis === 'confirmed' && props.occasion.date === props.today)
</script>

<template>
  <article
    class="relative rounded-xl border p-5 transition-colors"
    :class="isToday ? 'border-gold bg-ink text-paper shadow-lg' : 'border-line bg-white'"
  >
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h3 class="font-display text-2xl font-bold tracking-tight uppercase">{{ occasion.def.name }}</h3>
        <p class="mt-0.5 text-sm font-medium" :class="isToday ? 'text-gold' : 'text-brand'">
          {{ formatHijri(occasion.hijri) }}
        </p>
      </div>
      <span
        class="rounded-full px-2.5 py-1 text-xs font-semibold"
        :class="{
          'bg-gold text-ink': chip.tone === 'highlight',
          'bg-moss-soft text-moss': chip.tone === 'confirmed',
          'bg-amber-soft text-amber': chip.tone === 'expected',
          'bg-paper-2 text-muted': chip.tone === 'neutral',
        }"
      >
        {{ chip.label }}
      </span>
    </div>

    <dl class="mt-4 grid gap-1 text-sm">
      <div class="flex flex-wrap gap-x-2">
        <dt class="sr-only">Gregorian date</dt>
        <dd class="font-semibold">{{ occasion.date ? formatLong(occasion.date) : 'Date unavailable' }}</dd>
      </div>
      <div class="flex flex-wrap items-center gap-2">
        <dt class="sr-only">Date status</dt>
        <dd
          class="inline-flex items-center gap-1.5 text-xs font-semibold tracking-wide uppercase"
          :class="occasion.basis === 'confirmed' ? (isToday ? 'text-gold' : 'text-moss') : isToday ? 'text-paper/70' : 'text-amber'"
        >
          <svg v-if="occasion.basis === 'confirmed'" viewBox="0 0 16 16" class="h-3.5 w-3.5" fill="currentColor" aria-hidden="true">
            <path d="M6.5 11.2 3.3 8l-1 1 4.2 4.2 7.2-7.2-1-1z" />
          </svg>
          {{ basisLabel(occasion.basis) }}
        </dd>
      </div>
    </dl>

    <p v-if="!compact" class="mt-3 text-sm leading-6" :class="isToday ? 'text-paper/80' : 'text-muted'">
      {{ occasion.def.description }}
    </p>

    <p v-if="occasion.basis !== 'confirmed'" class="mt-3 text-xs leading-5" :class="isToday ? 'text-paper/60' : 'text-muted'">
      Awaiting official confirmation.
      <template v-if="occasion.basis === 'expected' && occasion.calculatedDate && occasion.calculatedDate !== occasion.date">
        Calculated date: {{ formatMedium(occasion.calculatedDate) }}.
      </template>
    </p>
    <p v-else-if="occasion.record" class="mt-3 text-xs leading-5" :class="isToday ? 'text-paper/60' : 'text-muted'">
      Source: {{ occasion.record.source }}<template v-if="occasion.record.confirmed_on">
        · announced {{ formatMedium(occasion.record.confirmed_on) }}</template
      >.
      <template v-if="occasion.corrected && occasion.record.corrected_from">
        Corrected from {{ formatMedium(occasion.record.corrected_from) }}.
      </template>
    </p>
  </article>
</template>
