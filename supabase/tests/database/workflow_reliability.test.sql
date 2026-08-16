begin;

create extension if not exists pgtap with schema extensions;

select plan(11);

select has_column('public', 'leads', 'version', 'leads expose a concurrency version');

select is(
  (select version from public.leads where id = 'a1000000-0000-4000-8000-000000000001'::uuid),
  1,
  'seeded leads start at version 1'
);

select ok(
  to_regprocedure('public.update_lead_with_notes(uuid,integer,jsonb,jsonb)') is not null,
  'version-aware transactional update RPC exists'
);

set local role authenticated;
set local request.jwt.claim.role = 'authenticated';
set local request.jwt.claim.sub = '11111111-1111-4111-8111-111111111111';

select lives_ok(
  $$
    select public.update_lead_with_notes(
      'a1000000-0000-4000-8000-000000000001'::uuid,
      1,
      '{
        "customer_name":"Cliente Demo A",
        "customer_phone":"+39 333 0000000",
        "customer_email":"",
        "source":"WhatsApp",
        "service_type":"Pulizia appartamento",
        "city":"Potenza",
        "address":"",
        "urgency":"Media",
        "status":"In attesa",
        "next_action":"Attendere riscontro",
        "follow_up_at":"",
        "estimated_value":"120",
        "raw_message":"Messaggio sintetico del tenant A.",
        "ai_summary":"Richiesta sintetica per una pulizia appartamento.",
        "ai_suggested_reply":"Buongiorno, grazie per averci contattato."
      }'::jsonb,
      '["Aggiornamento versione 2"]'::jsonb
    )
  $$,
  'fresh version can update lead and notes atomically'
);

select is(
  (select version from public.leads where id = 'a1000000-0000-4000-8000-000000000001'::uuid),
  2,
  'successful update increments the lead version'
);

select results_eq(
  $$
    select count(*)::bigint
    from public.lead_notes
    where lead_id = 'a1000000-0000-4000-8000-000000000001'::uuid
      and note = 'Aggiornamento versione 2'
  $$,
  $$values (1::bigint)$$,
  'successful update appends its note'
);

select throws_ok(
  $$
    select public.update_lead_with_notes(
      'a1000000-0000-4000-8000-000000000001'::uuid,
      1,
      '{
        "customer_name":"Cliente Demo A",
        "customer_phone":"+39 333 0000000",
        "customer_email":"",
        "source":"WhatsApp",
        "service_type":"Pulizia appartamento",
        "city":"Potenza",
        "address":"",
        "urgency":"Media",
        "status":"Vinta",
        "next_action":"Nessuna azione",
        "follow_up_at":"",
        "estimated_value":"120",
        "raw_message":"Messaggio sintetico del tenant A.",
        "ai_summary":"Richiesta sintetica per una pulizia appartamento.",
        "ai_suggested_reply":"Buongiorno, grazie per averci contattato."
      }'::jsonb,
      '["Questa nota non deve essere salvata"]'::jsonb
    )
  $$,
  '40001',
  'Lead version conflict',
  'stale version is rejected explicitly'
);

select is(
  (select status from public.leads where id = 'a1000000-0000-4000-8000-000000000001'::uuid),
  'In attesa',
  'stale update does not overwrite the latest lead state'
);

select results_eq(
  $$
    select count(*)::bigint
    from public.lead_notes
    where lead_id = 'a1000000-0000-4000-8000-000000000001'::uuid
      and note = 'Questa nota non deve essere salvata'
  $$,
  $$values (0::bigint)$$,
  'stale update does not append notes'
);

select ok(
  not has_column_privilege('authenticated', 'public.leads', 'status', 'UPDATE'),
  'authenticated role cannot bypass the update RPC with direct lead writes'
);

select ok(
  not has_column_privilege('authenticated', 'public.lead_notes', 'note', 'INSERT'),
  'authenticated role cannot bypass the update RPC with direct note inserts'
);

select * from finish();
rollback;
