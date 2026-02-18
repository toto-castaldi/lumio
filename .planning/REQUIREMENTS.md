# Requirements: Lumio

**Defined:** 2026-02-17
**Core Value:** Gli utenti studiano concetti tramite quiz generati dall'AI -- il contenuto viene dai repository Git, le domande vengono generate e pre-cachate dal sistema.

## v1.6 Requirements

Requirements for v1.6 Sync Error Handling. Each maps to roadmap phases.

### Sync Error Handling (Backend)

- [x] **SYNC-01**: Backend handles Docora `sync_failed` webhook with HMAC validation
- [x] **SYNC-02**: Backend stores sync failure details (error type, message, circuit breaker status) in repositories table
- [x] **SYNC-03**: Backend resets `sync_status` to `synced` when a successful create/update webhook arrives for a previously failed repo

### Token Update (Backend)

- [x] **TOKEN-01**: New edge function proxies PAT update to Docora `PATCH /api/repositories/{repository_id}/token`
- [x] **TOKEN-02**: After successful token update, backend optimistically clears repo sync error status

### Error Display (App)

- [x] **ERRDSP-01**: User sees error indicator on repos with sync failures in the repository list
- [x] **ERRDSP-02**: User sees error details (error message from Docora) in the repo error state

### Token Refresh (App)

- [x] **TOKUI-01**: User can tap a failed repo to open a bottom-sheet modal with error details
- [x] **TOKUI-02**: For auth-related errors, user can enter a new PAT in the modal and submit
- [x] **TOKUI-03**: After successful token update, the repo error state clears immediately in the UI

## Future Requirements

### Sync Monitoring

- **SMON-01**: User receives push notification when a repo sync fails
- **SMON-02**: Dashboard shows aggregate sync health across all repos

## Out of Scope

| Feature | Reason |
|---------|--------|
| Auto-retry sync from app | Docora manages circuit breaker and retries internally |
| Manual sync trigger | Docora controls sync schedule, no user-initiated re-sync |
| Push notifications for sync errors | Deferred to future milestone |
| Circuit breaker UI (cooldown timer, retry count) | Over-engineering for v1.6, error message is sufficient |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| SYNC-01 | Phase 17 | Complete |
| SYNC-02 | Phase 17 | Complete |
| SYNC-03 | Phase 17 | Complete |
| TOKEN-01 | Phase 19 | Complete |
| TOKEN-02 | Phase 19 | Complete |
| ERRDSP-01 | Phase 18 | Complete |
| ERRDSP-02 | Phase 18 | Complete |
| TOKUI-01 | Phase 19 | Complete |
| TOKUI-02 | Phase 19 | Complete |
| TOKUI-03 | Phase 19 | Complete |

**Coverage:**
- v1.6 requirements: 10 total
- Mapped to phases: 10
- Unmapped: 0

---
*Requirements defined: 2026-02-17*
*Last updated: 2026-02-18 after Phase 19 Plan 01 completion*
