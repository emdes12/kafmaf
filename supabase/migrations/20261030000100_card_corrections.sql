-- Card corrections supplied by KAFMAF (corrected printed card, October 2026):
--   * the organisation's registration number ("RC: 106730") beside the short name;
--   * an "If found, kindly call …" notice on the back of the card;
--   * the member's level (e.g. "Student") on the front, in place of the membership number.

-- ---------------------------------------------------------------------------
-- Organisation settings
-- ---------------------------------------------------------------------------
alter table public.organization_settings
  add column registration_number text check (registration_number is null or char_length(registration_number) <= 40),
  add column card_found_notice text check (card_found_notice is null or char_length(card_found_notice) <= 160);

grant update (registration_number, card_found_notice) on public.organization_settings to authenticated;

-- Values as printed on the corrected card supplied by the organisation.
update public.organization_settings set
  registration_number = '106730',
  card_found_notice = 'If found, kindly call 09035858377 or 08060593860'
where id = 1;

-- ---------------------------------------------------------------------------
-- Member level
-- ---------------------------------------------------------------------------
alter table public.members
  add column membership_level text check (membership_level is null or char_length(membership_level) between 1 and 40);

-- `m.*` in the view is expanded when the view is created, so rebuild it to include the new column.
drop view public.members_with_status;
create view public.members_with_status
with (security_invoker = true) as
  select m.*, public.effective_membership_status(m.status, m.expiry_date) as effective_status
  from public.members m;
grant select on public.members_with_status to authenticated;

-- admin_update_member gains the level. NULL leaves the level unchanged; an empty string clears it.
drop function public.admin_update_member(uuid, text, text, text[]);
create or replace function public.admin_update_member(
  p_member_id uuid,
  p_full_name text,
  p_display_name text,
  p_disciplines text[],
  p_level text default null
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
    disciplines = v_disciplines,
    membership_level = case
      when p_level is null then membership_level
      else nullif(regexp_replace(btrim(p_level), '\s+', ' ', 'g'), '')
    end
  where id = p_member_id
  returning * into m;
  perform public.write_audit('member.update', 'member', m.id, jsonb_build_object(
    'full_name_changed', before_row.full_name is distinct from m.full_name,
    'display_name_changed', before_row.display_name is distinct from m.display_name,
    'disciplines', jsonb_build_object('from', before_row.disciplines, 'to', m.disciplines),
    'level', jsonb_build_object('from', before_row.membership_level, 'to', m.membership_level)));
  return m;
end
$$;

revoke execute on function public.admin_update_member(uuid, text, text, text[], text) from public, anon;
grant execute on function public.admin_update_member(uuid, text, text, text[], text) to authenticated;
