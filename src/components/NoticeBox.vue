<script setup lang="ts">
withDefaults(defineProps<{ tone?: 'info' | 'warning' | 'error' | 'success'; title?: string }>(), { tone: 'info' })
</script>

<template>
  <div
    :role="tone === 'error' ? 'alert' : 'status'"
    class="rounded-lg border px-4 py-3 text-sm leading-6"
    :class="{
      'border-ink/10 bg-paper-2/70 text-ink-3': tone === 'info',
      'border-amber/25 bg-amber-soft text-[#5c3d00]': tone === 'warning',
      'border-crimson/25 bg-crimson-soft text-crimson-dark': tone === 'error',
      'border-moss/25 bg-moss-soft text-moss': tone === 'success',
    }"
  >
    <p v-if="title" class="font-semibold">{{ title }}</p>
    <div><slot /></div>
  </div>
</template>
