<script setup lang="ts">
import { ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import BrandMark from './BrandMark.vue'
import { useAuth } from '@/composables/useAuth'

const route = useRoute()
const open = ref(false)
const { user, isAdmin } = useAuth()

watch(() => route.fullPath, () => (open.value = false))

const links = [
  { to: '/about', label: 'About' },
  { to: '/martial-arts', label: 'Martial Arts' },
  { to: '/membership', label: 'Membership' },
  { to: '/hijri-calendar', label: 'Hijri Calendar' },
  { to: '/contact', label: 'Contact' },
]
</script>

<template>
  <header class="sticky top-0 z-40 border-b border-white/10 bg-ink/95 text-paper backdrop-blur">
    <div class="container-page flex h-16 items-center justify-between gap-4 lg:h-[72px]">
      <RouterLink to="/" class="shrink-0" aria-label="Home">
        <BrandMark tone="light" full-name-class="hidden xl:block" />
      </RouterLink>

      <nav aria-label="Main" class="hidden items-center gap-1 lg:flex">
        <RouterLink
          v-for="l in links"
          :key="l.to"
          :to="l.to"
          class="rounded px-2.5 py-2 text-sm font-medium whitespace-nowrap text-paper/75 transition-colors hover:text-white xl:px-3"
          active-class="!text-white underline decoration-gold decoration-2 underline-offset-[10px]"
        >
          {{ l.label }}
        </RouterLink>
      </nav>

      <div class="hidden items-center gap-2 lg:flex">
        <RouterLink v-if="isAdmin" to="/admin" class="btn-ghost-light btn-sm whitespace-nowrap">Admin</RouterLink>
        <RouterLink v-if="user" to="/account" class="btn-ghost-light btn-sm whitespace-nowrap">My account</RouterLink>
        <RouterLink v-else to="/login" class="btn-ghost-light btn-sm whitespace-nowrap">Member login</RouterLink>
        <RouterLink v-if="!user" to="/membership" class="btn-accent btn-sm whitespace-nowrap">Become a member</RouterLink>
      </div>

      <button
        type="button"
        class="inline-flex h-10 w-10 items-center justify-center rounded-md border border-white/20 lg:hidden"
        :aria-expanded="open"
        aria-controls="mobile-nav"
        @click="open = !open"
      >
        <span class="sr-only">{{ open ? 'Close menu' : 'Open menu' }}</span>
        <svg viewBox="0 0 24 24" class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
          <path v-if="!open" d="M4 7h16M4 12h16M4 17h16" />
          <path v-else d="M6 6l12 12M18 6L6 18" />
        </svg>
      </button>
    </div>

    <nav v-show="open" id="mobile-nav" aria-label="Mobile" class="border-t border-white/10 bg-ink lg:hidden">
      <div class="container-page flex flex-col py-3">
        <RouterLink
          v-for="l in links"
          :key="l.to"
          :to="l.to"
          class="rounded px-2 py-3 text-base font-medium text-paper/85"
          active-class="!text-white"
        >
          {{ l.label }}
        </RouterLink>
        <div class="mt-3 grid grid-cols-2 gap-2 border-t border-white/10 pt-4">
          <RouterLink v-if="user" to="/account" class="btn-ghost-light">My account</RouterLink>
          <RouterLink v-else to="/login" class="btn-ghost-light">Member login</RouterLink>
          <RouterLink v-if="isAdmin" to="/admin" class="btn-ghost-light">Admin</RouterLink>
          <RouterLink v-else-if="!user" to="/membership" class="btn-accent">Become a member</RouterLink>
        </div>
      </div>
    </nav>
  </header>
</template>
