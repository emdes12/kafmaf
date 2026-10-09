<script setup lang="ts">
/** Scales a fixed 856 × 540 card canvas to fit its container while keeping the export element unscaled. */
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { CARD_H_PX, CARD_W_PX } from '@/lib/card/render'

const box = ref<HTMLElement | null>(null)
const scale = ref(0.5)
let ro: ResizeObserver | null = null

onMounted(() => {
  ro = new ResizeObserver(([entry]) => {
    scale.value = Math.min(1, entry.contentRect.width / CARD_W_PX)
  })
  if (box.value) ro.observe(box.value)
})
onBeforeUnmount(() => ro?.disconnect())
</script>

<template>
  <div ref="box" class="w-full min-w-0 max-w-[856px]">
    <!-- Width comes from the container (never from the card), so the layout cannot feed back into the scale. -->
    <div
      class="relative w-full overflow-hidden rounded-[14px] shadow-[0_20px_50px_-20px_rgba(6,42,16,0.45)] ring-1 ring-ink/10"
      :style="{ aspectRatio: '856 / 540' }"
    >
      <div class="absolute top-0 left-0" :style="{ transform: `scale(${scale})`, transformOrigin: 'top left', width: CARD_W_PX + 'px', height: CARD_H_PX + 'px' }">
        <slot />
      </div>
    </div>
  </div>
</template>
