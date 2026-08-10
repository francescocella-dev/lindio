-- Synthetic local development data only. No production or validation data is included.

insert into auth.users (id, email, raw_user_meta_data)
values
  (
    '11111111-1111-4111-8111-111111111111',
    'tenant-a@example.test',
    '{"full_name":"Mario Rossi"}'::jsonb
  ),
  (
    '22222222-2222-4222-8222-222222222222',
    'tenant-b@example.test',
    '{"full_name":"Giulia Bianchi"}'::jsonb
  )
on conflict (id) do nothing;

insert into public.organizations (id, name, sector, city, phone, email, address)
values
  (
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    'Pulito Demo',
    'Impresa di pulizie',
    'Potenza',
    '+39 000 0000000',
    'info@pulito-demo.example',
    'Via Demo 1'
  ),
  (
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    'Brillo Demo',
    'Impresa di pulizie',
    'Matera',
    '+39 000 0000001',
    'info@brillo-demo.example',
    'Via Demo 2'
  )
on conflict (id) do nothing;

update public.profiles
set
  full_name = case
    when id = '11111111-1111-4111-8111-111111111111' then 'Mario Rossi'
    when id = '22222222-2222-4222-8222-222222222222' then 'Giulia Bianchi'
    else full_name
  end,
  notification_enabled = true,
  notification_minutes_before = 30
where id in (
  '11111111-1111-4111-8111-111111111111',
  '22222222-2222-4222-8222-222222222222'
);

insert into public.organization_members (organization_id, user_id, role)
values
  (
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    '11111111-1111-4111-8111-111111111111',
    'owner'
  ),
  (
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    '22222222-2222-4222-8222-222222222222',
    'owner'
  )
on conflict (organization_id, user_id) do nothing;

insert into public.leads (
  id,
  organization_id,
  created_by,
  customer_name,
  customer_phone,
  source,
  service_type,
  city,
  urgency,
  status,
  next_action,
  follow_up_at,
  estimated_value,
  raw_message,
  ai_summary,
  ai_suggested_reply
)
values
  (
    'a1000000-0000-4000-8000-000000000001',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    '11111111-1111-4111-8111-111111111111',
    'Cliente Demo A',
    '+39 333 0000000',
    'WhatsApp',
    'Pulizia appartamento',
    'Potenza',
    'Media',
    'Da rispondere',
    'Rispondere al cliente',
    now() + interval '1 day',
    120,
    'Messaggio sintetico del tenant A.',
    'Richiesta sintetica per una pulizia appartamento.',
    'Buongiorno, grazie per averci contattato.'
  ),
  (
    'b1000000-0000-4000-8000-000000000001',
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    '22222222-2222-4222-8222-222222222222',
    'Cliente Demo B',
    '+39 333 0000001',
    'Email',
    'Pulizia ufficio',
    'Matera',
    'Alta',
    'Preventivo da preparare',
    'Preparare preventivo',
    now() + interval '2 days',
    260,
    'Messaggio sintetico del tenant B.',
    'Richiesta sintetica per una pulizia ufficio.',
    'Buongiorno, prepariamo il preventivo richiesto.'
  )
on conflict (id) do nothing;

insert into public.lead_notes (id, organization_id, lead_id, author_id, note)
values
  (
    'a2000000-0000-4000-8000-000000000001',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    'a1000000-0000-4000-8000-000000000001',
    '11111111-1111-4111-8111-111111111111',
    'Richiesta demo creata per il tenant A.'
  ),
  (
    'b2000000-0000-4000-8000-000000000001',
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    'b1000000-0000-4000-8000-000000000001',
    '22222222-2222-4222-8222-222222222222',
    'Richiesta demo creata per il tenant B.'
  )
on conflict (id) do nothing;
