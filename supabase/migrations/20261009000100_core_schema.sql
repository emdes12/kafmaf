-- =============================================================================
-- KAFMAF platform — core schema
--
-- Security model
--   * Row Level Security is enabled on every table in the `public` schema.
--   * Clients (anon / authenticated) get NO direct INSERT/UPDATE/DELETE on
--     membership data. Every state change goes through a SECURITY DEFINER
--     function below, which checks the caller's role from `profiles`, validates
--     input, writes an audit log entry and runs in a single transaction.
--   * Role, membership status, membership number, issue and expiry dates are
--     never accepted from the client.
--   * The public verification page uses `verify_membership(token)` which returns
--     only the minimum card-verification fields.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Types
-- ---------------------------------------------------------------------------
create type public.app_role as enum ('member', 'admin');
create type public.account_status as enum ('active', 'disabled');
create type public.application_status as enum ('pending', 'approved', 'rejected', 'withdrawn');
-- "expired" is not stored: it is derived from expiry_date at read time.
create type public.membership_status as enum ('active', 'suspended', 'revoked');
create type public.member_request_type as enum ('correction', 'renewal');
create type public.member_request_status as enum ('open', 'resolved', 'dismissed');

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

-- Today's date in Nigeria. All membership dates are calendar dates in Africa/Lagos.
create or replace function public.lagos_today()
returns date
language sql
stable
set search_path = ''
as $$
  select (now() at time zone 'Africa/Lagos')::date
$$;

-- Expiry policy: `expiry_date` is the LAST VALID CALENDAR DAY (inclusive).
--   expiry = (issue + N months) - 1 day
-- If the anniversary does not exist (e.g. issued 29 Feb, or 31 Jan + 1 month),
-- Postgres clamps it to the end of the month; in that case the clamped date
-- itself is the last valid day, so membership is never shortened by a day.
--   2026-10-09 + 12 months -> expires 2027-10-08
--   2028-02-29 + 12 months -> expires 2029-02-28
create or replace function public.compute_expiry(p_start date, p_months integer)
returns date
language plpgsql
immutable
set search_path = ''
as $$
declare
  anniversary date;
begin
  if p_start is null or p_months is null or p_months < 1 or p_months > 120 then
    raise exception 'invalid validity period' using errcode = '22023';
  end if;
  anniversary := (p_start + make_interval(months => p_months))::date;
  if extract(day from anniversary) < extract(day from p_start) then
    return anniversary;  -- clamped to month end
  end if;
  return anniversary - 1;
end
$$;

create or replace function public.effective_membership_status(p_status public.membership_status, p_expiry date)
returns text
language sql
stable
set search_path = ''
as $$
  select case
    when p_status = 'active' and p_expiry < public.lagos_today() then 'expired'
    else p_status::text
  end
$$;

-- 64 hex chars from two v4 UUIDs = 244 random bits. Unguessable; not derived from any id.
create or replace function public.new_verification_token()
returns text
language sql
volatile
set search_path = ''
as $$
  select replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '')
$$;

-- Short human-friendly application reference, e.g. APP-7K3M-Q9TD (no 0/O/1/I).
create or replace function public.new_application_reference()
returns text
language plpgsql
volatile
set search_path = ''
as $$
declare
  alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  bytes bytea := decode(replace(gen_random_uuid()::text, '-', ''), 'hex');
  out text := 'APP-';
begin
  for i in 0..7 loop
    if i = 4 then out := out || '-'; end if;
    out := out || substr(alphabet, (get_byte(bytes, i) % 32) + 1, 1);
  end loop;
  return out;
end
$$;

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end
$$;

-- ---------------------------------------------------------------------------
-- Profiles (one per auth user)
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text check (display_name is null or char_length(display_name) between 1 and 120),
  role public.app_role not null default 'member',
  account_status public.account_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Role is ALWAYS 'member' on sign-up, regardless of any client-supplied metadata.
  insert into public.profiles (id, display_name, role)
  values (new.id, null, 'member')
  on conflict (id) do nothing;
  return new;
end
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin' and p.account_status = 'active'
  )
$$;

create or replace function public.require_admin()
returns uuid
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'Administrator access required' using errcode = '42501';
  end if;
  return auth.uid();
end
$$;

