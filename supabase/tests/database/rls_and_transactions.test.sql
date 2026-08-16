begin;

create extension if not exists pgtap with schema extensions;

select plan(21);

select has_table('public', 'organizations', 'organizations table exists');
select has_table('public', 'profiles', 'profiles table exists');
select has_table('public', 'organization_members', 'organization_members table exists');
select has_table('public', 'leads', 'leads table exists');
select has_table('public', 'lead_notes', 'lead_notes table exists');

select ok(
  (select relrowsecurity from pg_class where oid = 'public.organizations'::regclass),
  'RLS is enabled on organizations'
);
select ok(
  (select relrowsecurity from pg_class where oid = 'public.leads'::regclass),
  'RLS is enabled on leads'
);
select ok(
  (select relrowsecurity from pg_class where oid = 'public.lead_notes'::regclass),
  'RLS is enabled on lead_notes'
);

set local role authenticated;
set local request.jwt.claim.role = 'authenticated';
set local request.jwt.claim.sub = '11111111-1111-4111-8111-111111111111';

select results_eq(
  $$select count(*)::bigint from public.organizations$$,
  $$values (1::bigint)$$,
  'tenant A sees only its organization'
);

select results_eq(
  $$select count(*)::bigint from public.leads$$,
  $$values (1::bigint)$$,
  'tenant A sees only its seeded lead'
);

select is(
  (public.get_my_account() -> 'organization' ->> 'id'),
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  'account lookup resolves tenant A membership'
);

select lives_ok(
  $$
    select public.create_lead_with_initial_note(
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid,
      '{
        "customer_name":"Tenant A transaction test",
        "customer_phone":"",
        "customer_email":"",
        "source":"Telefono",
        "service_type":"Pulizia ufficio",
        "city":"Potenza",
        "address":"",
        "urgency":"Media",
        "status":"Nuova",
        "next_action":"Rispondere al cliente",
        "follow_up_at":"",
        "estimated_value":"90",
        "raw_message":"transaction-marker-a",
        "ai_summary":"",
        "ai_suggested_reply":""
      }'::jsonb,
      'Nota atomica tenant A'
    )
  $$,
  'tenant A can atomically create a lead with its initial note'
);

select results_eq(
  $$
    select count(*)::bigint
    from public.lead_notes n
    join public.leads l on l.id = n.lead_id
    where l.raw_message = 'transaction-marker-a'
      and n.note = 'Nota atomica tenant A'
  $$,
  $$values (1::bigint)$$,
  'atomic create persisted the initial note together with the lead'
);

select throws_ok(
  $$
    select public.create_lead_with_initial_note(
      'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'::uuid,
      '{"customer_name":"Forbidden","source":"WhatsApp","urgency":"Media","status":"Nuova"}'::jsonb,
      'Forbidden note'
    )
  $$,
  '42501',
  'Organization membership required',
  'tenant A cannot create a lead inside tenant B through the transactional RPC'
);

select throws_ok(
  $$
    insert into public.leads (organization_id, customer_name)
    values ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'::uuid, 'Forbidden direct insert')
  $$,
  '42501',
  null,
  'direct lead writes are blocked outside the transactional RPC'
);

reset role;

select throws_ok(
  $$
    insert into public.lead_notes (organization_id, lead_id, author_id, note)
    values (
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid,
      'b1000000-0000-4000-8000-000000000001'::uuid,
      '11111111-1111-4111-8111-111111111111'::uuid,
      'Cross-tenant association attempt'
    )
  $$,
  '23503',
  null,
  'composite foreign key blocks associating a tenant A note with a tenant B lead'
);

set local role authenticated;
set local request.jwt.claim.role = 'authenticated';
set local request.jwt.claim.sub = '11111111-1111-4111-8111-111111111111';

select lives_ok(
  $$
    select public.update_lead_with_notes(
      (select id from public.leads where raw_message = 'transaction-marker-a'),
      1,
      '{
        "customer_name":"Tenant A transaction test",
        "customer_phone":"",
        "customer_email":"",
        "source":"Telefono",
        "service_type":"Pulizia ufficio",
        "city":"Potenza",
        "address":"",
        "urgency":"Media",
        "status":"In attesa",
        "next_action":"Attendere riscontro",
        "follow_up_at":"",
        "estimated_value":"95",
        "raw_message":"transaction-marker-a",
        "ai_summary":"",
        "ai_suggested_reply":""
      }'::jsonb,
      '["Nota aggiornamento atomico"]'::jsonb
    )
  $$,
  'tenant A can atomically update a lead and append notes'
);

select results_eq(
  $$
    select l.status, count(n.id)::bigint
    from public.leads l
    join public.lead_notes n on n.lead_id = l.id
    where l.raw_message = 'transaction-marker-a'
      and n.note = 'Nota aggiornamento atomico'
    group by l.status
  $$,
  $$values ('In attesa'::text, 1::bigint)$$,
  'atomic update persisted both the lead change and its note'
);

set local request.jwt.claim.sub = '22222222-2222-4222-8222-222222222222';

select results_eq(
  $$select count(*)::bigint from public.leads where raw_message = 'transaction-marker-a'$$,
  $$values (0::bigint)$$,
  'tenant B cannot read the lead created by tenant A'
);

select throws_ok(
  $$
    select public.update_lead_with_notes(
      'a1000000-0000-4000-8000-000000000001'::uuid,
      1,
      '{"customer_name":"Forbidden update","source":"WhatsApp","urgency":"Media","status":"Nuova"}'::jsonb,
      '[]'::jsonb
    )
  $$,
  '42501',
  'Organization membership required',
  'tenant B cannot update tenant A lead through the transactional RPC'
);

select throws_ok(
  $$
    select public.update_my_account(
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid,
      'Giulia Bianchi',
      true,
      30,
      'Tentativo cross tenant',
      'Impresa di pulizie',
      'Matera',
      '',
      '',
      ''
    )
  $$,
  '42501',
  'Organization owner role required',
  'tenant B cannot update tenant A organization'
);

select * from finish();
rollback;
