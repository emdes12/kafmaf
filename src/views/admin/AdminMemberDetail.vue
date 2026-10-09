<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import StatusBadge from '@/components/StatusBadge.vue'
import NoticeBox from '@/components/NoticeBox.vue'
import MemberCardPanel from '@/components/card/MemberCardPanel.vue'
import { PHOTO_BUCKET, supabase, verificationUrl } from '@/lib/supabase'
import { formatLong, formatTimestamp } from '@/lib/dates'
import { DISCIPLINES } from '@/lib/disciplines'
import { friendlyError } from '@/lib/errors'
import { PHOTO_ACCEPT, PhotoError, processPassportPhoto, randomFileName } from '@/lib/image'
import type { AuditLog, Member, MembershipStatus } from '@/lib/types'
import { useMemberCard } from '@/composables/useMemberCard'
import { useSettings } from '@/composables/useSettings'

const route = useRoute()
const { settings } = useSettings()
const member = ref<Member | null>(null)
const history = ref<AuditLog[]>([])
const error = ref<string | null>(null)
const notice = ref<string | null>(null)
const busy = ref(false)

const edit = ref({ full_name: '', display_name: '', disciplines: [] as string[] })
const statusReason = ref('')
const rotateToken = ref(false)

const card = useMemberCard(member)
const effective = computed(() => member.value?.effective_status ?? member.value?.status)

async function load() {
  if (!supabase) return
  const id = String(route.params.id)
  const [{ data, error: err }, logs] = await Promise.all([
    supabase.from('members_with_status').select('*').eq('id', id).maybeSingle(),
    supabase.from('audit_logs').select('*').eq('target_id', id).order('created_at', { ascending: false }).limit(30),
  ])
  if (err || !data) {
    error.value = 'Member not found.'
    return
  }
  member.value = data as Member
  history.value = (logs.data ?? []) as AuditLog[]
  edit.value = { full_name: member.value.full_name, display_name: member.value.display_name, disciplines: [...member.value.disciplines] }
}
onMounted(load)

async function act(label: string, fn: () => PromiseLike<{ error: unknown }>, confirmText?: string) {
  if (confirmText && !confirm(confirmText)) return
  busy.value = true
  error.value = null
  notice.value = null
  const { error: err } = await fn()
  busy.value = false
  if (err) {
    error.value = friendlyError(err)
    return
  }
  notice.value = label
  await load()
}

const saveDetails = () =>
  act('Details saved.', () =>
    supabase!.rpc('admin_update_member', {
      p_member_id: member.value!.id,
      p_full_name: edit.value.full_name,
      p_display_name: edit.value.display_name,
      p_disciplines: edit.value.disciplines,
    }),
  )

const setStatus = (s: MembershipStatus) =>
  act(
    `Status changed to ${s}.`,
    () => supabase!.rpc('set_member_status', { p_member_id: member.value!.id, p_status: s, p_reason: statusReason.value }),
    s === 'revoked' ? 'Revoking is permanent: the card will never verify again. Continue?' : undefined,
  )

const renew = () =>
  act(
    'Membership renewed.',
    () => supabase!.rpc('renew_membership', { p_member_id: member.value!.id }),
    `Renew this membership for ${settings.value.validity_months} months? The new period starts the day after the current expiry, or today if already expired.`,
  )

const reissue = () =>
  act(
    rotateToken.value ? 'Card reissued with a new QR code. Older cards no longer verify.' : 'Card reissued.',
    () => supabase!.rpc('reissue_card', { p_member_id: member.value!.id, p_rotate_token: rotateToken.value }),
    'Reissue the card? Validity dates do not change.',
  )

async function replacePhoto(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file || !supabase || !member.value) return
  error.value = null
  try {
    const blob = await processPassportPhoto(file)
    const path = `members/${member.value.id}/${randomFileName('jpg')}`
    const up = await supabase.storage.from(PHOTO_BUCKET).upload(path, blob, { contentType: 'image/jpeg' })
    if (up.error) throw new PhotoError('Upload failed. Please try again.')
    await act('Photograph replaced.', () => supabase!.rpc('admin_set_member_photo', { p_member_id: member.value!.id, p_photo_path: path }))
  } catch (err) {
    error.value = err instanceof PhotoError ? err.message : 'That image could not be used.'
  }
}
</script>