-- ---------------------------------------------------------------------------
-- Organization settings (single row, id = 1). Contains PUBLIC content only.
-- NULL means "not yet approved by KAFMAF leadership" and is hidden on the site.
-- ---------------------------------------------------------------------------
create table public.organization_settings (
  id smallint primary key default 1 check (id = 1),
  short_name text not null default 'KAFMAF' check (char_length(short_name) between 2 and 20),
  full_name text not null default 'Kick and Fist Martial Art Foundation' check (char_length(full_name) between 3 and 120),
  name_approved boolean not null default false,

  tagline text check (tagline is null or char_length(tagline) <= 160),
  about_text text check (about_text is null or char_length(about_text) <= 8000),
  community_text text check (community_text is null or char_length(community_text) <= 2000),
  disciplines text[] not null default array['karate', 'boxing', 'taekwondo']
    check (disciplines <@ array['karate', 'boxing', 'taekwondo']::text[]),
  disciplines_confirmed boolean not null default false,

  contact_phone text check (contact_phone is null or char_length(contact_phone) <= 120),
  contact_email text check (contact_email is null or char_length(contact_email) <= 200),
  contact_address text check (contact_address is null or char_length(contact_address) <= 400),
  contact_notes text check (contact_notes is null or char_length(contact_notes) <= 1000),

  -- Membership policy
  applications_open boolean not null default false,
  eligibility_text text check (eligibility_text is null or char_length(eligibility_text) <= 4000),
  membership_terms_text text check (membership_terms_text is null or char_length(membership_terms_text) <= 8000),
  faith_attestation_enabled boolean not null default false,
  faith_attestation_text text check (faith_attestation_text is null or char_length(faith_attestation_text) <= 400),
  validity_months integer not null default 12 check (validity_months between 1 and 120),
  validity_approved boolean not null default false,
  privacy_notice_version text not null default '2026-10-draft-1',

  -- ID card. 'heritage' = KAFMAF's existing logo and green/yellow/red colours;
  -- 'signature' = charcoal/red/gold alternative design.
  card_theme text not null default 'heritage' check (card_theme in ('heritage', 'signature')),
  card_validity_statement text not null default
    'This card is valid only while the membership is current. Scan the QR code to confirm the live status.'
    check (char_length(card_validity_statement) <= 220),
  card_show_signature boolean not null default false,
  card_signature_label text check (card_signature_label is null or char_length(card_signature_label) <= 60),
  card_color_primary text not null default '#16181d' check (card_color_primary ~ '^#[0-9a-fA-F]{6}$'),
  card_color_accent text not null default '#9e1b22' check (card_color_accent ~ '^#[0-9a-fA-F]{6}$'),
  card_color_gold text not null default '#b08d4a' check (card_color_gold ~ '^#[0-9a-fA-F]{6}$'),
  -- Paths inside the public `site-assets` bucket (uploaded by administrators).
  logo_path text check (logo_path is null or char_length(logo_path) <= 300),
  hero_image_path text check (hero_image_path is null or char_length(hero_image_path) <= 300),
  hero_image_alt text check (hero_image_alt is null or char_length(hero_image_alt) <= 200),

  -- Hijri calendar
  hijri_calendar text not null default 'islamic-umalqura'
    check (hijri_calendar in ('islamic-umalqura', 'islamic-civil', 'islamic-tbla')),
  hijri_adjustment_days integer not null default 0 check (hijri_adjustment_days between -2 and 2),
  hijri_authority_label text not null default 'the Sultan of Sokoto / NSCIA moon-sighting announcement'
    check (char_length(hijri_authority_label) <= 160),

  updated_by uuid references auth.users (id) on delete set null,
  updated_at timestamptz not null default now()
);
insert into public.organization_settings (id) values (1);
create trigger organization_settings_touch before update on public.organization_settings
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- Membership applications
-- ---------------------------------------------------------------------------
create table public.membership_applications (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique default public.new_application_reference(),
  user_id uuid not null references auth.users (id) on delete cascade,
  full_name text not null check (char_length(full_name) between 3 and 120),
  email text not null check (char_length(email) <= 254),
  phone text check (phone is null or phone ~ '^\+?[0-9]{7,15}$'),
  phone_normalized text,
  photo_path text check (photo_path is null or char_length(photo_path) <= 300),
  disciplines text[] not null
    check (cardinality(disciplines) between 1 and 3 and disciplines <@ array['karate', 'boxing', 'taekwondo']::text[]),
  training_location text check (training_location is null or char_length(training_location) <= 120),
  eligibility_confirmed boolean not null check (eligibility_confirmed),
  adult_confirmed boolean not null check (adult_confirmed),
  faith_attested boolean,
  privacy_notice_version text not null,
  terms_accepted boolean not null check (terms_accepted),
  status public.application_status not null default 'pending',
  submitted_at timestamptz not null default now(),
  reviewed_by uuid references auth.users (id) on delete set null,
  reviewed_at timestamptz,
  rejection_reason text check (rejection_reason is null or char_length(rejection_reason) <= 500),
  updated_at timestamptz not null default now()
);
create trigger membership_applications_touch before update on public.membership_applications
  for each row execute function public.touch_updated_at();
