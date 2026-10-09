<script setup lang="ts">
import { computed } from 'vue'
import MemberCardPanel from '@/components/card/MemberCardPanel.vue'
import { useSettings } from '@/composables/useSettings'
import { usePageMeta } from '@/composables/usePageMeta'
import { siteUrl } from '@/lib/supabase'
import { HERITAGE_COLORS, SAMPLE_CARD, brandingFromSettings, type CardTheme } from '@/lib/card/types'

usePageMeta({ title: 'ID card design preview', noindex: true })
const { settings, uploadedLogoUrl } = useSettings()
const host = computed(() => new URL(siteUrl() || 'https://example.invalid').host)
const brandingFor = (theme: CardTheme) => brandingFromSettings(settings.value, uploadedLogoUrl.value, host.value, theme)

const designs = computed(() => [
  {
    theme: 'heritage' as const,
    name: 'Heritage',
    lead: "KAFMAF's existing logo and colours, taken from the previous membership card.",
    colours: `Green ${HERITAGE_COLORS.green.toUpperCase()} · Yellow ${HERITAGE_COLORS.yellow.toUpperCase()} · Red ${HERITAGE_COLORS.red.toUpperCase()} · White`,
  },
  {
    theme: 'signature' as const,
    name: 'Signature',
    lead: 'Alternative charcoal, dark-red and gold design with a provisional text mark (not a logo).',
    colours: `Charcoal ${settings.value.card_color_primary.toUpperCase()} · Red ${settings.value.card_color_accent.toUpperCase()} · Gold ${settings.value.card_color_gold.toUpperCase()} · Warm white`,
  },
])

const spec = [
  ['Format', 'ID-1, 85.60 × 53.98 mm, landscape. Template canvas 856 × 540 px (1 px = 0.1 mm).'],
  ['Safe area', '≥ 3.2 mm from every edge for all text; colour bands bleed to the edge.'],
  ['Typography', 'Barlow Condensed 600/700 (names, dates, headings) · Inter (labels, body) · JetBrains Mono (membership number).'],
  ['Sizes at print', 'Name 3.1–5.0 mm (auto-fit to 2 lines) · Dates 3.3 mm · Number 2.6 mm · Labels ≥ 1.2 mm.'],
  ['Photograph', 'Heritage 18.0 × 22.5 mm, Signature 20.0 × 25.0 mm (4:5). Uploaded photos are cropped to 600 × 750 px.'],
  ['QR code', '24.8 mm square block, error correction M, encodes the exact /verify/<token> URL of the member.'],
  ['Export', 'Browser-side PNG at ≈ 890 dpi → PDF (card size, 2 pages) or A4 sheet with crop marks.'],
]
</script>

<template>
  <div class="container-page py-12">
    <p class="eyebrow">Design preview</p>
    <h1 class="display mt-2 text-5xl">Membership ID card</h1>
    <p class="mt-3 max-w-2xl text-sm leading-6 text-muted">
      Two card styles. Administrators choose which one is issued in Admin → Settings. All data shown is fictional sample data, and the QR
      code is a labelled placeholder — real cards encode each member's unique verification link.
    </p>

    <section v-for="d in designs" :key="d.theme" class="mt-14">
      <div class="flex flex-wrap items-baseline gap-3">
        <h2 class="display text-4xl">{{ d.name }}</h2>
        <span v-if="settings.card_theme === d.theme" class="rounded-full bg-moss-soft px-2.5 py-1 text-xs font-semibold text-moss">Currently issued</span>
      </div>
      <p class="mt-1 text-sm text-muted">{{ d.lead }}</p>
      <p class="mt-1 text-xs text-muted">{{ d.colours }}</p>
      <div class="mt-6">
        <MemberCardPanel :data="SAMPLE_CARD" :branding="brandingFor(d.theme)" :allow-download="true" />
      </div>
    </section>

    <section class="mt-16">
      <h2 class="display text-3xl">Specification</h2>
      <dl class="mt-4 divide-y divide-line rounded-xl border border-line bg-white">
        <div v-for="[k, v] in spec" :key="k" class="grid gap-1 px-5 py-3 text-sm sm:grid-cols-[180px_1fr]">
          <dt class="font-semibold">{{ k }}</dt>
          <dd class="text-muted">{{ v }}</dd>
        </div>
      </dl>
    </section>
  </div>
</template>
