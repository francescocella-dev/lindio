create extension if not exists pgcrypto with schema extensions;

create schema if not exists private;
revoke all on schema private from public;

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'Azienda',
  sector text not null default '',
  city text not null default '',
  phone text not null default '',
  email text not null default '',
  address text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint organizations_name_not_blank check (length(btrim(name)) > 0)
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  notification_enabled boolean not null default false,
  notification_minutes_before integer not null default 30,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_notification_minutes_range
    check (notification_minutes_before between 5 and 1440)
);

create table public.organization_members (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member',
  created_at timestamptz not null default now(),
  primary key (organization_id, user_id),
  constraint organization_members_role_allowed check (role in ('owner', 'member'))
);

create table public.leads (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  created_by uuid not null default auth.uid() references auth.users(id) on delete restrict,
  customer_name text not null default 'Cliente da identificare',
  customer_phone text not null default '',
  customer_email text not null default '',
  source text not null default 'WhatsApp',
  service_type text not null default 'Servizio da definire',
  city text not null default '',
  address text not null default '',
  urgency text not null default 'Media',
  status text not null default 'Nuova',
  next_action text not null default '',
  follow_up_at timestamptz,
  estimated_value numeric(12, 2) not null default 0,
  raw_message text not null default '',
  ai_summary text not null default '',
  ai_suggested_reply text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint leads_source_allowed check (
    source in ('WhatsApp', 'Telefono', 'Email', 'Instagram', 'Facebook', 'Sito/Form', 'Altro')
  ),
  constraint leads_urgency_allowed check (urgency in ('Bassa', 'Media', 'Alta')),
  constraint leads_status_allowed check (
    status in (
      'Nuova',
      'Da rispondere',
      'Info richieste',
      'Sopralluogo da fissare',
      'Preventivo da preparare',
      'Preventivo inviato',
      'In attesa',
      'Vinta',
      'Persa'
    )
  ),
  constraint leads_estimated_value_non_negative check (estimated_value >= 0),
  constraint leads_id_organization_unique unique (id, organization_id)
);

create table public.lead_notes (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  lead_id uuid not null,
  author_id uuid not null default auth.uid() references auth.users(id) on delete restrict,
  note text not null,
  created_at timestamptz not null default now(),
  constraint lead_notes_note_not_blank check (length(btrim(note)) > 0),
  constraint lead_notes_lead_same_organization
    foreign key (lead_id, organization_id)
    references public.leads(id, organization_id)
    on delete cascade
);

create index organization_members_user_id_idx
  on public.organization_members(user_id);
create index leads_organization_follow_up_idx
  on public.leads(organization_id, follow_up_at);
create index leads_organization_created_at_idx
  on public.leads(organization_id, created_at desc);
create index lead_notes_organization_lead_idx
  on public.lead_notes(organization_id, lead_id, created_at desc);

create or replace function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger organizations_set_updated_at
before update on public.organizations
for each row execute function private.set_updated_at();

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function private.set_updated_at();

create trigger leads_set_updated_at
before update on public.leads
for each row execute function private.set_updated_at();

create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', ''))
  on conflict (id) do nothing;

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();

create or replace function private.is_organization_member(target_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.organization_members membership
    where membership.organization_id = target_organization_id
      and membership.user_id = auth.uid()
  );
$$;

create or replace function private.is_organization_owner(target_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.organization_members membership
    where membership.organization_id = target_organization_id
      and membership.user_id = auth.uid()
      and membership.role = 'owner'
  );
$$;

alter table public.organizations enable row level security;
alter table public.profiles enable row level security;
alter table public.organization_members enable row level security;
alter table public.leads enable row level security;
alter table public.lead_notes enable row level security;

create policy organizations_select_for_members
on public.organizations
for select
to authenticated
using ((select private.is_organization_member(id)));

create policy organizations_update_for_owners
on public.organizations
for update
to authenticated
using ((select private.is_organization_owner(id)))
with check ((select private.is_organization_owner(id)));

create policy profiles_select_own
on public.profiles
for select
to authenticated
using ((select auth.uid()) is not null and id = (select auth.uid()));

