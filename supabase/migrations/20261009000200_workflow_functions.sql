-- =============================================================================
-- KAFMAF platform — trusted workflow functions
-- All functions are SECURITY DEFINER with an empty search_path, validate the
-- caller, and write an audit entry. Clients call them via supabase.rpc().
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Applicant: submit an application
-- ---------------------------------------------------------------------------
create or replace function public.submit_application(
  p_full_name text,
  p_phone text,
  p_disciplines text[],
  p_photo_path text,
  p_training_location text,
  p_eligibility_confirmed boolean,
  p_adult_confirmed boolean,
  p_faith_attested boolean,
  p_privacy_notice_version text,
  p_terms_accepted boolean
)
returns table (id uuid, reference text, status public.application_status, submitted_at timestamptz)
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  s public.organization_settings%rowtype;
  v_email text;
  v_confirmed timestamptz;
  v_name text := regexp_replace(btrim(coalesce(p_full_name, '')), '\s+', ' ', 'g');
  v_phone text := nullif(regexp_replace(coalesce(p_phone, ''), '[\s\-().]', '', 'g'), '');
  v_phone_norm text;
  v_disciplines text[];
  v_recent integer;
  v_row public.membership_applications%rowtype;
begin
  if uid is null then
    raise exception 'Please sign in before applying.' using errcode = '42501';
  end if;

  select * into s from public.organization_settings where organization_settings.id = 1;
  if not s.applications_open then
    raise exception 'Membership applications are not open at the moment.' using errcode = 'P0001';
  end if;

  select u.email, u.email_confirmed_at into v_email, v_confirmed from auth.users u where u.id = uid;
  if v_confirmed is null then
    raise exception 'Please verify your email address before applying.' using errcode = 'P0001';
  end if;

  -- Abuse protection: at most 3 submissions per account in 24 hours.
  select count(*) into v_recent from public.membership_applications a
  where a.user_id = uid and a.submitted_at > now() - interval '24 hours';
  if v_recent >= 3 then
    raise exception 'Too many applications from this account. Please try again later.' using errcode = 'P0001';
  end if;

  if exists (select 1 from public.members m where m.user_id = uid) then
    raise exception 'This account already has a membership record.' using errcode = 'P0001';
  end if;
  if exists (select 1 from public.membership_applications a where a.user_id = uid and a.status = 'pending') then
    raise exception 'You already have an application under review.' using errcode = 'P0001';
  end if;

  if char_length(v_name) < 3 or char_length(v_name) > 120 or v_name !~ '^[[:alpha:]][[:alpha:] .''-]*$' then
    raise exception 'Please enter your full name using letters, spaces, hyphens or apostrophes.' using errcode = '22023';
  end if;

  if v_phone is not null then
    if v_phone !~ '^\+?[0-9]{7,15}$' then
      raise exception 'Please enter a valid phone number.' using errcode = '22023';
    end if;
    -- Normalize Nigerian numbers: 0803... -> 234803..., +234803... -> 234803...
    v_phone_norm := regexp_replace(v_phone, '^\+', '');
    if v_phone_norm ~ '^0[0-9]{10}$' then v_phone_norm := '234' || substr(v_phone_norm, 2); end if;
  end if;

  select array_agg(distinct d order by d) into v_disciplines
  from unnest(coalesce(p_disciplines, '{}'::text[])) d;
  if v_disciplines is null or not (v_disciplines <@ s.disciplines) then
    raise exception 'Please choose at least one of the listed disciplines.' using errcode = '22023';
  end if;

  if p_photo_path is null or p_photo_path !~ ('^applications/' || uid::text || '/[A-Za-z0-9_-]{8,64}\.(jpg|jpeg|png|webp)$') then
    raise exception 'Please upload a passport photograph.' using errcode = '22023';
  end if;
  if not exists (select 1 from storage.objects o where o.bucket_id = 'member-photos' and o.name = p_photo_path) then
    raise exception 'The uploaded photograph could not be found. Please upload it again.' using errcode = '22023';
  end if;

  if coalesce(p_eligibility_confirmed, false) is not true or coalesce(p_adult_confirmed, false) is not true
     or coalesce(p_terms_accepted, false) is not true then
    raise exception 'Please confirm all required statements.' using errcode = '22023';
  end if;
  if s.faith_attestation_enabled and coalesce(p_faith_attested, false) is not true then
    raise exception 'Please confirm all required statements.' using errcode = '22023';
  end if;
  if p_privacy_notice_version is distinct from s.privacy_notice_version then
    raise exception 'The privacy notice has changed. Please reload the page and review it again.' using errcode = 'P0001';
  end if;

  -- Duplicate detection without revealing whose record matched.
  if v_phone_norm is not null and (
       exists (select 1 from public.membership_applications a
               where a.phone_normalized = v_phone_norm and a.status in ('pending', 'approved'))
     ) then
    raise exception 'An application with these details already exists. Please contact KAFMAF if you believe this is a mistake.'
      using errcode = 'P0001';
  end if;

  insert into public.membership_applications (
    user_id, full_name, email, phone, phone_normalized, photo_path, disciplines, training_location,
    eligibility_confirmed, adult_confirmed, faith_attested, privacy_notice_version, terms_accepted
  ) values (
    uid, v_name, lower(v_email), v_phone, v_phone_norm, p_photo_path, v_disciplines,
    nullif(btrim(coalesce(p_training_location, '')), ''),
    true, true, case when s.faith_attestation_enabled then true else null end,
    p_privacy_notice_version, true
  )
  returning * into v_row;

  update public.profiles set display_name = coalesce(display_name, v_name) where profiles.id = uid;
  perform public.write_audit('application.submit', 'membership_application', v_row.id,
    jsonb_build_object('reference', v_row.reference));

  return query select v_row.id, v_row.reference, v_row.status, v_row.submitted_at;
