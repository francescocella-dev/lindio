# Lindio database and tenancy

## Scope

The reproducible Supabase/PostgreSQL backend models the authenticated application boundary used by Lindio:

- Supabase Auth users;
- user profiles;
- organizations;
- organization memberships;
- commercial leads;
- lead notes.

The frontend currently operates one active workspace at a time. The schema can represent multiple memberships, but the UI intentionally resolves one membership until an explicit workspace selector is justified.

## Multi-tenant authorization boundary

`organization_members` is the authorization source of truth. Tenant-owned rows carry an `organization_id`, and Row Level Security checks authenticated membership server-side.

Important properties include:

1. unauthenticated requests cannot read application rows;
2. authenticated users can only read organizations, leads and notes for organizations they belong to;
3. organization/account updates require the appropriate owner membership;
4. lead notes use the composite `(lead_id, organization_id)` relationship so a note cannot cross tenant boundaries;
5. tenant identifiers are not reassigned through lead workflow commands;
6. lead/account writes are exposed as server-side functions so related changes succeed or fail atomically.

RLS protects read isolation. Workflow RPC authorization, privileges and constraints protect the write path.

## Reproducible local environment

Prerequisites:

- Node.js 24.18.0;
- repository-pinned Supabase CLI `supabase@2.110.0`;
- Docker Desktop or another Docker-compatible runtime.

From the repository root:

```bash
npx supabase start
npx supabase db reset --local
npx supabase test db --local
npx supabase db lint --local --level warning --fail-on error
```

`supabase db reset --local` recreates the database, replays every migration and runs `supabase/seed.sql`.

The local project uses dedicated ports, including API `55321` and PostgreSQL `55322`, defined in `supabase/config.toml`. After startup, copy the project URL and browser-safe anon/publishable key from `npx supabase status` into `.env.local` using `.env.example` as the template.

## Authentication and onboarding

Supabase Auth owns user identity. The application profile is created for a new auth user, while the first organization is provisioned through an authenticated transactional bootstrap command.

`bootstrap_my_organization(...)` is retry-safe: an already-provisioned user receives the existing workspace instead of silently creating duplicate organizations.

`get_my_account()` returns the authenticated profile, selected membership and organization as one application-facing contract. See [`architecture/authentication-and-demo.md`](architecture/authentication-and-demo.md) for the complete account lifecycle and local demo separation.

## Seed data

`supabase/seed.sql` contains synthetic development/test data only. It creates independent organizations/principals so tenant isolation can be tested deterministically.

Seeded database principals are not the browser demo account. User-facing demo mode is explicitly local-only and uses synthetic browser data without authenticating against Supabase.

No production customer data is required by the local database tests.

## Transactional commands

### `get_my_account()`

Returns the authenticated user's profile, membership and organization in one server-side contract.

### `bootstrap_my_organization(...)`

Creates the first organization and owner membership for an authenticated user that still requires onboarding. Repeated calls are safe for an already-provisioned account.

### `update_my_account(...)`

Updates organization settings and the authenticated profile in one authorized transaction.

### `create_lead_with_initial_note(...)`

Checks membership, creates the lead and its optional initial note as one transaction. Tenant ownership is checked server-side.

### `update_lead_with_notes(...)`

Loads and locks the current lead, verifies membership, checks the caller's expected version, updates lead fields and appends new notes in one transaction.

A stale version is rejected instead of applying a last-write-wins overwrite. The returned row becomes the authoritative client snapshot after a successful command.

## RPC-only workflow writes

Authenticated browser clients retain RLS-protected reads, but direct lead/note mutation privileges are restricted so the supported write path cannot bypass:

- tenant checks;
- lead + note atomicity;
- version/concurrency checks;
- consistent return contracts.

See [`architecture/workflow-reliability.md`](architecture/workflow-reliability.md).

## Database verification

The pgTAP suite covers:

- schema/domain constraints;
- RLS tenant isolation;
- account/onboarding boundaries;
- transactional lead and note writes;
- mutation permissions;
- optimistic concurrency and stale-write rejection.

Database lint runs after a clean migration reset both locally and in GitHub Actions.

## Current intentional limits

- the UI has no multi-workspace switcher;
- organization invitation flows are not implemented;
- the product does not expose a fine-grained enterprise permission matrix;
- hosted real-auth browser acceptance is not part of the default CI suite;
- Supabase-backed mutations are not queued for offline synchronization.

These are explicit product/infrastructure limits rather than hidden database capabilities.
