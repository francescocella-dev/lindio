# Lindio domain model

## Purpose

Lindio makes the commercial-request workflow explicit while keeping operator control appropriate for a micro-business. The domain layer centralizes stable vocabulary, normalization and runtime validation so browser-local demo persistence and Supabase-backed persistence do not drift into different product rules.

The workflow is deliberately permissive: an operator can move a request to any valid status. Phone calls, offline conversations and corrections can legitimately skip or revisit steps, and current product evidence does not justify a restrictive finite-state machine.

Reliability is enforced through validation, transaction boundaries and optimistic concurrency instead of by artificially blocking valid manual transitions. See [`workflow-reliability.md`](workflow-reliability.md).

## Typed boundary

TypeScript is concentrated around stable domain/application/repository concepts rather than requiring a mechanical all-at-once React migration:

- `src/domain/lead.ts` — lead vocabulary and contracts;
- `src/domain/leadValidation.ts` — runtime validation and normalization of untrusted lead input;
- `src/domain/leadWorkflow.ts` — workflow guidance and final-state rules;
- `src/domain/leadOperations.ts` — shared operational timing/query semantics;
- `src/domain/reminderPolicy.ts` — deterministic reminder eligibility/deduplication rules;
- `src/domain/account.ts` / `accountValidation.ts` — account and organization contracts;
- `src/repositories/leadRepository.ts` — provider-independent persistence contract;
- `src/repositories/supabaseLeadRepository.ts` — Supabase lead implementation;
- `src/repositories/supabaseAccountRepository.ts` — typed account RPC adapter;
- `src/application/localLeadService.ts` — local/demo lead operations using the same domain validation.

Small JavaScript facades preserve existing JSX import paths where useful. This keeps migration boundaries explainable without mixing architecture work with a big-bang file conversion.

## Lead vocabulary

Controlled values are centralized for:

- status;
- intake channel;
- urgency;
- next action.

`serviceType` intentionally remains free text. Lindio targets small service businesses whose service catalogues vary substantially, so a fixed enum would impose a product constraint without evidence.

The current final states are `Vinta` and `Persa`. The historic `Follow-up` status is normalized to `In attesa` for backward compatibility with older local payloads.

## Validation model

Runtime validation runs before both local and Supabase persistence. Validation exposes structured issues with a field path, stable issue code and user-facing message.

Current validation includes:

- at least one useful intake signal (customer name or raw message);
- valid channel, urgency, status and next action;
- optional email syntax;
- non-negative finite estimated value;
- valid optional follow-up date/time;
- account/organization input validation;
- notification lead time as an integer from **0 to 1440 minutes**.

Arbitrary text-length limits are not introduced merely for technical convenience; adding them would be a product decision because it can reject previously supported customer input.

## Workflow semantics

The UI can move between any valid commercial statuses, but shared domain functions define consistent behavior for:

- open vs final requests;
- follow-ups due today;
- overdue follow-ups;
- near-term follow-ups;
- ordering of operational work.

An overdue follow-up means a follow-up scheduled before the current local day. A follow-up whose clock time has passed today remains in the Today category. The same semantics are reused across dashboard, list, cards and report views.

Database-backed writes add a separate reliability boundary: lead versions are checked server-side and stale commands are rejected before they can overwrite newer data.

## Persistence alignment

The database constrains the same controlled values used by the application and exposes transactional RPCs for workflow writes. The browser does not get to choose or mutate tenant ownership through a lead command.

Application adapters normalize database rows back into the domain contract, while demo/local operations use the same validation rules before browser persistence.

This means local demo mode intentionally shares **product validation**, but it does not pretend to share PostgreSQL authorization or transactional guarantees.

## Legacy persistence names

`aiSummary` and `aiSuggestedReply` remain in the lead persistence shape for backward/schema compatibility. They are legacy field names rather than a claim that the current intake analyzer is an LLM.

Visible product terminology and the current application boundary describe the feature as deterministic intake analysis. See [`intake-analyzer.md`](intake-analyzer.md).

## Intentional limits

The current model does not attempt to provide:

- a restrictive commercial state machine;
- configurable per-organization workflow schemas;
- a normalized service catalogue;
- arbitrary enterprise role/permission matrices;
- automated decisions that commit workflow changes without operator review.

Those capabilities should only be introduced when a concrete product requirement justifies their added constraints and complexity.
