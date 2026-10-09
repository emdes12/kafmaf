<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { supabase } from '@/lib/supabase'
import { formatLong, formatTimestamp } from '@/lib/dates'
import type { VerificationResult } from '@/lib/types'
import { useSettings } from '@/composables/useSettings'
import { usePageMeta } from '@/composables/usePageMeta'

usePageMeta({ title: 'Verify membership card', noindex: true })

const route = useRoute()
const { settings } = useSettings()
const state = ref<'loading' | 'found' | 'not-found' | 'invalid' | 'error' | 'unconfigured'>('loading')
const result = ref<VerificationResult | null>(null)
const checkedAt = ref<string | null>(null)

const token = computed(() => String(route.params.token ?? ''))

async function check() {
  if (!supabase) return (state.value = 'unconfigured')
  if (!/^[0-9a-f]{64}$/.test(token.value)) return (state.value = 'invalid')
  state.value = 'loading'
  const { data, error } = await supabase.rpc('verify_membership', { p_token: token.value })
  checkedAt.value = new Date().toISOString()
  if (error) return (state.value = 'error')
  const row = (data as VerificationResult[] | null)?.[0]
  if (!row) return (state.value = 'not-found')
  result.value = row
  state.value = 'found'
}
onMounted(check)

const valid = computed(() => result.value?.status === 'active')
const statusText: Record<string, string> = {
  active: 'Active membership',
  expired: 'Membership expired',
  suspended: 'Membership suspended',
  revoked: 'Membership revoked',
}
</script>

<template>
  <div class="container-page max-w-2xl py-12 sm:py-16">
    <p class="eyebrow">{{ settings.short_name }} card verification</p>
    <h1 class="display mt-2 text-4xl sm:text-5xl">Membership check</h1>

    <div class="mt-8">
      <div v-if="state === 'loading'" class="card animate-pulse p-8 text-sm text-muted" role="status">Checking membership records…</div>

      <div v-else-if="state === 'found' && result" class="card overflow-hidden" role="status" aria-live="polite">
        <div class="flex items-center gap-4 p-6 sm:p-8" :class="valid ? 'bg-moss text-white' : 'bg-crimson text-white'">
          <svg v-if="valid" viewBox="0 0 48 48" class="h-14 w-14 shrink-0" aria-hidden="true">
            <circle cx="24" cy="24" r="22" fill="none" stroke="currentColor" stroke-width="3" />
            <path d="M14 25l7 7 13-15" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
          <svg v-else viewBox="0 0 48 48" class="h-14 w-14 shrink-0" aria-hidden="true">
            <circle cx="24" cy="24" r="22" fill="none" stroke="currentColor" stroke-width="3" />
            <path d="M16 16l16 16M32 16L16 32" stroke="currentColor" stroke-width="4" stroke-linecap="round" />
          </svg>
          <div>
            <p class="text-xs font-bold tracking-[0.16em] uppercase opacity-80">{{ valid ? 'Valid' : 'Not valid' }}</p>
            <p class="display text-3xl sm:text-4xl">{{ statusText[result.status] ?? result.status }}</p>
          </div>
        </div>
        <dl class="grid gap-5 p-6 sm:grid-cols-2 sm:p-8">
          <div class="sm:col-span-2">
            <dt class="text-xs font-semibold tracking-[0.12em] text-muted uppercase">Name</dt>
            <dd class="mt-1 font-display text-3xl font-bold uppercase">{{ result.display_name }}</dd>
          </div>
          <div>
            <dt class="text-xs font-semibold tracking-[0.12em] text-muted uppercase">Membership number</dt>
            <dd class="mt-1 font-mono text-lg font-semibold">{{ result.membership_number }}</dd>
          </div>
          <div>
            <dt class="text-xs font-semibold tracking-[0.12em] text-muted uppercase">Card version</dt>
            <dd class="mt-1 text-lg font-semibold">v{{ result.card_version }}</dd>
          </div>
          <div>
            <dt class="text-xs font-semibold tracking-[0.12em] text-muted uppercase">Issued</dt>
            <dd class="mt-1 font-semibold">{{ formatLong(result.issue_date) }}</dd>
          </div>
          <div>
            <dt class="text-xs font-semibold tracking-[0.12em] uppercase" :class="result.status === 'expired' ? 'text-crimson' : 'text-muted'">
              Valid until (inclusive)
            </dt>
            <dd class="mt-1 font-semibold">{{ formatLong(result.expiry_date) }}</dd>
          </div>
        </dl>
        <p class="border-t border-line px-6 py-4 text-xs leading-5 text-muted sm:px-8">
          Checked against live membership records on {{ checkedAt ? formatTimestamp(checkedAt) : '' }} (Africa/Lagos).
          <template v-if="valid">The card is valid only if the name and number above match the printed card.</template>
          <template v-else>This card must not be accepted as proof of current membership.</template>
        </p>
      </div>

      <div v-else-if="state === 'not-found' || state === 'invalid'" class="card border-crimson/40 p-6 sm:p-8" role="alert">
        <p class="display text-3xl text-crimson">No matching card</p>
        <p class="mt-3 text-sm leading-6 text-muted">
          This verification link does not match any current {{ settings.short_name }} card. The card may have been replaced by a newer
          version, or the link may be incomplete or altered. Do not accept the card as proof of membership.
        </p>
      </div>

      <div v-else-if="state === 'unconfigured'" class="card p-6 text-sm text-muted" role="alert">
        Verification is not available on this deployment because the membership service is not connected.
      </div>

      <div v-else class="card p-6 sm:p-8" role="alert">
        <p class="display text-3xl">Could not check right now</p>
        <p class="mt-3 text-sm leading-6 text-muted">
          The membership service could not be reached, so this card's status is <strong>unknown</strong>. Please try again in a moment.
        </p>
        <button type="button" class="btn-dark mt-5" @click="check">Try again</button>
      </div>
    </div>
  </div>
</template>
