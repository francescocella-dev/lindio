# Authentication, onboarding and demo mode

## Scope

Lindio supports two deliberately separate execution modes:

- **Database mode** uses Supabase Auth, PostgreSQL, RLS and the active organization membership.
- **Demo mode** is local-only. It uses synthetic data in the browser and never pretends to be an authenticated Supabase workspace.

The separation is intentional: a recruiter or product reviewer can explore the complete operational flow without provisioning credentials, while the real application path keeps its security guarantees.

## Real account lifecycle

1. A user signs up with email, password and display name.
2. Supabase Auth creates the identity. The existing `on_auth_user_created` trigger creates the application profile.
3. An authenticated user without a membership is treated as **onboarding required**, not as a broken account.
4. `bootstrap_my_organization(...)` creates the first organization and owner membership transactionally.
5. The function is retry-safe: if the user already has a membership, it returns the existing workspace instead of creating another organization.
6. All later data access continues to rely on RLS membership checks.

Local development explicitly disables email confirmation so the signup/onboarding loop can be tested without an external SMTP provider. Hosted environments may enable confirmation; the UI also handles signup responses that do not immediately contain a session.

## Auth event handling

The Supabase `onAuthStateChange` callback only updates React session state. It does not make further asynchronous Supabase calls. Account and lead loading happens in a separate effect after session state changes.

This avoids coupling auth-event delivery to data fetching and protects the app from the documented `supabase-js` deadlock scenario in which an async Supabase call is started inside an auth-state callback.

## Password recovery

Password recovery is a two-step flow:

1. `resetPasswordForEmail` sends a link whose redirect target is `/reset-password`.
2. The returned recovery session is used with `updateUser({ password })` to set the new password.

The public recovery request uses a generic success message and does not reveal whether a specific email belongs to an account.

## Demo mode

Demo mode is entered explicitly from the login page.

- The demo session flag is stored in `sessionStorage`, so it survives refreshes in the current tab but is not a permanent authentication token.
- Synthetic leads and demo account edits are stored locally in the browser.
- No Supabase Auth or database call is required to enter the demo.
- The top bar shows `Demo locale` while the mode is active.
- Password management is hidden in demo mode because no real credentials exist.

The demo and the database adapters both pass account and lead changes through the same domain validation rules. This reduces behavioral drift without pretending that local persistence provides the same security guarantees as PostgreSQL/RLS.

## Current MVP tenancy decision

The database schema can represent multiple memberships, but the product currently resolves the first membership as the active workspace and has no workspace switcher. The onboarding bootstrap therefore creates only the first workspace and is idempotent for an already-provisioned user.

A future multi-workspace UI should make active-organization selection explicit rather than silently changing this rule.
