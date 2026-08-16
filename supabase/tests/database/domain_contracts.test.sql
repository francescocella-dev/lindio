begin;

create extension if not exists pgtap with schema extensions;

select plan(3);

select ok(
  exists (
    select 1
    from pg_constraint
    where conrelid = 'public.leads'::regclass
      and conname = 'leads_next_action_allowed'
  ),
  'leads enforces the next action domain at database level'
);

-- These are schema-contract tests, not application-permission tests.
-- M4 intentionally revokes direct lead writes from the authenticated role;
-- workflow_reliability.test.sql verifies that boundary separately.
-- Keep a JWT subject so auth.uid() can satisfy created_by defaults while the
-- test runner retains its privileged role and can exercise raw constraints.
set local request.jwt.claim.role = 'authenticated';
set local request.jwt.claim.sub = '11111111-1111-4111-8111-111111111111';

select throws_ok(
  $$
    insert into public.leads (
      organization_id,
      customer_name,
      source,
      urgency,
      status,
      next_action
    )
    values (
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid,
      'Invalid domain action',
      'WhatsApp',
      'Media',
      'Nuova',
      'Azione inventata'
    )
  $$,
  '23514',
  null,
  'database rejects next actions outside the application domain'
);

select lives_ok(
  $$
    insert into public.leads (
      organization_id,
      customer_name,
      source,
      urgency,
      status
    )
    values (
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid,
      'Default action contract',
      'Telefono',
      'Bassa',
      'Nuova'
    )
  $$,
  'schema default keeps a safe valid next-action value'
);

select * from finish();
rollback;
