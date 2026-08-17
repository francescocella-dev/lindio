# Performance and loading architecture

## Scope

M8 addresses a concrete production-build problem: Lindio's validated M7 build emitted one main JavaScript asset of approximately **585.19 kB minified / 171.25 kB gzip**, which crossed Vite's default 500 kB warning boundary.

The milestone does not raise that limit and does not treat vendor chunk naming as a performance win by itself. The objective is to reduce the code required by the first route and make deferred product areas explicit in the module graph.

## Baseline findings

Before M8:

- `src/app/router.jsx` statically imported every page;
- authentication routes therefore shared the initial graph with workspace-only pages such as Reports, Settings and lead-detail/form UI;
- `App.jsx` statically imported `authService.js`, `supabaseLeadsService.js` and `notificationService.js`;
- `authService.js` and the lead repository path both reached `supabaseClient.js`, which imports `@supabase/supabase-js`;
- the demo route therefore paid the parsing cost of database-only infrastructure even when Supabase was not used;
- `SettingsPage.jsx` combined account editing, reminder preferences, password security and session controls in one presentation module.

## Route boundary

M8 declares page modules with `React.lazy()` at the router boundary.

The route table remains synchronous and explicit, but the implementation code for these areas is deferred until React attempts to render the matched route:

- authentication pages;
- onboarding;
- workspace shell;
- Today;
- requests list;
- new request;
- request detail;
- reports;
- settings;
- not-found handling.

A `Suspense` boundary in `App` covers top-level lazy routes. A nearer boundary in `AppLayout` covers workspace-page transitions so the navigation shell can remain mounted while a page chunk is loading.

This intentionally avoids preloading every route at startup: doing so would recreate the original eager graph through network hints instead of static imports.

## Infrastructure boundary

M8 separates **configuration detection** from **Supabase runtime loading**.

`src/services/supabaseConfig.js` reads only the two Vite environment values and exposes the lightweight `isSupabaseConfigured` flag. It does not import the Supabase SDK.

`src/services/supabaseClient.js` remains the single client-construction module, but it is now reachable from the app orchestrator only through lazy service imports.

`src/services/runtimeServiceLoader.js` owns three cached dynamic module boundaries:

- auth/account Supabase service;
- Supabase lead service;
- notification service.

Each loader resets its cached promise if a dynamic import fails, so a transient chunk-load failure is not permanently memoized for the browser session.

### Consequences

- a demo-first session can render without eagerly parsing the Supabase SDK/repositories;
- real-auth bootstrap still loads auth infrastructure when Supabase is configured and no demo session is active;
- lead database infrastructure is deferred until an authenticated workspace actually needs remote lead operations;
- reminder runtime is deferred until reminders are enabled, while the Settings route can still load the same module when the user opens reminder controls.

The change is about execution ownership, not hiding dependencies: Supabase remains a first-class production dependency and real authenticated flows continue to use it.

## Settings decomposition

The largest settings page is decomposed along user-facing responsibilities rather than line-count targets:

- `AccountSettingsCards` owns organization/profile presentation and edit fields;
- `ReminderPreferencesCard` owns browser reminder presentation and actions;
- `SecuritySessionCards` owns password/session presentation;
- `SettingsPage` retains orchestration, validation, state and persistence handlers.

Password mutation now goes through the app context's `changePassword` operation. That removes the Settings page's direct static dependency on `authService.js` while keeping the same product behavior.

This decomposition is intentionally not turned into a generic form framework. The extracted components remain feature-specific and keep their existing accessible labels.

## Build-topology gate

`npm run check:bundle` inspects the generated production files instead of relying on a hand-maintained expected filename.

It reports:

- every JavaScript chunk;
- minified byte size;
- gzip byte size;
- whether the chunk is referenced directly by `dist/index.html` or is lazy/shared;
- total initial JavaScript entry payload.

The command fails if any JavaScript chunk exceeds **500,000 bytes**, matching the default Vite warning boundary used by this milestone, or if the build collapses back to a single JavaScript chunk.

`quality:frontend` runs this check immediately after `vite build`, so CI protects the split without changing `chunkSizeWarningLimit`.

## PWA interaction

M7's service worker already caches Vite assets under `/assets/` only after they are requested while the service worker controls the page.

With route splitting, the application shell guarantee remains intentionally warm-cache based:

1. the production shell is loaded online;
2. the service worker becomes active;
3. a controlled reload/request lets required route chunks enter the runtime static cache;
4. the warmed route can then render with the browser offline.

The PWA Playwright test reloads after service-worker control before entering offline mode, so it continues to validate the real split build rather than assuming lazy chunks are precached.

## Measurement discipline

The baseline number above comes from the validated M7 local build. Post-change chunk sizes must come from the actual repository after this overlay is applied:

```powershell
npm.cmd run build
npm.cmd run check:bundle
```

Do not copy estimated chunk sizes into the README, portfolio or PR. The generated output is the source of truth for the M8 after-state.

## Non-goals

M8 does not:

- raise Vite's warning threshold;
- add a bundle-analysis dependency;
- introduce speculative route prefetching;
- redesign the product;
- change database schemas;
- add offline data replication;
- claim Lighthouse or Core Web Vitals improvements without a controlled measurement environment.
