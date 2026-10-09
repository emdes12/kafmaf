# KAFMAF — website & digital membership platform

Public website, online membership applications, an administrator dashboard, digital membership ID
cards (PDF/PNG with QR verification) and a Hijri calendar for **KAFMAF** (Kick and Fist Martial Art
Foundation), Nigeria.

- **Frontend:** Vue 3 (Composition API, `<script setup>`), Vite, TypeScript, Tailwind CSS 4, vue-router, @unhead/vue
- **Backend:** Supabase — PostgreSQL with Row Level Security, Auth (email + password), private Storage
- **Cards:** html-to-image + jsPDF + qrcode, generated in the browser
- **Hijri:** built-in `Intl` Islamic calendars (no paid API) — see [docs/HIJRI_CALENDAR.md](docs/HIJRI_CALENDAR.md)
- **Hosting:** any static host (Vercel config included); no server code, no paid services

Read first: [docs/EVIDENCE_REGISTER.md](docs/EVIDENCE_REGISTER.md) — what is verified, what needs leadership approval.

---

## 1. Local development

```bash
npm install
cp .env.example .env.local      # fill in the values (section 3)
npm run dev                     # http://localhost:5173
```

Without Supabase variables the public site, Hijri calendar and card design preview still work;
sign-in, applications and verification show a "service not connected" notice.

## 2. Tests

```bash
npm test            # unit (Hijri, QR) + database (migrations, RLS, workflows on in-process Postgres)
npm run test:e2e    # full workflow against a real Supabase project (needs E2E_* variables, see file header)
npm run build       # type-check + production build
```

`tests/db` runs the real migrations in PGlite (PostgreSQL compiled to WebAssembly) with a small
shim of Supabase's `auth`/`storage` schemas, and exercises them as the `anon` and `authenticated`
roles. `tests/e2e/supabase.e2e.test.ts` covers Auth, Storage and PostgREST and is skipped unless
`E2E_SUPABASE_URL`, `E2E_SUPABASE_ANON_KEY` and `E2E_SUPABASE_SERVICE_ROLE_KEY` are set. Never run
it against production.

## 3. Environment variables

| Variable | Where | Value |
|---|---|---|
| `VITE_SUPABASE_URL` | `.env.local`, Vercel | Supabase → Project Settings → API → Project URL |
| `VITE_SUPABASE_ANON_KEY` | `.env.local`, Vercel | the **anon / publishable** key (safe in browsers) |
| `VITE_PUBLIC_SITE_URL` | `.env.local`, Vercel | canonical site URL without trailing slash, e.g. `https://kafmaf.vercel.app` — used in QR codes, so set it **before** issuing cards |

Only `VITE_*` variables reach the browser. **Never** put the service-role key, database password or
JWT secret in this project or in Vercel.

## 4. Supabase setup (free plan)

1. Create a project at supabase.com (choose a region close to Nigeria, e.g. EU West / Frankfurt).
2. Apply the migrations **in order**. Either:
   - **SQL editor:** paste and run each file in `supabase/migrations/` (0100 → 0200 → 0300), or
   - **CLI:**
     ```bash
     npx supabase init          # once; keeps the existing migrations folder
     npx supabase link --project-ref <your-ref>
     npx supabase db push
     ```
3. **Authentication → URL configuration:** Site URL = `VITE_PUBLIC_SITE_URL`; add redirect URLs
   `<site>/account` and `<site>/reset-password`.
4. **Authentication → Providers → Email:** keep "Confirm email" **on**. Recommended: minimum password
   length 10; enable leaked-password protection if available; optionally enable CAPTCHA (Cloudflare
   Turnstile is free) for sign-up/sign-in abuse protection.
5. Storage buckets (`member-photos` private, 2 MB, JPEG/PNG/WebP; `site-assets` public) are created by
   migration 0300.
6. The free plan's default email sender is rate-limited; for real use configure custom SMTP
   (Authentication → Emails → SMTP), e.g. a free tier of a transactional email provider.

### First administrator (no default password exists)

1. The authorised person signs up on the website and confirms their email.
2. The Supabase project owner runs, in the **SQL editor**:
   ```sql
   select public.bootstrap_first_admin('their-email@example.com');
   ```
   This works only once (it refuses if any administrator exists) and cannot be called from the website.
