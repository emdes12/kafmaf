<script setup lang="ts">
import { computed, ref } from 'vue'
import MemberCardFront from './MemberCardFront.vue'
import MemberCardBack from './MemberCardBack.vue'
import HeritageCardFront from './HeritageCardFront.vue'
import HeritageCardBack from './HeritageCardBack.vue'
import CardScaler from './CardScaler.vue'
import NoticeBox from '../NoticeBox.vue'
import type { CardBranding, CardData } from '@/lib/card/types'
import { buildCardPdf, downloadBlob, downloadDataUrl, renderCardPng } from '@/lib/card/render'

const props = withDefaults(defineProps<{ data: CardData; branding: CardBranding; allowDownload?: boolean }>(), {
  allowDownload: true,
})

type Face = { root: HTMLElement | null }
const front = ref<Face | null>(null)
const back = ref<Face | null>(null)
const FrontComponent = computed(() => (props.branding.theme === 'heritage' ? HeritageCardFront : MemberCardFront))
const BackComponent = computed(() => (props.branding.theme === 'heritage' ? HeritageCardBack : MemberCardBack))
const busy = ref<string | null>(null)
const error = ref<string | null>(null)

const fileBase = computed(() => props.data.membershipNumber.replace(/[^A-Za-z0-9-]/g, '') + `-card-v${props.data.cardVersion}`)

async function run(kind: string, fn: () => Promise<void>) {
  error.value = null
  busy.value = kind
  try {
    await fn()
  } catch (e) {
    console.error(e)
    error.value = 'The card could not be generated in this browser. Please try again, or use a recent version of Chrome, Edge, Firefox or Safari.'
  } finally {
    busy.value = null
  }
}

function elements() {
  const f = front.value?.root
  const b = back.value?.root
  if (!f || !b) throw new Error('Card not ready')
  return { f, b }
}

const pdf = (layout: 'card' | 'a4') =>
  run(`pdf-${layout}`, async () => {
    const { f, b } = elements()
    const blob = await buildCardPdf(f, b, layout)
    downloadBlob(blob, `${fileBase.value}${layout === 'a4' ? '-A4' : ''}.pdf`)
  })

const png = (side: 'front' | 'back') =>
  run(`png-${side}`, async () => {
    const { f, b } = elements()
    downloadDataUrl(await renderCardPng(side === 'front' ? f : b), `${fileBase.value}-${side}.png`)
  })
</script>

<template>
  <div class="space-y-6">
    <div class="grid gap-6 xl:grid-cols-2">
      <figure class="min-w-0">
        <figcaption class="mb-2 text-xs font-semibold tracking-[0.14em] text-muted uppercase">Front</figcaption>
        <CardScaler><component :is="FrontComponent" ref="front" :data="data" :branding="branding" /></CardScaler>
      </figure>
      <figure class="min-w-0">
        <figcaption class="mb-2 text-xs font-semibold tracking-[0.14em] text-muted uppercase">Back</figcaption>
        <CardScaler><component :is="BackComponent" ref="back" :data="data" :branding="branding" /></CardScaler>
      </figure>
    </div>

    <div v-if="allowDownload" class="flex flex-wrap gap-2">
      <button type="button" class="btn-primary" :disabled="!!busy" @click="pdf('card')">
        {{ busy === 'pdf-card' ? 'Preparing PDF…' : 'Download PDF (card size, both sides)' }}
      </button>
      <button type="button" class="btn-outline" :disabled="!!busy" @click="pdf('a4')">
        {{ busy === 'pdf-a4' ? 'Preparing…' : 'A4 print sheet' }}
      </button>
      <button type="button" class="btn-outline" :disabled="!!busy" @click="png('front')">PNG front</button>
      <button type="button" class="btn-outline" :disabled="!!busy" @click="png('back')">PNG back</button>
    </div>
    <NoticeBox v-if="error" tone="error">{{ error }}</NoticeBox>
  </div>
</template>
