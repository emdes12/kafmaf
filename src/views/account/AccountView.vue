<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import NoticeBox from '@/components/NoticeBox.vue'
import StatusBadge from '@/components/StatusBadge.vue'
import BackendNotice from '@/components/BackendNotice.vue'
import MemberCardPanel from '@/components/card/MemberCardPanel.vue'
import { supabase, verificationUrl } from '@/lib/supabase'
import { formatLong, formatTimestamp } from '@/lib/dates'
import { disciplineList } from '@/lib/disciplines'
import { friendlyError } from '@/lib/errors'
import type { Member, MemberRequest, MembershipApplication } from '@/lib/types'
import { useAuth } from '@/composables/useAuth'
import { useSettings } from '@/composables/useSettings'
import { useMemberCard } from '@/composables/useMemberCard'
import { usePageMeta } from '@/composables/usePageMeta'

usePageMeta({ title: 'My account', noindex: true })
const { user, emailVerified, signOut, isAdmin } = useAuth()
const { settings } = useSettings()

const loading = ref(true)
const loadError = ref<string | null>(null)
const applications = ref<MembershipApplication[]>([])
const member = ref<Member | null>(null)
const requests = ref<MemberRequest[]>([])

const latestApp = computed(() => applications.value[0] ?? null)
const effective = computed(() => member.value?.effective_status ?? null)
const canDownload = computed(() => effective.value === 'active')
const card = useMemberCard(computed(() => (canDownload.value ? member.value : null)))

async function load() {
  if (!supabase || !user.value) {
    loading.value = false
    return
  }
  loading.value = true
  loadError.value = null
  const uid = user.value.id
  const [apps, mem, reqs] = await Promise.all([
    supabase
      .from('membership_applications')
      .select('id, reference, full_name, disciplines, status, submitted_at, reviewed_at, rejection_reason')
      .eq('user_id', uid)
      .order('submitted_at', { ascending: false }),
    supabase.from('members_with_status').select('*').eq('user_id', uid).maybeSingle(),
    supabase.from('member_requests').select('*').eq('user_id', uid).order('created_at', { ascending: false }).limit(10),
  ])
  if (apps.error || mem.error || reqs.error) loadError.value = 'Your records could not be loaded. Please refresh the page.'
  applications.value = (apps.data ?? []) as MembershipApplication[]
  member.value = (mem.data as Member | null) ?? null
  requests.value = (reqs.data ?? []) as MemberRequest[]
  loading.value = false
}
onMounted(load)

// Requests
const reqType = ref<'correction' | 'renewal'>('correction')
const reqMessage = ref('')
const reqBusy = ref(false)
const reqError = ref<string | null>(null)
const reqDone = ref(false)
async function sendRequest() {
  if (!supabase) return
  reqError.value = null
  reqDone.value = false
  if (reqMessage.value.trim().length < 5) return (reqError.value = 'Please describe your request.')
  reqBusy.value = true
  const { error } = await supabase.rpc('create_member_request', { p_type: reqType.value, p_message: reqMessage.value.trim() })
  reqBusy.value = false
  if (error) return (reqError.value = friendlyError(error))
  reqMessage.value = ''
  reqDone.value = true
  await load()
}

async function withdraw(id: string) {
  if (!supabase || !confirm('Withdraw this application? You can apply again later if applications are open.')) return
  const { error } = await supabase.rpc('withdraw_application', { p_application_id: id })
  if (error) loadError.value = friendlyError(error)
  await load()
}
</script>

