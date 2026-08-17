# Testing strategy

## Scope

M6 adds a browser-level quality gate to Lindio's existing unit and PostgreSQL test foundation. The goal is not to maximize a coverage percentage. The goal is to make each test layer responsible for a different class of regression and to prove the product's critical user journey through the real browser UI.

## Test pyramid

### 1. Unit and application tests

`npm run test:unit`

These tests exercise deterministic logic without a browser or database. Current coverage includes:

- lead validation and normalization;
- workflow semantics and time-based lead operations;
- application error mapping;
- authentication and onboarding validation;
- local/demo persistence services;
- Supabase repository adapters with controlled test doubles;
- deterministic intake analysis and its runtime contract.

This layer should remain fast and precise. It is the right place for edge cases and failure-mode matrices.

### 2. PostgreSQL / Supabase tests

`npx supabase test db --local`

pgTAP tests run against a database recreated from migrations and seed data. They verify behavior that application mocks cannot prove reliably:

- schema/domain constraints;
- RLS tenant isolation;
- membership and account onboarding boundaries;
- transactional lead + note writes;
- RPC-only mutation permissions;
- optimistic concurrency and stale-write rejection.

The CI database job starts local Supabase and performs a clean reset before executing these tests and database linting.

### 3. Browser E2E tests

`npm run test:e2e`

Playwright drives the actual React application through Chromium. M6 deliberately keeps this suite small and focused on product wiring that lower layers cannot prove.

The critical demo journey verifies:

1. entering the explicit local demo from the login boundary;
2. navigating to a new request;
3. pasting a synthetic customer message;
4. executing the deterministic intake analyzer through the UI;
5. reviewing and applying its suggestions;
6. saving the lead;
7. reloading the page and proving local persistence;
8. changing an operational workflow field;
9. adding a note;
10. reloading again and proving both mutations persist;
11. logging out and confirming protected routes return to login.

The tests use user-facing roles and labels instead of CSS classes or implementation-specific selectors. No production credentials, customer data or external services are required.

## Why the default E2E path uses demo mode

Demo mode is a real supported Lindio execution path, not a mocked HTML fixture. It uses the application's router, React state orchestration, deterministic analyzer, domain validation and local persistence services. This makes it a useful browser acceptance boundary while keeping the E2E job deterministic and independent from external infrastructure.

M6 does **not** add a browser signup/onboarding scenario against Supabase. Doing that reliably would couple the E2E job to the local auth stack, generated credentials and service startup while substantially overlapping existing auth repository tests plus pgTAP coverage for account bootstrap and tenancy. That trade-off is not justified yet.

A real-auth browser smoke test can be added later if Lindio gains a production acceptance requirement that specifically needs to prove the complete hosted auth flow.

## Browser scope

M6 runs the critical journey in Chromium only. The purpose of this milestone is end-to-end product wiring, not a cross-browser compatibility matrix. Firefox/WebKit or mobile projects should be added only when there is a concrete support requirement rather than multiplying CI time without a product reason.

## Failure diagnostics

Playwright is configured to:

- keep a trace when a test fails;
- capture screenshots only on failure;
- avoid video recording by default;
- keep browser workers to one in CI for reproducibility.

GitHub Actions uploads `playwright-report/` and `test-results/` only when the E2E job fails. These diagnostics are ephemeral CI artifacts and are ignored by Git, so they do not become repository assets.

## Quality gate

Pull requests and pushes to `main` run three independent jobs:

```text
frontend  -> lint + TypeScript + unit tests + production build

e2e       -> npm ci + Chromium install + critical Playwright journeys

database  -> local Supabase + migration reset + pgTAP + database lint
```

A change is considered CI-green only when all three jobs pass.

## Known gaps

The following are intentionally outside M6:

- arbitrary global line/branch coverage targets;
- exhaustive React component tests;
- visual regression snapshots;
- third-party browser testing SaaS;
- production credential tests;
- full cross-browser or device matrices;
- hosted Supabase authentication acceptance tests;
- PWA/offline/background-notification behavior, which belongs to the dedicated PWA milestone.
