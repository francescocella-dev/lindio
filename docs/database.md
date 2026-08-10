# Lindio database foundation

This document describes the first reproducible backend baseline for Lindio.

## Scope

The database models the minimum product boundary needed by the current application:

- Supabase Auth users;
- user profiles;
- organizations;
- organization memberships;
- commercial leads;
- lead notes.

The application is still intentionally optimized for a small business with one active workspace in the UI. The database does not hard-code that limitation: a user can have memberships in more than one organization, while the current frontend resolves the first membership until a workspace selector is introduced.

## Multi-tenant boundary

`organization_members` is the authorization source of truth. Every tenant-owned row carries an `organization_id` and Row Level Security checks membership through server-side helper functions.

Important properties:

1. unauthenticated requests cannot access application rows;
2. authenticated users can only select organizations, leads and notes belonging to an organization they belong to;
3. organization settings can only be updated by an `owner` membership;
4. a lead note has a composite foreign key `(lead_id, organization_id)`, preventing a note from being attached to a lead from another tenant;
5. tenant identifiers are never changed by the lead update RPC;
6. composed writes are exposed as database functions so lead + initial note, lead + new notes, and account + organization updates succeed or fail atomically.

## Reproducible local environment

Prerequisites:

- Node.js 24 LTS;
- repository-pinned Supabase CLI (`supabase@2.110.0`);
- Docker Desktop or another Docker-compatible runtime.

From the repository root:

```bash
npx supabase start
npx supabase db reset --local
npx supabase test db --local
npx supabase db lint --local --level warning --fail-on error
```

`supabase db reset --local` drops the local database, replays every migration and then runs `supabase/seed.sql`.

After `npx supabase start`, copy the local project URL and anon key shown by `npx supabase status` into `.env.local` using `.env.example` as the template. Lindio uses project-specific local ports in `supabase/config.toml` so it can coexist with other Supabase projects.

## Seed data

`supabase/seed.sql` contains only synthetic development data. It creates two independent organizations and two test principals so that isolation can be tested deterministically.

The seeded `auth.users` rows are database test principals, not login-ready demo accounts. A user-facing demo/login flow is intentionally deferred to the authentication/demo milestone rather than mixing that concern into the database foundation.

No production data and no information from the real-world validation is included in the seed.

## Transactional commands

### `get_my_account()`

Returns the authenticated user's profile, selected membership and organization in one server-side contract.

### `update_my_account(...)`

Requires an owner membership and updates organization settings plus the authenticated profile in one transaction.

### `create_lead_with_initial_note(...)`

Checks membership, creates the lead and its initial note in one transaction. The organization is checked server-side before any write occurs.

### `update_lead_with_notes(...)`

Loads the existing lead server-side, verifies membership in its organization, updates the lead and inserts any new notes in the same transaction. The caller cannot move a lead to a different organization through this function.

## Current intentional limits

This milestone does not yet implement:

- signup/onboarding and organization creation;
- a workspace switcher;
- invitation flows;
- granular roles beyond `owner` and `member`;
- user-facing local demo authentication;
- browser E2E tests.

Those concerns are kept outside this database milestone so the tenancy and transactional guarantees stay small enough to reason about and test.
