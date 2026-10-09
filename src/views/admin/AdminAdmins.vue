<script setup lang="ts">
import { onMounted, ref } from 'vue'
import NoticeBox from '@/components/NoticeBox.vue'
import { supabase } from '@/lib/supabase'
import { formatTimestamp } from '@/lib/dates'
import { friendlyError } from '@/lib/errors'
import { useAuth } from '@/composables/useAuth'

interface AdminRow {
  id: string
  email: string
  display_name: string | null
  account_status: string
  created_at: string
}
const { user } = useAuth()
const rows = ref<AdminRow[]>([])
const email = ref('')
const error = ref<string | null>(null)
const notice = ref<string | null>(null)

async function load() {
  if (!supabase) return
  const { data, error: err } = await supabase.rpc('admin_list_admins')
  if (err) error.value = friendlyError(err)
  rows.value = (data ?? []) as AdminRow[]
}
onMounted(load)

async function setRole(target: string, role: 'admin' | 'member') {
  if (!supabase) return
  if (role === 'member' && !confirm(`Remove administrator access from ${target}?`)) return
  error.value = notice.value = null
  const { error: err } = await supabase.rpc('admin_set_role_by_email', { p_email: target, p_role: role })
  if (err) return (error.value = friendlyError(err))
  notice.value = role === 'admin' ? `${target} is now an administrator.` : `${target} is no longer an administrator.`
  email.value = ''
  await load()
}
</script>

<template>
  <div class="space-y-6">
    <h1 class="display text-4xl">Administrators</h1>
    <p class="max-w-2xl text-sm text-muted">
      Administrators can approve applications, issue and revoke memberships, and publish content. Grant access only to people authorised
      by leadership. The person must first create an account and confirm their email.
    </p>
    <NoticeBox v-if="error" tone="error">{{ error }}</NoticeBox>
    <NoticeBox v-if="notice" tone="success">{{ notice }}</NoticeBox>

    <div class="card overflow-x-auto">
      <table class="table-base">
        <thead><tr><th>Email</th><th>Name</th><th>Since</th><th></th></tr></thead>
        <tbody>
          <tr v-for="r in rows" :key="r.id">
            <td class="break-all">{{ r.email }}</td>
            <td>{{ r.display_name ?? '—' }}</td>
            <td class="whitespace-nowrap">{{ formatTimestamp(r.created_at) }}</td>
            <td class="text-right">
              <button v-if="r.id !== user?.id" type="button" class="btn-outline btn-sm" @click="setRole(r.email, 'member')">Remove</button>
              <span v-else class="text-xs text-muted">You</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <form class="card flex flex-wrap items-end gap-3 p-6" @submit.prevent="setRole(email.trim(), 'admin')">
      <div class="grow">
        <label for="newadmin" class="field-label">Add administrator by email</label>
        <input id="newadmin" v-model="email" type="email" class="input" required />
      </div>
      <button type="submit" class="btn-dark" :disabled="!email.trim()">Grant access</button>
    </form>
  </div>
</template>
