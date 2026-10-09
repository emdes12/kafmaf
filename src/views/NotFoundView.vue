<script setup lang="ts">
import { usePageMeta } from '@/composables/usePageMeta'
usePageMeta({ title: 'Page not found', noindex: true })
</script>

<template>
  <div class="container-page py-28 text-center">
    <p class="display text-8xl text-brand">404</p>
    <h1 class="display mt-4 text-4xl">Page not found</h1>
    <p class="mt-3 text-muted">The page you are looking for does not exist.</p>
    <RouterLink to="/" class="btn-dark mt-8">Back to home</RouterLink>
  </div>
</template>