-- One open (pending or approved) application per account.
create unique index membership_applications_one_open_per_user
  on public.membership_applications (user_id) where status in ('pending', 'approved');
-- A phone number may only belong to one open application.
create unique index membership_applications_phone_open
  on public.membership_applications (phone_normalized) where status in ('pending', 'approved') and phone_normalized is not null;
create index membership_applications_status_idx on public.membership_applications (status, submitted_at desc);

-- ---------------------------------------------------------------------------
-- Members
-- ---------------------------------------------------------------------------
create sequence public.membership_number_seq start 1;

create table public.members (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique references auth.users (id) on delete set null,
  application_id uuid unique references public.membership_applications (id) on delete set null,
  membership_number text not null unique check (membership_number ~ '^[A-Z]{2,20}-[0-9]{4}-[0-9]{5}$'),
  full_name text not null check (char_length(full_name) between 3 and 120),
  display_name text not null check (char_length(display_name) between 3 and 120),
  photo_path text check (photo_path is null or char_length(photo_path) <= 300),
  disciplines text[] not null
    check (cardinality(disciplines) between 1 and 3 and disciplines <@ array['karate', 'boxing', 'taekwondo']::text[]),
  status public.membership_status not null default 'active',
  status_reason text check (status_reason is null or char_length(status_reason) <= 500),
  member_since date not null,
  issue_date date not null,
  expiry_date date not null,
  verification_token text not null unique default public.new_verification_token()
    check (verification_token ~ '^[0-9a-f]{64}$'),
  card_version integer not null default 1 check (card_version >= 1),
  card_issued_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (expiry_date >= issue_date)
);
create trigger members_touch before update on public.members
  for each row execute function public.touch_updated_at();
create index members_status_idx on public.members (status, expiry_date);

-- Effective status (adds 'expired') for listings. security_invoker => RLS of `members` applies.
create view public.members_with_status
with (security_invoker = true) as
  select m.*, public.effective_membership_status(m.status, m.expiry_date) as effective_status
  from public.members m;

-- ---------------------------------------------------------------------------
-- Member requests (profile correction / renewal)
-- ---------------------------------------------------------------------------
create table public.member_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  member_id uuid references public.members (id) on delete cascade,
  request_type public.member_request_type not null,
  message text not null check (char_length(message) between 5 and 1000),
  status public.member_request_status not null default 'open',
  admin_note text check (admin_note is null or char_length(admin_note) <= 500),
  created_at timestamptz not null default now(),
  resolved_by uuid references auth.users (id) on delete set null,
  resolved_at timestamptz
);
create index member_requests_status_idx on public.member_requests (status, created_at desc);

