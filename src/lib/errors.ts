/**
 * Turns Supabase/PostgREST errors into a message that is safe to show.
 * Messages raised deliberately by our database functions (P0001 / 22023 / 42501 / P0002)
 * are already user-facing; anything else becomes a generic message so internal
 * details are never displayed.
 */
const USER_FACING_CODES = new Set(['P0001', 'P0002', '22023', '42501'])

export function friendlyError(error: unknown, fallback = 'Something went wrong. Please try again.'): string {
  if (!error) return fallback
  if (typeof error === 'object') {
    const e = error as { code?: string; message?: string; name?: string; status?: number }
    if (e.code && USER_FACING_CODES.has(e.code) && e.message) return e.message
    if (e.code === 'over_email_send_rate_limit' || /email rate limit/i.test(e.message ?? '')) {
      return 'We cannot send more emails right now. Please try again in an hour. If you already signed up, check your inbox (and spam folder) for the confirmation link.'
    }
    if (e.status === 429) return 'Too many attempts. Please wait a moment and try again.'
    if (e.name === 'AuthApiError' || e.name === 'AuthWeakPasswordError') return e.message ?? fallback
    if (e.message && /Failed to fetch|NetworkError/i.test(e.message)) {
      return 'Could not reach the membership service. Check your connection and try again.'
    }
  }
  return fallback
}
