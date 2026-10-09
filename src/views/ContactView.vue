<script setup lang="ts">
import { computed } from 'vue'
import PageHero from '@/components/PageHero.vue'
import { useSettings } from '@/composables/useSettings'
import { usePageMeta } from '@/composables/usePageMeta'

const { settings } = useSettings()
usePageMeta({ title: 'Contact', description: computed(() => `Contact ${settings.value.short_name}.`) })
const hasAny = computed(() => !!(settings.value.contact_phone || settings.value.contact_email || settings.value.contact_address))
const telHref = (p: string) => 'tel:' + p.split(/[,;/]/)[0].replace(/[^\d+]/g, '')
</script>

<template>
  <div>
    <PageHero eyebrow="Contact" :title="`Contact ${settings.short_name}`" />
    <div class="container-page mt-14 grid gap-8 lg:grid-cols-[1.4fr_1fr]">
      <div v-if="hasAny" class="grid gap-4 sm:grid-cols-2">
        <div v-if="settings.contact_phone" class="card p-6">
          <p class="eyebrow">Phone</p>
          <a :href="telHref(settings.contact_phone)" class="mt-2 block text-lg font-semibold break-words hover:text-brand">
            {{ settings.contact_phone }}
          </a>
        </div>
        <div v-if="settings.contact_email" class="card p-6">
          <p class="eyebrow">Email</p>
          <a :href="`mailto:${settings.contact_email}`" class="mt-2 block text-lg font-semibold break-words hover:text-brand">
            {{ settings.contact_email }}
          </a>
        </div>
        <div v-if="settings.contact_address" class="card p-6 sm:col-span-2">
          <p class="eyebrow">Address</p>
          <p class="mt-2 text-lg font-semibold whitespace-pre-line">{{ settings.contact_address }}</p>
        </div>
        <p v-if="settings.contact_notes" class="text-sm leading-6 whitespace-pre-line text-muted sm:col-span-2">{{ settings.contact_notes }}</p>
      </div>
      <p v-else class="rounded-lg border border-dashed border-line bg-white p-6 text-sm leading-6 text-muted">
        Official contact details will be published here once confirmed by {{ settings.short_name }} leadership.
      </p>

      <aside class="card p-6 text-sm leading-6">
        <h2 class="font-display text-xl font-bold uppercase">Already applied or a member?</h2>
        <p class="mt-2 text-muted">
          Sign in to see your application status, request a correction to your details, or request renewal.
        </p>
        <RouterLink to="/account" class="btn-dark mt-4 w-full">Go to my account</RouterLink>
      </aside>
    </div>
  </div>
</template>
