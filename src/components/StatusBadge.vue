<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{ status: string; size?: 'sm' | 'md' }>()

const styles: Record<string, string> = {
  active: 'bg-moss-soft text-moss ring-moss/25',
  approved: 'bg-moss-soft text-moss ring-moss/25',
  confirmed: 'bg-moss-soft text-moss ring-moss/25',
  resolved: 'bg-moss-soft text-moss ring-moss/25',
  pending: 'bg-amber-soft text-amber ring-amber/25',
  expected: 'bg-amber-soft text-amber ring-amber/25',
  open: 'bg-amber-soft text-amber ring-amber/25',
  calculated: 'bg-paper-2 text-ink-3 ring-ink/10',
  expired: 'bg-paper-2 text-ink-3 ring-ink/15',
  withdrawn: 'bg-paper-2 text-ink-3 ring-ink/15',
  dismissed: 'bg-paper-2 text-ink-3 ring-ink/15',
  suspended: 'bg-crimson-soft text-crimson ring-crimson/25',
  revoked: 'bg-crimson-soft text-crimson ring-crimson/25',
  rejected: 'bg-crimson-soft text-crimson ring-crimson/25',
  cancelled: 'bg-crimson-soft text-crimson ring-crimson/25',
}

const cls = computed(() => styles[props.status] ?? 'bg-paper-2 text-ink-3 ring-ink/10')
const label = computed(() => props.status.charAt(0).toUpperCase() + props.status.slice(1))
</script>

<template>
  <span
    class="inline-flex items-center rounded-full font-semibold ring-1 ring-inset"
    :class="[cls, size === 'md' ? 'px-3 py-1 text-sm' : 'px-2 py-0.5 text-xs']"
  >
    <slot>{{ label }}</slot>
  </span>
</template>
