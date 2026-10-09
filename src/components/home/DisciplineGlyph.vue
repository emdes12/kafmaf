<script setup lang="ts">
/**
 * Abstract line-art motifs for each discipline (deliberately not fighter
 * silhouettes or clip-art fists): Karate = tied belt, Boxing = ring ropes,
 * Taekwondo = arc of a turning kick.
 */
defineProps<{ discipline: 'karate' | 'boxing' | 'taekwondo' }>()
</script>

<template>
  <svg viewBox="0 0 200 200" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <template v-if="discipline === 'karate'">
      <!-- belt knot with hanging ends -->
      <path d="M10 92 H82" stroke-width="14" />
      <path d="M118 92 H190" stroke-width="14" />
      <rect x="82" y="76" width="36" height="32" rx="6" stroke-width="8" />
      <path d="M92 108 L70 176" stroke-width="14" />
      <path d="M108 108 L134 172" stroke-width="14" />
      <path d="M64 168 L78 172" stroke-width="3" opacity=".5" />
      <path d="M128 164 L142 166" stroke-width="3" opacity=".5" />
    </template>
    <template v-else-if="discipline === 'boxing'">
      <!-- ring corner post and three ropes in perspective -->
      <path d="M40 30 V180" stroke-width="10" />
      <path d="M40 60 L190 80" stroke-width="6" />
      <path d="M40 92 L190 108" stroke-width="6" />
      <path d="M40 124 L190 136" stroke-width="6" />
      <path d="M40 60 L10 96" stroke-width="6" opacity=".55" />
      <path d="M40 92 L10 124" stroke-width="6" opacity=".55" />
      <path d="M40 124 L10 152" stroke-width="6" opacity=".55" />
      <rect x="30" y="22" width="20" height="14" rx="3" stroke-width="6" />
    </template>
    <template v-else>
      <!-- arc of a turning kick with motion trails -->
      <path d="M30 170 C40 80 120 30 182 52" stroke-width="10" />
      <path d="M48 176 C60 104 120 64 176 74" stroke-width="4" opacity=".55" />
      <path d="M64 180 C78 126 124 96 168 96" stroke-width="2.5" opacity=".35" />
      <circle cx="182" cy="52" r="9" fill="currentColor" stroke="none" />
    </template>
  </svg>
</template>
