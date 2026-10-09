import type { OrganizationSettings } from '../types'

/** Dynamic fields printed on a card. Always built from an approved `members` record. */
export interface CardData {
  fullName: string
  membershipNumber: string
  disciplines: string[]
  issueDate: string // DD/MM/YYYY
  expiryDate: string // DD/MM/YYYY
  /** Status label printed on the card ('Active' for live cards, 'Sample' for the design preview). */
  statusLabel: string
  /** Data URL of the passport photo, or null for the neutral placeholder. */
  photoDataUrl: string | null
  /** Exact verification URL encoded in the QR code; null renders a labelled placeholder. */
  verifyUrl: string | null
  /** SVG data URL of the QR code for `verifyUrl`. */
  qrDataUrl: string | null
  cardVersion: number
  sample?: boolean
}

export type CardTheme = 'heritage' | 'signature'

export interface CardBranding {
  theme: CardTheme
  shortName: string
  fullName: string
  colorPrimary: string
  colorAccent: string
  colorGold: string
  logoUrl: string | null
  validityStatement: string
  showSignature: boolean
  signatureLabel: string | null
  contactLine: string | null
  verifyHost: string
}

/**
 * KAFMAF's existing logo, cut from the previous membership card supplied by the
 * organisation. It is low resolution (112 px): replace it with the original
 * artwork via Admin → Settings → Approved logo for sharp printing.
 */
export const BUNDLED_LOGO_URL = '/brand/kafmaf-logo.png'

/** Colours sampled from KAFMAF's previous membership card and logo. */
export const HERITAGE_COLORS = { green: '#006f03', yellow: '#fff112', red: '#cd383a' } as const

export function brandingFromSettings(
  s: OrganizationSettings,
  uploadedLogoUrl: string | null,
  verifyHost: string,
  theme: CardTheme = s.card_theme,
): CardBranding {
  const contact = [s.contact_phone, s.contact_email].filter(Boolean).join(' · ')
  const heritage = theme === 'heritage'
  return {
    theme,
    shortName: s.short_name,
    fullName: s.full_name,
    colorPrimary: heritage ? HERITAGE_COLORS.green : s.card_color_primary,
    colorAccent: heritage ? HERITAGE_COLORS.red : s.card_color_accent,
    colorGold: heritage ? HERITAGE_COLORS.yellow : s.card_color_gold,
    // Heritage always shows the organisation's logo; Signature keeps its text mark unless a logo is uploaded.
    logoUrl: heritage ? (uploadedLogoUrl ?? BUNDLED_LOGO_URL) : uploadedLogoUrl,
    validityStatement: s.card_validity_statement,
    showSignature: s.card_show_signature,
    signatureLabel: s.card_signature_label,
    contactLine: contact || null,
    verifyHost,
  }
}

export const SAMPLE_CARD: CardData = {
  fullName: 'SAMPLE MEMBER',
  membershipNumber: 'KAFMAF-DEMO-0001',
  disciplines: ['karate', 'boxing', 'taekwondo'],
  issueDate: 'DD/MM/YYYY',
  expiryDate: 'DD/MM/YYYY',
  statusLabel: 'Sample',
  photoDataUrl: null,
  verifyUrl: null,
  qrDataUrl: null,
  cardVersion: 1,
  sample: true,
}
