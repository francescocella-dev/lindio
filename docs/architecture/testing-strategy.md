# Testing strategy

## Scope

Lindio uses multiple automated test layers because different regressions require different execution boundaries. The goal is not to maximize a coverage percentage; it is to make every layer responsible for a concrete class of risk and keep the quality gate explainable.

Browser critical-path coverage protects product wiring, production PWA acceptance protects service-worker behavior, the bundle gate protects loading architecture, and the M9 release-hygiene gate protects repository/publication boundaries that normal application tests cannot see.

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
11. exercising the lazy Settings boundary and demo account persistence;
12. logging out and confirming protected routes return to login.

The tests use user-facing roles and labels instead of CSS classes or implementation-specific selectors. No production credentials, customer data or external services are required.

### 4. Production PWA acceptance

`npm run test:pwa`

Service-worker registration is intentionally disabled in Vite development mode, so the normal E2E suite cannot prove PWA behavior. A separate Playwright configuration:

1. runs a real production build;
2. serves `dist` through `vite preview`;
3. waits for the service worker to register and control the page;
4. validates core manifest metadata and declared icon dimensions;
5. inspects Lindio-owned Cache Storage entries;
6. warms production assets while online;
7. switches the Chromium context offline;
8. proves that the cached application shell still renders the lazy-loaded login route.

This is an application-shell acceptance test, not a claim that Supabase-backed features work offline.

### 5. Production bundle topology

`npm run build`

`npm run check:bundle`

The build-topology script inspects the real `dist/assets` output and prints each JavaScript chunk with minified/gzip sizes and whether it is referenced directly from `dist/index.html`.

The gate fails when:

- no JavaScript entry can be resolved from production HTML;
- the build collapses back to a single JavaScript chunk;
- any JavaScript chunk exceeds the 500,000-byte boundary used by this project.

The threshold is not increased to suppress Vite warnings. The split itself is protected as an architectural property.

### 6. Release hygiene

`npm run check:release`

This gate inspects **tracked repository files**, not runtime application state. It fails for high-signal release blockers such as:

- tracked `.env` files other than `.env.example`;
- tracked build/test output or local Netlify/Supabase state;
- recognized private-key/access-token patterns;
- a Supabase service-role key assignment;
- absolute local workspace paths that would leak developer-machine structure into the portfolio repository.

It is deliberately dependency-free and complements, rather than replaces, GitHub/host secret management and manual pre-publication review.

## Why the default E2E path uses demo mode

Demo mode is a real supported Lindio execution path, not a mocked HTML fixture. It uses the application's router, React state orchestration, deterministic analyzer, domain validation and local persistence services. This makes it a useful browser acceptance boundary while keeping the critical E2E job deterministic and independent from external infrastructure.

The browser suite does **not** add a signup/onboarding scenario against Supabase. Doing that reliably would couple the E2E job to the local auth stack, generated credentials and service startup while substantially overlapping existing auth repository tests plus pgTAP coverage for account bootstrap and tenancy.

A hosted real-auth smoke test is a release/deployment check rather than a claim made by the default deterministic CI suite.

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
frontend  -> lint + TypeScript + unit tests + production build + bundle topology + release hygiene

e2e       -> Chromium install + critical browser journeys + production PWA acceptance

database  -> local Supabase + migration reset + pgTAP + database lint
```

`npm run quality:deploy` is the smaller hosted-deployment boundary:

```text
production build -> bundle topology -> release hygiene
```

A change is considered CI-green only when all three GitHub Actions jobs pass.

## Known gaps

The following remain intentional non-goals rather than hidden coverage claims:

- arbitrary global line/branch coverage targets;
- exhaustive React component tests;
- visual regression snapshots;
- third-party browser-testing SaaS;
- production credentials or real customer data in browser tests;
- full cross-browser/device matrices;
- hosted Supabase authentication acceptance inside deterministic CI;
- full offline Supabase data replication or mutation queues;
- background/closed-app reminder delivery;
- a Web Push backend and delivery scheduler;
- synthetic Lighthouse/Core Web Vitals claims without a controlled measurement environment;
- treating pattern-based secret scanning as a formal security audit.
