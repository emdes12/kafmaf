<script setup lang="ts">
defineProps<{ eyebrow?: string; title: string; lead?: string }>()
</script>

<template>
  <section class="relative overflow-hidden bg-ink text-paper">
    <div class="pattern-motion absolute inset-0" aria-hidden="true" />
    <div class="absolute top-0 right-0 h-full w-1/3 bg-gradient-to-l from-brand/45 to-transparent" aria-hidden="true" />
    <div class="container-page relative py-14 sm:py-20">
      <p v-if="eyebrow" class="eyebrow !text-gold">{{ eyebrow }}</p>
      <h1 class="display mt-3 text-5xl sm:text-6xl">{{ title }}</h1>
      <p v-if="lead" class="mt-5 max-w-2xl text-base leading-7 text-paper/75 sm:text-lg">{{ lead }}</p>
      <slot />
    </div>
  </section>
</template>