<template>
  <div class="container-page py-10 sm:py-14">
    <div class="flex flex-wrap items-end justify-between gap-4">
      <div>
        <p class="eyebrow">My account</p>
        <h1 class="display mt-2 text-5xl">{{ member?.display_name ?? 'Welcome' }}</h1>
        <p class="mt-1 text-sm text-muted">{{ user?.email }}</p>
      </div>
      <div class="flex gap-2">
        <RouterLink v-if="isAdmin" to="/admin" class="btn-dark btn-sm">Admin dashboard</RouterLink>
        <button type="button" class="btn-outline btn-sm" @click="signOut().then(() => $router.push('/'))">Sign out</button>
      </div>
    </div>

    <div class="mt-6 space-y-3">
      <BackendNotice />
      <NoticeBox v-if="!emailVerified" tone="warning" title="Email not confirmed">
        Please open the confirmation link we sent to your email address before applying.
      </NoticeBox>
      <NoticeBox v-if="loadError" tone="error">{{ loadError }}</NoticeBox>
    </div>

    <div v-if="loading" class="mt-10 text-sm text-muted" role="status">Loading your records…</div>

    <template v-else>
      <!-- Membership -->
      <section v-if="member" class="mt-10 space-y-6" aria-labelledby="membership-heading">
        <div class="card grid gap-6 p-6 sm:p-8 md:grid-cols-4">
          <div class="md:col-span-4 flex flex-wrap items-center justify-between gap-3">
            <h2 id="membership-heading" class="display text-3xl">Membership</h2>
            <StatusBadge :status="effective ?? member.status" size="md" />
          </div>
          <div>
            <p class="text-xs font-semibold tracking-[0.12em] text-muted uppercase">Membership no.</p>
            <p class="mt-1 font-mono text-lg font-semibold">{{ member.membership_number }}</p>
          </div>
          <div>
            <p class="text-xs font-semibold tracking-[0.12em] text-muted uppercase">Issued</p>
            <p class="mt-1 font-semibold">{{ formatLong(member.issue_date) }}</p>
          </div>
          <div>
            <p class="text-xs font-semibold tracking-[0.12em] text-muted uppercase">Valid until (inclusive)</p>
            <p class="mt-1 font-semibold" :class="effective === 'expired' && 'text-brand'">{{ formatLong(member.expiry_date) }}</p>
          </div>
          <div>
            <p class="text-xs font-semibold tracking-[0.12em] text-muted uppercase">Disciplines</p>
            <p class="mt-1 font-semibold">{{ disciplineList(member.disciplines) }}</p>
          </div>
        </div>

        <NoticeBox v-if="effective === 'expired'" tone="warning" title="Membership expired">
          Your card no longer verifies as active. Use the form below to request renewal.
        </NoticeBox>
        <NoticeBox v-else-if="effective === 'suspended' || effective === 'revoked'" tone="error" :title="`Membership ${effective}`">
          Your card cannot be downloaded and does not verify as valid.
          <template v-if="member.status_reason"> Reason recorded: {{ member.status_reason }}</template>
        </NoticeBox>

        <div v-if="canDownload && card.data.value" class="card p-6 sm:p-8">
          <div class="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 class="display text-3xl">Digital ID card</h2>
              <p class="mt-1 text-sm text-muted">Generated from your approved record. Version {{ member.card_version }}.</p>
            </div>
            <a :href="verificationUrl(member.verification_token)" target="_blank" rel="noopener" class="btn-outline btn-sm">
              Open verification page ↗
            </a>
          </div>
          <NoticeBox v-if="card.photoMissing.value && !card.loading.value" tone="warning" class="mt-4">
            Your photograph could not be loaded, so the card shows a placeholder. Please request a correction if this persists.
          </NoticeBox>
          <div class="mt-6">
            <MemberCardPanel :data="card.data.value" :branding="card.branding.value" />
          </div>
        </div>
      </section>

      <!-- Application -->
      <section v-else class="mt-10" aria-labelledby="application-heading">
        <div v-if="latestApp" class="card p-6 sm:p-8">
          <div class="flex flex-wrap items-center justify-between gap-3">
            <h2 id="application-heading" class="display text-3xl">Your application</h2>
            <StatusBadge :status="latestApp.status" size="md" />
          </div>
          <dl class="mt-6 grid gap-4 text-sm sm:grid-cols-3">
            <div>
              <dt class="text-xs font-semibold tracking-[0.12em] text-muted uppercase">Reference</dt>
              <dd class="mt-1 font-mono font-semibold">{{ latestApp.reference }}</dd>
            </div>
            <div>
              <dt class="text-xs font-semibold tracking-[0.12em] text-muted uppercase">Submitted</dt>
              <dd class="mt-1 font-semibold">{{ formatTimestamp(latestApp.submitted_at) }}</dd>
            </div>
            <div>
              <dt class="text-xs font-semibold tracking-[0.12em] text-muted uppercase">Disciplines</dt>
              <dd class="mt-1 font-semibold">{{ disciplineList(latestApp.disciplines) }}</dd>
            </div>
          </dl>
          <NoticeBox v-if="latestApp.status === 'pending'" class="mt-6">
            Your application is being reviewed. No membership card is issued until it is approved.
            <button type="button" class="ml-1 font-semibold text-brand underline" @click="withdraw(latestApp.id)">Withdraw application</button>
          </NoticeBox>
          <NoticeBox v-else-if="latestApp.status === 'rejected'" tone="error" title="Application not approved" class="mt-6">
            {{ latestApp.rejection_reason }}
          </NoticeBox>
          <RouterLink
            v-if="['rejected', 'withdrawn'].includes(latestApp.status) && settings.applications_open"
            to="/apply"
            class="btn-primary mt-6"
          >
            Submit a new application
          </RouterLink>
        </div>
        <div v-else class="card p-6 sm:p-8">
          <h2 id="application-heading" class="display text-3xl">No application yet</h2>
          <p class="mt-2 text-sm text-muted">
            {{ settings.applications_open ? 'Apply for membership to receive a membership number and digital ID card.' : 'Online applications are not open at the moment.' }}
          </p>
          <RouterLink v-if="settings.applications_open" to="/apply" class="btn-primary mt-6">Apply for membership</RouterLink>
        </div>
      </section>

      <!-- Requests -->
      <section v-if="member || latestApp" class="mt-10 grid gap-6 lg:grid-cols-2" aria-labelledby="requests-heading">
        <form class="card space-y-4 p-6 sm:p-8" @submit.prevent="sendRequest">
          <h2 id="requests-heading" class="display text-3xl">Send a request</h2>
          <div>
            <label for="reqType" class="field-label">Request type</label>
            <select id="reqType" v-model="reqType" class="input">
              <option value="correction">Correct my details</option>
              <option v-if="member" value="renewal">Renew my membership</option>
            </select>
          </div>
          <div>
            <label for="reqMsg" class="field-label">Details</label>
            <textarea id="reqMsg" v-model="reqMessage" rows="4" maxlength="1000" class="input" />
            <p class="field-hint">Do not include passwords or bank details.</p>
          </div>
          <NoticeBox v-if="reqError" tone="error">{{ reqError }}</NoticeBox>
          <NoticeBox v-if="reqDone" tone="success">Request sent. An administrator will review it.</NoticeBox>
          <button type="submit" class="btn-dark" :disabled="reqBusy">{{ reqBusy ? 'Sending…' : 'Send request' }}</button>
        </form>
        <div class="card p-6 sm:p-8">
          <h2 class="display text-3xl">Recent requests</h2>
          <ul v-if="requests.length" class="mt-4 divide-y divide-line text-sm">
            <li v-for="r in requests" :key="r.id" class="py-3">
              <div class="flex items-center justify-between gap-2">
                <span class="font-semibold capitalize">{{ r.request_type }}</span>
                <StatusBadge :status="r.status" />
              </div>
              <p class="mt-1 text-muted">{{ r.message }}</p>
              <p v-if="r.admin_note" class="mt-1 text-xs"><strong>Response:</strong> {{ r.admin_note }}</p>
              <p class="mt-1 text-xs text-muted">{{ formatTimestamp(r.created_at) }}</p>
            </li>
          </ul>
          <p v-else class="mt-4 text-sm text-muted">No requests yet.</p>
        </div>
      </section>
    </template>
  </div>
</template>