create policy profiles_update_own
on public.profiles
for update
to authenticated
using ((select auth.uid()) is not null and id = (select auth.uid()))
with check ((select auth.uid()) is not null and id = (select auth.uid()));

create policy organization_members_select_for_members
on public.organization_members
for select
to authenticated
using ((select private.is_organization_member(organization_id)));

create policy leads_select_for_members
on public.leads
for select
to authenticated
using ((select private.is_organization_member(organization_id)));

create policy leads_insert_for_members
on public.leads
for insert
to authenticated
with check (
  (select auth.uid()) is not null
  and created_by = (select auth.uid())
  and (select private.is_organization_member(organization_id))
);

create policy leads_update_for_members
on public.leads
for update
to authenticated
using ((select private.is_organization_member(organization_id)))
with check ((select private.is_organization_member(organization_id)));

create policy lead_notes_select_for_members
on public.lead_notes
for select
to authenticated
using ((select private.is_organization_member(organization_id)));

create policy lead_notes_insert_for_members
on public.lead_notes
for insert
to authenticated
with check (
  (select auth.uid()) is not null
  and author_id = (select auth.uid())
  and (select private.is_organization_member(organization_id))
);

create or replace function public.get_my_account()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  account_profile public.profiles;
  account_membership public.organization_members;
  account_organization public.organizations;
begin
  if current_user_id is null then
    raise exception using errcode = '42501', message = 'Authentication required';
  end if;

  select *
  into account_profile
  from public.profiles
  where id = current_user_id;

  if not found then
    raise exception using errcode = 'P0002', message = 'Profile not found';
  end if;

  select *
  into account_membership
  from public.organization_members
  where user_id = current_user_id
  order by created_at asc, organization_id asc
  limit 1;

  if not found then
    raise exception using errcode = 'P0002', message = 'Organization membership not found';
  end if;

  select *
  into account_organization
  from public.organizations
  where id = account_membership.organization_id;

  return jsonb_build_object(
    'profile', jsonb_build_object(
      'id', account_profile.id,
      'organization_id', account_membership.organization_id,
      'full_name', account_profile.full_name,
      'role', account_membership.role,
      'notification_enabled', account_profile.notification_enabled,
      'notification_minutes_before', account_profile.notification_minutes_before
    ),
    'organization', jsonb_build_object(
      'id', account_organization.id,
      'name', account_organization.name,
      'sector', account_organization.sector,
      'city', account_organization.city,
      'phone', account_organization.phone,
      'email', account_organization.email,
      'address', account_organization.address
    )
  );
end;
$$;