-- ---------------------------------------------------------------------------
-- Audit log (append-only; written only by SECURITY DEFINER functions/triggers)
-- ---------------------------------------------------------------------------
create table public.audit_logs (
  id bigint generated always as identity primary key,
  actor_id uuid references auth.users (id) on delete set null,
  action text not null,
  target_type text,
  target_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index audit_logs_created_idx on public.audit_logs (created_at desc);
create index audit_logs_target_idx on public.audit_logs (target_type, target_id);

create or replace function public.write_audit(p_action text, p_target_type text, p_target_id uuid, p_metadata jsonb default '{}'::jsonb)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.audit_logs (actor_id, action, target_type, target_id, metadata)
  values (auth.uid(), p_action, p_target_type, p_target_id, coalesce(p_metadata, '{}'::jsonb))
$$;

-- ---------------------------------------------------------------------------
-- Islamic occasions (administrator-confirmed dates)
-- ---------------------------------------------------------------------------
create table public.islamic_occasions (
  id uuid primary key default gen_random_uuid(),
  occasion_key text not null check (occasion_key in ('islamic_new_year', 'ramadan_start', 'eid_al_fitr', 'eid_al_adha')),
  hijri_year integer not null check (hijri_year between 1440 and 1600),
  status text not null check (status in ('expected', 'confirmed', 'cancelled')),
  gregorian_date date not null,
  source text check (source is null or char_length(source) <= 300),
  confirmed_on date,
  corrected_from date,
  announcement text check (announcement is null or char_length(announcement) <= 600),
  publish_announcement boolean not null default false,
  announcement_expires_on date,
  updated_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (occasion_key, hijri_year),
  check (status <> 'confirmed' or (source is not null and confirmed_on is not null))
);
create trigger islamic_occasions_touch before update on public.islamic_occasions
  for each row execute function public.touch_updated_at();

-- =============================================================================
-- Row Level Security — default deny; explicit policies only.
-- =============================================================================
alter table public.profiles enable row level security;
alter table public.organization_settings enable row level security;
alter table public.membership_applications enable row level security;
alter table public.members enable row level security;
alter table public.member_requests enable row level security;
alter table public.audit_logs enable row level security;
alter table public.islamic_occasions enable row level security;

-- Remove default privileges and grant only what each role needs. Grants below are explicit,
-- so the schema works whether or not "Automatically expose new tables" is enabled in Supabase.
grant usage on schema public to anon, authenticated;
revoke all on all tables in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;
revoke execute on all functions in schema public from public, anon, authenticated;

-- profiles
grant select on public.profiles to authenticated;
grant update (display_name) on public.profiles to authenticated;
create policy profiles_select_own on public.profiles for select to authenticated
  using (id = auth.uid() or public.is_admin());
create policy profiles_update_own_name on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

-- organization_settings: public read; admin update.
grant select on public.organization_settings to anon, authenticated;
grant update (
  short_name, full_name, name_approved, tagline, about_text, community_text, disciplines, disciplines_confirmed,
  contact_phone, contact_email, contact_address, contact_notes, applications_open, eligibility_text,
  membership_terms_text, faith_attestation_enabled, faith_attestation_text, validity_months, validity_approved,
  privacy_notice_version, card_theme, card_validity_statement, card_show_signature, card_signature_label,
  card_color_primary, card_color_accent, card_color_gold, logo_path, hero_image_path, hero_image_alt,
  hijri_calendar, hijri_adjustment_days, hijri_authority_label
) on public.organization_settings to authenticated;
create policy settings_public_read on public.organization_settings for select to anon, authenticated using (true);
create policy settings_admin_update on public.organization_settings for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- membership_applications: owner and admins can read; writes only via functions.
grant select on public.membership_applications to authenticated;
create policy applications_select on public.membership_applications for select to authenticated
  using (user_id = auth.uid() or public.is_admin());

-- members: owner and admins can read; writes only via functions.
grant select on public.members to authenticated;
grant select on public.members_with_status to authenticated;
create policy members_select on public.members for select to authenticated
  using (user_id = auth.uid() or public.is_admin());

-- member_requests
grant select on public.member_requests to authenticated;
create policy member_requests_select on public.member_requests for select to authenticated
  using (user_id = auth.uid() or public.is_admin());

-- audit_logs: admins read only. No role may update or delete.
grant select on public.audit_logs to authenticated;
create policy audit_logs_admin_read on public.audit_logs for select to authenticated
  using (public.is_admin());

-- islamic_occasions: public read; writes only via function (audited).
grant select on public.islamic_occasions to anon, authenticated;
create policy occasions_public_read on public.islamic_occasions for select to anon, authenticated using (true);

-- Helper functions callable by clients (they only expose booleans / today's date).
grant execute on function public.is_admin() to authenticated;
grant execute on function public.lagos_today() to anon, authenticated;
grant execute on function public.compute_expiry(date, integer) to authenticated;
grant execute on function public.effective_membership_status(public.membership_status, date) to anon, authenticated;

-- Audit changes to organization settings (direct admin UPDATE through the API).
create or replace function public.audit_settings_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  changed jsonb := '{}'::jsonb;
  k text;
  old_j jsonb := to_jsonb(old);
  new_j jsonb := to_jsonb(new);
begin
  for k in select jsonb_object_keys(new_j) loop
    if k not in ('updated_at', 'updated_by') and old_j -> k is distinct from new_j -> k then
      changed := changed || jsonb_build_object(k, jsonb_build_object('from', old_j -> k, 'to', new_j -> k));
    end if;
  end loop;
  new.updated_by := auth.uid();
  if changed <> '{}'::jsonb then
    perform public.write_audit('settings.update', 'organization_settings', null, jsonb_build_object('changes', changed));
  end if;
  return new;
end
$$;
create trigger organization_settings_audit before update on public.organization_settings
  for each row execute function public.audit_settings_change();
