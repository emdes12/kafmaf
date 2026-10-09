<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { z } from 'zod'
import NoticeBox from '@/components/NoticeBox.vue'
import BackendNotice from '@/components/BackendNotice.vue'
import { PHOTO_BUCKET, supabase } from '@/lib/supabase'
import { friendlyError } from '@/lib/errors'
import { DISCIPLINES } from '@/lib/disciplines'
import { PHOTO_ACCEPT, PhotoError, processPassportPhoto, randomFileName } from '@/lib/image'
import { useAuth } from '@/composables/useAuth'
import { useSettings, loadSettings } from '@/composables/useSettings'
import { usePageMeta } from '@/composables/usePageMeta'

usePageMeta({ title: 'Membership application', noindex: true })
const router = useRouter()
const { user, emailVerified } = useAuth()
const { settings, state: settingsState } = useSettings()

const form = ref({
  fullName: '',
  phone: '',
  disciplines: [] as string[],
  eligibility: false,
  adult: false,
  faith: false,
  privacy: false,
})
const photoBlob = ref<Blob | null>(null)
const photoPreview = ref<string | null>(null)
const photoError = ref<string | null>(null)
const photoBusy = ref(false)
const submitted = ref(false)
const busy = ref(false)
const serverError = ref<string | null>(null)
const result = ref<{ reference: string } | null>(null)
const existingPending = ref(false)
const isMember = ref(false)

onMounted(async () => {
  await loadSettings()
  if (!supabase || !user.value) return
  const [{ data: apps }, { data: mem }] = await Promise.all([
    supabase.from('membership_applications').select('id').eq('user_id', user.value.id).eq('status', 'pending').limit(1),
    supabase.from('members').select('id').eq('user_id', user.value.id).limit(1),
  ])
  existingPending.value = !!apps?.length
  isMember.value = !!mem?.length
})
onBeforeUnmount(() => photoPreview.value && URL.revokeObjectURL(photoPreview.value))

