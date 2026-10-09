<script setup lang="ts">
import { ref } from 'vue'
import AuthShell from '@/components/AuthShell.vue'
import NoticeBox from '@/components/NoticeBox.vue'
import { authRedirectUrl, supabase } from '@/lib/supabase'
import { friendlyError } from '@/lib/errors'
import { usePageMeta } from '@/composables/usePageMeta'

usePageMeta({ title: 'Reset password', noindex: true })
const email = ref('')
const busy = ref(false)
const sent = ref(false)
const error = ref<string | null>(null)

async function submit() {
  if (!supabase || !email.value.trim()) return
  busy.value = true
  error.value = null
  const { error: err } = await supabase.auth.resetPasswordForEmail(email.value.trim(), { redirectTo: authRedirectUrl('/reset-password') })
  busy.value = false
  // Do not reveal whether an account exists; only surface rate-limit / network problems.
  if (err && (err.status === 429 || /fetch/i.test(err.message))) return (error.value = friendlyError(err))
  sent.value = true
}
</script>

<template>
  <AuthShell title="Reset password" lead="We will email you a link to choose a new password.">
    <NoticeBox v-if="sent" tone="success">If an account uses that address, a reset link is on its way. The link expires after a short time.</NoticeBox>
    <form v-else class="space-y-4" @submit.prevent="submit">
      <div>
        <label for="email" class="field-label">Email address</label>
        <input id="email" v-model="email" type="email" autocomplete="email" required class="input" />
      </div>
      <NoticeBox v-if="error" tone="error">{{ error }}</NoticeBox>
      <button type="submit" class="btn-dark w-full" :disabled="busy || !supabase">{{ busy ? 'Sending…' : 'Send reset link' }}</button>
    </form>
  </AuthShell>
</template>
