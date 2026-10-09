import { computed, ref, watch, type Ref } from 'vue'
import { formatCardDate } from '@/lib/dates'
import { PHOTO_BUCKET, siteUrl, supabase, verificationUrl } from '@/lib/supabase'
import { blobToDataUrl } from '@/lib/image'
import { qrSvgDataUrl } from '@/lib/card/render'
import { brandingFromSettings, type CardData } from '@/lib/card/types'
import type { Member } from '@/lib/types'
import { useSettings } from './useSettings'

/** Downloads a private photo through the authenticated client and returns a data URL (null if unavailable). */
export async function loadPhotoDataUrl(path: string | null): Promise<string | null> {
  if (!path || !supabase) return null
  const { data, error } = await supabase.storage.from(PHOTO_BUCKET).download(path)
  if (error || !data) return null
  return blobToDataUrl(data)
}

/**
 * Builds card data strictly from an approved member record loaded from the
 * database. No field can be typed in by the user.
 */
export function useMemberCard(member: Ref<Member | null>) {
  const { settings, uploadedLogoUrl } = useSettings()
  const photo = ref<string | null>(null)
  const qr = ref<string | null>(null)
  const photoMissing = ref(false)
  const loading = ref(false)

  watch(
    () => [member.value?.id, member.value?.photo_path, member.value?.verification_token] as const,
    async () => {
      const m = member.value
      if (!m) return
      loading.value = true
      const [p, q] = await Promise.all([loadPhotoDataUrl(m.photo_path), qrSvgDataUrl(verificationUrl(m.verification_token))])
      photo.value = p
      photoMissing.value = !p
      qr.value = q
      loading.value = false
    },
    { immediate: true },
  )

  const data = computed<CardData | null>(() => {
    const m = member.value
    if (!m) return null
    return {
      fullName: m.full_name,
      membershipNumber: m.membership_number,
      disciplines: m.disciplines,
      issueDate: formatCardDate(m.issue_date),
      expiryDate: formatCardDate(m.expiry_date),
      statusLabel: 'Active',
      photoDataUrl: photo.value,
      verifyUrl: verificationUrl(m.verification_token),
      qrDataUrl: qr.value,
      cardVersion: m.card_version,
    }
  })

  const branding = computed(() => brandingFromSettings(settings.value, uploadedLogoUrl.value, new URL(siteUrl() || 'https://example.invalid').host))

  return { data, branding, loading, photoMissing }
}
