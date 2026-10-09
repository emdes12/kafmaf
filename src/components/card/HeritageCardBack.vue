<script setup lang="ts">
/** ID card — BACK, "Heritage" style (KAFMAF logo and colours). 856 × 540 px canvas. */
import { computed, ref, useId } from 'vue'
import type { CardBranding, CardData } from '@/lib/card/types'
import { guillochePaths } from '@/lib/card/guilloche'

const props = defineProps<{ data: CardData; branding: CardBranding }>()
const root = ref<HTMLElement | null>(null)
defineExpose({ root })

const vars = computed(() => ({
  '--g': props.branding.colorPrimary,
  '--y': props.branding.colorGold,
  '--r': props.branding.colorAccent,
}))
const waves = guillochePaths(856, 540, 14)
const uid = useId()
</script>

<template>
  <div ref="root" class="face" :style="vars" role="img" aria-label="Membership card back with verification QR code">
    <svg class="bg" viewBox="0 0 856 540" aria-hidden="true">
      <defs>
        <linearGradient :id="`${uid}-band`" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stop-color="#03300c" />
          <stop offset="1" :stop-color="branding.colorPrimary" />
        </linearGradient>
      </defs>
      <rect width="856" height="540" fill="#fbfcf9" />
      <g fill="none" :stroke="branding.colorPrimary" stroke-width="0.8" stroke-opacity="0.07">
        <path v-for="(d, i) in waves" :key="i" :d="d" />
      </g>
      <rect width="856" height="92" :fill="`url(#${uid}-band)`" />
      <rect y="92" width="856" height="3" fill="var(--y)" />
      <rect y="492" width="856" height="48" :fill="`url(#${uid}-band)`" />
    </svg>
    <img v-if="branding.logoUrl" :src="branding.logoUrl" alt="" class="watermark" />

    <header class="head">
      <span class="logo"><img v-if="branding.logoUrl" :src="branding.logoUrl" alt="" /></span>
      <div>
        <div class="short">{{ branding.shortName }}</div>
        <div class="full">{{ branding.fullName }}</div>
      </div>
    </header>

    <!-- QR with viewfinder corners -->
    <div class="qr-block">
      <div class="qr-frame">
        <i class="c tl" /><i class="c tr" /><i class="c bl" /><i class="c br" />
        <div class="qr">
          <img v-if="data.qrDataUrl" :src="data.qrDataUrl" alt="" />
          <div v-else class="qr-placeholder"><span>Sample QR<br />placeholder</span></div>
        </div>
      </div>
      <div class="qr-caption">Scan to verify</div>
    </div>

    <section class="info">
      <div class="eyebrow">Live verification</div>
      <h3 class="heading">Check this card online</h3>
      <p class="text">
        Scan the QR code to open this card's verification page on
        <strong>{{ branding.verifyHost || 'the official website' }}</strong>. It shows the current membership status from the
        live records.
      </p>
      <p class="statement">{{ branding.validityStatement }}</p>
      <p v-if="branding.contactLine" class="contact"><span class="label">Contact</span>{{ branding.contactLine }}</p>
      <div v-if="branding.showSignature" class="signature">
        <div class="sig-line" />
        <div class="label">{{ branding.signatureLabel || 'Authorised signature' }}</div>
      </div>
    </section>

    <footer class="foot">
      <span class="mono">{{ data.membershipNumber }}</span>
      <span>Card v{{ data.cardVersion }}</span>
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
  background: #fbfcf9;
  color: #0d2311;
  font-family: 'Inter Variable', sans-serif;
}
.bg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}
.watermark {
  position: absolute;
  right: -60px;
  bottom: 30px;
  width: 300px;
  height: 300px;
  opacity: 0.05;
  border-radius: 50%;
}
.head {
  position: absolute;
  left: 36px;
  top: 14px;
  height: 64px;
  display: flex;
  align-items: center;
  gap: 14px;
  color: #fff;
}
.logo {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  background: #fff;
  padding: 3px;
  box-shadow: 0 0 0 2.5px var(--y);
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
  font-size: 36px;
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

/* QR */
.qr-block {
  position: absolute;
  left: 44px;
  top: 122px;
  width: 244px;
}
.qr-frame {
  position: relative;
  width: 244px;
  height: 244px;
  padding: 14px;
  box-sizing: border-box;
}
.qr {
  width: 100%;
  height: 100%;
  background: #fff;
  padding: 12px;
  box-sizing: border-box;
  border-radius: 8px;
  box-shadow: 0 8px 22px rgba(13, 35, 17, 0.12);
}
.qr img {
  display: block;
  width: 100%;
  height: 100%;
  image-rendering: pixelated;
}
.c {
  position: absolute;
  width: 34px;
  height: 34px;
  border-color: var(--g);
  border-style: solid;
  border-width: 0;
}
.tl {
  top: 0;
  left: 0;
  border-top-width: 5px;
  border-left-width: 5px;
  border-top-left-radius: 10px;
}
.tr {
  top: 0;
  right: 0;
  border-top-width: 5px;
  border-right-width: 5px;
  border-top-right-radius: 10px;
}
.bl {
  bottom: 0;
  left: 0;
  border-bottom-width: 5px;
  border-left-width: 5px;
  border-bottom-left-radius: 10px;
}
.br {
  bottom: 0;
  right: 0;
  border-bottom-width: 5px;
  border-right-width: 5px;
  border-bottom-right-radius: 10px;
}
.qr-placeholder {
  width: 100%;
  height: 100%;
  background: repeating-linear-gradient(45deg, #edf1ea 0 8px, #fff 8px 16px);
  border: 2px dashed #8a9488;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  font-size: 15px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #5d675b;
}
.qr-caption {
  margin-top: 10px;
  text-align: center;
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 700;
  font-size: 22px;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--g);
}

/* Info */
.info {
  position: absolute;
  left: 330px;
  right: 40px;
  top: 118px;
}
.eyebrow {
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: var(--r);
}
.heading {
  margin: 4px 0 0;
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 700;
  font-size: 34px;
  line-height: 1;
  letter-spacing: 0.02em;
  text-transform: uppercase;
  color: var(--g);
}
.text {
  margin-top: 10px;
  font-size: 16.5px;
  line-height: 1.45;
  color: #2a3a2c;
}
.statement {
  margin-top: 14px;
  padding: 12px 16px;
  border-radius: 8px;
  background: rgba(0, 111, 3, 0.07);
  border-left: 5px solid var(--g);
  font-size: 15.5px;
  line-height: 1.4;
  font-weight: 600;
}
.contact {
  margin-top: 12px;
  font-size: 15px;
  font-weight: 600;
}
.label {
  display: block;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--g);
}
.signature {
  margin-top: 20px;
  width: 260px;
}
.sig-line {
  height: 36px;
  border-bottom: 2px solid #0d2311;
  margin-bottom: 6px;
}

/* Footer */
.foot {
  position: absolute;
  left: 40px;
  right: 40px;
  bottom: 14px;
  height: 26px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.85);
}
.mono {
  font-family: 'JetBrains Mono Variable', monospace;
  letter-spacing: 0.04em;
  color: #fff;
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