<template>
  <div class="space-y-6">
    <RouterLink to="/admin/members" class="text-sm font-semibold text-brand hover:underline">← Members</RouterLink>
    <NoticeBox v-if="error" tone="error">{{ error }}</NoticeBox>
    <NoticeBox v-if="notice" tone="success">{{ notice }}</NoticeBox>

    <template v-if="member">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 class="display text-4xl">{{ member.full_name }}</h1>
          <p class="font-mono text-sm text-muted">{{ member.membership_number }}</p>
        </div>
        <StatusBadge :status="effective!" size="md" />
      </div>

      <div class="grid gap-4 sm:grid-cols-4">
        <div class="card p-4"><p class="text-xs font-semibold text-muted uppercase">Member since</p><p class="mt-1 font-semibold">{{ formatLong(member.member_since) }}</p></div>
        <div class="card p-4"><p class="text-xs font-semibold text-muted uppercase">Current period from</p><p class="mt-1 font-semibold">{{ formatLong(member.issue_date) }}</p></div>
        <div class="card p-4"><p class="text-xs font-semibold text-muted uppercase">Valid until (inclusive)</p><p class="mt-1 font-semibold">{{ formatLong(member.expiry_date) }}</p></div>
        <div class="card p-4"><p class="text-xs font-semibold text-muted uppercase">Card</p><p class="mt-1 font-semibold">v{{ member.card_version }} · {{ formatTimestamp(member.card_issued_at) }}</p></div>
      </div>
      <p v-if="member.status_reason" class="text-sm"><strong>Status reason:</strong> {{ member.status_reason }}</p>

      <div class="grid gap-6 xl:grid-cols-2">
        <form class="card space-y-4 p-6" @submit.prevent="saveDetails">
          <h2 class="font-display text-2xl font-bold uppercase">Approved details</h2>
          <div>
            <label for="fn" class="field-label">Full name (printed on card)</label>
            <input id="fn" v-model="edit.full_name" class="input" maxlength="120" />
          </div>
          <div>
            <label for="dn" class="field-label">Display name (verification page)</label>
            <input id="dn" v-model="edit.display_name" class="input" maxlength="120" />
          </div>
          <fieldset>
            <legend class="field-label">Disciplines</legend>
            <div class="flex flex-wrap gap-3">
              <label v-for="d in DISCIPLINES" :key="d.id" class="flex items-center gap-2 text-sm">
                <input v-model="edit.disciplines" type="checkbox" :value="d.id" class="accent-brand" /> {{ d.name }}
              </label>
            </div>
          </fieldset>
          <div class="flex flex-wrap items-center gap-3">
            <button type="submit" class="btn-dark" :disabled="busy || member.status === 'revoked'">Save details</button>
            <label class="btn-outline cursor-pointer" :class="member.status === 'revoked' && 'pointer-events-none opacity-50'">
              Replace photograph
              <input type="file" :accept="PHOTO_ACCEPT" class="sr-only" @change="replacePhoto" />
            </label>
          </div>
        </form>

        <section class="card space-y-4 p-6">
          <h2 class="font-display text-2xl font-bold uppercase">Membership actions</h2>
          <div>
            <label for="reason" class="field-label">Reason (required to suspend or revoke)</label>
            <input id="reason" v-model="statusReason" class="input" maxlength="500" />
          </div>
          <div class="flex flex-wrap gap-2">
            <button v-if="member.status === 'active'" type="button" class="btn-outline" :disabled="busy" @click="setStatus('suspended')">Suspend</button>
            <button v-if="member.status === 'suspended'" type="button" class="btn-outline" :disabled="busy" @click="setStatus('active')">Reinstate</button>
            <button v-if="member.status !== 'revoked'" type="button" class="btn-outline !text-crimson" :disabled="busy" @click="setStatus('revoked')">Revoke</button>
          </div>
          <div class="flex flex-wrap items-center gap-3 border-t border-line pt-4">
            <button type="button" class="btn-dark" :disabled="busy || member.status !== 'active' || !settings.validity_approved" @click="renew">
              Renew ({{ settings.validity_months }} months)
            </button>
          </div>
          <div class="flex flex-wrap items-center gap-3 border-t border-line pt-4">
            <button type="button" class="btn-outline" :disabled="busy || member.status === 'revoked'" @click="reissue">Reissue card</button>
            <label class="flex items-center gap-2 text-sm">
              <input v-model="rotateToken" type="checkbox" class="accent-brand" /> New QR code (invalidates previously printed cards)
            </label>
          </div>
          <a :href="verificationUrl(member.verification_token)" target="_blank" rel="noopener" class="inline-block text-sm font-semibold text-brand hover:underline">
            Open public verification page ↗
          </a>
        </section>
      </div>

      <section class="card p-6">
        <h2 class="font-display text-2xl font-bold uppercase">ID card</h2>
        <p class="mt-1 text-sm text-muted">Generated from the database record above.</p>
        <NoticeBox v-if="effective !== 'active'" tone="warning" class="mt-4">
          This membership is {{ effective }}. The member cannot download a card, and the QR code verifies as not valid.
        </NoticeBox>
        <div v-if="card.data.value" class="mt-6">
          <MemberCardPanel :data="card.data.value" :branding="card.branding.value" :allow-download="effective === 'active'" />
        </div>
      </section>

      <section class="card p-6">
        <h2 class="font-display text-2xl font-bold uppercase">History</h2>
        <ul class="mt-4 divide-y divide-line text-sm">
          <li v-for="h in history" :key="h.id" class="flex flex-wrap justify-between gap-2 py-2">
            <span class="font-mono text-xs">{{ h.action }}</span>
            <span class="text-xs text-muted">{{ formatTimestamp(h.created_at) }}</span>
          </li>
          <li v-if="!history.length" class="py-2 text-muted">No history.</li>
        </ul>
      </section>
    </template>
  </div>
</template>
