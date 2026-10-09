<script setup lang="ts">
import BrandMark from './BrandMark.vue'
import { useSettings } from '@/composables/useSettings'

const { settings } = useSettings()
const year = new Date().getFullYear()
</script>

<template>
  <footer class="mt-24 bg-ink text-paper/80">
    <div class="h-1 bg-gradient-to-r from-brand via-gold to-crimson" aria-hidden="true" />
    <div class="container-page grid gap-10 py-14 md:grid-cols-[1.4fr_1fr_1fr]">
      <div>
        <BrandMark tone="light" />
        <p v-if="settings.tagline" class="mt-5 max-w-sm text-sm leading-6 text-paper/70">{{ settings.tagline }}</p>
        <p class="mt-5 text-xs text-paper/50">Nigeria</p>
      </div>
      <div>
        <h2 class="font-display text-sm font-semibold tracking-[0.16em] text-paper uppercase">Explore</h2>
        <ul class="mt-4 space-y-2.5 text-sm">
          <li><RouterLink class="hover:text-white" to="/about">About {{ settings.short_name }}</RouterLink></li>
          <li><RouterLink class="hover:text-white" to="/martial-arts">Martial arts</RouterLink></li>
          <li><RouterLink class="hover:text-white" to="/hijri-calendar">Hijri calendar</RouterLink></li>
          <li><RouterLink class="hover:text-white" to="/contact">Contact</RouterLink></li>
        </ul>
      </div>
      <div>
        <h2 class="font-display text-sm font-semibold tracking-[0.16em] text-paper uppercase">Members</h2>
        <ul class="mt-4 space-y-2.5 text-sm">
          <li><RouterLink class="hover:text-white" to="/membership">Membership</RouterLink></li>
          <li><RouterLink class="hover:text-white" to="/login">Member login</RouterLink></li>
          <li><RouterLink class="hover:text-white" to="/privacy">Privacy notice</RouterLink></li>
        </ul>
      </div>
    </div>
    <div class="border-t border-white/10">
      <div class="container-page flex flex-col gap-2 py-6 text-xs text-paper/50 sm:flex-row sm:justify-between">
        <p>© {{ year }} {{ settings.short_name }} — {{ settings.full_name }}</p>
        <p>Membership cards are verified online against live records.</p>
      </div>
    </div>
  </footer>
</template>
