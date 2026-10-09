<script setup lang="ts">
import { computed } from 'vue'
import HijriTodayCard from '@/components/hijri/HijriTodayCard.vue'
import HeroShowcase from '@/components/home/HeroShowcase.vue'
import DisciplineGlyph from '@/components/home/DisciplineGlyph.vue'
import FaqList from '@/components/home/FaqList.vue'
import HeritageCardBack from '@/components/card/HeritageCardBack.vue'
import CardScaler from '@/components/card/CardScaler.vue'
import { useSettings } from '@/composables/useSettings'
import { useAuth } from '@/composables/useAuth'
import { usePageMeta } from '@/composables/usePageMeta'
import { DISCIPLINE_INFO } from '@/lib/content'
import { siteUrl } from '@/lib/supabase'
import { SAMPLE_CARD, brandingFromSettings } from '@/lib/card/types'

const { settings, heroUrl, uploadedLogoUrl } = useSettings()
const { user } = useAuth()

usePageMeta({
  title: '',
  description: computed(
    () => `${settings.value.short_name} — ${settings.value.full_name}, Nigeria. Karate, Boxing and Taekwondo. Membership applications, digital member ID cards with live verification, and the Hijri calendar.`,
  ),
})

const disciplines = computed(() => settings.value.disciplines.map((d) => DISCIPLINE_INFO[d]))
const aboutExcerpt = computed(() => settings.value.about_text?.split(/\n\s*\n/)[0] ?? null)
const backBranding = computed(() =>
  brandingFromSettings(settings.value, uploadedLogoUrl.value, new URL(siteUrl() || 'https://example.invalid').host, 'heritage'),
)

const pillars = [
  { title: 'Three disciplines', text: 'Karate, Boxing and Taekwondo under one membership.' },
  { title: 'Online application', text: 'Apply from your phone in minutes, with your passport photograph.' },
  { title: 'Digital member ID', text: 'A print-quality card, front and back, ready to download.' },
  { title: 'Live verification', text: 'Every card carries a QR code linked to the current membership record.' },
]

const steps = [
  { n: '01', title: 'Create an account', text: 'Sign up with your email address and confirm it from the message we send you.' },
  { n: '02', title: 'Apply online', text: 'Add your passport photograph and preferred discipline. You receive an application reference.' },
  { n: '03', title: 'Review', text: 'Authorised administrators review every application. Submitting is not the same as approval.' },
  { n: '04', title: 'Receive your card', text: 'Approved members get an official membership number and a downloadable ID card.' },
]

const cardPoints = [
  { title: 'From approved records', text: 'Every detail on the card comes from the membership record — nothing can be typed in or altered.' },
  { title: 'Unique number', text: 'Your membership number is assigned once, by the system, at the moment of approval.' },
  { title: 'Clear validity dates', text: 'Issue and expiry dates are calculated on the server and printed prominently.' },
  { title: 'Live QR check', text: 'Scanning shows whether the membership is active, expired, suspended or revoked — today, not when it was printed.' },
]

const faq = computed(() => [
  {
    q: 'Does applying make me a member?',
    a: 'No. Every application is reviewed by authorised administrators. You become a member — and receive a membership number and card — only when your application is approved. You can follow the status in your account.',
  },
  {
    q: 'How do I get my membership card?',
    a: 'Once approved, sign in to your account and download your card as a print-ready PDF (card size, or an A4 sheet with crop marks) or as images. The card is always generated from your current approved record.',
  },
  {
    q: 'How can someone check a card is genuine?',
    a: `Scan the QR code on the back of the card. It opens a verification page on the ${settings.value.short_name} website showing the membership number, name, status and validity dates from the live records. A suspended, revoked or expired membership never shows as valid, even if the printed date has not passed.`,
  },
  {
    q: 'What if my card is lost or my details change?',
    a: 'Send a correction request from your account. Administrators can update your record and reissue the card; if needed they can issue a new QR code so the old card stops verifying.',
  },
  {
    q: 'Who can see my personal information?',
    a: 'Only you and authorised administrators. The public verification page never shows your email, phone number or photograph. See the privacy notice for details.',
  },
  {
    q: 'How are the Islamic dates worked out?',
    a: 'Everyday Hijri dates are calculated. Moon-sighting-dependent occasions — the start of Ramadan and the two Eids — are marked as expected until an administrator records the official announcement for Nigeria, after which they are shown as confirmed.',
  },
])
</script>

