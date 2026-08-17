# Lindio release readiness

## Release boundary

Target: **portfolio release candidate `0.1.0`**.

M9 release hardening has been merged. The repository remains private during the final portfolio-publication pass. Making it public is a separate explicit action after the checks below are satisfied; public visibility does not automatically imply an open-source license.

No Git tag or GitHub Release is claimed by this document unless that artifact is actually created after the final publication review.

## Public-ready criteria

### Repository hygiene

- root README explains product, architecture, setup, tests, limitations and reviewer path;
- `.env.example` contains placeholders/browser-safe guidance only;
- real `.env` files remain ignored;
- generated build/test output and local tool state are not tracked;
- `npm run check:release` passes;
- manual `git diff --check` passes;
- no developer-machine absolute paths or real credentials are present in tracked content;
- no unsupported adoption, revenue, production-traffic or AI/LLM claims are introduced.

### Portfolio evidence

- `docs/demo-scenario.md` documents the exact synthetic scenario and screenshot contract;
- `docs/reviewer-walkthrough.md` provides a short reviewer path;
- `npm run demo:capture` regenerates the eight portfolio screenshots through Playwright;
- captures use a fresh browser-local demo and never require production credentials;
- desktop screenshots use the canonical `1440 × 1000` viewport;
- mobile screenshots use the canonical `390 × 844` viewport;
- the README references only generated screenshots that are actually tracked;
- all visible names, contacts, businesses and values remain synthetic;
- screenshot captions do not imply real customer outcomes or production usage.

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
- publication pull-request CI and post-merge `main` CI are green.

### Hosted deployment

For a public portfolio link, the hosted deployment must additionally be smoke-tested after the publication commit is live:

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
- portfolio capture runs against a browser-local synthetic workspace;
- reminders are local browser/device reminders, not guaranteed server push while the application is fully closed;
- there is no claim of external penetration testing, formal certification or production-scale security validation.

## Licensing state

No root open-source license is currently declared. The release process must not silently add one merely because the repository is being used as a portfolio artifact.

## Decision rule

Lindio can be declared **public-ready for portfolio use** only after:

1. the publication overlay is applied and all eight screenshots are regenerated successfully;
2. the complete local quality/release gate passes;
3. the publication pull request and post-merge `main` Quality workflow are green;
4. the hosted deployment smoke check has no release blocker when a hosted link will be published;
5. the final manual security/claims/screenshot review finds no tracked secret, private data or unsupported portfolio claim.

Until those checks are complete, the correct state remains **release candidate / repository private**.
