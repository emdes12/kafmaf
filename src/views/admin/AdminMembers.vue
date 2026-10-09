<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import StatusBadge from '@/components/StatusBadge.vue'
import NoticeBox from '@/components/NoticeBox.vue'
import { supabase } from '@/lib/supabase'
import { formatMedium } from '@/lib/dates'
import { disciplineList } from '@/lib/disciplines'
import type { EffectiveStatus, Member } from '@/lib/types'

const route = useRoute()
const PAGE = 50
const status = ref<EffectiveStatus | 'all'>((route.query.status as EffectiveStatus) || 'all')
const search = ref('')
const page = ref(0)
const rows = ref<Member[]>([])
const total = ref(0)
const error = ref<string | null>(null)
const loading = ref(false)

async function load() {
  if (!supabase) return
  loading.value = true
  let q = supabase
    .from('members_with_status')
    .select('id, membership_number, full_name, display_name, disciplines, status, effective_status, issue_date, expiry_date', { count: 'exact' })
    .order('expiry_date', { ascending: true })
    .range(page.value * PAGE, page.value * PAGE + PAGE - 1)
  if (status.value !== 'all') q = q.eq('effective_status', status.value)
  const term = search.value.trim().replace(/[%*,()"\\]/g, '')
  if (term) q = q.or(`full_name.ilike."*${term}*",display_name.ilike."*${term}*",membership_number.ilike."*${term}*"`)
  const { data, count, error: err } = await q
  loading.value = false
  error.value = err ? 'Members could not be loaded.' : null
  rows.value = (data ?? []) as Member[]
  total.value = count ?? 0
}
onMounted(load)
watch([status], () => {
  page.value = 0
  load()
})
watch(page, load)
let t: ReturnType<typeof setTimeout>
watch(search, () => {
  clearTimeout(t)
  t = setTimeout(() => {
    page.value = 0
    load()
  }, 300)
})
</script>

<template>
  <div class="space-y-6">
    <h1 class="display text-4xl">Members</h1>
    <div class="flex flex-wrap items-center gap-3">
      <div class="flex flex-wrap gap-1 rounded-lg border border-line bg-white p-1" role="tablist" aria-label="Filter by status">
        <button
          v-for="s in ['all', 'active', 'expired', 'suspended', 'revoked'] as const"
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
      <label for="member-search" class="sr-only">Search members</label>
      <input id="member-search" v-model="search" type="search" placeholder="Search name or membership no." class="input max-w-xs" />
    </div>
    <NoticeBox v-if="error" tone="error">{{ error }}</NoticeBox>

    <div class="card overflow-x-auto">
      <table class="table-base min-w-[720px]">
        <thead>
          <tr>
            <th>Membership no.</th>
            <th>Name</th>
            <th>Disciplines</th>
            <th>Issued</th>
            <th>Expires</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="m in rows" :key="m.id" class="hover:bg-paper/60">
            <td>
              <RouterLink :to="`/admin/members/${m.id}`" class="font-mono font-semibold text-brand hover:underline">{{ m.membership_number }}</RouterLink>
            </td>
            <td class="font-semibold">{{ m.full_name }}</td>
            <td>{{ disciplineList(m.disciplines) }}</td>
            <td class="whitespace-nowrap">{{ formatMedium(m.issue_date) }}</td>
            <td class="whitespace-nowrap">{{ formatMedium(m.expiry_date) }}</td>
            <td><StatusBadge :status="m.effective_status ?? m.status" /></td>
          </tr>
          <tr v-if="!loading && !rows.length">
            <td colspan="6" class="py-10 text-center text-muted">No members found.</td>
          </tr>
        </tbody>
      </table>
    </div>
    <div v-if="total > PAGE" class="flex items-center gap-3 text-sm">
      <button type="button" class="btn-outline btn-sm" :disabled="page === 0" @click="page--">Previous</button>
      <span>Page {{ page + 1 }} of {{ Math.ceil(total / PAGE) }}</span>
      <button type="button" class="btn-outline btn-sm" :disabled="(page + 1) * PAGE >= total" @click="page++">Next</button>
    </div>
  </div>
</template>
