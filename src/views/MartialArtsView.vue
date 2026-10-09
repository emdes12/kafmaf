<script setup lang="ts">
import { computed } from 'vue'
import PageHero from '@/components/PageHero.vue'
import { useSettings } from '@/composables/useSettings'
import { usePageMeta } from '@/composables/usePageMeta'
import { DISCIPLINE_INFO } from '@/lib/content'

const { settings } = useSettings()
usePageMeta({
  title: 'Martial Arts',
  description: computed(() => `Karate, Boxing and Taekwondo at ${settings.value.short_name}: general information about each discipline.`),
})
const disciplines = computed(() => settings.value.disciplines.map((d) => DISCIPLINE_INFO[d]))
</script>

<template>
  <div>
    <PageHero
      eyebrow="Martial arts"
      title="The disciplines"
      :lead="`${settings.short_name} lists the following disciplines. Each section below gives general background on the sport itself.`"
    />

    <div class="container-page mt-16 space-y-6">
      <article
        v-for="(d, i) in disciplines"
        :id="d.id"
        :key="d.id"
        class="card grid overflow-hidden md:grid-cols-[240px_1fr]"
      >
        <div class="relative flex flex-col justify-between bg-ink p-8 text-paper">
          <div class="pattern-motion absolute inset-0" aria-hidden="true" />
          <span class="relative font-display text-6xl font-bold text-gold">0{{ i + 1 }}</span>
          <h2 class="display relative mt-8 text-5xl">{{ d.name }}</h2>
        </div>
        <div class="p-8">
          <p class="text-xs font-semibold tracking-[0.14em] text-brand uppercase">General information · {{ d.origin }}</p>
          <p class="mt-4 max-w-2xl text-base leading-7 text-ink-3">{{ d.summary }}</p>
          <h3 class="mt-6 text-sm font-semibold">Typical areas of training</h3>
          <ul class="mt-2 grid gap-2 text-sm text-ink-3 sm:grid-cols-3">
            <li v-for="f in d.focus" :key="f" class="rounded-md border border-line bg-paper px-3 py-2">{{ f }}</li>
          </ul>
        </div>
      </article>

      <p class="rounded-lg border border-line bg-white p-5 text-sm leading-6 text-muted">
        <strong class="text-ink">Please note:</strong> the descriptions above are general information about each sport. They do not
        describe {{ settings.short_name }}'s own curriculum, grading system, instructors or affiliations, which will be published
        only when confirmed by the organisation.
      </p>
    </div>
  </div>
</template>
