# Testing strategy

## Scope

Lindio uses multiple automated test layers because different regressions require different execution boundaries. The goal is not to maximize a coverage percentage; it is to make every layer responsible for a concrete class of risk and keep the quality gate explainable.

M6 introduced browser-level critical-path coverage. M7 extends that strategy with a separate production-build PWA acceptance boundary so service-worker and offline behavior are tested in the environment where they actually exist. M8 adds a build-topology gate so code splitting remains an architectural property rather than a one-time optimization.

## Test pyramid

### 1. Unit and application tests

`npm run test:unit`

These tests exercise deterministic logic without a browser or database. Current coverage includes:

- lead validation and normalization;
- workflow semantics and time-based lead operations;
- deterministic reminder eligibility and deduplication policy;
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

### 3. Browser critical-path tests

`npm run test:e2e`

Playwright drives the actual React application through Chromium using the Vite development server. This suite stays small and focuses on product wiring that lower layers cannot prove.

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

M8 also exercises the lazy-loaded Settings route in demo mode. That scenario edits the demo operator name, saves it, reloads the route and verifies persistence while preserving the reminder/security copy exposed by the decomposed Settings components.

The tests use user-facing roles and labels instead of CSS classes or implementation-specific selectors. No production credentials, customer data or external services are required.

### 4. Production PWA acceptance

`npm run test:pwa`

Service-worker registration is intentionally disabled in Vite development mode, so the normal E2E suite cannot prove PWA behavior. M7 therefore uses a separate Playwright configuration that:

1. runs a real production build;
2. serves `dist` through `vite preview`;
3. waits for the service worker to register and control the page;
4. validates core manifest metadata and declared icon dimensions;
5. inspects Lindio-owned Cache Storage entries;
6. warms the production assets while online;
7. switches the Chromium context offline;
8. proves that the cached application shell still renders the login route.

Because `/login` is lazy-loaded after M8, this test also proves that a route chunk fetched while the service worker controls the page is available to the warmed offline shell.

This is an application-shell acceptance test, not a claim that Supabase-backed features work offline.

### 5. Production bundle topology

`npm run build`

`npm run check:bundle`

The build-topology script inspects the real `dist/assets` output and prints every JavaScript chunk with minified and gzip sizes. It also identifies the JavaScript entry referenced by `dist/index.html`.

The gate fails when:

- no JavaScript entry can be resolved from the production HTML;
- the build collapses back to a single JavaScript chunk;
- any JavaScript chunk exceeds Vite's default 500 kB warning boundary.

The limit is not raised to hide the warning. M8 makes the split itself part of CI by appending `check:bundle` to `quality:frontend`.

## Why the default E2E path uses demo mode

Demo mode is a real supported Lindio execution path, not a mocked HTML fixture. It uses the application's router, React state orchestration, deterministic analyzer, domain validation and local persistence services. This makes it a useful browser acceptance boundary while keeping the critical E2E job deterministic and independent from external infrastructure.

The browser suite does **not** add a signup/onboarding scenario against Supabase. Doing that reliably would couple the E2E job to the local auth stack, generated credentials and service startup while substantially overlapping existing auth repository tests plus pgTAP coverage for account bootstrap and tenancy.

A real-auth browser smoke test can be added later if Lindio gains a production acceptance requirement that specifically needs to prove the complete hosted auth flow.

## Browser scope

Both browser suites use Chromium. Their purpose is product wiring and PWA runtime acceptance, not a cross-browser compatibility matrix. Firefox/WebKit or device-specific projects should be added only when a concrete support requirement justifies the additional CI time.

## Failure diagnostics

Playwright is configured to:

- keep a trace when a browser test fails;
- capture screenshots only on failure;
- avoid video recording by default;
- keep deterministic worker counts in CI;
- write critical-path and PWA diagnostics to separate output directories.

GitHub Actions uploads browser reports/results only when the E2E job fails. These diagnostics are ephemeral CI artifacts and are ignored by Git.

## Quality gate

Pull requests and pushes to `main` run three independent jobs:

```text
frontend  -> lint + TypeScript + unit tests + production build + bundle topology gate

e2e       -> Chromium install + critical browser journeys + production PWA acceptance

database  -> local Supabase + migration reset + pgTAP + database lint
```

A change is considered CI-green only when all three jobs pass.

## Known gaps

The following remain intentional non-goals rather than hidden coverage claims:

- arbitrary global line/branch coverage targets;
- exhaustive React component tests;
- visual regression snapshots;
- third-party browser-testing SaaS;
- production credentials or real customer data in browser tests;
- full cross-browser/device matrices;
- hosted Supabase authentication acceptance tests;
- full offline Supabase data replication or mutation queues;
- background/closed-app reminder delivery;
- a Web Push backend and delivery scheduler;
- synthetic Lighthouse claims without a controlled measurement environment.
