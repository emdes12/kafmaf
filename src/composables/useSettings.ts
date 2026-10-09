import { computed, ref } from 'vue'
import { supabase, publicAssetUrl } from '@/lib/supabase'
import { BUNDLED_LOGO_URL } from '@/lib/card/types'
import type { OrganizationSettings } from '@/lib/types'

/**
 * Mirrors the database defaults. Used before settings load or when the backend
 * is not configured. Everything not yet approved by KAFMAF leadership is null.
 */
export const DEFAULT_SETTINGS: OrganizationSettings = {
  short_name: 'KAFMAF',
  full_name: 'Kick and Fist Martial Art Foundation',
  name_approved: false,
  tagline: null,
  about_text: null,
  community_text: null,
  disciplines: ['karate', 'boxing', 'taekwondo'],
  disciplines_confirmed: false,
  contact_phone: null,
  contact_email: null,
  contact_address: null,
  contact_notes: null,
  applications_open: false,
  eligibility_text: null,
  membership_terms_text: null,
  faith_attestation_enabled: false,
  faith_attestation_text: null,
  validity_months: 12,
  validity_approved: false,
  privacy_notice_version: '2026-10-draft-1',
  card_theme: 'heritage',
  card_validity_statement:
    'This card is valid only while the membership is current. Scan the QR code to confirm the live status.',
  card_show_signature: false,
  card_signature_label: null,
  card_color_primary: '#16181d',
  card_color_accent: '#9e1b22',
  card_color_gold: '#b08d4a',
  logo_path: null,
  hero_image_path: null,
  hero_image_alt: null,
  hijri_calendar: 'islamic-umalqura',
  hijri_adjustment_days: 0,
  hijri_authority_label: 'the Sultan of Sokoto / NSCIA moon-sighting announcement',
  updated_at: '',
}

const settings = ref<OrganizationSettings>({ ...DEFAULT_SETTINGS })
const state = ref<'idle' | 'loading' | 'live' | 'unavailable'>('idle')
let pending: Promise<void> | null = null

export async function loadSettings(force = false): Promise<void> {
  if (!supabase) {
    state.value = 'unavailable'
    return
  }
  if (pending && !force) return pending
  state.value = 'loading'
  pending = (async () => {
    const { data, error } = await supabase!.from('organization_settings').select('*').eq('id', 1).maybeSingle()
    if (error || !data) {
      state.value = 'unavailable'
      return
    }
    settings.value = { ...DEFAULT_SETTINGS, ...(data as Partial<OrganizationSettings>) }
    state.value = 'live'
  })()
  return pending
}

export function useSettings() {
  /** Logo uploaded by an administrator (null if none). */
  const uploadedLogoUrl = computed(() => publicAssetUrl(settings.value.logo_path))
  /** Logo to display on the website: uploaded logo, otherwise the KAFMAF logo from the previous card. */
  const logoUrl = computed(() => uploadedLogoUrl.value ?? BUNDLED_LOGO_URL)
  const heroUrl = computed(() => publicAssetUrl(settings.value.hero_image_path))
  return { settings, state, logoUrl, uploadedLogoUrl, heroUrl, reload: () => loadSettings(true) }
}
