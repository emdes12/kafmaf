<script setup lang="ts">
/**
 * ID card — FRONT, "Heritage" style: KAFMAF's own logo and its green / yellow / red
 * colours. Fixed 856 × 540 px canvas (1 px = 0.1 mm of an ID-1 card).
 */
import { computed, ref, useId } from 'vue'
import type { CardBranding, CardData } from '@/lib/card/types'
import { disciplineName } from '@/lib/disciplines'
import { guillochePaths } from '@/lib/card/guilloche'

const props = defineProps<{ data: CardData; branding: CardBranding }>()
const root = ref<HTMLElement | null>(null)
defineExpose({ root })

const vars = computed(() => ({
  '--g': props.branding.colorPrimary,
  '--y': props.branding.colorGold,
  '--r': props.branding.colorAccent,
}))
const nameSize = computed(() => {
  const n = props.data.fullName.length
  if (n <= 16) return 52
  if (n <= 22) return 45
  if (n <= 30) return 38
  return 32
})
const waves = guillochePaths()
const uid = useId()
</script>

<template>
  <div ref="root" class="face" :style="vars" role="img" :aria-label="`Membership card front for ${data.fullName}`">
    <!-- Background: deep green field, guilloche security lines, light sweep -->
    <svg class="bg" viewBox="0 0 856 540" aria-hidden="true">
      <defs>
        <linearGradient :id="`${uid}-field`" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="#03300c" />
          <stop offset="0.55" stop-color="#05470f" />
          <stop offset="1" :stop-color="branding.colorPrimary" />
        </linearGradient>
        <radialGradient :id="`${uid}-glow`" cx="0.82" cy="0.18" r="0.6">
          <stop offset="0" stop-color="#ffffff" stop-opacity="0.13" />
          <stop offset="1" stop-color="#ffffff" stop-opacity="0" />
        </radialGradient>
      </defs>
      <rect width="856" height="540" :fill="`url(#${uid}-field)`" />
      <g fill="none" stroke="var(--y)" stroke-width="0.8" stroke-opacity="0.13">
        <path v-for="(d, i) in waves" :key="i" :d="d" />
      </g>
      <rect width="856" height="540" :fill="`url(#${uid}-glow)`" />
      <!-- Angular accent behind the portrait -->
      <polygon points="0,96 268,96 242,470 0,470" fill="#000" fill-opacity="0.18" />
      <polygon points="268,96 274,96 248,470 242,470" fill="var(--y)" />
    </svg>
    <img v-if="branding.logoUrl" :src="branding.logoUrl" alt="" class="watermark" />

    <!-- Header -->
    <header class="head">
      <div class="brand">
        <span class="logo"><img v-if="branding.logoUrl" :src="branding.logoUrl" alt="" /></span>
        <div>
          <div class="short">{{ branding.shortName }}</div>
          <div class="full">{{ branding.fullName }}</div>
        </div>
      </div>
      <div class="kind">
        <span>Membership</span>
        <strong>ID Card</strong>
      </div>
    </header>
    <div class="hairline" />

    <!-- Portrait -->
    <div class="portrait">
      <div class="photo">
        <img v-if="data.photoDataUrl" :src="data.photoDataUrl" alt="" />
        <svg v-else viewBox="0 0 200 250" aria-hidden="true">
          <rect width="200" height="250" fill="#e8ece6" />
          <circle cx="100" cy="98" r="44" fill="#c3ccc0" />
          <path d="M22 250 C26 176 64 152 100 152 C136 152 174 176 178 250 Z" fill="#c3ccc0" />
          <text x="100" y="236" text-anchor="middle" font-size="13" font-family="Inter Variable, sans-serif" fill="#66705f">PHOTO</text>
        </svg>
      </div>
      <div class="status" :class="{ sample: data.sample }">
        <span class="dot" />
        {{ data.statusLabel }}
      </div>
    </div>

    <!-- Details -->
    <section class="details">
      <div class="label">Name</div>
      <div class="name" :style="{ fontSize: nameSize + 'px' }">{{ data.fullName }}</div>

      <div class="row">
        <div>
          <div class="label">Membership no.</div>
          <div class="number">{{ data.membershipNumber }}</div>
        </div>
      </div>

      <div class="dates">
        <div>
          <div class="label">Issued</div>
          <div class="date">{{ data.issueDate }}</div>
        </div>
        <div class="divider" />
        <div>
          <div class="label">Valid until</div>
          <div class="date accent">{{ data.expiryDate }}</div>
        </div>
      </div>

      <div class="chips">
        <span v-for="d in data.disciplines" :key="d" class="chip">{{ disciplineName(d) }}</span>
      </div>
    </section>

    <!-- Footer: tricolour edge -->
    <footer class="foot">
      <span>Scan reverse to verify</span>
      <span v-if="data.sample" class="sample-flag">Design preview · sample data</span>
    </footer>
    <div class="tricolour"><i /><i /><i /></div>
  </div>
</template>

