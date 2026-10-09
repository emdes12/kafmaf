import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL?.trim()
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim()

/** True when the public Supabase URL and anon/publishable key are configured. */
export const isBackendConfigured = Boolean(url && anonKey)

/**
 * Browser Supabase client. Uses ONLY the public anon/publishable key; all access
 * control is enforced by Row Level Security and SECURITY DEFINER functions.
 */
export const supabase: SupabaseClient | null = isBackendConfigured
  ? createClient(url!, anonKey!, {
      auth: {
        flowType: 'pkce',
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null

export function requireSupabase(): SupabaseClient {
  if (!supabase) throw new Error('The membership service is not configured yet.')
  return supabase
}

/** Canonical public site URL (used for QR codes, canonical links and auth redirects). */
export function siteUrl(): string {
  const configured = import.meta.env.VITE_PUBLIC_SITE_URL?.trim().replace(/\/+$/, '')
  if (configured) return configured
  return typeof window !== 'undefined' ? window.location.origin : ''
}

export function verificationUrl(token: string): string {
  return `${siteUrl()}/verify/${token}`
}

export function publicAssetUrl(path: string | null | undefined): string | null {
  if (!path || !supabase) return null
  return supabase.storage.from('site-assets').getPublicUrl(path).data.publicUrl
}

export const PHOTO_BUCKET = 'member-photos'
