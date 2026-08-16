-- M4: reliable lead mutations with optimistic concurrency and RPC-only writes.

alter table public.leads
  add column version integer not null default 1;

alter table public.leads
  add constraint leads_version_positive check (version > 0);

-- Application writes are intentionally restricted to transactional RPCs.
-- Reads remain available through RLS-protected SELECT queries.
revoke insert (
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
) on public.leads from authenticated;

revoke update (
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
) on public.leads from authenticated;

revoke insert (organization_id, lead_id, note)
  on public.lead_notes from authenticated;

drop function public.update_lead_with_notes(uuid, jsonb, jsonb);

create function public.update_lead_with_notes(
  p_lead_id uuid,
  p_expected_version integer,
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

  if p_expected_version is null or p_expected_version < 1 then
    raise exception using errcode = '22023', message = 'Expected lead version must be positive';
  end if;

  select *
  into current_lead
  from public.leads
  where id = p_lead_id
  for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'Lead not found';
  end if;

  if not private.is_organization_member(current_lead.organization_id) then
    raise exception using errcode = '42501', message = 'Organization membership required';
  end if;

  if current_lead.version <> p_expected_version then
    raise exception using errcode = '40001', message = 'Lead version conflict';
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
    ai_suggested_reply = coalesce(btrim(p_lead ->> 'ai_suggested_reply'), ''),
    version = current_lead.version + 1
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

revoke all on function public.update_lead_with_notes(uuid, integer, jsonb, jsonb)
  from public, anon;
grant execute on function public.update_lead_with_notes(uuid, integer, jsonb, jsonb)
  to authenticated;
