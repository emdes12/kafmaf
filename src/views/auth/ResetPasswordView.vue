<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import AuthShell from '@/components/AuthShell.vue'
import NoticeBox from '@/components/NoticeBox.vue'
import { supabase } from '@/lib/supabase'
import { friendlyError } from '@/lib/errors'
import { initAuth, useAuth } from '@/composables/useAuth'
import { usePageMeta } from '@/composables/usePageMeta'

usePageMeta({ title: 'Choose a new password', noindex: true })
const router = useRouter()
const { user } = useAuth()
const password = ref('')
const confirm = ref('')
const busy = ref(false)
const error = ref<string | null>(null)
const ready = ref(false)

onMounted(async () => {
  await initAuth()
  ready.value = true
})

const problem = computed(() => {
  if (password.value.length < 10) return 'Use at least 10 characters.'
  if (!/[A-Za-z]/.test(password.value) || !/\d/.test(password.value)) return 'Include at least one letter and one number.'
  if (password.value !== confirm.value) return 'Passwords do not match.'
  return null
})

async function submit() {
  if (!supabase || problem.value) return
  busy.value = true
  error.value = null
  const { error: err } = await supabase.auth.updateUser({ password: password.value })
  busy.value = false
  if (err) return (error.value = friendlyError(err))
  router.replace('/account')
}
</script>

<template>
  <AuthShell title="Choose a new password">
    <NoticeBox v-if="ready && !user" tone="warning">
      This reset link is invalid or has expired. <RouterLink to="/forgot-password" class="font-semibold underline">Request a new link</RouterLink>.
    </NoticeBox>
    <form v-else class="space-y-4" @submit.prevent="submit">
      <div>
        <label for="pw" class="field-label">New password</label>
        <input id="pw" v-model="password" type="password" autocomplete="new-password" class="input" />
      </div>
      <div>
        <label for="pw2" class="field-label">Confirm new password</label>
        <input id="pw2" v-model="confirm" type="password" autocomplete="new-password" class="input" />
        <p class="field-hint">{{ problem ?? 'Looks good.' }}</p>
      </div>
      <NoticeBox v-if="error" tone="error">{{ error }}</NoticeBox>
      <button type="submit" class="btn-dark w-full" :disabled="busy || !!problem">{{ busy ? 'Saving…' : 'Save password' }}</button>
    </form>
  </AuthShell>
</template>
