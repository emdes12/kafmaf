<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import NoticeBox from '@/components/NoticeBox.vue'
import MemberCardPanel from '@/components/card/MemberCardPanel.vue'
import { publicAssetUrl, siteUrl, supabase } from '@/lib/supabase'
import { friendlyError } from '@/lib/errors'
import { formatTimestamp } from '@/lib/dates'
import { DISCIPLINES } from '@/lib/disciplines'
import { CALENDAR_LABELS, isCalendarSupported, type HijriCalendarId } from '@/lib/hijri'
import { randomFileName } from '@/lib/image'
import { SAMPLE_CARD, brandingFromSettings } from '@/lib/card/types'
import type { OrganizationSettings } from '@/lib/types'
import { loadSettings, useSettings } from '@/composables/useSettings'

const { settings } = useSettings()
const form = ref<OrganizationSettings | null>(null)
const busy = ref(false)
const error = ref<string | null>(null)
const notice = ref<string | null>(null)

onMounted(async () => {
  await loadSettings(true)
  form.value = JSON.parse(JSON.stringify(settings.value))
})

const EDITABLE: (keyof OrganizationSettings)[] = [
  'short_name', 'full_name', 'name_approved', 'tagline', 'about_text', 'community_text', 'disciplines', 'disciplines_confirmed',
  'contact_phone', 'contact_email', 'contact_address', 'contact_notes', 'applications_open', 'eligibility_text',
  'membership_terms_text', 'faith_attestation_enabled', 'faith_attestation_text', 'validity_months', 'validity_approved',
  'privacy_notice_version', 'card_theme', 'card_validity_statement', 'card_show_signature', 'card_signature_label', 'card_color_primary',
  'card_color_accent', 'card_color_gold', 'logo_path', 'hero_image_path', 'hero_image_alt', 'hijri_calendar',
  'hijri_adjustment_days', 'hijri_authority_label',
]

function payload() {
  const f = form.value!
  const out: Record<string, unknown> = {}
  for (const k of EDITABLE) {
    const v = f[k]
    out[k] = typeof v === 'string' ? (v.trim() === '' && !['short_name', 'full_name', 'card_validity_statement'].includes(k) ? null : v.trim()) : v
  }
  return out
}

const problems = computed(() => {
  const f = form.value
  if (!f) return []
  const p: string[] = []
  if (!f.disciplines.length) p.push('Select at least one discipline.')
  if (f.applications_open && !f.validity_approved) p.push('Approve the validity period before opening applications (approvals would otherwise be blocked).')
  if (f.faith_attestation_enabled && !f.faith_attestation_text?.trim()) p.push('Enter the wording of the membership statement, or disable it.')
  if (f.card_show_signature && !f.card_signature_label?.trim()) p.push('Enter a label for the signature area.')
  if (!isCalendarSupported(f.hijri_calendar)) p.push('This browser cannot calculate the selected Hijri calendar.')
  return p
})

async function save() {
  if (!supabase || !form.value || problems.value.length) return
  busy.value = true
  error.value = notice.value = null
  const { error: err } = await supabase.from('organization_settings').update(payload()).eq('id', 1)
  busy.value = false
  if (err) return (error.value = friendlyError(err, 'Settings could not be saved. Check the values and try again.'))
  await loadSettings(true)
  form.value = JSON.parse(JSON.stringify(settings.value))
  notice.value = 'Settings saved. Changes are recorded in the audit log.'
}

async function uploadAsset(e: Event, field: 'logo_path' | 'hero_image_path') {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file || !supabase || !form.value) return
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 3 * 1024 * 1024) {
    error.value = 'Use a JPG, PNG or WebP image up to 3 MB.'
    return
  }
  const ext = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg'
  const path = `${field === 'logo_path' ? 'logo' : 'hero'}/${randomFileName(ext)}`
  const { error: err } = await supabase.storage.from('site-assets').upload(path, file, { contentType: file.type })
  if (err) return (error.value = 'Upload failed.')
  form.value[field] = path
  notice.value = 'Image uploaded. Save settings to publish it.'
}

