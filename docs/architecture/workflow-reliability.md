# Workflow reliability

## Scope

M4 hardens the commercial lead workflow without making it artificially rigid. Operators can still move a request to any valid status because the current product evidence does not justify a restrictive state machine. The reliability work instead guarantees that writes are explicit, atomic and conflict-aware.

## Mutation path

Database-mode lead writes follow one path:

1. the UI builds a complete lead draft;
2. domain validation normalizes and validates the draft;
3. the Supabase adapter sends a transactional RPC command;
4. PostgreSQL locks the current row and checks its expected `version`;
5. lead fields and new notes are persisted in one transaction;
6. the RPC returns the authoritative lead, its incremented version and the complete note list;
7. React replaces the local snapshot only after the command succeeds.

The application deliberately does not optimistically mutate database-backed leads. Lindio is an operational tool for small businesses: avoiding silent lost updates is more valuable than shaving a small amount of perceived latency from a status change.

## Optimistic concurrency

`public.leads.version` starts at `1` and increments after every successful update.

The client sends the version it last read as `p_expected_version`. `update_lead_with_notes(...)` locks the lead row with `FOR UPDATE` and rejects a stale command with PostgreSQL SQLSTATE `40001` and message `Lead version conflict`.

On conflict, the frontend reloads the authoritative lead list and asks the operator to repeat the intended change. A stale command cannot overwrite newer fields or append its notes.

This is optimistic concurrency control: concurrent editing is allowed, but stale writes are detected instead of silently winning by last-write-wins.

## RPC-only writes

Authenticated clients retain RLS-protected `SELECT` access to leads and notes, but direct `INSERT`/`UPDATE` column privileges are revoked for lead workflow data. Creates and updates must go through the transactional RPCs.

This prevents a browser client from bypassing:

- tenant membership checks;
- atomic lead + note writes;
- version checks;
- consistent RPC return contracts.

RLS remains the tenant isolation boundary for reads, while RPC authorization and database constraints protect writes.

## Application errors

Lead operations expose a small application error vocabulary:

- `VALIDATION` — input does not satisfy the domain/database contract;
- `AUTHORIZATION` — the authenticated user cannot perform the operation;
- `NOT_FOUND` — the requested lead is no longer available;
- `CONFLICT` — the client attempted to save a stale version;
- `UNAVAILABLE` — the data provider failed or is temporarily unavailable;
- `UNKNOWN` — unexpected fallback category.

The Supabase adapter maps PostgreSQL/PostgREST error codes to this vocabulary. UI components display the resulting message and preserve unsaved user input where relevant.

## UI acknowledgement

Workflow controls and note creation now wait for persistence confirmation:

- status/action/follow-up controls are temporarily disabled while saving;
- an error is shown inside the workflow card when a save fails;
- note text is cleared only after the note is confirmed by the repository;
- edit forms already follow the same await-success-before-close pattern.

This removes the previous fire-and-forget behavior that could make the interface look successful while the database write had failed.

## Shared operational semantics

Dashboard, request list, request cards and report reuse the same domain functions for:

- open vs final requests;
- follow-ups due today;
- overdue follow-ups;
- near-term follow-ups;
- active-request ordering.

For M4, an overdue follow-up means a follow-up scheduled **before the current local day**. A time earlier today remains classified as “today”, matching the behavior already used by the main operational views before this refactor. Changing that product rule would require explicit validation rather than being hidden inside a technical refactor.
