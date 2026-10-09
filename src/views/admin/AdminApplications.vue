<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import StatusBadge from '@/components/StatusBadge.vue'
import NoticeBox from '@/components/NoticeBox.vue'
import { supabase } from '@/lib/supabase'
import { formatTimestamp } from '@/lib/dates'
import { disciplineList } from '@/lib/disciplines'
import type { ApplicationStatus, MembershipApplication } from '@/lib/types'

const status = ref<ApplicationStatus | 'all'>('pending')
const search = ref('')
const rows = ref<MembershipApplication[]>([])
const loading = ref(false)
const error = ref<string | null>(null)

async function load() {
  if (!supabase) return
  loading.value = true
  error.value = null
  let q = supabase
    .from('membership_applications')
    .select('id, reference, full_name, email, disciplines, status, submitted_at')
    .order('submitted_at', { ascending: status.value === 'pending' })
    .limit(100)
  if (status.value !== 'all') q = q.eq('status', status.value)
  const term = search.value.trim().replace(/[%*,()"\\]/g, '')
  if (term) q = q.or(`full_name.ilike."*${term}*",reference.ilike."*${term}*",email.ilike."*${term}*"`)
  const { data, error: err } = await q
  loading.value = false
  if (err) error.value = 'Applications could not be loaded.'
  rows.value = (data ?? []) as MembershipApplication[]
}
onMounted(load)
watch(status, load)
let t: ReturnType<typeof setTimeout>
watch(search, () => {
  clearTimeout(t)
  t = setTimeout(load, 300)
})
</script>

<template>
  <div class="space-y-6">
    <h1 class="display text-4xl">Applications</h1>
    <div class="flex flex-wrap items-center gap-3">
      <div class="flex flex-wrap gap-1 rounded-lg border border-line bg-white p-1" role="tablist" aria-label="Filter by status">
        <button
          v-for="s in ['pending', 'approved', 'rejected', 'withdrawn', 'all'] as const"
          :key="s"
          type="button"
          role="tab"
          :aria-selected="status === s"
          class="rounded-md px-3 py-1.5 text-sm font-medium capitalize"
          :class="status === s ? 'bg-ink text-paper' : 'text-ink-3 hover:bg-paper-2'"
          @click="status = s"
        >
          {{ s }}
        </button>
      </div>
      <label class="sr-only" for="app-search">Search applications</label>
      <input id="app-search" v-model="search" type="search" placeholder="Search name, reference or email" class="input max-w-xs" />
    </div>
    <NoticeBox v-if="error" tone="error">{{ error }}</NoticeBox>

    <div class="card overflow-x-auto">
      <table class="table-base min-w-[640px]">
        <thead>
          <tr>
            <th>Reference</th>
            <th>Applicant</th>
            <th>Disciplines</th>
            <th>Submitted</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="a in rows" :key="a.id" class="hover:bg-paper/60">
            <td>
              <RouterLink :to="`/admin/applications/${a.id}`" class="font-mono font-semibold text-brand hover:underline">{{ a.reference }}</RouterLink>
            </td>
            <td>
              <p class="font-semibold">{{ a.full_name }}</p>
              <p class="text-xs text-muted">{{ a.email }}</p>
            </td>
            <td>{{ disciplineList(a.disciplines) }}</td>
            <td class="whitespace-nowrap">{{ formatTimestamp(a.submitted_at) }}</td>
            <td><StatusBadge :status="a.status" /></td>
          </tr>
          <tr v-if="!loading && !rows.length">
            <td colspan="5" class="py-10 text-center text-muted">No applications found.</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
