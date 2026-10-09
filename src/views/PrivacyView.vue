<script setup lang="ts">
import PageHero from '@/components/PageHero.vue'
import NoticeBox from '@/components/NoticeBox.vue'
import { useSettings } from '@/composables/useSettings'
import { usePageMeta } from '@/composables/usePageMeta'

const { settings } = useSettings()
usePageMeta({ title: 'Privacy notice', description: 'How membership application and member information is collected, used and protected.' })
</script>

<template>
  <div>
    <PageHero eyebrow="Privacy" title="Privacy notice" :lead="`Version ${settings.privacy_notice_version}`" />
    <div class="container-page mt-12 max-w-3xl">
      <NoticeBox v-if="settings.privacy_notice_version.includes('draft')" tone="warning" title="Draft notice">
        This notice describes how this website handles personal information. It is a draft awaiting review and approval by
        {{ settings.short_name }} leadership.
      </NoticeBox>

      <div class="prose-kafmaf mt-8 space-y-8">
        <section>
          <h2 class="display text-3xl text-ink">Who is responsible</h2>
          <p>
            {{ settings.full_name }} ({{ settings.short_name }}) is responsible for the personal information collected through this
            website. Contact details are on the <RouterLink to="/contact" class="font-semibold text-brand underline">contact page</RouterLink>.
          </p>
        </section>

        <section>
          <h2 class="display text-3xl text-ink">What we collect</h2>
          <ul class="list-disc space-y-1 pl-5">
            <li>Account: your email address and a password (stored only as a secure hash by our authentication provider).</li>
            <li>Application: full name, passport photograph, preferred discipline(s) and, optionally, a phone number.</li>
            <li>Confirmations you make: that you meet the published eligibility criteria, that you are 18 or older, and that you accept this notice<template v-if="settings.faith_attestation_enabled"> and the membership statement shown on the form</template>.</li>
            <li>Membership record (if approved): membership number, approved name, photograph, disciplines, status, issue and expiry dates.</li>
            <li>Requests you send from your account (for example a correction or renewal request).</li>
          </ul>
          <p>We do not ask for your date of birth, home address, identity documents or religious history.</p>
        </section>

        <section>
          <h2 class="display text-3xl text-ink">Why we use it</h2>
          <p>
            To review membership applications, keep membership records, produce your membership card and let others confirm that a card
            is genuine and current. We do not sell your information or use it for advertising.
          </p>
        </section>

        <section>
          <h2 class="display text-3xl text-ink">Who can see it</h2>
          <ul class="list-disc space-y-1 pl-5">
            <li>You can see your own application and membership record.</li>
            <li>Authorised {{ settings.short_name }} administrators can see applications and membership records. Their actions are logged.</li>
            <li>
              Anyone who scans your card's QR code sees only: membership number, approved display name, current status, issue date and
              expiry date. Your email, phone number and photograph are not shown on the verification page.
            </li>
            <li>
              Service providers that host the website and database process data on our behalf (currently Vercel for website hosting and
              Supabase for the database, sign-in and file storage).
            </li>
          </ul>
        </section>

        <section>
          <h2 class="display text-3xl text-ink">How long we keep it</h2>
          <p>
            We keep information only for as long as it is needed for membership administration. Retention periods for rejected or
            withdrawn applications and for past members are set by {{ settings.short_name }} leadership; you can ask for your
            information to be deleted at any time, subject to any legal obligation to keep it.
          </p>
        </section>

        <section>
          <h2 class="display text-3xl text-ink">Your rights</h2>
          <p>
            Under the Nigeria Data Protection Act 2023 you may ask to access, correct or delete your personal information, or object to
            its use. Signed-in members can send a correction request from their account; otherwise use the contact details published on
            this website.
          </p>
        </section>

        <section>
          <h2 class="display text-3xl text-ink">Security</h2>
          <p>
            Passport photographs are stored in private storage and are never publicly listed. Access to records is restricted by
            database-level security rules, and administrative changes are recorded in an audit log. Photographs are re-encoded on
            upload, which removes hidden metadata such as location.
          </p>
        </section>
      </div>
    </div>
  </div>
</template>
