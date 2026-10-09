/**
 * End-to-end acceptance test against a REAL Supabase project (local `supabase start`
 * or a disposable cloud project) — exercises Auth, Storage, PostgREST, RLS and the
 * workflow functions exactly as the browser app does.
 *
 *   E2E_SUPABASE_URL=...  E2E_SUPABASE_ANON_KEY=...  E2E_SUPABASE_SERVICE_ROLE_KEY=...  npm run test:e2e
 *
 * The service-role key is used ONLY by this test runner to create confirmed test
 * users and promote a test admin. It must never be put in VITE_* variables.
 * Do not run against production: it creates and deletes test accounts and changes
 * organization_settings (applications_open, validity_approved).
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { PNG } from 'pngjs'

const URL_ = process.env.E2E_SUPABASE_URL
const ANON = process.env.E2E_SUPABASE_ANON_KEY
const SERVICE = process.env.E2E_SUPABASE_SERVICE_ROLE_KEY
const enabled = Boolean(URL_ && ANON && SERVICE)

const stamp = Date.now()
const password = `E2e-${stamp}-pass`
const emails = { admin: `e2e-admin-${stamp}@example.test`, alice: `e2e-alice-${stamp}@example.test`, bob: `e2e-bob-${stamp}@example.test` }

function client() {
  return createClient(URL_!, ANON!, { auth: { persistSession: false, autoRefreshToken: false } })
}

function testPhoto(): Buffer {
  const png = new PNG({ width: 300, height: 375 })
  png.data.fill(200)
  return PNG.sync.write(png)
}

describe.skipIf(!enabled)('Supabase end-to-end workflow', () => {
  let service: SupabaseClient
  const ids: Record<string, string> = {}
  const as: Record<string, SupabaseClient> = {}
  let memberId = ''
  let token = ''

  beforeAll(async () => {
    service = createClient(URL_!, SERVICE!, { auth: { persistSession: false } })
    for (const [k, email] of Object.entries(emails)) {
      const { data, error } = await service.auth.admin.createUser({ email, password, email_confirm: true })
      if (error) throw error
      ids[k] = data.user.id
      as[k] = client()
      const { error: e2 } = await as[k].auth.signInWithPassword({ email, password })
      if (e2) throw e2
    }
    const { error } = await service.from('profiles').update({ role: 'admin' }).eq('id', ids.admin)
    if (error) throw error
    await as.admin.from('organization_settings').update({ applications_open: true, validity_approved: true, validity_months: 12 }).eq('id', 1)
  })

  afterAll(async () => {
    if (!service) return
    await service.from('members').delete().in('user_id', Object.values(ids))
    for (const id of Object.values(ids)) await service.auth.admin.deleteUser(id)
  })

  it('applicant uploads a photo and submits an application (pending)', async () => {
    const path = `applications/${ids.alice}/photo_e2e${stamp}.png`
    const up = await as.alice.storage.from('member-photos').upload(path, testPhoto(), { contentType: 'image/png' })
    expect(up.error).toBeNull()
    const { data, error } = await as.alice.rpc('submit_application', {
      p_full_name: 'Sample Applicant',
      p_phone: null,
      p_disciplines: ['karate'],
      p_photo_path: path,
      p_training_location: null,
      p_eligibility_confirmed: true,
      p_adult_confirmed: true,
      p_faith_attested: null,
      p_privacy_notice_version: '2026-10-draft-1',
      p_terms_accepted: true,
    })
    expect(error).toBeNull()
    expect(data[0].status).toBe('pending')
  })

  it('rejects uploads into another user folder and non-image types', async () => {
    const other = await as.alice.storage.from('member-photos').upload(`applications/${ids.bob}/photo_x${stamp}.png`, testPhoto(), { contentType: 'image/png' })
    expect(other.error).not.toBeNull()
    const txt = await as.alice.storage.from('member-photos').upload(`applications/${ids.alice}/photo_t${stamp}.png`, Buffer.from('hello'), { contentType: 'text/plain' })
    expect(txt.error).not.toBeNull()
  })

  it('pending applicant has no membership; others cannot read the application', async () => {
    expect((await as.alice.from('members').select('*')).data).toEqual([])
    expect((await as.bob.from('membership_applications').select('*')).data).toEqual([])
    expect((await client().from('membership_applications').select('*')).data ?? []).toEqual([])
  })

  it('non-admins cannot approve; admin approval issues exactly one membership', async () => {
    const { data: app } = await as.admin.from('membership_applications').select('id').eq('user_id', ids.alice).single()
    expect((await as.bob.rpc('approve_application', { p_application_id: app!.id })).error).not.toBeNull()
    const { data, error } = await as.admin.rpc('approve_application', { p_application_id: app!.id })
    expect(error).toBeNull()
    memberId = data.id
    token = data.verification_token
    expect(data.membership_number).toMatch(/^KAFMAF-\d{4}-\d{5}$/)
    expect((await as.admin.rpc('approve_application', { p_application_id: app!.id })).error).not.toBeNull()
    const { count } = await service.from('members').select('id', { count: 'exact', head: true }).eq('user_id', ids.alice)
    expect(count).toBe(1)
  })

  it('member can download own photo; another user cannot', async () => {
    const { data: m } = await as.alice.from('members').select('photo_path').single()
    expect((await as.alice.storage.from('member-photos').download(m!.photo_path)).error).toBeNull()
    expect((await as.bob.storage.from('member-photos').download(m!.photo_path)).error).not.toBeNull()
  })

  it('public verification shows minimal data and live status', async () => {
    const anon = client()
    const ok = await anon.rpc('verify_membership', { p_token: token })
    expect(ok.data[0].status).toBe('active')
    expect(Object.keys(ok.data[0]).sort()).toEqual(['card_version', 'checked_on', 'display_name', 'expiry_date', 'issue_date', 'membership_number', 'status'])
    await as.admin.rpc('set_member_status', { p_member_id: memberId, p_status: 'suspended', p_reason: 'E2E test' })
    expect((await anon.rpc('verify_membership', { p_token: token })).data[0].status).toBe('suspended')
    await as.admin.rpc('set_member_status', { p_member_id: memberId, p_status: 'revoked', p_reason: 'E2E test' })
    expect((await anon.rpc('verify_membership', { p_token: token })).data[0].status).toBe('revoked')
  })

  it('anonymous users cannot list members or call admin functions', async () => {
    const anon = client()
    expect((await anon.from('members').select('*')).data ?? []).toEqual([])
    expect((await anon.rpc('approve_application', { p_application_id: memberId })).error).not.toBeNull()
    expect((await anon.from('audit_logs').select('*')).data ?? []).toEqual([])
  })
})
