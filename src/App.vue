<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import SiteHeader from '@/components/SiteHeader.vue'
import SiteFooter from '@/components/SiteFooter.vue'

const route = useRoute()
const isAdmin = computed(() => route.matched.some((r) => r.meta.layout === 'admin'))
</script>

<template>
  <a
    href="#main"
    class="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded focus:bg-white focus:px-4 focus:py-2 focus:text-sm focus:font-semibold"
  >
    Skip to content
  </a>
  <SiteHeader />
  <main id="main" class="min-h-[60vh]">
    <RouterView />
  </main>
  <SiteFooter v-if="!isAdmin" />
</template>