const preview = computed(() =>
  form.value ? brandingFromSettings(form.value, publicAssetUrl(form.value.logo_path), new URL(siteUrl() || 'https://example.invalid').host) : null,
)
const calendars = Object.keys(CALENDAR_LABELS) as HijriCalendarId[]
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 class="display text-4xl">Settings &amp; content</h1>
        <p class="mt-1 text-sm text-muted">Only publish information confirmed by {{ settings.short_name }} leadership. Empty fields are hidden on the website.</p>
        <p v-if="settings.updated_at" class="mt-1 text-xs text-muted">Last saved {{ formatTimestamp(settings.updated_at) }}</p>
      </div>
    </div>

    <form v-if="form" class="space-y-6" @submit.prevent="save">
      <!-- Organisation -->
      <section class="card space-y-4 p-6">
        <h2 class="font-display text-2xl font-bold uppercase">Organisation</h2>
        <div class="grid gap-4 md:grid-cols-[200px_1fr]">
          <div>
            <label for="sn" class="field-label">Short name</label>
            <input id="sn" v-model="form.short_name" class="input" maxlength="20" />
          </div>
          <div>
            <label for="fn" class="field-label">Full name</label>
            <input id="fn" v-model="form.full_name" class="input" maxlength="120" />
            <p class="field-hint">Sources differ (“Martial Art” vs “Martial Arts”). Use the name leadership approves.</p>
          </div>
        </div>
        <label class="flex items-center gap-2 text-sm font-semibold"><input v-model="form.name_approved" type="checkbox" class="accent-brand" /> Name confirmed by leadership</label>
        <div>
          <label for="tag" class="field-label">Tagline / motto (homepage)</label>
          <input id="tag" v-model="form.tagline" class="input" maxlength="160" />
        </div>
        <div>
          <label for="about" class="field-label">About text</label>
          <textarea id="about" v-model="form.about_text" rows="6" class="input" maxlength="8000" />
          <p class="field-hint">Separate paragraphs with a blank line. Include history or leadership only with confirmed names and dates.</p>
        </div>
        <div>
          <label for="comm" class="field-label">Community statement (About page)</label>
          <textarea id="comm" v-model="form.community_text" rows="3" class="input" maxlength="2000" />
          <p class="field-hint">For example, the community the organisation serves — exact wording approved by leadership.</p>
        </div>
        <fieldset>
          <legend class="field-label">Disciplines</legend>
          <div class="flex flex-wrap gap-4">
            <label v-for="d in DISCIPLINES" :key="d.id" class="flex items-center gap-2 text-sm">
              <input v-model="form.disciplines" type="checkbox" :value="d.id" class="accent-brand" /> {{ d.name }}
            </label>
          </div>
          <label class="mt-2 flex items-center gap-2 text-sm font-semibold"><input v-model="form.disciplines_confirmed" type="checkbox" class="accent-brand" /> Disciplines confirmed by leadership</label>
        </fieldset>
        <div class="grid gap-4 md:grid-cols-2">
          <div>
            <p class="field-label">Logo</p>
            <p class="field-hint mb-2">Until a file is uploaded, the site and Heritage card use the KAFMAF logo cut from the previous card (low resolution). Upload the original artwork for sharp printing.</p>
            <img v-if="form.logo_path" :src="publicAssetUrl(form.logo_path) ?? ''" alt="Current logo" class="mb-2 h-16 w-16 rounded border border-line object-contain" />
            <div class="flex gap-2">
              <label class="btn-outline btn-sm cursor-pointer">Upload logo<input type="file" accept="image/png,image/jpeg,image/webp" class="sr-only" @change="uploadAsset($event, 'logo_path')" /></label>
              <button v-if="form.logo_path" type="button" class="btn-outline btn-sm" @click="form.logo_path = null">Use provisional mark</button>
            </div>
          </div>
          <div>
            <p class="field-label">Homepage photograph (licensed / organisation-approved)</p>
            <img v-if="form.hero_image_path" :src="publicAssetUrl(form.hero_image_path) ?? ''" alt="Current homepage photograph" class="mb-2 h-16 rounded border border-line object-cover" />
            <div class="flex gap-2">
              <label class="btn-outline btn-sm cursor-pointer">Upload photo<input type="file" accept="image/png,image/jpeg,image/webp" class="sr-only" @change="uploadAsset($event, 'hero_image_path')" /></label>
              <button v-if="form.hero_image_path" type="button" class="btn-outline btn-sm" @click="form.hero_image_path = null">Remove</button>
            </div>
            <input v-model="form.hero_image_alt" class="input mt-2" placeholder="Describe the photo (alt text)" maxlength="200" />
          </div>
        </div>
      </section>

      <!-- Contact -->
      <section class="card space-y-4 p-6">
        <h2 class="font-display text-2xl font-bold uppercase">Contact details</h2>
        <div class="grid gap-4 md:grid-cols-2">
          <div><label for="ph" class="field-label">Phone</label><input id="ph" v-model="form.contact_phone" class="input" maxlength="120" /></div>
          <div><label for="em" class="field-label">Email</label><input id="em" v-model="form.contact_email" type="email" class="input" maxlength="200" /></div>
        </div>
        <div><label for="ad" class="field-label">Address</label><textarea id="ad" v-model="form.contact_address" rows="2" class="input" maxlength="400" /></div>
        <div><label for="cn" class="field-label">Notes (e.g. opening hours)</label><textarea id="cn" v-model="form.contact_notes" rows="2" class="input" maxlength="1000" /></div>
        <p class="text-xs text-muted">Phone and email also appear on the back of ID cards.</p>
      </section>

      <!-- Membership -->
      <section class="card space-y-4 p-6">
        <h2 class="font-display text-2xl font-bold uppercase">Membership policy</h2>
        <label class="flex items-center gap-2 text-sm font-semibold"><input v-model="form.applications_open" type="checkbox" class="accent-brand" /> Online applications open</label>
        <div><label for="el" class="field-label">Eligibility criteria</label><textarea id="el" v-model="form.eligibility_text" rows="4" class="input" maxlength="4000" /></div>
        <div><label for="tm" class="field-label">Membership terms</label><textarea id="tm" v-model="form.membership_terms_text" rows="4" class="input" maxlength="8000" /></div>
        <div class="rounded-lg border border-line p-4">
          <label class="flex items-center gap-2 text-sm font-semibold"><input v-model="form.faith_attestation_enabled" type="checkbox" class="accent-brand" /> Require a membership statement (self-attestation) on the application</label>
          <input v-model="form.faith_attestation_text" class="input mt-2" maxlength="400" placeholder="Exact statement approved by leadership" />
          <p class="field-hint">Only a yes/no confirmation is stored. Do not ask for religious history or other sensitive details.</p>
        </div>
        <div class="grid gap-4 md:grid-cols-[200px_1fr] md:items-end">
          <div>
            <label for="vm" class="field-label">Validity period (months)</label>
            <input id="vm" v-model.number="form.validity_months" type="number" min="1" max="120" class="input" />
          </div>
          <label class="flex items-center gap-2 pb-2.5 text-sm font-semibold"><input v-model="form.validity_approved" type="checkbox" class="accent-brand" /> Validity period approved by leadership (required before issuing memberships)</label>
        </div>
        <p class="text-xs text-muted">Expiry = last valid day: issue date + N months − 1 day (e.g. issued 9 Oct 2026 → valid until 8 Oct 2027). Issued on 29 Feb → valid until 28 Feb.</p>
        <div class="max-w-xs">
          <label for="pv" class="field-label">Privacy notice version</label>
          <input id="pv" v-model="form.privacy_notice_version" class="input" maxlength="40" />
          <p class="field-hint">Change when the notice changes; applicants must accept the current version.</p>
        </div>
      </section>

      <!-- Card -->
      <section class="card space-y-4 p-6">
        <h2 class="font-display text-2xl font-bold uppercase">ID card design</h2>
        <fieldset>
          <legend class="field-label">Card style issued to members</legend>
          <div class="grid gap-3 md:grid-cols-2">
            <label class="flex cursor-pointer gap-3 rounded-lg border p-4 text-sm" :class="form.card_theme === 'heritage' ? 'border-ink ring-2 ring-ink/10' : 'border-line'">
              <input v-model="form.card_theme" type="radio" value="heritage" class="mt-1 accent-brand" />
              <span><strong>Heritage</strong> — KAFMAF logo with the green, yellow and red colours of the previous card.</span>
            </label>
            <label class="flex cursor-pointer gap-3 rounded-lg border p-4 text-sm" :class="form.card_theme === 'signature' ? 'border-ink ring-2 ring-ink/10' : 'border-line'">
              <input v-model="form.card_theme" type="radio" value="signature" class="mt-1 accent-brand" />
              <span><strong>Signature</strong> — charcoal, dark red and gold (colours below), provisional text mark unless a logo is uploaded.</span>
            </label>
          </div>
        </fieldset>
        <div v-if="form.card_theme === 'signature'" class="grid gap-4 md:grid-cols-3">
          <div><label for="c1" class="field-label">Primary (charcoal)</label><input id="c1" v-model="form.card_color_primary" type="color" class="h-10 w-full rounded border border-line" /></div>
          <div><label for="c2" class="field-label">Accent (red)</label><input id="c2" v-model="form.card_color_accent" type="color" class="h-10 w-full rounded border border-line" /></div>
          <div><label for="c3" class="field-label">Detail (gold)</label><input id="c3" v-model="form.card_color_gold" type="color" class="h-10 w-full rounded border border-line" /></div>
        </div>
        <div><label for="vs" class="field-label">Validity statement (card back)</label><textarea id="vs" v-model="form.card_validity_statement" rows="2" class="input" maxlength="220" /></div>
        <div class="flex flex-wrap items-end gap-4">
          <label class="flex items-center gap-2 pb-2.5 text-sm font-semibold"><input v-model="form.card_show_signature" type="checkbox" class="accent-brand" /> Show authorised-signature area</label>
          <div class="grow"><label for="sl" class="field-label">Signature label</label><input id="sl" v-model="form.card_signature_label" class="input" maxlength="60" /></div>
        </div>
        <div v-if="preview" class="border-t border-line pt-6">
          <p class="mb-3 text-xs font-semibold tracking-[0.14em] text-muted uppercase">Live preview (sample data)</p>
          <MemberCardPanel :data="SAMPLE_CARD" :branding="preview" :allow-download="false" />
        </div>
      </section>

      <!-- Hijri -->
      <section class="card space-y-4 p-6">
        <h2 class="font-display text-2xl font-bold uppercase">Hijri calendar</h2>
        <div class="grid gap-4 md:grid-cols-[1fr_200px]">
          <div>
            <label for="hc" class="field-label">Calculation method</label>
            <select id="hc" v-model="form.hijri_calendar" class="input">
              <option v-for="c in calendars" :key="c" :value="c">{{ CALENDAR_LABELS[c] }}</option>
            </select>
          </div>
          <div>
            <label for="ha" class="field-label">Day adjustment</label>
            <select id="ha" v-model.number="form.hijri_adjustment_days" class="input">
              <option v-for="n in [-2, -1, 0, 1, 2]" :key="n" :value="n">{{ n > 0 ? '+' : '' }}{{ n }} day{{ Math.abs(n) === 1 ? '' : 's' }}</option>
            </select>
          </div>
        </div>
        <p class="text-xs text-muted">Use the adjustment if the calculated calendar consistently differs from Nigerian announcements. Confirmed occasion dates always override the calculation.</p>
        <div><label for="hl" class="field-label">Announcing authority (shown on the calendar)</label><input id="hl" v-model="form.hijri_authority_label" class="input" maxlength="160" /></div>
      </section>

      <NoticeBox v-for="p in problems" :key="p" tone="warning">{{ p }}</NoticeBox>
      <NoticeBox v-if="error" tone="error">{{ error }}</NoticeBox>
      <NoticeBox v-if="notice" tone="success">{{ notice }}</NoticeBox>
      <div class="sticky bottom-0 -mx-4 border-t border-line bg-paper/95 px-4 py-3 backdrop-blur sm:-mx-8 sm:px-8">
        <button type="submit" class="btn-primary" :disabled="busy || problems.length > 0">{{ busy ? 'Saving…' : 'Save settings' }}</button>
      </div>
    </form>
  </div>
</template>