end
$$;

create or replace function public.withdraw_application(p_application_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  n integer;
begin
  update public.membership_applications a set status = 'withdrawn'
  where a.id = p_application_id and a.user_id = auth.uid() and a.status = 'pending';
  get diagnostics n = row_count;
  if n = 0 then
    raise exception 'Application not found or no longer pending.' using errcode = 'P0001';
  end if;
  perform public.write_audit('application.withdraw', 'membership_application', p_application_id, '{}'::jsonb);
end
$$;

-- ---------------------------------------------------------------------------
-- Admin: approve / reject
-- ---------------------------------------------------------------------------
create or replace function public.approve_application(p_application_id uuid, p_display_name text default null)
returns public.members
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := public.require_admin();
  s public.organization_settings%rowtype;
  a public.membership_applications%rowtype;
  m public.members%rowtype;
  v_issue date := public.lagos_today();
  v_display text;
begin
  select * into s from public.organization_settings where id = 1;
  if not s.validity_approved then
    raise exception 'The membership validity period has not been approved yet. Approve it in Settings before issuing memberships.'
      using errcode = 'P0001';
  end if;

  -- Row lock prevents two administrators approving the same application concurrently.
  select * into a from public.membership_applications where id = p_application_id for update;
  if not found then
    raise exception 'Application not found.' using errcode = 'P0002';
  end if;
  if a.status <> 'pending' then
    raise exception 'Only pending applications can be approved (current status: %).', a.status using errcode = 'P0001';
  end if;
  if exists (select 1 from public.members where user_id = a.user_id) then
    raise exception 'This applicant already has a membership record.' using errcode = 'P0001';
  end if;

  v_display := regexp_replace(btrim(coalesce(nullif(p_display_name, ''), a.full_name)), '\s+', ' ', 'g');

  insert into public.members (
    user_id, application_id, membership_number, full_name, display_name, photo_path, disciplines,
    status, member_since, issue_date, expiry_date
  ) values (
    a.user_id, a.id,
    upper(s.short_name) || '-' || to_char(v_issue, 'YYYY') || '-' || lpad(nextval('public.membership_number_seq')::text, 5, '0'),
    a.full_name, v_display, a.photo_path, a.disciplines,
    'active', v_issue, v_issue, public.compute_expiry(v_issue, s.validity_months)
  )
  returning * into m;

  update public.membership_applications
  set status = 'approved', reviewed_by = actor, reviewed_at = now(), rejection_reason = null
  where id = a.id;

  perform public.write_audit('application.approve', 'membership_application', a.id,
    jsonb_build_object('reference', a.reference, 'member_id', m.id, 'membership_number', m.membership_number));
  perform public.write_audit('member.issue', 'member', m.id,
    jsonb_build_object('membership_number', m.membership_number, 'issue_date', m.issue_date,
                       'expiry_date', m.expiry_date, 'validity_months', s.validity_months));
  return m;
end
$$;

create or replace function public.reject_application(p_application_id uuid, p_reason text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := public.require_admin();
  a public.membership_applications%rowtype;
begin
  if p_reason is null or char_length(btrim(p_reason)) < 3 or char_length(p_reason) > 500 then
    raise exception 'Please record a reason (3–500 characters).' using errcode = '22023';
  end if;
  select * into a from public.membership_applications where id = p_application_id for update;
  if not found then raise exception 'Application not found.' using errcode = 'P0002'; end if;
  if a.status <> 'pending' then
    raise exception 'Only pending applications can be rejected.' using errcode = 'P0001';
  end if;
  update public.membership_applications
  set status = 'rejected', reviewed_by = actor, reviewed_at = now(), rejection_reason = btrim(p_reason)
  where id = a.id;
  perform public.write_audit('application.reject', 'membership_application', a.id,
    jsonb_build_object('reference', a.reference));
end
$$;

-- ---------------------------------------------------------------------------
-- Admin: member lifecycle
-- ---------------------------------------------------------------------------
create or replace function public.admin_update_member(
  p_member_id uuid,
  p_full_name text,
  p_display_name text,
  p_disciplines text[]
)
returns public.members
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := public.require_admin();
  before_row public.members%rowtype;
  m public.members%rowtype;
  v_disciplines text[];
begin
  select * into before_row from public.members where id = p_member_id for update;
  if not found then raise exception 'Member not found.' using errcode = 'P0002'; end if;
  select array_agg(distinct d order by d) into v_disciplines from unnest(coalesce(p_disciplines, '{}'::text[])) d;
  update public.members set
    full_name = regexp_replace(btrim(p_full_name), '\s+', ' ', 'g'),
    display_name = regexp_replace(btrim(p_display_name), '\s+', ' ', 'g'),
    disciplines = v_disciplines
  where id = p_member_id
  returning * into m;
  perform public.write_audit('member.update', 'member', m.id, jsonb_build_object(
    'full_name_changed', before_row.full_name is distinct from m.full_name,
    'display_name_changed', before_row.display_name is distinct from m.display_name,
    'disciplines', jsonb_build_object('from', before_row.disciplines, 'to', m.disciplines)));
  return m;
end
$$;

create or replace function public.admin_set_member_photo(p_member_id uuid, p_photo_path text)
returns public.members
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := public.require_admin();
  m public.members%rowtype;
begin
  if p_photo_path is null or p_photo_path !~ ('^members/' || p_member_id::text || '/[A-Za-z0-9_-]{8,64}\.(jpg|jpeg|png|webp)$') then
    raise exception 'Invalid photograph path.' using errcode = '22023';
  end if;
  if not exists (select 1 from storage.objects o where o.bucket_id = 'member-photos' and o.name = p_photo_path) then
    raise exception 'Uploaded photograph not found.' using errcode = '22023';
  end if;
  update public.members set photo_path = p_photo_path where id = p_member_id returning * into m;
  if not found then raise exception 'Member not found.' using errcode = 'P0002'; end if;
  perform public.write_audit('member.photo_replace', 'member', m.id, '{}'::jsonb);
  return m;
end
$$;

create or replace function public.set_member_status(p_member_id uuid, p_status public.membership_status, p_reason text)
returns public.members
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := public.require_admin();
  before_row public.members%rowtype;
  m public.members%rowtype;
begin
  select * into before_row from public.members where id = p_member_id for update;
  if not found then raise exception 'Member not found.' using errcode = 'P0002'; end if;
  if before_row.status = 'revoked' then
    raise exception 'A revoked membership cannot be changed. Create a new membership instead.' using errcode = 'P0001';
  end if;
  if p_status in ('suspended', 'revoked') and (p_reason is null or char_length(btrim(p_reason)) < 3) then
    raise exception 'Please record a reason.' using errcode = '22023';
  end if;
  update public.members set status = p_status, status_reason = nullif(btrim(coalesce(p_reason, '')), '')
  where id = p_member_id returning * into m;
  perform public.write_audit('member.status', 'member', m.id,
    jsonb_build_object('from', before_row.status, 'to', m.status));
  return m;
end
$$;

-- Renewal: a new validity period starting the day after the current expiry
-- (if still valid) or today (if already expired). Explicit admin action only.
create or replace function public.renew_membership(p_member_id uuid)
returns public.members
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := public.require_admin();
  s public.organization_settings%rowtype;
  before_row public.members%rowtype;
  m public.members%rowtype;
  v_start date;
begin
  select * into s from public.organization_settings where id = 1;
  if not s.validity_approved then
    raise exception 'The membership validity period has not been approved yet.' using errcode = 'P0001';
  end if;
  select * into before_row from public.members where id = p_member_id for update;
  if not found then raise exception 'Member not found.' using errcode = 'P0002'; end if;
  if before_row.status <> 'active' then
    raise exception 'Only active memberships can be renewed. Reinstate a suspended membership first.' using errcode = 'P0001';
  end if;
  v_start := greatest(before_row.expiry_date + 1, public.lagos_today());
  update public.members set
    issue_date = v_start,
    expiry_date = public.compute_expiry(v_start, s.validity_months),
    card_version = card_version + 1,
    card_issued_at = now()
  where id = p_member_id returning * into m;
  perform public.write_audit('member.renew', 'member', m.id, jsonb_build_object(
    'previous_expiry', before_row.expiry_date, 'issue_date', m.issue_date, 'expiry_date', m.expiry_date,
    'validity_months', s.validity_months));
  return m;
end
$$;

-- Reissue: new card version, same validity dates. Optionally rotate the
-- verification token so QR codes on older printed cards stop verifying.
create or replace function public.reissue_card(p_member_id uuid, p_rotate_token boolean)
returns public.members
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := public.require_admin();
  m public.members%rowtype;
begin
  update public.members set
    card_version = card_version + 1,
    card_issued_at = now(),
    verification_token = case when p_rotate_token then public.new_verification_token() else verification_token end
  where id = p_member_id returning * into m;
  if not found then raise exception 'Member not found.' using errcode = 'P0002'; end if;
  perform public.write_audit('member.reissue', 'member', m.id,
    jsonb_build_object('card_version', m.card_version, 'token_rotated', coalesce(p_rotate_token, false)));
  return m;
end
$$;

-- ---------------------------------------------------------------------------
-- Public verification — minimal data only
-- ---------------------------------------------------------------------------
create or replace function public.verify_membership(p_token text)
returns table (
  membership_number text,
  display_name text,
  status text,
  issue_date date,
  expiry_date date,
  card_version integer,
  checked_on date
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if p_token is null or p_token !~ '^[0-9a-f]{64}$' then
    return;
  end if;
  return query
    select m.membership_number, m.display_name,
           public.effective_membership_status(m.status, m.expiry_date),
           m.issue_date, m.expiry_date, m.card_version, public.lagos_today()
    from public.members m
    where m.verification_token = p_token;
end
$$;

-- ---------------------------------------------------------------------------
-- Member: requests (correction / renewal)
-- ---------------------------------------------------------------------------
create or replace function public.create_member_request(p_type public.member_request_type, p_message text)
returns public.member_requests
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  v_member uuid;
  r public.member_requests%rowtype;
begin
  if uid is null then raise exception 'Please sign in.' using errcode = '42501'; end if;
  if p_message is null or char_length(btrim(p_message)) < 5 or char_length(p_message) > 1000 then
    raise exception 'Please describe your request (5–1000 characters).' using errcode = '22023';
  end if;
  select id into v_member from public.members where user_id = uid;
  if v_member is null and not exists (select 1 from public.membership_applications where user_id = uid) then
    raise exception 'There is no application or membership linked to this account.' using errcode = 'P0001';
  end if;
  if p_type = 'renewal' and v_member is null then
    raise exception 'Renewal is only available to members.' using errcode = 'P0001';
  end if;
  if (select count(*) from public.member_requests where user_id = uid and status = 'open') >= 3 then
    raise exception 'You already have open requests. Please wait for a response.' using errcode = 'P0001';
  end if;
  insert into public.member_requests (user_id, member_id, request_type, message)
  values (uid, v_member, p_type, btrim(p_message)) returning * into r;
  perform public.write_audit('request.create', 'member_request', r.id, jsonb_build_object('type', p_type));
  return r;
end
$$;

create or replace function public.resolve_member_request(p_request_id uuid, p_status public.member_request_status, p_note text)
returns public.member_requests
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := public.require_admin();
  r public.member_requests%rowtype;
begin
  if p_status = 'open' then raise exception 'Choose resolved or dismissed.' using errcode = '22023'; end if;
  update public.member_requests set status = p_status, admin_note = nullif(btrim(coalesce(p_note, '')), ''),
    resolved_by = actor, resolved_at = now()
  where id = p_request_id and status = 'open' returning * into r;
  if not found then raise exception 'Request not found or already closed.' using errcode = 'P0002'; end if;
  perform public.write_audit('request.' || p_status::text, 'member_request', r.id, '{}'::jsonb);
  return r;
end
$$;

-- ---------------------------------------------------------------------------
-- Islamic occasions (admin)
-- ---------------------------------------------------------------------------
create or replace function public.upsert_islamic_occasion(
  p_occasion_key text,
  p_hijri_year integer,
  p_status text,
  p_gregorian_date date,
  p_source text,
  p_confirmed_on date,
  p_announcement text,
  p_publish_announcement boolean,
  p_announcement_expires_on date
)
returns public.islamic_occasions
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := public.require_admin();
  prev public.islamic_occasions%rowtype;
  r public.islamic_occasions%rowtype;
  v_corrected date;
begin
  if p_status = 'confirmed' and (nullif(btrim(coalesce(p_source, '')), '') is null or p_confirmed_on is null) then
    raise exception 'A confirmed date needs the announcement source and the date it was announced.' using errcode = '22023';
  end if;
  select * into prev from public.islamic_occasions where occasion_key = p_occasion_key and hijri_year = p_hijri_year for update;
  -- Keep the first officially confirmed date when it is later corrected.
  v_corrected := case
    when found and prev.status = 'confirmed' and p_status = 'confirmed' and prev.gregorian_date <> p_gregorian_date
      then coalesce(prev.corrected_from, prev.gregorian_date)
    when found then prev.corrected_from
    else null end;

  insert into public.islamic_occasions as o (
    occasion_key, hijri_year, status, gregorian_date, source, confirmed_on, corrected_from,
    announcement, publish_announcement, announcement_expires_on, updated_by
  ) values (
    p_occasion_key, p_hijri_year, p_status, p_gregorian_date, nullif(btrim(coalesce(p_source, '')), ''),
    p_confirmed_on, v_corrected, nullif(btrim(coalesce(p_announcement, '')), ''),
    coalesce(p_publish_announcement, false), p_announcement_expires_on, actor
  )
  on conflict (occasion_key, hijri_year) do update set
    status = excluded.status,
    gregorian_date = excluded.gregorian_date,
    source = excluded.source,
    confirmed_on = excluded.confirmed_on,
    corrected_from = excluded.corrected_from,
    announcement = excluded.announcement,
    publish_announcement = excluded.publish_announcement,
    announcement_expires_on = excluded.announcement_expires_on,
    updated_by = excluded.updated_by
  returning * into r;

  perform public.write_audit('occasion.upsert', 'islamic_occasion', r.id, jsonb_build_object(
    'occasion', r.occasion_key, 'hijri_year', r.hijri_year,
    'status', jsonb_build_object('from', prev.status, 'to', r.status),
    'date', jsonb_build_object('from', prev.gregorian_date, 'to', r.gregorian_date),
    'source', r.source, 'published', r.publish_announcement));
  return r;
end
$$;

create or replace function public.delete_islamic_occasion(p_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := public.require_admin();
  r public.islamic_occasions%rowtype;
begin
  delete from public.islamic_occasions where id = p_id returning * into r;
  if not found then raise exception 'Record not found.' using errcode = 'P0002'; end if;
  perform public.write_audit('occasion.delete', 'islamic_occasion', p_id, jsonb_build_object(
    'occasion', r.occasion_key, 'hijri_year', r.hijri_year, 'status', r.status, 'date', r.gregorian_date));
end
$$;

-- ---------------------------------------------------------------------------
-- Administrators
-- ---------------------------------------------------------------------------
create or replace function public.admin_list_admins()
returns table (id uuid, email text, display_name text, account_status public.account_status, created_at timestamptz)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform public.require_admin();
  return query
    select p.id, u.email::text, p.display_name, p.account_status, p.created_at
    from public.profiles p join auth.users u on u.id = p.id
    where p.role = 'admin'
    order by p.created_at;
end
$$;

create or replace function public.admin_set_role_by_email(p_email text, p_role public.app_role)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := public.require_admin();
  target uuid;
begin
  select u.id into target from auth.users u
  where lower(u.email) = lower(btrim(p_email)) and u.email_confirmed_at is not null;
  if target is null then
    raise exception 'No verified account uses that email address.' using errcode = 'P0002';
  end if;
  if target = actor and p_role <> 'admin' then
    raise exception 'You cannot remove your own administrator role.' using errcode = 'P0001';
  end if;
  update public.profiles set role = p_role where id = target;
  perform public.write_audit('admin.role', 'profile', target, jsonb_build_object('role', p_role));
end
$$;

-- First administrator. NOT callable by anon/authenticated: run it once from the
-- Supabase SQL editor (service role / postgres) after the person has signed up
-- and verified their email. Refuses if an administrator already exists.
create or replace function public.bootstrap_first_admin(p_email text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  target uuid;
begin
  if exists (select 1 from public.profiles where role = 'admin') then
    raise exception 'An administrator already exists. Use the dashboard to add more.';
  end if;
  select u.id into target from auth.users u
  where lower(u.email) = lower(btrim(p_email)) and u.email_confirmed_at is not null;
  if target is null then
    raise exception 'No verified account uses that email address. Sign up and confirm the email first.';
  end if;
  update public.profiles set role = 'admin' where id = target;
  insert into public.audit_logs (actor_id, action, target_type, target_id, metadata)
  values (null, 'admin.bootstrap', 'profile', target, '{}'::jsonb);
  return 'Administrator role granted.';
end
$$;

-- ---------------------------------------------------------------------------
-- Function privileges
-- ---------------------------------------------------------------------------
revoke execute on all functions in schema public from public, anon, authenticated;

grant execute on function public.is_admin() to authenticated;
grant execute on function public.lagos_today() to anon, authenticated;
grant execute on function public.effective_membership_status(public.membership_status, date) to anon, authenticated;
grant execute on function public.verify_membership(text) to anon, authenticated;

grant execute on function public.submit_application(text, text, text[], text, text, boolean, boolean, boolean, text, boolean) to authenticated;
grant execute on function public.withdraw_application(uuid) to authenticated;
grant execute on function public.create_member_request(public.member_request_type, text) to authenticated;

-- Admin functions: granted to authenticated, but each one calls require_admin().
grant execute on function public.approve_application(uuid, text) to authenticated;
grant execute on function public.reject_application(uuid, text) to authenticated;
grant execute on function public.admin_update_member(uuid, text, text, text[]) to authenticated;
grant execute on function public.admin_set_member_photo(uuid, text) to authenticated;
grant execute on function public.set_member_status(uuid, public.membership_status, text) to authenticated;
grant execute on function public.renew_membership(uuid) to authenticated;
grant execute on function public.reissue_card(uuid, boolean) to authenticated;
grant execute on function public.resolve_member_request(uuid, public.member_request_status, text) to authenticated;
grant execute on function public.upsert_islamic_occasion(text, integer, text, date, text, date, text, boolean, date) to authenticated;
grant execute on function public.delete_islamic_occasion(uuid) to authenticated;
grant execute on function public.admin_list_admins() to authenticated;
grant execute on function public.admin_set_role_by_email(text, public.app_role) to authenticated;
-- bootstrap_first_admin: intentionally no grant (service role / SQL editor only).

-- Trigger functions and internal helpers keep no client grants.
