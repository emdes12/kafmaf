<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { supabase } from '@/lib/supabase'
import { addDays } from '@/lib/dates'
import { useSettings } from '@/composables/useSettings'
import { useLagosToday } from '@/composables/useHijri'

const { settings } = useSettings()
const today = useLagosToday()
const counts = ref({ pending: 0, active: 0, expiring: 0, requests: 0 })

onMounted(async () => {
  if (!supabase) return
  const head = { count: 'exact' as const, head: true }
  const [p, a, e, r] = await Promise.all([
    supabase.from('membership_applications').select('id', head).eq('status', 'pending'),
    supabase.from('members_with_status').select('id', head).eq('effective_status', 'active'),
    supabase
      .from('members_with_status')
      .select('id', head)
      .eq('effective_status', 'active')
      .lte('expiry_date', addDays(today.value, 30)),
    supabase.from('member_requests').select('id', head).eq('status', 'open'),
  ])
  counts.value = { pending: p.count ?? 0, active: a.count ?? 0, expiring: e.count ?? 0, requests: r.count ?? 0 }
})

/** Items that need a decision from KAFMAF leadership before the platform is fully operational. */
const checklist = computed(() => {
  const s = settings.value
  return [
    { done: s.name_approved, label: `Official full name confirmed (“${s.full_name}”)` },
    { done: s.disciplines_confirmed, label: 'Disciplines confirmed' },
    { done: s.validity_approved, label: `Membership validity period approved (${s.validity_months} months)` },
    { done: !!s.eligibility_text, label: 'Eligibility criteria published' },
    { done: !!(s.contact_phone || s.contact_email || s.contact_address), label: 'Official contact details published' },
    { done: !!s.about_text, label: 'About text approved' },
    { done: !s.privacy_notice_version.includes('draft'), label: 'Privacy notice reviewed (version without “draft”)' },
    { done: !!s.logo_path, label: 'High-resolution logo uploaded (currently the low-resolution logo taken from the previous card)' },
    { done: s.applications_open, label: 'Online applications opened' },
  ]
})

const stats = computed(() => [
  { label: 'Pending applications', value: counts.value.pending, to: '/admin/applications' },
  { label: 'Active members', value: counts.value.active, to: '/admin/members' },
  { label: 'Expiring in 30 days', value: counts.value.expiring, to: '/admin/members?status=active' },
  { label: 'Open requests', value: counts.value.requests, to: '/admin/requests' },
])
</script>

<template>
  <div class="space-y-8">
    <h1 class="display text-4xl">Overview</h1>
    <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <RouterLink v-for="s in stats" :key="s.label" :to="s.to" class="card p-5 hover:border-ink/40">
        <p class="text-xs font-semibold tracking-[0.12em] text-muted uppercase">{{ s.label }}</p>
        <p class="mt-2 font-display text-5xl font-bold">{{ s.value }}</p>
      </RouterLink>
    </div>

    <section class="card p-6">
      <h2 class="font-display text-2xl font-bold uppercase">Leadership approvals</h2>
      <p class="mt-1 text-sm text-muted">Unapproved content stays hidden from the public site. Update these in Settings once confirmed.</p>
      <ul class="mt-4 grid gap-2 text-sm sm:grid-cols-2">
        <li v-for="c in checklist" :key="c.label" class="flex items-start gap-2">
          <span
            class="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-bold"
            :class="c.done ? 'bg-moss text-white' : 'bg-amber-soft text-amber ring-1 ring-amber/30'"
            aria-hidden="true"
          >{{ c.done ? '✓' : '!' }}</span>
          <span>{{ c.label }}<span class="sr-only">: {{ c.done ? 'done' : 'pending' }}</span></span>
        </li>
      </ul>
      <RouterLink to="/admin/settings" class="btn-dark btn-sm mt-5">Open settings</RouterLink>
    </section>
  </div>
</template>
