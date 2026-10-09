<script setup lang="ts">
/** Hero visual: KAFMAF emblem inside a geometric ring, with the digital ID card (sample data) in front. */
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import HeritageCardFront from '@/components/card/HeritageCardFront.vue'
import { useSettings } from '@/composables/useSettings'
import { siteUrl } from '@/lib/supabase'
import { SAMPLE_CARD, brandingFromSettings } from '@/lib/card/types'

const { settings, logoUrl, uploadedLogoUrl } = useSettings()
const branding = computed(() =>
  brandingFromSettings(settings.value, uploadedLogoUrl.value, new URL(siteUrl() || 'https://example.invalid').host, 'heritage'),
)
const sample = { ...SAMPLE_CARD, statusLabel: 'Active', sample: false }
// The card spans ~76% of the showcase width at any screen size.
const box = ref<HTMLElement | null>(null)
const scale = ref(0.46)
let ro: ResizeObserver | null = null
onMounted(() => {
  ro = new ResizeObserver(([e]) => (scale.value = (e.contentRect.width * 0.76) / 856))
  if (box.value) ro.observe(box.value)
})
onBeforeUnmount(() => ro?.disconnect())
</script>

<template>
  <div ref="box" class="relative mx-auto aspect-square w-full max-w-[520px]" aria-hidden="true">
    <!-- Rings -->
    <svg viewBox="0 0 520 520" class="spin-slow absolute inset-0 h-full w-full">
      <circle cx="260" cy="260" r="250" fill="none" stroke="var(--color-gold)" stroke-opacity=".25" stroke-width="1" stroke-dasharray="2 10" />
      <circle cx="260" cy="260" r="214" fill="none" stroke="var(--color-paper)" stroke-opacity=".08" stroke-width="28" />
      <g stroke="var(--color-gold)" stroke-opacity=".35" stroke-width="2">
        <line v-for="i in 24" :key="i" x1="260" y1="4" x2="260" y2="22" :transform="`rotate(${i * 15} 260 260)`" />
      </g>
    </svg>
    <svg viewBox="0 0 520 520" class="absolute inset-0 h-full w-full">
      <circle cx="260" cy="260" r="176" fill="var(--color-ink-2)" />
      <circle cx="260" cy="260" r="176" fill="none" stroke="var(--color-gold)" stroke-width="3" />
      <path d="M150 470 L250 50 H284 L184 470 Z" fill="var(--color-brand)" opacity=".55" />
    </svg>

    <!-- Emblem -->
    <div class="absolute top-[18%] left-1/2 flex h-[38%] w-[38%] -translate-x-1/2 items-center justify-center rounded-full bg-white p-2 shadow-[0_0_0_6px_var(--color-gold),0_30px_60px_-20px_rgba(0,0,0,.6)]">
      <img :src="logoUrl" alt="" class="h-full w-full rounded-full object-contain" />
    </div>

    <!-- Card -->
    <div
      class="absolute right-[-4%] bottom-[2%] origin-bottom-right rotate-[-7deg] overflow-hidden rounded-[10px] shadow-[0_40px_80px_-30px_rgba(0,0,0,.75)] ring-1 ring-black/20"
      :style="{ width: 856 * scale + 'px', height: 540 * scale + 'px' }"
    >
      <div :style="{ transform: `scale(${scale})`, transformOrigin: 'top left', width: '856px', height: '540px' }">
        <HeritageCardFront :data="sample" :branding="branding" />
      </div>
    </div>
  </div>
</template>