const schema = computed(() =>
  z.object({
    fullName: z
      .string()
      .trim()
      .min(3, 'Enter your full name as it should appear on your card.')
      .max(120, 'Name is too long.')
      .regex(/^[\p{L}][\p{L} .'-]*$/u, 'Use letters, spaces, hyphens or apostrophes only.'),
    phone: z
      .string()
      .trim()
      .refine((v) => v === '' || /^\+?[0-9]{7,15}$/.test(v.replace(/[\s\-().]/g, '')), 'Enter a valid phone number, e.g. 0803 123 4567.'),
    disciplines: z.array(z.string()).min(1, 'Choose at least one discipline.'),
    eligibility: z.literal(true, { errorMap: () => ({ message: 'Required.' }) }),
    adult: z.literal(true, { errorMap: () => ({ message: 'Online applications are for adults only.' }) }),
    faith: settings.value.faith_attestation_enabled ? z.literal(true, { errorMap: () => ({ message: 'Required.' }) }) : z.boolean(),
    privacy: z.literal(true, { errorMap: () => ({ message: 'Please read and accept the privacy notice.' }) }),
  }),
)

const fieldErrors = computed<Record<string, string | undefined>>(() => {
  const r = schema.value.safeParse(form.value)
  const out: Record<string, string | undefined> = {}
  if (!r.success) for (const issue of r.error.issues) out[String(issue.path[0])] ??= issue.message
  if (!photoBlob.value) out.photo = 'A passport photograph is required.'
  return out
})
const show = (k: string) => (submitted.value ? fieldErrors.value[k] : undefined)

async function onPhoto(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  photoError.value = null
  if (!file) return
  photoBusy.value = true
  try {
    const blob = await processPassportPhoto(file)
    photoBlob.value = blob
    if (photoPreview.value) URL.revokeObjectURL(photoPreview.value)
    photoPreview.value = URL.createObjectURL(blob)
  } catch (err) {
    photoBlob.value = null
    photoError.value = err instanceof PhotoError ? err.message : 'That image could not be used.'
  } finally {
    photoBusy.value = false
  }
}

async function submit() {
  submitted.value = true
  serverError.value = null
  if (Object.keys(fieldErrors.value).length || !supabase || !user.value || !photoBlob.value) {
    document.querySelector<HTMLElement>('[aria-invalid="true"], .field-error')?.scrollIntoView({ block: 'center', behavior: 'smooth' })
    return
  }
  busy.value = true
  const path = `applications/${user.value.id}/${randomFileName('jpg')}`
  const upload = await supabase.storage.from(PHOTO_BUCKET).upload(path, photoBlob.value, { contentType: 'image/jpeg', upsert: false })
  if (upload.error) {
    busy.value = false
    serverError.value = 'Your photograph could not be uploaded. Please try again.'
    return
  }
  const f = form.value
  const { data, error } = await supabase.rpc('submit_application', {
    p_full_name: f.fullName.trim(),
    p_phone: f.phone.trim() || null,
    p_disciplines: f.disciplines,
    p_photo_path: path,
    p_training_location: null,
    p_eligibility_confirmed: f.eligibility,
    p_adult_confirmed: f.adult,
    p_faith_attested: settings.value.faith_attestation_enabled ? f.faith : null,
    p_privacy_notice_version: settings.value.privacy_notice_version,
    p_terms_accepted: f.privacy,
  })
  busy.value = false
  if (error) {
    await supabase.storage.from(PHOTO_BUCKET).remove([path]) // remove the orphaned upload
    serverError.value = friendlyError(error, 'Your application could not be submitted. Please try again.')
    return
  }
  result.value = { reference: (data as { reference: string }[])[0].reference }
  window.scrollTo({ top: 0 })
}
</script>

<template>
  <div class="container-page max-w-3xl py-10 sm:py-14">
    <!-- Confirmation -->
    <section v-if="result" class="card overflow-hidden" aria-live="polite">
      <div class="bg-ink p-8 text-paper">
        <p class="eyebrow !text-gold">Application received</p>
        <h1 class="display mt-2 text-4xl">Thank you</h1>
      </div>
      <div class="space-y-4 p-8 text-sm leading-6">
        <p>Your application reference is</p>
        <p class="font-mono text-2xl font-semibold tracking-wide">{{ result.reference }}</p>
        <NoticeBox tone="info">
          Your application is now <strong>pending review</strong>. Submitting an application does not mean membership has been approved,
          and no membership card is issued until an administrator approves it.
        </NoticeBox>
        <button type="button" class="btn-dark" @click="router.push('/account')">Go to my account</button>
      </div>
    </section>

    <template v-else>
      <p class="eyebrow">Membership</p>
      <h1 class="display mt-2 text-5xl">Application form</h1>
      <div class="mt-6 space-y-3"><BackendNotice /></div>

      <NoticeBox v-if="!emailVerified" tone="warning" title="Confirm your email first" class="mt-6">
        Open the confirmation link we emailed to you, then reload this page.
      </NoticeBox>
      <NoticeBox v-else-if="isMember" tone="info" class="mt-6">
        This account already has a membership. <RouterLink to="/account" class="font-semibold underline">Go to your account</RouterLink>.
      </NoticeBox>
      <NoticeBox v-else-if="existingPending" tone="info" class="mt-6">
        You already have an application under review. <RouterLink to="/account" class="font-semibold underline">View its status</RouterLink>.
      </NoticeBox>
      <NoticeBox v-else-if="settingsState === 'live' && !settings.applications_open" tone="info" class="mt-6">
        Online applications are not open at the moment.
      </NoticeBox>

      <form v-else class="mt-8 space-y-10" novalidate @submit.prevent="submit">
        <fieldset class="space-y-5">
          <legend class="font-display text-2xl font-bold uppercase">Your details</legend>
          <div>
            <label for="fullName" class="field-label">Full name</label>
            <input
              id="fullName"
              v-model="form.fullName"
              type="text"
              autocomplete="name"
              maxlength="120"
              class="input"
              :aria-invalid="!!show('fullName')"
              aria-describedby="fullName-msg"
            />
            <p id="fullName-msg" :class="show('fullName') ? 'field-error' : 'field-hint'">
              {{ show('fullName') ?? 'As it should appear on your membership card.' }}
            </p>
          </div>
          <div>
            <label for="phone" class="field-label">Phone number <span class="font-normal text-muted">(optional)</span></label>
            <input
              id="phone"
              v-model="form.phone"
              type="tel"
              autocomplete="tel"
              inputmode="tel"
              class="input"
              :aria-invalid="!!show('phone')"
              aria-describedby="phone-msg"
            />
            <p id="phone-msg" :class="show('phone') ? 'field-error' : 'field-hint'">
              {{ show('phone') ?? 'Used only by administrators to contact you about your membership.' }}
            </p>
          </div>
          <div>
            <p class="field-label">Email address</p>
            <p class="rounded-md border border-line bg-paper-2/60 px-3 py-2.5 text-sm">{{ user?.email }}</p>
          </div>
        </fieldset>

        <fieldset class="space-y-3">
          <legend class="font-display text-2xl font-bold uppercase">Passport photograph</legend>
          <div class="flex flex-col gap-5 sm:flex-row sm:items-start">
            <div class="flex h-[200px] w-[160px] shrink-0 items-center justify-center overflow-hidden rounded-md border-2 border-dashed border-line bg-paper-2/60">
              <img v-if="photoPreview" :src="photoPreview" alt="Preview of your passport photograph" class="h-full w-full object-cover" />
              <span v-else class="px-4 text-center text-xs text-muted">No photo selected</span>
            </div>
            <div class="text-sm">
              <label for="photo" class="btn-outline cursor-pointer">{{ photoBlob ? 'Choose a different photo' : 'Choose photo' }}</label>
              <input id="photo" type="file" :accept="PHOTO_ACCEPT" class="sr-only" :aria-invalid="!!(photoError || show('photo'))" @change="onPhoto" />
              <ul class="mt-3 list-disc space-y-1 pl-5 text-xs text-muted">
                <li>Head and shoulders, facing the camera, plain light background.</li>
                <li>JPG, PNG or WebP, up to 8 MB. It will be cropped to a 4:5 portrait.</li>
                <li>Hidden photo data (such as location) is removed before upload.</li>
              </ul>
              <p v-if="photoBusy" class="field-hint">Processing…</p>
              <p v-if="photoError || show('photo')" class="field-error">{{ photoError ?? show('photo') }}</p>
            </div>
          </div>
        </fieldset>

        <fieldset>
          <legend class="font-display text-2xl font-bold uppercase">Preferred discipline(s)</legend>
          <div class="mt-4 grid gap-3 sm:grid-cols-3">
            <label
              v-for="d in DISCIPLINES.filter((x) => settings.disciplines.includes(x.id))"
              :key="d.id"
              class="flex cursor-pointer items-center gap-3 rounded-lg border bg-white px-4 py-3 text-sm font-semibold transition-colors"
              :class="form.disciplines.includes(d.id) ? 'border-ink ring-2 ring-ink/10' : 'border-line'"
            >
              <input v-model="form.disciplines" type="checkbox" :value="d.id" class="h-4 w-4 accent-brand" />
              {{ d.name }}
            </label>
          </div>
          <p v-if="show('disciplines')" class="field-error">{{ show('disciplines') }}</p>
        </fieldset>

        <fieldset class="space-y-4">
          <legend class="font-display text-2xl font-bold uppercase">Confirmations</legend>
          <div v-if="settings.eligibility_text" class="rounded-lg border border-line bg-paper-2/50 p-4 text-sm leading-6 whitespace-pre-line text-ink-3">
            {{ settings.eligibility_text }}
          </div>
          <label class="flex gap-3 text-sm leading-6">
            <input v-model="form.eligibility" type="checkbox" class="mt-1 h-4 w-4 shrink-0 accent-brand" :aria-invalid="!!show('eligibility')" />
            <span>
              I confirm that I meet {{ settings.short_name }}'s membership eligibility criteria<template v-if="!settings.eligibility_text">
                as published on the <RouterLink to="/membership" class="font-semibold text-brand underline">membership page</RouterLink></template>.
              <span v-if="show('eligibility')" class="field-error block">{{ show('eligibility') }}</span>
            </span>
          </label>
          <label class="flex gap-3 text-sm leading-6">
            <input v-model="form.adult" type="checkbox" class="mt-1 h-4 w-4 shrink-0 accent-brand" :aria-invalid="!!show('adult')" />
            <span>
              I am 18 years of age or older.
              <span v-if="show('adult')" class="field-error block">{{ show('adult') }}</span>
            </span>
          </label>
          <label v-if="settings.faith_attestation_enabled && settings.faith_attestation_text" class="flex gap-3 text-sm leading-6">
            <input v-model="form.faith" type="checkbox" class="mt-1 h-4 w-4 shrink-0 accent-brand" :aria-invalid="!!show('faith')" />
            <span>
              {{ settings.faith_attestation_text }}
              <span v-if="show('faith')" class="field-error block">{{ show('faith') }}</span>
            </span>
          </label>
          <label class="flex gap-3 text-sm leading-6">
            <input v-model="form.privacy" type="checkbox" class="mt-1 h-4 w-4 shrink-0 accent-brand" :aria-invalid="!!show('privacy')" />
            <span>
              I have read the
              <RouterLink to="/privacy" target="_blank" class="font-semibold text-brand underline">privacy notice</RouterLink>
              (version {{ settings.privacy_notice_version }})<template v-if="settings.membership_terms_text">
                and the <RouterLink to="/membership#terms" target="_blank" class="font-semibold text-brand underline">membership terms</RouterLink></template>
              and agree to my information being used as described.
              <span v-if="show('privacy')" class="field-error block">{{ show('privacy') }}</span>
            </span>
          </label>
        </fieldset>

        <NoticeBox v-if="submitted && Object.keys(fieldErrors).length" tone="error">Please correct the highlighted fields.</NoticeBox>
        <NoticeBox v-if="serverError" tone="error">{{ serverError }}</NoticeBox>

        <div class="flex flex-wrap items-center gap-4 border-t border-line pt-6">
          <button type="submit" class="btn-primary" :disabled="busy || photoBusy">{{ busy ? 'Submitting…' : 'Submit application' }}</button>
          <p class="text-xs text-muted">Submitting does not make you a member until an administrator approves the application.</p>
        </div>
      </form>
    </template>
  </div>
</template>
