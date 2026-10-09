<script setup lang="ts">
/**
 * PROVISIONAL text-based brand treatment. This is not an official KAFMAF logo.
 * When leadership supplies an approved logo, upload it in Admin → Settings and
 * it replaces the angled bar automatically.
 */
import { useSettings } from '@/composables/useSettings'

withDefaults(defineProps<{ tone?: 'light' | 'dark'; showFullName?: boolean; fullNameClass?: string }>(), {
  tone: 'dark',
  showFullName: true,
  fullNameClass: 'hidden sm:block',
})
const { settings, logoUrl } = useSettings()
</script>

<template>
  <span class="inline-flex items-center gap-3">
    <img v-if="logoUrl" :src="logoUrl" alt="" class="h-10 w-10 object-contain" />
    <svg v-else viewBox="0 0 24 40" class="h-9 w-[22px] shrink-0" aria-hidden="true">
      <path d="M6 40 L16 0 H24 L14 40 Z" fill="var(--color-crimson)" />
      <path d="M0 40 L5 20 H9 L4 40 Z" fill="var(--color-gold)" />
    </svg>
    <span class="flex flex-col leading-none">
      <span
        class="font-display text-[1.6rem] font-bold tracking-[0.06em]"
        :class="tone === 'light' ? 'text-paper' : 'text-ink'"
      >
        {{ settings.short_name }}
      </span>
      <span
        v-if="showFullName"
        class="mt-1 text-[10px] font-semibold tracking-[0.14em] uppercase"
        :class="[fullNameClass, tone === 'light' ? 'text-paper/60' : 'text-muted']"
      >
        {{ settings.full_name }}
      </span>
    </span>
  </span>
</template>
