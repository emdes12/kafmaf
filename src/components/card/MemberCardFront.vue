<script setup lang="ts">
/**
 * ID card — FRONT. Fixed 856 × 540 px canvas (1 px = 0.1 mm of an ID-1 card).
 * All member data comes in through `data`; nothing is baked into the artwork.
 */
import { computed, ref } from 'vue'
import type { CardBranding, CardData } from '@/lib/card/types'
import { disciplineName } from '@/lib/disciplines'

const props = defineProps<{ data: CardData; branding: CardBranding }>()
const root = ref<HTMLElement | null>(null)
defineExpose({ root })

const vars = computed(() => ({
  '--c-primary': props.branding.colorPrimary,
  '--c-accent': props.branding.colorAccent,
  '--c-gold': props.branding.colorGold,
}))

// Long names shrink so they never overflow two lines.
const nameSize = computed(() => {
  const n = props.data.fullName.length
  if (n <= 16) return 50
  if (n <= 22) return 44
  if (n <= 30) return 38
  return 32
})
</script>

<template>
  <div ref="root" class="card-face" :style="vars" role="img" :aria-label="`Membership card front for ${data.fullName}`">
    <!-- Background geometry (decorative, behind content) -->
    <svg class="bg" viewBox="0 0 856 540" aria-hidden="true">
      <path d="M560 99 L856 99 L856 500 L700 500 Z" fill="var(--c-primary)" opacity="0.035" />
      <path d="M640 99 L856 99 L856 330 Z" fill="var(--c-accent)" opacity="0.04" />
      <g stroke="var(--c-gold)" stroke-opacity="0.16" stroke-width="1.2">
        <line x1="600" y1="500" x2="760" y2="99" />
        <line x1="640" y1="500" x2="800" y2="99" />
        <line x1="680" y1="500" x2="840" y2="99" />
      </g>
    </svg>

    <!-- Header band -->
    <header class="band">
      <div class="brand">
        <img v-if="branding.logoUrl" :src="branding.logoUrl" alt="" class="logo" />
        <svg v-else viewBox="0 0 24 40" class="mark" aria-hidden="true">
          <path d="M6 40 L16 0 H24 L14 40 Z" fill="var(--c-accent)" />
          <path d="M0 40 L5 20 H9 L4 40 Z" fill="var(--c-gold)" />
        </svg>
        <div>
          <div class="short">{{ branding.shortName }}</div>
          <div class="full">{{ branding.fullName }}</div>
        </div>
      </div>
      <div class="kind">Membership card</div>
    </header>
    <div class="rule" />

    <!-- Photo -->
    <div class="photo-wrap">
      <div class="photo">
        <img v-if="data.photoDataUrl" :src="data.photoDataUrl" alt="" />
        <svg v-else viewBox="0 0 200 250" aria-hidden="true" class="placeholder">
          <rect width="200" height="250" fill="#e9e6df" />
          <circle cx="100" cy="98" r="44" fill="#c9c4b8" />
          <path d="M22 250 C26 176 64 152 100 152 C136 152 174 176 178 250 Z" fill="#c9c4b8" />
          <text x="100" y="236" text-anchor="middle" font-size="13" font-family="Inter Variable, sans-serif" fill="#7d786d">PHOTO</text>
        </svg>
      </div>
      <div class="status" :class="{ sample: data.sample }">{{ data.statusLabel }}</div>
    </div>

    <!-- Details -->
    <div class="details">
      <div class="label">Name</div>
      <div class="name" :style="{ fontSize: nameSize + 'px' }">{{ data.fullName }}</div>

      <div class="label mt">Membership no.</div>
      <div class="number">{{ data.membershipNumber }}</div>

      <div class="dates">
        <div>
          <div class="label">Issued</div>
          <div class="date">{{ data.issueDate }}</div>
        </div>
        <div>
          <div class="label accent">Valid until</div>
          <div class="date accent">{{ data.expiryDate }}</div>
        </div>
      </div>

      <div class="label mt-sm">Disciplines</div>
      <div class="chips">
        <span v-for="d in data.disciplines" :key="d" class="chip">{{ disciplineName(d) }}</span>
      </div>
    </div>

    <!-- Footer strip -->
    <footer class="strip">
      <span>Scan reverse to verify</span>
      <span v-if="data.sample" class="sample-flag">Design preview · sample data</span>
    </footer>
  </div>
