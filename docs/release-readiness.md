# Lindio release readiness

## Release boundary

Target: **portfolio release candidate `0.1.0`**.

Repository visibility must remain private while M9 is being implemented and verified. Making the repository public is a separate explicit action after the checks below are satisfied; public visibility does not automatically imply an open-source license.

No Git tag or GitHub Release is claimed by this document unless that artifact is actually created after the final M9 merge.

## Public-ready criteria

### Repository hygiene

- root README explains product, architecture, setup, tests and limitations;
- `.env.example` contains placeholders/browser-safe guidance only;
- real `.env` files remain ignored;
- generated build/test output and local tool state are not tracked;
- `npm run check:release` passes;
- manual `git diff --check` passes;
- no developer-machine absolute paths or real credentials are present in tracked content;
- no unsupported adoption, revenue, production-traffic or AI/LLM claims are introduced.

### Runtime and build reproducibility

- `.nvmrc` pins Node 24.18.0;
- `package.json` constrains Node to `>=24.18.0 <25`;
- `package-lock.json` is synchronized with the package metadata;
- GitHub Actions resolves the pinned Node runtime;
- Netlify uses Node 24.18.0;
- Netlify builds with `npm run quality:deploy` and publishes `dist`.

### Automated quality

- ESLint passes;
- TypeScript passes;
- unit/application tests pass;
- production build passes;
- bundle topology gate passes;
- release-hygiene gate passes;
- critical browser E2E passes;
- production PWA acceptance passes;
- dependency audits report no release-blocking vulnerability at the time of release review;
- clean Supabase reset passes;
- pgTAP database tests pass;
- database lint passes;
- pull-request CI and post-merge `main` CI are green.

### Hosted deployment

For a public portfolio link, the hosted deployment must additionally be smoke-tested after the M9 configuration is live:

- login page renders over HTTPS;
- `Esplora la demo` reaches the operational workspace;
- SPA deep links return the application rather than a 404;
- a production service worker registers successfully;
- manifest and icons load;
- the deployed build uses the expected runtime/configuration;
- if Supabase-backed mode is exposed, hosted `VITE_SUPABASE_URL` and browser-safe anon/publishable key are configured;
- if password recovery is exposed, the hosted origin and reset destination are allowed by Supabase Auth redirect configuration.

## Security/privacy release notes

- RLS membership is the tenant read-isolation boundary;
- lead/note workflow mutations use authorized transactional RPCs;
- optimistic concurrency rejects stale writes;
- deterministic intake analysis runs locally and does not call an external AI provider;
- demo/seed data is synthetic;
- reminders are local browser/device reminders, not guaranteed server push while the application is fully closed;
- there is no claim of external penetration testing, formal certification or production-scale security validation.

## Licensing state

No root open-source license is currently declared. The release process must not silently add one merely because the repository is being used as a portfolio artifact.

## Decision rule

Lindio can be declared **public-ready for portfolio use** only after:

1. the complete local M9 gate passes;
2. the M9 pull request and post-merge `main` Quality workflow are green;
3. the hosted deployment smoke check has no release blocker (when a hosted link will be published);
4. the final manual security/claims review finds no tracked secret, private data or unsupported portfolio claim.

Until those checks are complete, the correct state is **release candidate / repository remains private**.
