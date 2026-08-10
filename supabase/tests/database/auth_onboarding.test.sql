begin;

create extension if not exists pgtap with schema extensions;

select plan(9);

insert into auth.users (id, email, raw_user_meta_data)
values (
  '33333333-3333-4333-8333-333333333333',
  'new-owner@example.test',
  '{"full_name":"Nuovo Owner"}'::jsonb
)
on conflict (id) do nothing;

set local role authenticated;
set local request.jwt.claim.role = 'authenticated';
set local request.jwt.claim.sub = '33333333-3333-4333-8333-333333333333';

select results_eq(
  $$select count(*)::bigint from public.organization_members where user_id = auth.uid()$$,
  $$values (0::bigint)$$,
  'new authenticated user starts without an organization membership'
);

select lives_ok(
  $$update public.profiles set notification_minutes_before = 0 where id = auth.uid()$$,
  'profile accepts a reminder exactly at the deadline'
);

select throws_ok(
  $$select public.get_my_account()$$,
  'P0002',
  'Organization membership not found',
  'account lookup explicitly signals that onboarding is required'
);

select lives_ok(
  $$select public.bootstrap_my_organization('Nuovo Owner', 'Pulito Nuovo', 'Pulizie e servizi', 'Potenza')$$,
  'authenticated user can bootstrap the first organization'
);

select results_eq(
  $$select role from public.organization_members where user_id = auth.uid()$$,
  $$values ('owner'::text)$$,
  'bootstrap assigns owner role to the creator'
);

select is(
  (public.get_my_account() -> 'organization' ->> 'name'),
  'Pulito Nuovo',
  'bootstrap returns the created organization as the active workspace'
);

select is(
  (public.get_my_account() -> 'profile' ->> 'full_name'),
  'Nuovo Owner',
  'bootstrap persists the operator full name'
);

select lives_ok(
  $$select public.bootstrap_my_organization('Nuovo Owner', 'Seconda Azienda', 'Altro', 'Matera')$$,
  'bootstrap is safe to retry after the membership already exists'
);

select results_eq(
  $$select count(*)::bigint from public.organization_members where user_id = auth.uid()$$,
  $$values (1::bigint)$$,
  'retry does not create a second membership or workspace'
);

select * from finish();
rollback;