3. Further administrators are added by an existing admin in **Admin → Administrators**.

### Before opening applications (Admin → Settings & content)

Confirm the name, add approved contact details, eligibility criteria and terms, approve the validity
period (memberships cannot be issued until "validity approved" is ticked), choose the card style, upload the
original logo, review the privacy notice, then tick "Online applications open".
**Admin → Overview** shows a checklist of outstanding approvals.

## 5. Deploying to Vercel

1. Push this folder to a GitHub repository.
2. vercel.com → Add New → Project → import the repository. Framework preset: **Vite** (build
   `npm run build`, output `dist` — also set in `vercel.json`).
3. Add the three `VITE_*` environment variables (Production and Preview).
4. Deploy. Use the `*.vercel.app` URL as `VITE_PUBLIC_SITE_URL` (redeploy after setting it) and in
   Supabase's Site URL.

CLI alternative: `npm i -g vercel`, then `vercel` (preview) and `vercel --prod`.

`vercel.json` adds SPA rewrites and security headers (CSP restricted to self + `*.supabase.co`,
`X-Frame-Options: DENY`, `Referrer-Policy: no-referrer` so verification tokens are never leaked,
HSTS). `robots.txt` and `sitemap.xml` are generated at build time from `VITE_PUBLIC_SITE_URL`.

### Free-tier terms — check before production

- **Vercel Hobby is for "non-commercial, personal use only"** (Vercel fair-use guidelines). An NGO
  site may not qualify — confirm with Vercel or use a host whose free tier allows organisational use
  (e.g. Cloudflare Pages or Netlify — this is a static site, so it deploys anywhere: build command
  `npm run build`, output `dist`, and add an SPA fallback to `index.html`).
- **Supabase Free:** 500 MB database, 1 GB storage, 50,000 monthly active users, max 2 active
  projects, **projects pause after 1 week of inactivity**, and **no automatic backups**. Take
  regular backups (`npx supabase db dump -f backup.sql` plus a copy of the storage bucket) or upgrade.
- Free hosting is not guaranteed to be permanent or unlimited.

## 6. Security model (summary)

- RLS enabled on every table; anonymous users can read only public settings and Islamic-occasion
  records, and call `verify_membership(token)`, which returns 7 non-sensitive fields.
- Members can read only their own application, membership, photo and requests.
- Clients have **no** INSERT/UPDATE/DELETE on applications, members or audit logs. All changes go
  through `SECURITY DEFINER` functions that check the caller's role in `profiles`, validate input,
  lock rows (no double approval), compute dates server-side in `Africa/Lagos`, and write an audit entry.
- Role, status, membership number, issue/expiry dates are never accepted from the client.
- Verification tokens: 64 hex characters (244 random bits), unique; can be rotated on reissue.
- Applicants must confirm their email; 3 applications/24 h per account; duplicate phone numbers
  are blocked without revealing whose record matched; open requests are capped.
- Photos: private bucket, type and size limits enforced by Storage, random file names, re-encoded in
  the browser (metadata stripped).
- Auth uses bearer tokens (not cookies), so CSRF does not apply; CSP blocks third-party scripts.
- Minors: online applications require an 18+ confirmation until KAFMAF approves a safeguarding and consent process.

## 7. Expiry rule

`expiry_date` is the **last valid day (inclusive)**: issue + N months − 1 day (9 Oct 2026 + 12 months
→ 8 Oct 2027). If the anniversary does not exist (issued 29 Feb), the end of that month is the last
valid day (→ 28 Feb). Renewal starts the day after the current expiry, or today if already expired.
Reissuing a card never changes the dates.

## 8. Project structure

```
src/
  lib/hijri/         Hijri provider, occasions, month grid (framework-free, unit-tested)
  lib/card/          card types, render/export (PNG/PDF), guilloche pattern
  components/card/   Heritage + Signature card templates, scaler, download panel
  views/             public pages, auth, account, admin
supabase/migrations/ schema, RLS, workflow functions, storage policies
tests/unit|db|e2e    tests
docs/                evidence register, Hijri method, ID card spec
```

## 9. Maintenance

- Keep the Supabase project active (or upgrade) to avoid pausing; back up regularly.
- Islamic occasions: record each announcement in **Admin → Islamic occasions** with its source.
- Review the audit log periodically.
- `npm outdated` / `npm audit` before redeploying.
