<script setup lang="ts">
import { computed } from 'vue'
import PageHero from '@/components/PageHero.vue'
import { useSettings } from '@/composables/useSettings'
import { usePageMeta } from '@/composables/usePageMeta'
import { disciplineName } from '@/lib/disciplines'

const { settings } = useSettings()
usePageMeta({
  title: 'About',
  description: computed(() => `About ${settings.value.short_name} — ${settings.value.full_name}, Nigeria.`),
})

const paragraphs = (text: string | null) => (text ? text.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean) : [])
const about = computed(() => paragraphs(settings.value.about_text))
const community = computed(() => paragraphs(settings.value.community_text))
</script>

<template>
  <div>
    <PageHero eyebrow="About" :title="settings.short_name" :lead="settings.full_name" />

    <div class="container-page mt-16 grid gap-12 lg:grid-cols-[1.5fr_1fr]">
      <article>
        <h2 class="display text-4xl">Who we are</h2>
        <div v-if="about.length" class="prose-kafmaf mt-6">
          <p v-for="(p, i) in about" :key="i" class="whitespace-pre-line">{{ p }}</p>
        </div>
        <p v-else class="mt-6 rounded-lg border border-dashed border-line bg-white p-6 text-sm leading-6 text-muted">
          An introduction to {{ settings.short_name }}, its history and its leadership will be published here once the
          organisation has confirmed the details.
        </p>

        <template v-if="community.length">
          <h2 class="display mt-14 text-4xl">Our community</h2>
          <div class="prose-kafmaf mt-6">
            <p v-for="(p, i) in community" :key="i" class="whitespace-pre-line">{{ p }}</p>
          </div>
        </template>
      </article>

      <aside class="space-y-4">
        <div class="card p-6">
          <h2 class="font-display text-xl font-bold tracking-wide uppercase">At a glance</h2>
          <dl class="mt-4 space-y-4 text-sm">
            <div>
              <dt class="text-xs font-semibold tracking-[0.12em] text-muted uppercase">Name</dt>
              <dd class="mt-1 font-semibold">{{ settings.full_name }} ({{ settings.short_name }})</dd>
            </div>
            <div>
              <dt class="text-xs font-semibold tracking-[0.12em] text-muted uppercase">Country</dt>
              <dd class="mt-1 font-semibold">Nigeria</dd>
            </div>
            <div>
              <dt class="text-xs font-semibold tracking-[0.12em] text-muted uppercase">Disciplines</dt>
              <dd class="mt-1 font-semibold">{{ settings.disciplines.map(disciplineName).join(', ') }}</dd>
            </div>
            <div v-if="settings.contact_address">
              <dt class="text-xs font-semibold tracking-[0.12em] text-muted uppercase">Address</dt>
              <dd class="mt-1 font-semibold whitespace-pre-line">{{ settings.contact_address }}</dd>
            </div>
          </dl>
        </div>
        <RouterLink to="/membership" class="btn-primary w-full">Membership</RouterLink>
      </aside>
    </div>
  </div>
</template>
