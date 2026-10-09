<script setup lang="ts">
import { computed, ref } from 'vue'
import AuthShell from '@/components/AuthShell.vue'
import NoticeBox from '@/components/NoticeBox.vue'
import { authRedirectUrl, supabase } from '@/lib/supabase'
import { friendlyError } from '@/lib/errors'
import { usePageMeta } from '@/composables/usePageMeta'

usePageMeta({ title: 'Create an account', noindex: true })

const email = ref('')
const password = ref('')
const confirm = ref('')
const touched = ref(false)
const error = ref<string | null>(null)
const busy = ref(false)
const done = ref(false)

const errors = computed(() => ({
  email: /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.value.trim()) ? null : 'Enter a valid email address.',
  password:
    password.value.length < 10
      ? 'Use at least 10 characters.'
      : !/[A-Za-z]/.test(password.value) || !/\d/.test(password.value)
        ? 'Include at least one letter and one number.'
        : null,
  confirm: confirm.value === password.value ? null : 'Passwords do not match.',
}))
const valid = computed(() => !errors.value.email && !errors.value.password && !errors.value.confirm)

async function submit() {
  touched.value = true
  if (!valid.value || !supabase) return
  error.value = null
  busy.value = true
  const { error: err } = await supabase.auth.signUp({
    email: email.value.trim(),
    password: password.value,
    options: { emailRedirectTo: authRedirectUrl('/account') },
  })
  busy.value = false
  if (err) return (error.value = friendlyError(err))
  password.value = confirm.value = ''
  // Same message whether or not the address already has an account (prevents account enumeration).
  done.value = true
}
</script>

<template>
  <AuthShell title="Create an account" lead="An account is needed to apply for membership and to download your card.">
    <NoticeBox v-if="done" tone="success" title="Check your email">
      If this address can be registered, we have sent a confirmation link to <strong>{{ email }}</strong>. Open it to activate your account,
      then sign in and complete your application.
    </NoticeBox>
    <form v-else class="space-y-4" novalidate @submit.prevent="submit">
      <div>
        <label for="email" class="field-label">Email address</label>
        <input
          id="email"
          v-model="email"
          type="email"
          autocomplete="email"
          class="input"
          :aria-invalid="touched && !!errors.email"
          aria-describedby="email-error"
        />
        <p v-if="touched && errors.email" id="email-error" class="field-error">{{ errors.email }}</p>
      </div>
      <div>
        <label for="password" class="field-label">Password</label>
        <input
          id="password"
          v-model="password"
          type="password"
          autocomplete="new-password"
          class="input"
          :aria-invalid="touched && !!errors.password"
          aria-describedby="password-hint"
        />
        <p id="password-hint" :class="touched && errors.password ? 'field-error' : 'field-hint'">
          {{ (touched && errors.password) || 'At least 10 characters, with a letter and a number.' }}
        </p>
      </div>
      <div>
        <label for="confirm" class="field-label">Confirm password</label>
        <input
          id="confirm"
          v-model="confirm"
          type="password"
          autocomplete="new-password"
          class="input"
          :aria-invalid="touched && !!errors.confirm"
          aria-describedby="confirm-error"
        />
        <p v-if="touched && errors.confirm" id="confirm-error" class="field-error">{{ errors.confirm }}</p>
      </div>
      <NoticeBox v-if="error" tone="error">{{ error }}</NoticeBox>
      <button type="submit" class="btn-dark w-full" :disabled="busy || !supabase">{{ busy ? 'Creating account…' : 'Create account' }}</button>
      <p class="text-center text-sm text-muted">
        Already registered? <RouterLink to="/login" class="font-semibold text-brand hover:underline">Sign in</RouterLink>
      </p>
    </form>
  </AuthShell>
</template>
