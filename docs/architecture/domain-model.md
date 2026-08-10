# Lindio domain model — M2

## Purpose

M2 makes the commercial workflow explicit without changing how operators use the product.
The existing UI remains intentionally permissive: an operator can move a request to any valid status because small businesses often correct or skip workflow steps after phone calls or offline activity.
A restrictive state machine is therefore deferred to the workflow milestone and must be justified by product evidence before it is enforced.

## Typed boundary

The first TypeScript boundary is deliberately placed around stable concepts rather than converting every React component at once:

- `src/domain/lead.ts` — lead vocabulary and TypeScript contracts;
- `src/domain/leadValidation.ts` — runtime validation and normalization of untrusted lead input;
- `src/domain/leadWorkflow.ts` — workflow guidance, final-state rules and follow-up suggestions;
- `src/domain/account.ts` / `accountValidation.ts` — account and organization contracts;
- `src/repositories/leadRepository.ts` — provider-independent persistence contract;
- `src/repositories/supabaseLeadRepository.ts` — Supabase implementation behind the contract;
- `src/repositories/supabaseAccountRepository.ts` — typed account RPC adapter;
- `src/application/localLeadService.ts` — local/demo lead operations using the same domain validation.

Legacy JSX and service import paths remain available through small JavaScript facades. This keeps M2 reviewable and avoids a big-bang migration that would mix architecture changes with hundreds of mechanical file conversions.

## Lead vocabulary

Controlled values are centralized for:

- status;
- intake channel;
- urgency;
- next action.

`serviceType` intentionally remains free text. Lindio targets micro-businesses whose services vary considerably, so turning service names into an enum would create artificial product constraints.

## Validation model

Runtime validation sits before both local persistence and Supabase commands. Validation returns structured issues with:

- field path;
- stable issue code;
- user-facing message.

Current validation covers:

- at least one useful intake signal (customer name or raw message);
- valid channel, urgency, status and next action;
- optional email syntax;
- non-negative finite estimated value;
- valid optional follow-up date/time;
- account notification interval aligned with the PostgreSQL 5–1440 minute constraint.

No arbitrary maximum text lengths were introduced in M2 because that would silently remove previously supported input without product evidence.

## Database alignment

PostgreSQL already constrained channel, urgency and status in M1. M2 adds the missing `next_action` constraint and changes its database default from an empty string to `Rispondere al cliente`.

Database tests verify that:

1. the constraint exists;
2. an unknown next action is rejected;
3. a direct insert receives a valid default action.

## Legacy compatibility

The historic status `Follow-up` is normalized to `In attesa` at the domain boundary. Existing data and old localStorage payloads therefore remain readable without keeping `Follow-up` as a first-class workflow state.

## Deliberately deferred

M2 does not yet:

- convert every React component to TypeScript;
- restrict state transitions;
- replace the deterministic analysis engine;
- redesign demo authentication;
- introduce provider-backed monitoring;
- implement background push notifications.

Those concerns belong to later milestones so each architectural change remains explainable and independently testable.
