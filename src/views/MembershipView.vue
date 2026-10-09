<script setup lang="ts">
import { computed } from 'vue'
import PageHero from '@/components/PageHero.vue'
import BackendNotice from '@/components/BackendNotice.vue'
import { useSettings } from '@/composables/useSettings'
import { useAuth } from '@/composables/useAuth'
import { usePageMeta } from '@/composables/usePageMeta'

const { settings } = useSettings()
const { user } = useAuth()
usePageMeta({
  title: 'Membership',
  description: computed(() => `How to apply for ${settings.value.short_name} membership, how applications are reviewed, and how digital membership cards are verified.`),
})

const paragraphs = (t: string | null) => (t ? t.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean) : [])
const validityText = computed(() => {
  const m = settings.value.validity_months
  if (m % 12 === 0) return `${m / 12} year${m === 12 ? '' : 's'}`
  return `${m} month${m === 1 ? '' : 's'}`
})
</script>

<template>
  <div>
    <PageHero
      eyebrow="Membership"
      :title="`Join ${settings.short_name}`"
      lead="Applications are made online and reviewed by authorised administrators. Approved members receive a digital membership card with live QR verification."
    />

    <div class="container-page mt-12">
      <BackendNotice />
    </div>

    <div class="container-page mt-10 grid gap-12 lg:grid-cols-[1.5fr_1fr]">
      <div class="space-y-14">
        <section aria-labelledby="eligibility">
          <h2 id="eligibility" class="display text-4xl">Eligibility</h2>
          <div v-if="settings.eligibility_text" class="prose-kafmaf mt-5">
            <p v-for="(p, i) in paragraphs(settings.eligibility_text)" :key="i" class="whitespace-pre-line">{{ p }}</p>
          </div>
          <p v-else class="mt-5 rounded-lg border border-dashed border-line bg-white p-5 text-sm text-muted">
            Membership eligibility criteria will be published here once confirmed by {{ settings.short_name }} leadership.
          </p>
          <p class="mt-4 text-sm text-muted">
            Online applications are currently for adults (18 years or older) only.
          </p>
        </section>

        <section aria-labelledby="process">
          <h2 id="process" class="display text-4xl">Application process</h2>
          <ol class="mt-6 space-y-5">
            <li class="flex gap-4">
              <span class="font-display text-2xl font-bold text-brand">1</span>
              <div>
                <h3 class="font-semibold">Create an account and confirm your email</h3>
                <p class="mt-1 text-sm leading-6 text-muted">Your account keeps your application private and lets you download your card later.</p>
              </div>
            </li>
            <li class="flex gap-4">
              <span class="font-display text-2xl font-bold text-brand">2</span>
              <div>
                <h3 class="font-semibold">Complete the application</h3>
                <p class="mt-1 text-sm leading-6 text-muted">
                  Provide your full name, a clear passport photograph (head and shoulders, plain background) and your preferred
                  discipline(s). A phone number is optional. You will receive an application reference.
                </p>
              </div>
            </li>
            <li class="flex gap-4">
              <span class="font-display text-2xl font-bold text-brand">3</span>
              <div>
                <h3 class="font-semibold">Review and decision</h3>
                <p class="mt-1 text-sm leading-6 text-muted">
                  Authorised administrators review each application. Submitting an application does <strong>not</strong> make you a
                  member. You can follow the status in your account; if an application is not approved, the reason is shown there.
                </p>
              </div>
            </li>
            <li class="flex gap-4">
              <span class="font-display text-2xl font-bold text-brand">4</span>
              <div>
                <h3 class="font-semibold">Membership number and digital card</h3>
                <p class="mt-1 text-sm leading-6 text-muted">
                  On approval you receive an official membership number. You can download a print-quality ID card (front and back) from
                  your account at any time while your membership is active.
                </p>
              </div>
            </li>
          </ol>
        </section>

        <section aria-labelledby="validity">
          <h2 id="validity" class="display text-4xl">Validity &amp; renewal</h2>
          <div class="prose-kafmaf mt-5">
            <p v-if="settings.validity_approved">
              Membership is valid for <strong>{{ validityText }}</strong> from the date of issue. The expiry date printed on the card is
              the last day the membership is valid. Renewal is carried out by administrators; members can request renewal from their
              account.
            </p>
            <p v-else>The membership validity period and renewal policy will be published once approved by {{ settings.short_name }} leadership.</p>
            <p>
              A card is only valid while the membership record is active. Anyone can confirm a card's current status by scanning its QR
              code — a suspended, revoked or expired membership shows as not valid even if the printed date has not passed.
            </p>
          </div>
        </section>

        <section v-if="settings.membership_terms_text" aria-labelledby="terms">
          <h2 id="terms" class="display text-4xl">Membership terms</h2>
          <div class="prose-kafmaf mt-5">
            <p v-for="(p, i) in paragraphs(settings.membership_terms_text)" :key="i" class="whitespace-pre-line">{{ p }}</p>
          </div>
        </section>
      </div>

      <aside class="lg:sticky lg:top-24 lg:self-start">
        <div class="card overflow-hidden">
          <div class="bg-ink p-6 text-paper">
            <p class="eyebrow !text-gold">Apply</p>
            <p class="display mt-2 text-3xl">Membership application</p>
          </div>
          <div class="space-y-4 p-6 text-sm">
            <template v-if="settings.applications_open">
              <p class="leading-6 text-muted">Have your passport photograph ready. Applying takes about five minutes.</p>
              <RouterLink v-if="user" to="/apply" class="btn-primary w-full">Start application</RouterLink>
              <template v-else>
                <RouterLink to="/signup" class="btn-primary w-full">Create an account to apply</RouterLink>
                <RouterLink to="/login?redirect=/apply" class="btn-outline w-full">I already have an account</RouterLink>
              </template>
            </template>
            <template v-else>
              <p class="leading-6 text-muted">Online applications are not open at the moment. Please check back later.</p>
              <RouterLink v-if="!user" to="/login" class="btn-outline w-full">Member login</RouterLink>
            </template>
            <p class="border-t border-line pt-4 text-xs text-muted">
              Read the <RouterLink to="/privacy" class="font-semibold text-brand underline">privacy notice</RouterLink> to see how your
              information is used.
            </p>
          </div>
        </div>
      </aside>
    </div>
  </div>
</template>