</template>

<style scoped>
.card-face {
  position: relative;
  width: 856px;
  height: 540px;
  overflow: hidden;
  background: #fbfaf7;
  color: var(--c-primary);
  font-family: 'Inter Variable', sans-serif;
  border-radius: 0;
}
.bg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}
.band {
  position: absolute;
  left: 0;
  top: 0;
  width: 856px;
  height: 96px;
  background: var(--c-primary);
  color: #f7f4ee;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 40px;
  clip-path: polygon(0 0, 100% 0, 100% 100%, 0 100%);
}
.band::after {
  content: '';
  position: absolute;
  right: 0;
  top: 0;
  width: 150px;
  height: 96px;
  background: var(--c-accent);
  clip-path: polygon(38px 0, 100% 0, 100% 100%, 0 100%);
}
.brand {
  display: flex;
  align-items: center;
  gap: 16px;
  position: relative;
  z-index: 1;
}
.mark {
  width: 26px;
  height: 44px;
}
.logo {
  width: 56px;
  height: 56px;
  object-fit: contain;
}
.short {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 700;
  font-size: 44px;
  letter-spacing: 0.06em;
  line-height: 1;
}
.full {
  margin-top: 4px;
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  opacity: 0.78;
}
.kind {
  position: relative;
  z-index: 1;
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 600;
  font-size: 17px;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: #fff;
  text-align: right;
  width: 100px;
  line-height: 1.05;
}
.rule {
  position: absolute;
  top: 96px;
  left: 0;
  width: 856px;
  height: 4px;
  background: var(--c-gold);
}
.photo-wrap {
  position: absolute;
  left: 40px;
  top: 126px;
  width: 200px;
}
.photo {
  width: 200px;
  height: 250px;
  background: #e9e6df;
  outline: 3px solid var(--c-primary);
  outline-offset: 0;
  box-shadow: 8px 8px 0 0 var(--c-accent);
  overflow: hidden;
}
.photo img,
.placeholder {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.status {
  margin-top: 22px;
  height: 36px;
  border-radius: 4px;
  background: var(--c-primary);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 700;
  font-size: 20px;
  letter-spacing: 0.22em;
  text-transform: uppercase;
}
.status.sample {
  background: repeating-linear-gradient(135deg, #8a5a00 0 10px, #a36c00 10px 20px);
}
.details {
  position: absolute;
  left: 280px;
  top: 124px;
  right: 40px;
}
.label {
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: #6b6f78;
}
.label.accent {
  color: var(--c-accent);
}
.mt {
  margin-top: 16px;
}
.mt-sm {
  margin-top: 14px;
}
.name {
  margin-top: 4px;
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 700;
  line-height: 0.98;
  text-transform: uppercase;
  letter-spacing: 0.01em;
  max-height: 2em;
  overflow: hidden;
  overflow-wrap: anywhere;
}
.number {
  margin-top: 4px;
  font-family: 'JetBrains Mono Variable', monospace;
  font-size: 28px;
  font-weight: 600;
  letter-spacing: 0.02em;
}
.dates {
  margin-top: 14px;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  padding: 12px 0;
  border-top: 2px solid rgba(22, 24, 29, 0.12);
  border-bottom: 2px solid rgba(22, 24, 29, 0.12);
}
.date {
  margin-top: 2px;
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 700;
  font-size: 34px;
  line-height: 1;
}
.date.accent {
  color: var(--c-accent);
}
.chips {
  margin-top: 6px;
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
.chip {
  border: 2px solid var(--c-primary);
  border-radius: 999px;
  padding: 3px 12px;
  font-size: 15px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}
.strip {
  position: absolute;
  left: 0;
  bottom: 0;
  width: 856px;
  height: 40px;
  background: var(--c-accent);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 40px;
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.18em;
  text-transform: uppercase;
}
.sample-flag {
  letter-spacing: 0.08em;
  opacity: 0.9;
}
</style>
