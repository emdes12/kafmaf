import { beforeAll, describe, expect, it } from 'vitest'
import { ANON, TestDb, type Actor } from './harness'

type User = Actor & { kind: 'user' }

let db: TestDb
let admin: User
let alice: User
let bob: User

const lagosToday = async () => (await db.su<{ d: string }>(`select public.lagos_today()::text as d`))[0].d

async function apply(user: User, overrides: Record<string, unknown> = {}) {
  const photo = 'photo' in overrides ? overrides.photo : await db.uploadPhoto(user)
  const args = {
    name: 'Sample Applicant',
    phone: null as string | null,
    disciplines: ['karate'],
    location: null,
    eligibility: true,
    adult: true,
    faith: null,
    privacy: '2026-10-draft-1',
    terms: true,
    ...overrides,
  }
  return db.q<{ id: string; reference: string; status: string }>(
    user,
    `select * from public.submit_application($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
    [args.name, args.phone, args.disciplines, photo, args.location, args.eligibility, args.adult, args.faith, args.privacy, args.terms],
  )
}

beforeAll(async () => {
  db = await TestDb.create()
  admin = await db.createUser('admin@example.test')
  alice = await db.createUser('alice@example.test')
  bob = await db.createUser('bob@example.test')
  expect((await db.su(`select public.bootstrap_first_admin('admin@example.test') as r`))[0].r).toBe('Administrator role granted.')
})

describe('setup & bootstrap', () => {
  it('new users always get the member role', async () => {
    const rows = await db.q<{ role: string }>(alice, `select role from public.profiles where id = auth.uid()`)
    expect(rows[0].role).toBe('member')
  })
  it('bootstrap cannot run twice and is not callable by clients', async () => {
    await expect(db.su(`select public.bootstrap_first_admin('alice@example.test')`)).rejects.toThrow(/already exists/)
    await expect(db.q(alice, `select public.bootstrap_first_admin('alice@example.test')`)).rejects.toThrow(/permission denied/)
    await expect(db.q(ANON, `select public.bootstrap_first_admin('alice@example.test')`)).rejects.toThrow(/permission denied/)
  })
  it('members cannot promote themselves', async () => {
    await expect(db.q(alice, `update public.profiles set role = 'admin' where id = auth.uid()`)).rejects.toThrow(/permission denied/)
    await expect(db.q(alice, `select public.admin_set_role_by_email('alice@example.test', 'admin')`)).rejects.toThrow(/Administrator access required/)
  })
})

describe('applications', () => {
  it('are refused while applications are closed (the default)', async () => {
    await expect(apply(alice)).rejects.toThrow(/not open/)
  })

  it('settings can only be changed by an administrator', async () => {
    await expect(db.q(alice, `update public.organization_settings set applications_open = true`)).resolves.toEqual([])
    expect((await db.su<{ o: boolean }>(`select applications_open as o from public.organization_settings`))[0].o).toBe(false)
    await expect(db.q(ANON, `update public.organization_settings set applications_open = true`)).rejects.toThrow(/permission denied/)
    await db.q(admin, `update public.organization_settings set applications_open = true`)
    expect((await db.su<{ o: boolean }>(`select applications_open as o from public.organization_settings`))[0].o).toBe(true)
    const audit = await db.su<{ action: string }>(`select action from public.audit_logs where action = 'settings.update'`)
    expect(audit.length).toBeGreaterThan(0)
  })

  it('anonymous users cannot apply or read applications', async () => {
    await expect(
      db.q(ANON, `select * from public.submit_application('X Y Z', null, array['karate'], 'x', null, true, true, null, 'v', true)`),
    ).rejects.toThrow(/permission denied/)
    await expect(db.q(ANON, `select * from public.membership_applications`)).rejects.toThrow(/permission denied/)
  })

  it('requires a verified email', async () => {
    const unverified = await db.createUser('unverified@example.test', false)
    await expect(apply(unverified)).rejects.toThrow(/verify your email/)
  })

  it('validates input on the server', async () => {
    await expect(apply(alice, { name: '<script>' })).rejects.toThrow(/full name/)
    await expect(apply(alice, { disciplines: ['kungfu'] })).rejects.toThrow(/disciplines/)
    await expect(apply(alice, { disciplines: [] })).rejects.toThrow(/disciplines/)
    await expect(apply(alice, { phone: '12ab' })).rejects.toThrow(/phone/)
    await expect(apply(alice, { adult: false })).rejects.toThrow(/required statements/)
    await expect(apply(alice, { privacy: 'old' })).rejects.toThrow(/privacy notice/)
    await expect(apply(alice, { photo: `applications/${bob.id}/photo_abcdefgh.jpg` })).rejects.toThrow(/photograph/)
    await expect(apply(alice, { photo: `applications/${alice.id}/missing_abcdefgh.jpg` })).rejects.toThrow(/could not be found/)
    await expect(apply(alice, { photo: null })).rejects.toThrow(/photograph/)
  })

  it('a user cannot upload into another applicant folder', async () => {
    await expect(db.uploadPhoto(alice, `applications/${bob.id}/photo_abcdefgh.jpg`)).rejects.toThrow(/row-level security/)
    await expect(db.uploadPhoto(alice, `members/x/photo_abcdefgh.jpg`)).rejects.toThrow(/row-level security/)
  })

  it('saves a pending application with a reference', async () => {
    const [row] = await apply(alice, { name: '  Sample   Applicant  ', phone: '0803 000 0000', disciplines: ['karate', 'boxing', 'karate'] })
    expect(row.status).toBe('pending')
    expect(row.reference).toMatch(/^APP-[A-Z2-9]{4}-[A-Z2-9]{4}$/)
    const [saved] = await db.su<{ full_name: string; email: string; disciplines: string[]; phone_normalized: string }>(
      `select full_name, email, disciplines, phone_normalized from public.membership_applications where id = $1`,
      [row.id],
    )
    expect(saved).toMatchObject({ full_name: 'Sample Applicant', email: 'alice@example.test', disciplines: ['boxing', 'karate'], phone_normalized: '2348030000000' })
  })

  it('prevents duplicates without revealing the other applicant', async () => {
    await expect(apply(alice)).rejects.toThrow(/already have an application/)
    await expect(apply(bob, { phone: '+2348030000000' })).rejects.toThrow(/application with these details already exists/)
  })

  it('a pending applicant has no membership and cannot read others', async () => {
    expect(await db.q(alice, `select * from public.members`)).toEqual([])
    const [b] = await apply(bob)
    expect(b.status).toBe('pending')
    const aliceView = await db.q<{ user_id: string }>(alice, `select user_id from public.membership_applications`)
    expect(aliceView.every((r) => r.user_id === alice.id)).toBe(true)
    expect(aliceView.length).toBe(1)
  })

  it('clients cannot write applications or members directly', async () => {
    await expect(db.q(alice, `update public.membership_applications set status = 'approved'`)).rejects.toThrow(/permission denied/)
    await expect(
      db.q(alice, `insert into public.members (membership_number, full_name, display_name, disciplines, member_since, issue_date, expiry_date)
                   values ('KAFMAF-2026-99999', 'Fake', 'Fake', array['karate'], now(), now(), now())`),
    ).rejects.toThrow(/permission denied/)
  })
})

describe('approval & issuance', () => {
  let aliceApp: string

  beforeAll(async () => {
    aliceApp = (await db.su<{ id: string }>(`select id from public.membership_applications where user_id = $1`, [alice.id]))[0].id
  })

  it('only administrators can approve', async () => {
    await expect(db.q(alice, `select public.approve_application($1)`, [aliceApp])).rejects.toThrow(/Administrator access required/)
    await expect(db.q(ANON, `select public.approve_application($1)`, [aliceApp])).rejects.toThrow(/permission denied/)
  })

  it('refuses to issue until the validity period is approved', async () => {
    await expect(db.q(admin, `select public.approve_application($1)`, [aliceApp])).rejects.toThrow(/validity period has not been approved/)
    await db.q(admin, `update public.organization_settings set validity_months = 12, validity_approved = true`)
  })

  it('creates exactly one membership with server-side dates', async () => {
    const [m] = await db.q<{ membership_number: string; issue_date: string; expiry_date: string; verification_token: string }>(
      admin,
      `select membership_number, issue_date::text, expiry_date::text, verification_token from public.approve_application($1)`,
      [aliceApp],
    )
    const today = await lagosToday()
    const [expected] = await db.su<{ e: string }>(`select (($1::date + interval '12 months')::date - 1)::text as e`, [today])
    expect(m.issue_date).toBe(today)
    expect(m.expiry_date).toBe(expected.e)
    expect(m.membership_number).toMatch(new RegExp(`^KAFMAF-${today.slice(0, 4)}-\\d{5}$`))
    expect(m.verification_token).toMatch(/^[0-9a-f]{64}$/)

    await expect(db.q(admin, `select public.approve_application($1)`, [aliceApp])).rejects.toThrow(/Only pending applications/)
    const count = await db.su<{ n: number }>(`select count(*)::int as n from public.members where user_id = $1`, [alice.id])
    expect(count[0].n).toBe(1)
    const audit = await db.su(`select 1 from public.audit_logs where action in ('application.approve', 'member.issue') and target_id is not null`)
    expect(audit.length).toBe(2)
  })

  it('the member sees only their own record; others see nothing', async () => {
    const own = await db.q<{ user_id: string }>(alice, `select user_id from public.members_with_status`)
    expect(own).toHaveLength(1)
    expect(own[0].user_id).toBe(alice.id)
    expect(await db.q(bob, `select * from public.members`)).toEqual([])
    await expect(db.q(ANON, `select * from public.members`)).rejects.toThrow(/permission denied/)
  })

  it('the member can read their photo; another user cannot', async () => {
    const [m] = await db.su<{ photo_path: string }>(`select photo_path from public.members where user_id = $1`, [alice.id])
    expect(await db.q(alice, `select name from storage.objects where name = $1`, [m.photo_path])).toHaveLength(1)
    expect(await db.q(bob, `select name from storage.objects where name = $1`, [m.photo_path])).toHaveLength(0)
    expect(await db.q(admin, `select name from storage.objects where name = $1`, [m.photo_path])).toHaveLength(1)
  })

  it('members cannot change their own status or dates', async () => {
    await expect(db.q(alice, `update public.members set expiry_date = '2099-01-01'`)).rejects.toThrow(/permission denied/)
    await expect(db.q(alice, `select public.renew_membership(id) from public.members`)).rejects.toThrow(/Administrator access required/)
  })

  it('rejection records a reason', async () => {
    const [b] = await db.su<{ id: string }>(`select id from public.membership_applications where user_id = $1`, [bob.id])
    await expect(db.q(admin, `select public.reject_application($1, '')`, [b.id])).rejects.toThrow(/reason/)
    await db.q(admin, `select public.reject_application($1, 'Photograph is not a clear passport photo')`, [b.id])
    const [row] = await db.q<{ status: string; rejection_reason: string }>(bob, `select status, rejection_reason from public.membership_applications`)
    expect(row).toEqual({ status: 'rejected', rejection_reason: 'Photograph is not a clear passport photo' })
    expect(await db.q(bob, `select * from public.members`)).toEqual([])
  })
})

describe('public verification', () => {
  let token: string
  let memberId: string

  beforeAll(async () => {
    const [m] = await db.su<{ id: string; verification_token: string }>(`select id, verification_token from public.members where user_id = $1`, [alice.id])
    token = m.verification_token
    memberId = m.id
  })

  const verify = (t: string) =>
    db.q<{ membership_number: string; display_name: string; status: string; expiry_date: string }>(
      ANON,
      `select membership_number, display_name, status, expiry_date::text from public.verify_membership($1)`,
      [t],
    )

  it('returns only minimal fields for a valid token', async () => {
    const rows = await db.q<Record<string, unknown>>(ANON, `select * from public.verify_membership($1)`, [token])
    expect(rows).toHaveLength(1)
    expect(Object.keys(rows[0]).sort()).toEqual(['card_version', 'checked_on', 'display_name', 'expiry_date', 'issue_date', 'membership_number', 'status'])
    expect(rows[0].status).toBe('active')
  })

  it('returns nothing for unknown or malformed tokens', async () => {
    expect(await verify('0'.repeat(64))).toEqual([])
    expect(await verify("' or 1=1 --")).toEqual([])
    expect(await verify(memberId)).toEqual([])
  })

  it('an expired card verifies as expired', async () => {
    await db.su(`update public.members set expiry_date = public.lagos_today() - 1, issue_date = public.lagos_today() - 366 where id = $1`, [memberId])
    expect((await verify(token))[0].status).toBe('expired')
    // The final valid day is inclusive.
    await db.su(`update public.members set expiry_date = public.lagos_today() where id = $1`, [memberId])
    expect((await verify(token))[0].status).toBe('active')
  })

  it('renewal extends from the day after the current expiry', async () => {
    const before = (await verify(token))[0].expiry_date
    await db.q(admin, `select public.renew_membership($1)`, [memberId])
    const [after] = await db.su<{ issue_date: string; expiry_date: string }>(`select issue_date::text, expiry_date::text from public.members where id = $1`, [memberId])
    const [exp] = await db.su<{ e: string }>(`select public.compute_expiry(($1::date + 1), 12)::text as e`, [before])
    expect(after.expiry_date).toBe(exp.e)
  })

  it('reissue does not extend validity; token rotation invalidates old QR codes', async () => {
    const [before] = await db.su<{ expiry_date: string }>(`select expiry_date::text from public.members where id = $1`, [memberId])
    await db.q(admin, `select public.reissue_card($1, false)`, [memberId])
    expect((await verify(token))[0].expiry_date).toBe(before.expiry_date)
    await db.q(admin, `select public.reissue_card($1, true)`, [memberId])
    expect(await verify(token)).toEqual([])
    token = (await db.su<{ t: string }>(`select verification_token as t from public.members where id = $1`, [memberId]))[0].t
    expect((await verify(token))[0].expiry_date).toBe(before.expiry_date)
  })

  it('a suspended card fails verification immediately, and can be reinstated', async () => {
    await expect(db.q(admin, `select public.set_member_status($1, 'suspended', '')`, [memberId])).rejects.toThrow(/reason/)
    await db.q(admin, `select public.set_member_status($1, 'suspended', 'Under review')`, [memberId])
    expect((await verify(token))[0].status).toBe('suspended')
    await db.q(admin, `select public.set_member_status($1, 'active', null)`, [memberId])
    expect((await verify(token))[0].status).toBe('active')
  })

  it('a revoked card fails verification and cannot be reactivated', async () => {
    await db.q(admin, `select public.set_member_status($1, 'revoked', 'Membership ended')`, [memberId])
    expect((await verify(token))[0].status).toBe('revoked')
    await expect(db.q(admin, `select public.set_member_status($1, 'active', null)`, [memberId])).rejects.toThrow(/revoked membership cannot be changed/)
  })
})

describe('expiry calculation', () => {
  it.each([
    ['2026-10-09', 12, '2027-10-08'],
    ['2027-01-01', 12, '2027-12-31'],
    ['2028-02-29', 12, '2029-02-28'],
    ['2027-02-28', 12, '2028-02-27'],
    ['2027-03-01', 12, '2028-02-29'],
    ['2026-01-31', 1, '2026-02-28'],
    ['2026-03-15', 6, '2026-09-14'],
  ])('compute_expiry(%s, %i) = %s', async (start, months, expected) => {
    const [r] = await db.su<{ e: string }>(`select public.compute_expiry($1::date, $2)::text as e`, [start, months])
    expect(r.e).toBe(expected)
  })
})

describe('islamic occasions', () => {
  const upsert = (actor: Actor, status: string, date: string, source: string | null, confirmedOn: string | null) =>
    db.q(actor, `select * from public.upsert_islamic_occasion('eid_al_fitr', 1448, $1, $2::date, $3, $4::date, 'Eid announcement', true, null)`, [
      status,
      date,
      source,
      confirmedOn,
    ])

  it('only administrators can record announcements', async () => {
    await expect(upsert(alice, 'confirmed', '2027-03-10', 'Sultan of Sokoto', '2027-03-08')).rejects.toThrow(/Administrator access required/)
    await expect(upsert(ANON, 'confirmed', '2027-03-10', 'x', '2027-03-08')).rejects.toThrow(/permission denied/)
    await expect(db.q(alice, `insert into public.islamic_occasions (occasion_key, hijri_year, status, gregorian_date) values ('eid_al_fitr', 1448, 'confirmed', '2027-03-10')`)).rejects.toThrow(/permission denied/)
  })

  it('confirmed requires a source and announcement date', async () => {
    await expect(upsert(admin, 'confirmed', '2027-03-10', null, null)).rejects.toThrow(/source/)
  })

  it('records expected -> confirmed -> corrected with audit trail, publicly readable', async () => {
    await upsert(admin, 'expected', '2027-03-10', null, null)
    await upsert(admin, 'confirmed', '2027-03-10', 'Sultan of Sokoto', '2027-03-08')
    await upsert(admin, 'confirmed', '2027-03-11', 'Sultan of Sokoto (correction)', '2027-03-09')
    const [row] = await db.q<{ status: string; gregorian_date: string; corrected_from: string }>(
      ANON,
      `select status, gregorian_date::text, corrected_from::text from public.islamic_occasions where occasion_key = 'eid_al_fitr'`,
    )
    expect(row).toEqual({ status: 'confirmed', gregorian_date: '2027-03-11', corrected_from: '2027-03-10' })
    const audit = await db.q(admin, `select * from public.audit_logs where action = 'occasion.upsert'`)
    expect(audit).toHaveLength(3)
  })
})

describe('audit log & requests', () => {
  it('audit log is readable only by admins and is append-only', async () => {
    expect(await db.q(alice, `select * from public.audit_logs`)).toEqual([])
    await expect(db.q(admin, `delete from public.audit_logs`)).rejects.toThrow(/permission denied/)
    await expect(db.q(admin, `update public.audit_logs set action = 'x'`)).rejects.toThrow(/permission denied/)
  })

  it('members can open requests; admins resolve them', async () => {
    const [r] = await db.q<{ id: string }>(alice, `select id from public.create_member_request('correction', 'Please correct my name spelling')`)
    expect(await db.q(bob, `select * from public.member_requests`)).toEqual([])
    await expect(db.q(alice, `select public.resolve_member_request($1, 'resolved', null)`, [r.id])).rejects.toThrow(/Administrator access required/)
    await db.q(admin, `select public.resolve_member_request($1, 'resolved', 'Done')`, [r.id])
    const [after] = await db.q<{ status: string }>(alice, `select status from public.member_requests where id = $1`, [r.id])
    expect(after.status).toBe('resolved')
  })
})
