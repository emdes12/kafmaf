import type { IsoDate } from './dates'
import type { HijriCalendarId } from './hijri'

export type Discipline = 'karate' | 'boxing' | 'taekwondo'
export type AppRole = 'member' | 'admin'
export type ApplicationStatus = 'pending' | 'approved' | 'rejected' | 'withdrawn'
export type MembershipStatus = 'active' | 'suspended' | 'revoked'
export type EffectiveStatus = MembershipStatus | 'expired'

export interface OrganizationSettings {
  short_name: string
  full_name: string
  name_approved: boolean
  tagline: string | null
  about_text: string | null
  community_text: string | null
  disciplines: Discipline[]
  disciplines_confirmed: boolean
  contact_phone: string | null
  contact_email: string | null
  contact_address: string | null
  contact_notes: string | null
  applications_open: boolean
  eligibility_text: string | null
  membership_terms_text: string | null
  faith_attestation_enabled: boolean
  faith_attestation_text: string | null
  validity_months: number
  validity_approved: boolean
  privacy_notice_version: string
  card_theme: 'heritage' | 'signature'
  card_validity_statement: string
  card_show_signature: boolean
  card_signature_label: string | null
  card_color_primary: string
  card_color_accent: string
  card_color_gold: string
  logo_path: string | null
  hero_image_path: string | null
  hero_image_alt: string | null
  hijri_calendar: HijriCalendarId
  hijri_adjustment_days: number
  hijri_authority_label: string
  updated_at: string
}

export interface Profile {
  id: string
  display_name: string | null
  role: AppRole
  account_status: 'active' | 'disabled'
}

export interface MembershipApplication {
  id: string
  reference: string
  user_id: string
  full_name: string
  email: string
  phone: string | null
  photo_path: string | null
  disciplines: Discipline[]
  training_location: string | null
  eligibility_confirmed: boolean
  adult_confirmed: boolean
  faith_attested: boolean | null
  privacy_notice_version: string
  status: ApplicationStatus
  submitted_at: string
  reviewed_at: string | null
  rejection_reason: string | null
}

export interface Member {
  id: string
  user_id: string | null
  application_id: string | null
  membership_number: string
  full_name: string
  display_name: string
  photo_path: string | null
  disciplines: Discipline[]
  status: MembershipStatus
  status_reason: string | null
  member_since: IsoDate
  issue_date: IsoDate
  expiry_date: IsoDate
  verification_token: string
  card_version: number
  card_issued_at: string
  created_at: string
  updated_at: string
  effective_status?: EffectiveStatus
}

export interface MemberRequest {
  id: string
  user_id: string
  member_id: string | null
  request_type: 'correction' | 'renewal'
  message: string
  status: 'open' | 'resolved' | 'dismissed'
  admin_note: string | null
  created_at: string
  resolved_at: string | null
}

export interface AuditLog {
  id: number
  actor_id: string | null
  action: string
  target_type: string | null
  target_id: string | null
  metadata: Record<string, unknown>
  created_at: string
}

export interface VerificationResult {
  membership_number: string
  display_name: string
  status: EffectiveStatus
  issue_date: IsoDate
  expiry_date: IsoDate
  card_version: number
  checked_on: IsoDate
}
