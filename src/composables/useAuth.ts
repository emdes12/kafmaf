import { computed, ref, shallowRef } from 'vue'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import type { Profile } from '@/lib/types'

const session = shallowRef<Session | null>(null)
const profile = ref<Profile | null>(null)
const ready = ref(false)
let initPromise: Promise<void> | null = null

async function loadProfile() {
  if (!supabase || !session.value) {
    profile.value = null
    return
  }
  const { data } = await supabase
    .from('profiles')
    .select('id, display_name, role, account_status')
    .eq('id', session.value.user.id)
    .maybeSingle()
  profile.value = (data as Profile | null) ?? null
}

/** Initialise once; resolves after the stored session (if any) has been restored. */
export function initAuth(): Promise<void> {
  if (initPromise) return initPromise
  initPromise = (async () => {
    if (!supabase) {
      ready.value = true
      return
    }
    const { data } = await supabase.auth.getSession()
    session.value = data.session
    await loadProfile()
    ready.value = true
    supabase.auth.onAuthStateChange((_event, next) => {
      const changedUser = next?.user.id !== session.value?.user.id
      session.value = next
      if (changedUser) void loadProfile()
    })
  })()
  return initPromise
}

export function useAuth() {
  const user = computed(() => session.value?.user ?? null)
  // UI hint only. Every admin action is authorised again by the database.
  const isAdmin = computed(() => profile.value?.role === 'admin' && profile.value.account_status === 'active')
  const emailVerified = computed(() => Boolean(user.value?.email_confirmed_at))

  async function signOut() {
    await supabase?.auth.signOut()
    session.value = null
    profile.value = null
  }

  return { session, user, profile, isAdmin, emailVerified, ready, signOut, refreshProfile: loadProfile }
}