create or replace function public.update_my_account(
  p_organization_id uuid,
  p_full_name text,
  p_notification_enabled boolean,
  p_notification_minutes_before integer,
  p_organization_name text,
  p_sector text,
  p_city text,
  p_phone text,
  p_email text,
  p_address text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
begin
  if current_user_id is null then
    raise exception using errcode = '42501', message = 'Authentication required';
  end if;

  if not private.is_organization_owner(p_organization_id) then
    raise exception using errcode = '42501', message = 'Organization owner role required';
  end if;

  update public.organizations
  set
    name = coalesce(nullif(btrim(p_organization_name), ''), 'Azienda'),
    sector = coalesce(btrim(p_sector), ''),
    city = coalesce(btrim(p_city), ''),
    phone = coalesce(btrim(p_phone), ''),
    email = coalesce(btrim(p_email), ''),
    address = coalesce(btrim(p_address), '')
  where id = p_organization_id;

  update public.profiles
  set
    full_name = coalesce(nullif(btrim(p_full_name), ''), 'Utente'),
    notification_enabled = coalesce(p_notification_enabled, false),
    notification_minutes_before = coalesce(p_notification_minutes_before, 30)
  where id = current_user_id;

  return public.get_my_account();
end;
$$;

create or replace function public.create_lead_with_initial_note(
  p_organization_id uuid,
  p_lead jsonb,
  p_initial_note text default 'Richiesta creata'
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  created_lead public.leads;
  estimated_value_value numeric(12, 2);
begin
  if current_user_id is null then
    raise exception using errcode = '42501', message = 'Authentication required';
  end if;

  if not private.is_organization_member(p_organization_id) then
    raise exception using errcode = '42501', message = 'Organization membership required';
  end if;

  estimated_value_value := greatest(coalesce(nullif(p_lead ->> 'estimated_value', '')::numeric, 0), 0);

  insert into public.leads (
    organization_id,
    created_by,
    customer_name,
    customer_phone,
    customer_email,
    source,
    service_type,
    city,
    address,
    urgency,
    status,
    next_action,
    follow_up_at,
    estimated_value,
    raw_message,
    ai_summary,
    ai_suggested_reply
  )
  values (
    p_organization_id,
    current_user_id,
    coalesce(nullif(btrim(p_lead ->> 'customer_name'), ''), 'Cliente da identificare'),
    coalesce(btrim(p_lead ->> 'customer_phone'), ''),
    coalesce(btrim(p_lead ->> 'customer_email'), ''),
    coalesce(nullif(p_lead ->> 'source', ''), 'WhatsApp'),
    coalesce(nullif(btrim(p_lead ->> 'service_type'), ''), 'Servizio da definire'),
    coalesce(btrim(p_lead ->> 'city'), ''),
    coalesce(btrim(p_lead ->> 'address'), ''),
    coalesce(nullif(p_lead ->> 'urgency', ''), 'Media'),
    coalesce(nullif(p_lead ->> 'status', ''), 'Nuova'),
    coalesce(btrim(p_lead ->> 'next_action'), ''),
    nullif(p_lead ->> 'follow_up_at', '')::timestamptz,
    estimated_value_value,
    coalesce(btrim(p_lead ->> 'raw_message'), ''),
    coalesce(btrim(p_lead ->> 'ai_summary'), ''),
    coalesce(btrim(p_lead ->> 'ai_suggested_reply'), '')
  )
  returning * into created_lead;

  if nullif(btrim(p_initial_note), '') is not null then
    insert into public.lead_notes (organization_id, lead_id, author_id, note)
    values (created_lead.organization_id, created_lead.id, current_user_id, btrim(p_initial_note));
  end if;

  return jsonb_build_object(
    'lead', to_jsonb(created_lead),
    'notes', coalesce(
      (
        select jsonb_agg(to_jsonb(note_row) order by note_row.created_at desc)
        from public.lead_notes note_row
        where note_row.lead_id = created_lead.id
      ),
      '[]'::jsonb
    )
  );
end;
$$;

create or replace function public.update_lead_with_notes(
  p_lead_id uuid,
  p_lead jsonb,
  p_new_notes jsonb default '[]'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  current_lead public.leads;
  updated_lead public.leads;
  note_item jsonb;
  note_text text;
  estimated_value_value numeric(12, 2);
begin
  if current_user_id is null then
    raise exception using errcode = '42501', message = 'Authentication required';
  end if;

  select *
  into current_lead
  from public.leads
  where id = p_lead_id;

  if not found then
    raise exception using errcode = 'P0002', message = 'Lead not found';
  end if;

  if not private.is_organization_member(current_lead.organization_id) then
    raise exception using errcode = '42501', message = 'Organization membership required';
  end if;

  if jsonb_typeof(coalesce(p_new_notes, '[]'::jsonb)) <> 'array' then
    raise exception using errcode = '22023', message = 'p_new_notes must be a JSON array';
  end if;

  estimated_value_value := greatest(coalesce(nullif(p_lead ->> 'estimated_value', '')::numeric, 0), 0);

  update public.leads
  set
    customer_name = coalesce(nullif(btrim(p_lead ->> 'customer_name'), ''), 'Cliente da identificare'),
    customer_phone = coalesce(btrim(p_lead ->> 'customer_phone'), ''),
    customer_email = coalesce(btrim(p_lead ->> 'customer_email'), ''),
    source = coalesce(nullif(p_lead ->> 'source', ''), 'WhatsApp'),
    service_type = coalesce(nullif(btrim(p_lead ->> 'service_type'), ''), 'Servizio da definire'),
    city = coalesce(btrim(p_lead ->> 'city'), ''),
    address = coalesce(btrim(p_lead ->> 'address'), ''),
    urgency = coalesce(nullif(p_lead ->> 'urgency', ''), 'Media'),
    status = coalesce(nullif(p_lead ->> 'status', ''), 'Nuova'),
    next_action = coalesce(btrim(p_lead ->> 'next_action'), ''),
    follow_up_at = nullif(p_lead ->> 'follow_up_at', '')::timestamptz,
    estimated_value = estimated_value_value,
    raw_message = coalesce(btrim(p_lead ->> 'raw_message'), ''),
    ai_summary = coalesce(btrim(p_lead ->> 'ai_summary'), ''),
    ai_suggested_reply = coalesce(btrim(p_lead ->> 'ai_suggested_reply'), '')
  where id = current_lead.id
  returning * into updated_lead;

  for note_item in
    select value from jsonb_array_elements(coalesce(p_new_notes, '[]'::jsonb))
  loop
    note_text := btrim(
      case
        when jsonb_typeof(note_item) = 'string' then note_item #>> '{}'
        else coalesce(note_item ->> 'text', '')
      end
    );

    if note_text <> '' then
      insert into public.lead_notes (organization_id, lead_id, author_id, note)
      values (updated_lead.organization_id, updated_lead.id, current_user_id, note_text);
    end if;
  end loop;

  return jsonb_build_object(
    'lead', to_jsonb(updated_lead),
    'notes', coalesce(
      (
        select jsonb_agg(to_jsonb(note_row) order by note_row.created_at desc)
        from public.lead_notes note_row
        where note_row.lead_id = updated_lead.id
      ),
      '[]'::jsonb
    )
  );
end;
$$;

revoke all on all tables in schema public from anon;
revoke all on all tables in schema public from authenticated;

revoke all on function public.get_my_account() from public, anon;
revoke all on function public.update_my_account(uuid, text, boolean, integer, text, text, text, text, text, text) from public, anon;
revoke all on function public.create_lead_with_initial_note(uuid, jsonb, text) from public, anon;
revoke all on function public.update_lead_with_notes(uuid, jsonb, jsonb) from public, anon;

revoke all on function private.is_organization_member(uuid) from public, anon;
revoke all on function private.is_organization_owner(uuid) from public, anon;

revoke all on function private.set_updated_at() from public, anon, authenticated;
revoke all on function private.handle_new_user() from public, anon, authenticated;

revoke all on schema private from anon;
grant usage on schema private to authenticated;

grant execute on function private.is_organization_member(uuid) to authenticated;
grant execute on function private.is_organization_owner(uuid) to authenticated;

grant select on public.organizations to authenticated;
grant update (name, sector, city, phone, email, address) on public.organizations to authenticated;

grant select on public.profiles to authenticated;
grant update (full_name, notification_enabled, notification_minutes_before) on public.profiles to authenticated;

grant select on public.organization_members to authenticated;

grant select on public.leads to authenticated;
grant insert (
  organization_id,
  customer_name,
  customer_phone,
  customer_email,
  source,
  service_type,
  city,
  address,
  urgency,
  status,
  next_action,
  follow_up_at,
  estimated_value,
  raw_message,
  ai_summary,
  ai_suggested_reply
) on public.leads to authenticated;
grant update (
  customer_name,
  customer_phone,
  customer_email,
  source,
  service_type,
  city,
  address,
  urgency,
  status,
  next_action,
  follow_up_at,
  estimated_value,
  raw_message,
  ai_summary,
  ai_suggested_reply
) on public.leads to authenticated;

grant select on public.lead_notes to authenticated;
grant insert (organization_id, lead_id, note) on public.lead_notes to authenticated;

grant execute on function public.get_my_account() to authenticated;
grant execute on function public.update_my_account(uuid, text, boolean, integer, text, text, text, text, text, text) to authenticated;
grant execute on function public.create_lead_with_initial_note(uuid, jsonb, text) to authenticated;
grant execute on function public.update_lead_with_notes(uuid, jsonb, jsonb) to authenticated;
