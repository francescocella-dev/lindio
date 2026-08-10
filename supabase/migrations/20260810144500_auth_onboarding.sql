alter table public.profiles
  drop constraint if exists profiles_notification_minutes_range;

alter table public.profiles
  add constraint profiles_notification_minutes_range
  check (notification_minutes_before between 0 and 1440);

create or replace function public.bootstrap_my_organization(
  p_full_name text,
  p_organization_name text,
  p_sector text,
  p_city text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  created_organization public.organizations;
begin
  if current_user_id is null then
    raise exception using errcode = '42501', message = 'Authentication required';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(current_user_id::text, 0));

  update public.profiles
  set full_name = coalesce(nullif(btrim(p_full_name), ''), 'Utente')
  where id = current_user_id;

  if not found then
    raise exception using errcode = 'P0002', message = 'Profile not found';
  end if;

  if exists (
    select 1
    from public.organization_members
    where user_id = current_user_id
  ) then
    return public.get_my_account();
  end if;

  insert into public.organizations (name, sector, city)
  values (
    coalesce(nullif(btrim(p_organization_name), ''), 'Azienda'),
    coalesce(nullif(btrim(p_sector), ''), 'Servizi'),
    coalesce(btrim(p_city), '')
  )
  returning * into created_organization;

  insert into public.organization_members (organization_id, user_id, role)
  values (created_organization.id, current_user_id, 'owner');

  return public.get_my_account();
end;
$$;

revoke all on function public.bootstrap_my_organization(text, text, text, text) from public, anon;
grant execute on function public.bootstrap_my_organization(text, text, text, text) to authenticated;
