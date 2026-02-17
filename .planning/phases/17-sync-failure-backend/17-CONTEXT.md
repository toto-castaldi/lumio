# Phase 17: Sync Failure Backend - Context

**Gathered:** 2026-02-17
**Status:** Ready for planning

<domain>
## Phase Boundary

Backend webhook handler for Docora `sync_failed` events. Stores sync failure details in the repositories table and auto-recovers when a successful sync webhook arrives. No UI in this phase — error display is Phase 18, token update is Phase 19.

</domain>

<decisions>
## Implementation Decisions

### Error classification
- Store Docora's raw error_type and error_message as-is — no backend classification or mapping
- Accept unknown/new error types gracefully — treat them as generic sync failures, store whatever Docora sends
- Store minimal fields: error_type, error_message, sync_status — skip circuit breaker details (retry count, cooldown, next retry time)

### Auth error detection
- Claude's Discretion: Decide whether to add a boolean `is_auth_error` flag or let the app check the raw error_type string. The app needs this distinction in Phase 19 for the token update UI.

### Recovery behavior
- Wipe error data completely on recovery — clear sync_status, error_type, error_message back to clean state. No "last error" preservation.
- Any successful webhook (create or update) for a previously failed repo triggers recovery
- Add a `sync_failed_at` timestamp column to track when the failure occurred (useful for Phase 18 display)
- Log recovery events for debugging — when a repo transitions from failed back to synced

### Webhook edge cases
- Events for unknown repos (not in our DB): ignore silently, return 200 OK
- Duplicate sync_failed events: always overwrite — update error fields and refresh sync_failed_at every time (idempotent)
- HMAC validation failure: Claude's Discretion on response code (401 vs 400 — pick the most secure approach)
- Endpoint scope: dedicated sync_failed handler only — not a general-purpose event router

### Claude's Discretion
- Auth error detection approach (boolean flag vs raw string check)
- HMAC failure response code
- Exact DB column types and migration structure
- Log format and destination for recovery events
- Edge function naming and routing

</decisions>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches. The existing webhook infrastructure (Docora create/update webhooks) should be the pattern to follow.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 17-sync-failure-backend*
*Context gathered: 2026-02-17*
