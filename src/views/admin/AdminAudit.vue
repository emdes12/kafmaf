<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import NoticeBox from '@/components/NoticeBox.vue'
import { supabase } from '@/lib/supabase'
import { formatTimestamp } from '@/lib/dates'
import type { AuditLog } from '@/lib/types'

const prefix = ref('')
const rows = ref<AuditLog[]>([])
const error = ref<string | null>(null)

async function load() {
  if (!supabase) return
  let q = supabase.from('audit_logs').select('*').order('created_at', { ascending: false }).limit(200)
  if (prefix.value) q = q.like('action', `${prefix.value}%`)
  const { data, error: err } = await q
  error.value = err ? 'Audit log could not be loaded.' : null
  rows.value = (data ?? []) as AuditLog[]
}
onMounted(load)
watch(prefix, load)

const targetLink = (r: AuditLog) =>
  r.target_type === 'member' ? `/admin/members/${r.target_id}` : r.target_type === 'membership_application' ? `/admin/applications/${r.target_id}` : null
</script>

<template>
  <div class="space-y-6">
    <h1 class="display text-4xl">Audit log</h1>
    <p class="text-sm text-muted">Append-only record of sensitive actions. Entries cannot be edited or deleted from the application.</p>
    <div class="max-w-xs">
      <label for="flt" class="field-label">Filter</label>
      <select id="flt" v-model="prefix" class="input">
        <option value="">All actions</option>
        <option value="application.">Applications</option>
        <option value="member.">Members</option>
        <option value="occasion.">Islamic occasions</option>
        <option value="settings.">Settings</option>
        <option value="admin.">Administrators</option>
        <option value="request.">Requests</option>
      </select>
    </div>
    <NoticeBox v-if="error" tone="error">{{ error }}</NoticeBox>
    <div class="card overflow-x-auto">
      <table class="table-base min-w-[760px]">
        <thead><tr><th>When</th><th>Action</th><th>Target</th><th>Actor</th><th>Details</th></tr></thead>
        <tbody>
          <tr v-for="r in rows" :key="r.id">
            <td class="whitespace-nowrap">{{ formatTimestamp(r.created_at) }}</td>
            <td class="font-mono text-xs">{{ r.action }}</td>
            <td>
              <RouterLink v-if="targetLink(r)" :to="targetLink(r)!" class="text-xs font-semibold text-brand hover:underline">{{ r.target_type }}</RouterLink>
              <span v-else class="text-xs">{{ r.target_type ?? '—' }}</span>
            </td>
            <td class="font-mono text-[11px] text-muted">{{ r.actor_id?.slice(0, 8) ?? 'system' }}</td>
            <td><pre class="max-w-md overflow-x-auto text-[11px] leading-4 whitespace-pre-wrap text-ink-3">{{ JSON.stringify(r.metadata, null, 1) }}</pre></td>
          </tr>
          <tr v-if="!rows.length"><td colspan="5" class="py-8 text-center text-muted">No entries.</td></tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
