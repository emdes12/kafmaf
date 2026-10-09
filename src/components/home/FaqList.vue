<script setup lang="ts">
defineProps<{ items: { q: string; a: string }[] }>()
</script>

<template>
  <div class="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-white">
    <details v-for="(item, i) in items" :key="i" class="group" :open="i === 0">
      <summary
        class="flex cursor-pointer list-none items-center justify-between gap-6 px-6 py-5 text-left font-display text-xl font-bold tracking-wide uppercase marker:hidden hover:bg-paper/70 sm:px-8"
      >
        {{ item.q }}
        <span
          class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-line text-brand transition-transform group-open:rotate-45"
          aria-hidden="true"
        >
          <svg viewBox="0 0 16 16" class="h-3.5 w-3.5" fill="none" stroke="currentColor" stroke-width="2"><path d="M8 2v12M2 8h12" /></svg>
        </span>
      </summary>
      <p class="px-6 pb-6 text-[15px] leading-7 text-ink-3 sm:px-8">{{ item.a }}</p>
    </details>
  </div>
</template>

<style scoped>
summary::-webkit-details-marker {
  display: none;
}
</style>
