# Review Lindio in five minutes

This walkthrough is designed for engineering reviewers, recruiters and interviewers evaluating Lindio as a portfolio project.

Lindio is a mobile-first operational PWA for small service businesses. It turns fragmented customer enquiries into structured requests, follow-ups and explicit next actions without imposing an enterprise CRM process on a micro-business.

The repository demo uses synthetic browser-local data and can be explored without Supabase credentials.

## 0:00 — Product problem

Small service businesses often receive work enquiries through disconnected channels:

- WhatsApp;
- phone calls;
- email;
- Instagram or Facebook;
- website forms.

The difficult part is not storing the contact. It is preserving enough context to answer correctly and remembering what has to happen next.

Lindio models the workflow as:

```text
incoming message / phone note
        ↓
structured request
        ↓
missing information + local deterministic analysis
        ↓
next action / editable reply draft
        ↓
status + follow-up + notes
        ↓
today / overdue / future operational views
```

## 0:45 — Today

Start from **Today**.

Look for:

- requests needing a response;
- follow-ups due today;
- overdue work;
- quotes to prepare or follow;
- the priority task list;
- recent enquiries;
- the current open-work count.

The dashboard is intentionally action-oriented. Its purpose is to answer “what should the operator do now?” rather than only displaying aggregate CRM metrics.

## 1:30 — Requests

Open **Requests**.

The view separates active work from archived outcomes and lets the operator filter by operational meaning:

- to reply;
- information requested;
- site visits;
- quotes;
- overdue;
- waiting;
- won/lost archive.

The list combines customer, service, channel, location, status, next action and follow-up context.

## 2:15 — Deterministic intake analysis

Open **New request** and paste a customer message.

The default analyzer:

- runs locally in the browser;
- uses deterministic rules and keyword/regex matching;
- extracts supported contact and request information;
- highlights missing information;
- proposes an editable next action and reply;
- exposes an explainable `low` / `medium` / `high` quality band.

It is deliberately **not** described as an LLM. The raw customer message is not sent to an external AI provider by the default implementation.

Suggestions are reviewed before they are applied and are never persisted automatically.

## 3:00 — Request detail and workflow

Open a request detail.

Review:

- current status;
- next action;
- follow-up date;
- urgency and estimated value;
- workflow guidance;
- customer/request information;
- original message;
- suggested reply;
- notes.

The UI permits manual commercial corrections because phone calls and offline work can legitimately skip or revisit steps.

Reliability is enforced elsewhere: runtime validation, transactional database commands and optimistic concurrency protect data without forcing an unvalidated rigid state machine.

## 3:45 — Operational report

Open **Report**.

The page surfaces:

- open, won and lost work;
- overdue and near-due follow-ups;
- quotes and missing-information states;
- synthetic open/won value;
- channel mix;
- service mix;
- status breakdown;
- an operational recommendation.

These are demo calculations over synthetic requests. They are not customer results, adoption metrics or validated business outcomes.

## 4:25 — Engineering evidence

The repository demonstrates:

- React/Vite application architecture;
- typed domain and repository boundaries;
- deterministic intake-analyzer contract;
- Supabase Auth;
- PostgreSQL row-level security;
- membership-based tenant isolation;
- transactional RPC mutations;
- optimistic concurrency;
- browser-local demo persistence;
- Playwright critical-path testing;
- pgTAP database testing;
- production PWA acceptance;
- bundle-topology protection;
- release-hygiene automation;
- GitHub Actions;
- Netlify deployment configuration.

Recommended deeper reading:

- `docs/database.md`
- `docs/architecture/domain-model.md`
- `docs/architecture/workflow-reliability.md`
- `docs/architecture/intake-analyzer.md`
- `docs/architecture/pwa-notifications.md`
- `docs/architecture/performance-loading.md`
- `docs/architecture/testing-strategy.md`
- `docs/demo-scenario.md`
- `docs/release-readiness.md`

## Current boundaries

- No claim of production adoption, revenue or measured business impact.
- No external LLM in the default intake path.
- No guaranteed closed-app server push.
- No offline queue for Supabase mutations.
- No workspace switcher or enterprise role system in the current UI.
- Browser acceptance targets Chromium rather than a full device matrix.
- Hosted real-auth browser acceptance is not part of CI.
- No open-source license is currently declared.

These constraints are explicit so the repository remains explainable in an engineering interview instead of presenting unsupported product scope.
