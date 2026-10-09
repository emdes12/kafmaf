<script setup lang="ts">
import BackendNotice from './BackendNotice.vue'
defineProps<{ title: string; lead?: string }>()
</script>

<template>
  <div class="container-page grid min-h-[70vh] items-start py-12 sm:py-20 lg:grid-cols-[1fr_440px] lg:gap-16">
    <div class="hidden lg:block">
      <p class="eyebrow">Member portal</p>
      <p class="display mt-3 text-7xl leading-[0.9]">Discipline.<br /><span class="text-brand">Identity.</span><br />Membership.</p>
    </div>
    <div class="card p-6 shadow-sm sm:p-8">
      <h1 class="display text-4xl">{{ title }}</h1>
      <p v-if="lead" class="mt-2 text-sm leading-6 text-muted">{{ lead }}</p>
      <div class="mt-4"><BackendNotice /></div>
      <div class="mt-6"><slot /></div>
    </div>
  </div>
</template>
