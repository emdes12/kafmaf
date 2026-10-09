<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import StatusBadge from '@/components/StatusBadge.vue'
import NoticeBox from '@/components/NoticeBox.vue'
import { PHOTO_BUCKET, supabase } from '@/lib/supabase'
import { formatTimestamp } from '@/lib/dates'
import { disciplineList } from '@/lib/disciplines'
import { friendlyError } from '@/lib/errors'
import type { Member, MembershipApplication } from '@/lib/types'
import { useSettings } from '@/composables/useSettings'

const route = useRoute()
const router = useRouter()
const { settings } = useSettings()
const app = ref<MembershipApplication | null>(null)
const photoUrl = ref<string | null>(null)
const loading = ref(true)
const error = ref<string | null>(null)
const busy = ref(false)
const displayName = ref('')
const rejectReason = ref('')
const showReject = ref(false)
const memberId = ref<string | null>(null)

async function load() {
  if (!supabase) return
  loading.value = true
  const { data, error: err } = await supabase.from('membership_applications').select('*').eq('id', String(route.params.id)).maybeSingle()
  loading.value = false
  if (err || !data) {
    error.value = 'Application not found.'
    return
  }
  app.value = data as MembershipApplication
  displayName.value = app.value.full_name
  if (app.value.photo_path) {
    const signed = await supabase.storage.from(PHOTO_BUCKET).createSignedUrl(app.value.photo_path, 300)
    photoUrl.value = signed.data?.signedUrl ?? null
  }
  if (app.value.status === 'approved') {
    const m = await supabase.from('members').select('id').eq('application_id', app.value.id).maybeSingle()
    memberId.value = (m.data as { id: string } | null)?.id ?? null
  }
}
onMounted(load)

const validityNote = computed(() =>
  settings.value.validity_approved
    ? `Membership will be issued today (Africa/Lagos) and valid for ${settings.value.validity_months} months; the expiry date is calculated by the server.`
    : 'The validity period has not been approved yet. Approve it in Settings before issuing memberships.',
)

async function approve() {
  if (!supabase || !app.value) return
  if (!confirm(`Approve ${app.value.full_name} and issue an official membership number?`)) return
  busy.value = true
  error.value = null
  const { data, error: err } = await supabase.rpc('approve_application', {
    p_application_id: app.value.id,
    p_display_name: displayName.value.trim() || null,
  })
  busy.value = false
  if (err) return (error.value = friendlyError(err))
  router.push(`/admin/members/${(data as Member).id}`)
}

async function reject() {
  if (!supabase || !app.value) return
  busy.value = true
  error.value = null
  const { error: err } = await supabase.rpc('reject_application', { p_application_id: app.value.id, p_reason: rejectReason.value })
  busy.value = false
  if (err) return (error.value = friendlyError(err))
  showReject.value = false
  await load()
}
</script>

<template>
  <div class="space-y-6">
    <RouterLink to="/admin/applications" class="text-sm font-semibold text-brand hover:underline">← Applications</RouterLink>
    <p v-if="loading" class="text-sm text-muted">Loading…</p>
    <NoticeBox v-if="error" tone="error">{{ error }}</NoticeBox>

    <template v-if="app">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 class="display text-4xl">{{ app.full_name }}</h1>
          <p class="font-mono text-sm text-muted">{{ app.reference }}</p>
        </div>
        <StatusBadge :status="app.status" size="md" />
      </div>

      <div class="grid gap-6 lg:grid-cols-[220px_1fr]">
        <div class="card overflow-hidden">
          <img v-if="photoUrl" :src="photoUrl" :alt="`Passport photograph submitted by ${app.full_name}`" class="aspect-[4/5] w-full object-cover" />
          <div v-else class="flex aspect-[4/5] items-center justify-center bg-paper-2 text-sm text-muted">No photograph</div>
        </div>
        <dl class="card grid gap-4 p-6 text-sm sm:grid-cols-2">
          <div><dt class="text-xs font-semibold text-muted uppercase">Email</dt><dd class="mt-1 break-all">{{ app.email }}</dd></div>
          <div><dt class="text-xs font-semibold text-muted uppercase">Phone</dt><dd class="mt-1">{{ app.phone ?? '—' }}</dd></div>
          <div><dt class="text-xs font-semibold text-muted uppercase">Disciplines</dt><dd class="mt-1">{{ disciplineList(app.disciplines) }}</dd></div>
          <div><dt class="text-xs font-semibold text-muted uppercase">Submitted</dt><dd class="mt-1">{{ formatTimestamp(app.submitted_at) }}</dd></div>
          <div>
            <dt class="text-xs font-semibold text-muted uppercase">Confirmations</dt>
            <dd class="mt-1">
              Eligibility ✓ · 18+ ✓<template v-if="app.faith_attested"> · Membership statement ✓</template>
            </dd>
          </div>
          <div><dt class="text-xs font-semibold text-muted uppercase">Privacy notice</dt><dd class="mt-1">{{ app.privacy_notice_version }}</dd></div>
          <div v-if="app.reviewed_at"><dt class="text-xs font-semibold text-muted uppercase">Reviewed</dt><dd class="mt-1">{{ formatTimestamp(app.reviewed_at) }}</dd></div>
          <div v-if="app.rejection_reason" class="sm:col-span-2">
            <dt class="text-xs font-semibold text-muted uppercase">Rejection reason</dt><dd class="mt-1">{{ app.rejection_reason }}</dd>
          </div>
        </dl>
      </div>

      <RouterLink v-if="memberId" :to="`/admin/members/${memberId}`" class="btn-dark">Open member record</RouterLink>

      <section v-if="app.status === 'pending'" class="card space-y-4 p-6">
        <h2 class="font-display text-2xl font-bold uppercase">Decision</h2>
        <NoticeBox :tone="settings.validity_approved ? 'info' : 'warning'">{{ validityNote }}</NoticeBox>
        <div class="max-w-md">
          <label for="displayName" class="field-label">Approved display name</label>
          <input id="displayName" v-model="displayName" class="input" maxlength="120" />
          <p class="field-hint">Shown on the public verification page. The card prints the full name.</p>
        </div>
        <div class="flex flex-wrap gap-2">
          <button type="button" class="btn-primary" :disabled="busy || !settings.validity_approved" @click="approve">Approve &amp; issue membership</button>
          <button type="button" class="btn-outline" :disabled="busy" @click="showReject = !showReject">Reject…</button>
        </div>
        <form v-if="showReject" class="max-w-lg space-y-3 border-t border-line pt-4" @submit.prevent="reject">
          <label for="reason" class="field-label">Reason (visible to the applicant)</label>
          <textarea id="reason" v-model="rejectReason" rows="3" maxlength="500" class="input" required />
          <button type="submit" class="btn-dark" :disabled="busy || rejectReason.trim().length < 3">Confirm rejection</button>
        </form>
      </section>
    </template>
  </div>
</template>
