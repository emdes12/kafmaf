<script setup lang="ts">
/** ID card — BACK. Fixed 856 × 540 px canvas (1 px = 0.1 mm). */
import { computed, ref } from 'vue'
import type { CardBranding, CardData } from '@/lib/card/types'

const props = defineProps<{ data: CardData; branding: CardBranding }>()
const root = ref<HTMLElement | null>(null)
defineExpose({ root })

const vars = computed(() => ({
  '--c-primary': props.branding.colorPrimary,
  '--c-accent': props.branding.colorAccent,
  '--c-gold': props.branding.colorGold,
}))
</script>

<template>
  <div ref="root" class="card-face" :style="vars" role="img" aria-label="Membership card back with verification QR code">
    <svg class="bg" viewBox="0 0 856 540" aria-hidden="true">
      <path d="M0 540 L0 380 L180 540 Z" fill="var(--c-primary)" opacity="0.04" />
      <g stroke="var(--c-gold)" stroke-opacity="0.15" stroke-width="1.2">
        <line x1="700" y1="500" x2="856" y2="110" />
        <line x1="740" y1="500" x2="856" y2="210" />
      </g>
    </svg>

    <header class="band">
      <div class="brand">
        <svg viewBox="0 0 24 40" class="mark" aria-hidden="true">
          <path d="M6 40 L16 0 H24 L14 40 Z" fill="var(--c-accent)" />
          <path d="M0 40 L5 20 H9 L4 40 Z" fill="var(--c-gold)" />
        </svg>
        <span class="short">{{ branding.shortName }}</span>
        <span class="full">{{ branding.fullName }}</span>
      </div>
    </header>
    <div class="rule" />

    <div class="qr-block">
      <div class="qr">
        <img v-if="data.qrDataUrl" :src="data.qrDataUrl" alt="" />
        <div v-else class="qr-placeholder">
          <span>Sample QR<br />placeholder</span>
        </div>
      </div>
      <div class="qr-caption">Scan to verify membership</div>
    </div>

    <div class="info">
      <h3 class="heading">Live verification</h3>
      <p class="text">
        Scan the QR code to open this card's verification page on
        <strong>{{ branding.verifyHost || 'the official website' }}</strong>. It shows the current membership status.
      </p>
      <p class="statement">{{ branding.validityStatement }}</p>

      <p v-if="branding.contactLine" class="contact">
        <span class="label">Contact</span>
        {{ branding.contactLine }}
      </p>

      <div v-if="branding.showSignature" class="signature">
        <div class="sig-line" />
        <div class="label">{{ branding.signatureLabel || 'Authorised signature' }}</div>
      </div>
    </div>

    <footer class="strip">
      <span class="mono">{{ data.membershipNumber }}</span>
      <span>Card v{{ data.cardVersion }}</span>
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
}
.bg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}
.band {
  position: absolute;
  inset: 0 0 auto 0;
  height: 72px;
  background: var(--c-primary);
  color: #f7f4ee;
  display: flex;
  align-items: center;
  padding: 0 40px;
}
.brand {
  display: flex;
  align-items: center;
  gap: 14px;
}
.mark {
  width: 20px;
  height: 34px;
}
.short {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 700;
  font-size: 34px;
  letter-spacing: 0.06em;
}
.full {
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  opacity: 0.75;
}
.rule {
  position: absolute;
  top: 72px;
  left: 0;
  right: 0;
  height: 4px;
  background: var(--c-gold);
}
.qr-block {
  position: absolute;
  left: 40px;
  top: 108px;
  width: 248px;
}
.qr {
  width: 248px;
  height: 248px;
  background: #fff;
  border: 2px solid var(--c-primary);
  padding: 18px;
  box-sizing: border-box;
}
.qr img {
  display: block;
  width: 100%;
  height: 100%;
  image-rendering: pixelated;
}
.qr-placeholder {
  width: 100%;
  height: 100%;
  background: repeating-linear-gradient(45deg, #ece8df 0 8px, #f7f4ee 8px 16px);
  border: 2px dashed #a39d90;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  font-size: 16px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #6b6f78;
}
.qr-caption {
  margin-top: 12px;
  text-align: center;
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 700;
  font-size: 21px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}
.info {
  position: absolute;
  left: 326px;
  right: 40px;
  top: 104px;
}
.heading {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 700;
  font-size: 30px;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--c-accent);
  margin: 0;
}
.text {
  margin-top: 8px;
  font-size: 17px;
  line-height: 1.45;
  color: #2b2e35;
}
.statement {
  margin-top: 14px;
  padding: 12px 14px;
  border-left: 5px solid var(--c-gold);
  background: rgba(176, 141, 74, 0.1);
  font-size: 16px;
  line-height: 1.4;
  font-weight: 600;
}
.contact {
  margin-top: 14px;
  font-size: 16px;
  font-weight: 600;
}
.label {
  display: block;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: #6b6f78;
}
.signature {
  margin-top: 26px;
  width: 260px;
}
.sig-line {
  height: 40px;
  border-bottom: 2px solid var(--c-primary);
  margin-bottom: 6px;
}
.strip {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 40px;
  background: var(--c-primary);
  color: #f7f4ee;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 40px;
  font-size: 14px;
  font-weight: 600;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}
.mono {
  font-family: 'JetBrains Mono Variable', monospace;
  letter-spacing: 0.04em;
}
</style>
