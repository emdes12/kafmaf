<script setup lang="ts">
import { ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useAuth } from '@/composables/useAuth'
import { usePageMeta } from '@/composables/usePageMeta'

usePageMeta({ title: 'Administration', noindex: true })
const { profile, user } = useAuth()
const route = useRoute()
const open = ref(false)
watch(() => route.fullPath, () => (open.value = false))

const nav = [
  { to: '/admin', label: 'Overview', exact: true },
  { to: '/admin/applications', label: 'Applications' },
  { to: '/admin/members', label: 'Members' },
  { to: '/admin/requests', label: 'Requests' },
  { to: '/admin/occasions', label: 'Islamic occasions' },
  { to: '/admin/settings', label: 'Settings & content' },
  { to: '/admin/administrators', label: 'Administrators' },
  { to: '/admin/audit', label: 'Audit log' },
]
const isActive = (item: (typeof nav)[number]) => (item.exact ? route.path === item.to : route.path.startsWith(item.to))
</script>

<template>
  <div class="min-h-[calc(100vh-72px)] bg-paper-2/40 lg:grid lg:grid-cols-[250px_1fr]">
    <aside class="border-b border-line bg-white lg:border-r lg:border-b-0">
      <div class="flex items-center justify-between px-4 py-4 lg:block lg:px-5 lg:py-6">
        <div>
          <p class="eyebrow">Administration</p>
          <p class="mt-1 truncate text-xs text-muted">{{ profile?.display_name ?? user?.email }}</p>
        </div>
        <button type="button" class="btn-outline btn-sm lg:hidden" :aria-expanded="open" aria-controls="admin-nav" @click="open = !open">
          Menu
        </button>
      </div>
      <nav id="admin-nav" aria-label="Administration" class="px-2 pb-4 lg:block" :class="open ? 'block' : 'hidden'">
        <RouterLink
          v-for="item in nav"
          :key="item.to"
          :to="item.to"
          class="block rounded-md px-3 py-2 text-sm font-medium"
          :class="isActive(item) ? 'bg-ink text-paper' : 'text-ink-3 hover:bg-paper-2'"
          :aria-current="isActive(item) ? 'page' : undefined"
        >
          {{ item.label }}
        </RouterLink>
      </nav>
    </aside>
    <div class="min-w-0 px-4 py-8 sm:px-8">
      <RouterView />
    </div>
  </div>
</template>
