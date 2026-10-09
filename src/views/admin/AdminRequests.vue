<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import StatusBadge from '@/components/StatusBadge.vue'
import NoticeBox from '@/components/NoticeBox.vue'
import { supabase } from '@/lib/supabase'
import { formatTimestamp } from '@/lib/dates'
import { friendlyError } from '@/lib/errors'
import type { MemberRequest } from '@/lib/types'

const status = ref<'open' | 'resolved' | 'dismissed'>('open')
const rows = ref<MemberRequest[]>([])
const notes = ref<Record<string, string>>({})
const error = ref<string | null>(null)

async function load() {
  if (!supabase) return
  const { data, error: err } = await supabase.from('member_requests').select('*').eq('status', status.value).order('created_at').limit(100)
  error.value = err ? 'Requests could not be loaded.' : null
  rows.value = (data ?? []) as MemberRequest[]
}
onMounted(load)
watch(status, load)

async function resolve(r: MemberRequest, s: 'resolved' | 'dismissed') {
  if (!supabase) return
  const { error: err } = await supabase.rpc('resolve_member_request', { p_request_id: r.id, p_status: s, p_note: notes.value[r.id] ?? null })
  if (err) error.value = friendlyError(err)
  await load()
}
</script>

<template>
  <div class="space-y-6">
    <h1 class="display text-4xl">Member requests</h1>
    <div class="flex gap-1 rounded-lg border border-line bg-white p-1 w-fit" role="tablist">
      <button
        v-for="s in ['open', 'resolved', 'dismissed'] as const"
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
    <NoticeBox v-if="error" tone="error">{{ error }}</NoticeBox>
    <p v-if="!rows.length" class="text-sm text-muted">No {{ status }} requests.</p>
    <article v-for="r in rows" :key="r.id" class="card space-y-3 p-5">
      <div class="flex flex-wrap items-center justify-between gap-2">
        <div class="flex items-center gap-2">
          <span class="font-semibold capitalize">{{ r.request_type }}</span>
          <StatusBadge :status="r.status" />
        </div>
        <span class="text-xs text-muted">{{ formatTimestamp(r.created_at) }}</span>
      </div>
      <p class="text-sm whitespace-pre-line">{{ r.message }}</p>
      <RouterLink v-if="r.member_id" :to="`/admin/members/${r.member_id}`" class="text-sm font-semibold text-brand hover:underline">
        Open member record →
      </RouterLink>
      <p v-if="r.admin_note" class="text-sm"><strong>Note:</strong> {{ r.admin_note }}</p>
      <div v-if="r.status === 'open'" class="flex flex-wrap items-end gap-2 border-t border-line pt-3">
        <div class="grow">
          <label :for="'note-' + r.id" class="field-label">Response to member (optional)</label>
          <input :id="'note-' + r.id" v-model="notes[r.id]" class="input" maxlength="500" />
        </div>
        <button type="button" class="btn-dark btn-sm" @click="resolve(r, 'resolved')">Mark resolved</button>
        <button type="button" class="btn-outline btn-sm" @click="resolve(r, 'dismissed')">Dismiss</button>
      </div>
    </article>
  </div>
</template>
