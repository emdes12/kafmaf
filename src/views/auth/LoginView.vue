<script setup lang="ts">
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AuthShell from '@/components/AuthShell.vue'
import NoticeBox from '@/components/NoticeBox.vue'
import { supabase } from '@/lib/supabase'
import { friendlyError } from '@/lib/errors'
import { useAuth } from '@/composables/useAuth'
import { usePageMeta } from '@/composables/usePageMeta'

usePageMeta({ title: 'Member login', noindex: true })
const route = useRoute()
const router = useRouter()
const { refreshProfile } = useAuth()

const email = ref('')
const password = ref('')
const error = ref<string | null>(null)
const busy = ref(false)

/** Only allow same-site relative redirects. */
function safeRedirect(): string {
  const r = String(route.query.redirect ?? '')
  return r.startsWith('/') && !r.startsWith('//') ? r : '/account'
}

async function submit() {
  if (!supabase) return
  error.value = null
  busy.value = true
  const { error: err } = await supabase.auth.signInWithPassword({ email: email.value.trim(), password: password.value })
  busy.value = false
  if (err) {
    error.value = err.message === 'Invalid login credentials' ? 'Incorrect email or password.' : friendlyError(err)
    return
  }
  password.value = ''
  await refreshProfile()
  router.replace(safeRedirect())
}
</script>

<template>
  <AuthShell title="Member login" lead="Sign in to see your application, membership and ID card.">
    <form class="space-y-4" novalidate @submit.prevent="submit">
      <div>
        <label for="email" class="field-label">Email address</label>
        <input id="email" v-model="email" type="email" autocomplete="email" required class="input" />
      </div>
      <div>
        <div class="flex items-center justify-between">
          <label for="password" class="field-label">Password</label>
          <RouterLink to="/forgot-password" class="text-xs font-semibold text-brand hover:underline">Forgot password?</RouterLink>
        </div>
        <input id="password" v-model="password" type="password" autocomplete="current-password" required class="input" />
      </div>
      <NoticeBox v-if="error" tone="error">{{ error }}</NoticeBox>
      <button type="submit" class="btn-dark w-full" :disabled="busy || !email || !password || !supabase">
        {{ busy ? 'Signing in…' : 'Sign in' }}
      </button>
      <p class="text-center text-sm text-muted">
        New here? <RouterLink to="/signup" class="font-semibold text-brand hover:underline">Create an account</RouterLink>
      </p>
    </form>
  </AuthShell>
</template>