<template>
  <div>
    <!-- ============ HERO ============ -->
    <section class="relative isolate overflow-hidden bg-ink text-paper">
      <img
        v-if="heroUrl"
        :src="heroUrl"
        :alt="settings.hero_image_alt ?? ''"
        class="absolute inset-0 -z-10 h-full w-full object-cover opacity-25"
        fetchpriority="high"
      />
      <div class="pattern-motion absolute inset-0 -z-10" aria-hidden="true" />
      <div class="absolute -top-40 -left-40 -z-10 h-[520px] w-[520px] rounded-full bg-brand/30 blur-3xl" aria-hidden="true" />
      <svg class="absolute bottom-0 left-0 -z-10 h-24 w-full" viewBox="0 0 1440 96" preserveAspectRatio="none" aria-hidden="true">
        <polygon points="0,96 1440,36 1440,96" fill="var(--color-brand)" opacity=".4" />
        <polygon points="0,92 1440,62 1440,70 0,100" fill="var(--color-gold)" />
      </svg>

      <div class="container-page grid items-center gap-12 pt-14 pb-32 sm:pt-20 lg:grid-cols-[1.05fr_1fr] lg:pt-24 lg:pb-40">
        <div>
          <p v-reveal class="eyebrow !text-gold">{{ settings.full_name }} · Nigeria</p>
          <h1 v-reveal="80" class="display mt-5 text-[clamp(4.2rem,13vw,9.5rem)] text-white">{{ settings.short_name }}</h1>
          <p v-reveal="140" class="mt-3 font-display text-xl font-semibold tracking-[0.12em] text-paper/85 uppercase sm:text-3xl sm:tracking-[0.18em]">
            <template v-for="(d, i) in disciplines" :key="d.id">
              <span v-if="i" class="mx-2 text-gold" aria-hidden="true">/</span>{{ d.name }}
            </template>
          </p>
          <p v-reveal="200" class="mt-7 max-w-xl text-lg leading-8 text-paper/75">
            {{ settings.tagline ?? 'Join online, carry a verifiable digital membership card, and follow the Hijri calendar — all in one place.' }}
          </p>
          <div v-reveal="260" class="mt-10 flex flex-wrap gap-3">
            <RouterLink to="/membership" class="btn-accent px-7 py-3.5 text-base">Apply for membership</RouterLink>
            <RouterLink :to="user ? '/account' : '/login'" class="btn-ghost-light px-7 py-3.5 text-base">
              {{ user ? 'Go to my account' : 'Member login' }}
            </RouterLink>
          </div>
        </div>
        <div v-reveal="200" class="px-2 sm:px-10 lg:px-0">
          <HeroShowcase />
        </div>
      </div>
    </section>

    <!-- ============ PILLARS ============ -->
    <section class="relative z-10 -mt-16">
      <div class="container-page">
        <ul class="grid overflow-hidden rounded-2xl border border-line bg-white shadow-[0_30px_60px_-40px_rgba(6,42,16,.45)] sm:grid-cols-2 lg:grid-cols-4">
          <li
            v-for="(p, i) in pillars"
            :key="p.title"
            v-reveal="i * 80"
            class="border-line p-6 sm:p-7 [&:not(:last-child)]:border-b sm:[&:nth-child(odd)]:border-r lg:border-b-0 lg:[&:not(:last-child)]:border-r"
          >
            <span class="block h-1 w-10 rounded-full" :class="['bg-brand', 'bg-gold', 'bg-crimson', 'bg-ink'][i]" aria-hidden="true" />
            <h2 class="mt-4 font-display text-xl font-bold tracking-wide uppercase">{{ p.title }}</h2>
            <p class="mt-1.5 text-sm leading-6 text-muted">{{ p.text }}</p>
          </li>
        </ul>
      </div>
    </section>

    <!-- ============ HIJRI ============ -->
    <section v-reveal class="container-page mt-20">
      <HijriTodayCard />
    </section>

    <!-- ============ DISCIPLINES ============ -->
    <section class="container-page mt-28" aria-labelledby="disciplines-heading">
      <div class="grid items-end gap-6 lg:grid-cols-[1fr_auto]">
        <div v-reveal>
          <p class="eyebrow">The disciplines</p>
          <h2 id="disciplines-heading" class="display mt-3 text-5xl sm:text-6xl">Kick. Strike. Discipline.</h2>
        </div>
        <RouterLink v-reveal to="/martial-arts" class="btn-outline justify-self-start">Explore the disciplines</RouterLink>
      </div>

      <div class="mt-12 grid gap-5 lg:grid-cols-3">
        <article
          v-for="(d, i) in disciplines"
          :key="d.id"
          v-reveal="i * 100"
          class="group relative flex min-h-[440px] flex-col overflow-hidden rounded-2xl bg-ink p-8 text-paper transition-transform duration-500 hover:-translate-y-1"
        >
          <div class="pattern-motion absolute inset-0" aria-hidden="true" />
          <div
            class="absolute -right-8 -bottom-8 h-52 w-52 opacity-30 transition duration-700 group-hover:scale-110 group-hover:opacity-45"
            :class="['text-gold/80', 'text-[#2fa33a]', 'text-crimson'][i % 3]"
          >
            <DisciplineGlyph :discipline="d.id" />
          </div>
          <span class="relative font-display text-sm font-semibold tracking-[0.2em] text-gold uppercase">0{{ i + 1 }} — {{ d.origin }}</span>
          <h3 class="display relative mt-4 text-6xl">{{ d.name }}</h3>
          <p class="relative mt-5 max-w-[32ch] text-sm leading-6 text-paper/75">{{ d.summary }}</p>
          <ul class="relative mt-auto space-y-1.5 pt-8 text-xs font-semibold tracking-wide text-paper/80 uppercase">
            <li v-for="f in d.focus" :key="f" class="flex items-center gap-2">
              <span class="h-1.5 w-1.5 rounded-full bg-gold" aria-hidden="true" />{{ f.split(' — ')[0] }}
            </li>
          </ul>
        </article>
      </div>
      <p class="mt-4 text-xs text-muted">Discipline descriptions are general information about each sport, not a description of a specific syllabus.</p>
    </section>

    <!-- ============ ABOUT (approved content only) ============ -->
    <section v-if="aboutExcerpt" v-reveal class="container-page mt-28 grid gap-10 lg:grid-cols-[1fr_1.4fr]">
      <div>
        <p class="eyebrow">About</p>
        <h2 class="display mt-3 text-5xl">{{ settings.short_name }}</h2>
      </div>
      <div>
        <p class="text-xl leading-9 text-ink-3">{{ aboutExcerpt }}</p>
        <RouterLink to="/about" class="mt-6 inline-block text-sm font-semibold text-brand hover:underline">Read more →</RouterLink>
      </div>
    </section>

    <!-- ============ DIGITAL ID ============ -->
    <section class="relative mt-28 overflow-hidden bg-ink py-24 text-paper" aria-labelledby="card-heading">
      <div class="pattern-geometric absolute inset-0 opacity-60" aria-hidden="true" />
      <div class="absolute inset-y-0 right-0 w-1/2 bg-gradient-to-l from-brand/40 to-transparent" aria-hidden="true" />
      <div class="container-page relative grid items-center gap-14 lg:grid-cols-2">
        <div>
          <p v-reveal class="eyebrow !text-gold">Digital membership</p>
          <h2 id="card-heading" v-reveal class="display mt-3 text-5xl sm:text-6xl">Your membership,<br />in your pocket.</h2>
          <p v-reveal class="mt-5 max-w-lg text-base leading-7 text-paper/75">
            Approved members download a professional, two-sided ID card in standard bank-card size — ready to print or keep on a phone.
          </p>
          <dl class="mt-10 grid gap-x-8 gap-y-7 sm:grid-cols-2">
            <div v-for="(c, i) in cardPoints" :key="c.title" v-reveal="i * 80">
              <dt class="flex items-center gap-2 font-display text-lg font-bold tracking-wide uppercase">
                <svg viewBox="0 0 20 20" class="h-5 w-5 shrink-0 text-gold" fill="currentColor" aria-hidden="true">
                  <path d="M8 13.6 4.4 10l-1.4 1.4L8 16.4l9-9L15.6 6z" />
                </svg>
                {{ c.title }}
              </dt>
              <dd class="mt-1.5 text-sm leading-6 text-paper/65">{{ c.text }}</dd>
            </div>
          </dl>
        </div>
        <div v-reveal="150" class="relative mx-auto w-full max-w-[520px]" aria-hidden="true">
          <div class="rotate-[4deg]">
            <CardScaler><HeritageCardBack :data="SAMPLE_CARD" :branding="backBranding" /></CardScaler>
          </div>
          <p class="mt-6 text-center text-xs text-paper/50">Card back shown with sample data.</p>
        </div>
      </div>
    </section>

    <!-- ============ PROCESS ============ -->
    <section class="container-page mt-28" aria-labelledby="process-heading">
      <div v-reveal class="max-w-2xl">
        <p class="eyebrow">Membership</p>
        <h2 id="process-heading" class="display mt-3 text-5xl sm:text-6xl">Four steps to join</h2>
      </div>
      <div class="relative mt-14">
        <div class="absolute top-6 right-[12%] left-[6%] hidden h-px bg-gradient-to-r from-brand via-gold to-crimson lg:block" aria-hidden="true" />
        <ol class="relative grid gap-10 md:grid-cols-2 lg:grid-cols-4 lg:gap-6">
          <li v-for="(s, i) in steps" :key="s.n" v-reveal="i * 90">
            <span class="flex h-12 w-12 items-center justify-center rounded-full bg-brand font-display text-lg font-bold text-white ring-8 ring-paper">
              {{ s.n }}
            </span>
            <h3 class="mt-5 font-display text-2xl font-bold uppercase">{{ s.title }}</h3>
            <p class="mt-2 text-sm leading-6 text-muted">{{ s.text }}</p>
          </li>
        </ol>
      </div>
      <div v-reveal class="mt-12 flex flex-wrap gap-3">
        <RouterLink to="/membership" class="btn-primary">Membership details</RouterLink>
        <RouterLink v-if="!user" to="/signup" class="btn-outline">Create an account</RouterLink>
      </div>
    </section>

    <!-- ============ FAQ ============ -->
    <section class="container-page mt-28 grid gap-10 lg:grid-cols-[1fr_1.6fr]" aria-labelledby="faq-heading">
      <div v-reveal>
        <p class="eyebrow">Questions</p>
        <h2 id="faq-heading" class="display mt-3 text-5xl">Good to know</h2>
        <p class="mt-4 max-w-sm text-sm leading-6 text-muted">Answers about applying, membership cards, verification and privacy.</p>
      </div>
      <div v-reveal="100">
        <FaqList :items="faq" />
      </div>
    </section>

    <!-- ============ CTA ============ -->
    <section v-reveal class="container-page mt-28">
      <div class="relative overflow-hidden rounded-3xl bg-brand px-8 py-14 text-white sm:px-14 sm:py-16">
        <svg class="absolute inset-y-0 right-0 hidden h-full w-auto sm:block" viewBox="0 0 300 300" preserveAspectRatio="xMaxYMid slice" aria-hidden="true">
          <path d="M150 300 L230 0 H262 L182 300 Z" fill="var(--color-gold)" />
          <path d="M200 300 L280 0 H292 L212 300 Z" fill="var(--color-crimson)" />
        </svg>
        <div class="relative max-w-2xl">
          <h2 class="display text-5xl sm:text-6xl">Ready to join {{ settings.short_name }}?</h2>
          <p class="mt-4 text-lg leading-8 text-white/85">
            {{ settings.applications_open ? 'Applications are open. Create your account and apply today.' : 'Create your account now — you can apply as soon as applications open.' }}
          </p>
          <div class="mt-8 flex flex-wrap gap-3">
            <RouterLink :to="user ? '/apply' : '/signup'" class="btn-accent px-7 py-3.5 text-base">
              {{ user ? 'Start my application' : 'Create an account' }}
            </RouterLink>
            <RouterLink to="/membership" class="btn-ghost-light px-7 py-3.5 text-base">Learn more</RouterLink>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>