<style scoped>
.face {
  position: relative;
  width: 856px;
  height: 540px;
  overflow: hidden;
  color: #fff;
  font-family: 'Inter Variable', sans-serif;
  background: #04380d;
}
.bg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}
.watermark {
  position: absolute;
  right: -90px;
  bottom: -70px;
  width: 400px;
  height: 400px;
  opacity: 0.07;
  filter: grayscale(1) brightness(2.2);
  border-radius: 50%;
}

/* Header */
.head {
  position: absolute;
  left: 36px;
  right: 36px;
  top: 18px;
  height: 64px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.brand {
  display: flex;
  align-items: center;
  gap: 14px;
}
.logo {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: #fff;
  padding: 3px;
  box-shadow:
    0 0 0 2.5px var(--y),
    0 6px 14px rgba(0, 0, 0, 0.35);
}
.logo img {
  display: block;
  width: 100%;
  height: 100%;
  border-radius: 50%;
}
.short {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 700;
  font-size: 40px;
  line-height: 0.9;
  letter-spacing: 0.05em;
  color: var(--y);
}
.full {
  margin-top: 5px;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.85);
}
.kind {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  line-height: 1;
  text-transform: uppercase;
}
.kind span {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.3em;
  color: rgba(255, 255, 255, 0.7);
}
.kind strong {
  margin-top: 5px;
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 26px;
  font-weight: 700;
  letter-spacing: 0.12em;
  color: #fff;
}
.hairline {
  position: absolute;
  left: 36px;
  right: 36px;
  top: 94px;
  height: 1px;
  background: linear-gradient(90deg, var(--y), rgba(255, 241, 18, 0.15));
}

/* Portrait */
.portrait {
  position: absolute;
  left: 40px;
  top: 120px;
  width: 182px;
}
.photo {
  width: 182px;
  height: 228px;
  border-radius: 10px;
  overflow: hidden;
  background: #e8ece6;
  border: 4px solid #fff;
  box-shadow:
    0 0 0 2px var(--y),
    0 16px 30px rgba(0, 0, 0, 0.45);
}
.photo img,
.photo svg {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.status {
  margin-top: 18px;
  height: 36px;
  border-radius: 999px;
  background: #fff;
  color: var(--g);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 700;
  font-size: 19px;
  letter-spacing: 0.24em;
  text-transform: uppercase;
}
.status .dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--g);
  box-shadow: 0 0 0 3px rgba(0, 111, 3, 0.2);
}
.status.sample {
  background: repeating-linear-gradient(135deg, var(--y) 0 10px, #fff 10px 20px);
  color: #0b240f;
}
.status.sample .dot {
  background: #0b240f;
}

/* Details */
.details {
  position: absolute;
  left: 290px;
  right: 40px;
  top: 116px;
}
.label {
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: var(--y);
  opacity: 0.9;
}
.name {
  margin-top: 4px;
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 700;
  line-height: 0.96;
  letter-spacing: 0.01em;
  text-transform: uppercase;
  max-height: 1.92em;
  overflow: hidden;
  overflow-wrap: anywhere;
  text-shadow: 0 2px 10px rgba(0, 0, 0, 0.25);
}
.row {
  margin-top: 16px;
}
.number {
  margin-top: 4px;
  display: inline-block;
  padding: 4px 12px;
  border-radius: 6px;
  background: rgba(0, 0, 0, 0.25);
  border: 1px solid rgba(255, 241, 18, 0.35);
  font-family: 'JetBrains Mono Variable', monospace;
  font-size: 25px;
  font-weight: 600;
  letter-spacing: 0.03em;
}
.dates {
  margin-top: 16px;
  display: grid;
  grid-template-columns: 1fr 1px 1fr;
  gap: 22px;
  align-items: center;
  padding: 12px 0;
  border-top: 1px solid rgba(255, 255, 255, 0.22);
  border-bottom: 1px solid rgba(255, 255, 255, 0.22);
}
.divider {
  height: 46px;
  background: rgba(255, 255, 255, 0.22);
}
.date {
  margin-top: 3px;
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 700;
  font-size: 34px;
  line-height: 1;
}
.date.accent {
  color: var(--y);
}
.chips {
  margin-top: 16px;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.chip {
  border: 1.5px solid rgba(255, 255, 255, 0.75);
  border-radius: 999px;
  padding: 4px 14px;
  font-size: 13.5px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

/* Footer */
.foot {
  position: absolute;
  left: 40px;
  right: 40px;
  bottom: 18px;
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.75);
}
.sample-flag {
  color: var(--y);
  letter-spacing: 0.1em;
}
.tricolour {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 8px;
  display: grid;
  grid-template-columns: 2fr 1fr 1fr;
}
.tricolour i:nth-child(1) {
  background: var(--g);
  filter: brightness(1.35);
}
.tricolour i:nth-child(2) {
  background: var(--y);
}
.tricolour i:nth-child(3) {
  background: var(--r);
}
</style>
