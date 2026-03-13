---
phase: 41
slug: database-foundation
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-13
---

# Phase 41 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Supabase CLI (db reset + manual SQL verification) |
| **Config file** | supabase/config.toml |
| **Quick run command** | `supabase db reset` |
| **Full suite command** | `supabase db reset && supabase functions serve --env-file supabase/.env.local --no-verify-jwt` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `supabase db reset`
- **After every plan wave:** Run `supabase db reset && supabase functions serve --env-file supabase/.env.local --no-verify-jwt`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 41-01-01 | 01 | 1 | DBSR-01 | smoke | `supabase db reset` | N/A — migration SQL | ⬜ pending |
| 41-01-02 | 01 | 1 | DBSR-03 | smoke | `supabase db reset` | N/A — migration SQL | ⬜ pending |
| 41-01-03 | 01 | 1 | DBSR-05 | smoke | `supabase db reset` | N/A — migration SQL | ⬜ pending |
| 41-02-01 | 02 | 1 | DBSR-04 | manual | SQL via Supabase Studio: call study RPCs with subfolder data | N/A — RPC SQL | ⬜ pending |
| 41-02-02 | 02 | 1 | DBSR-02 | manual | SQL via Supabase Studio: `SELECT * FROM search_decks('test')` | N/A — RPC SQL | ⬜ pending |
| 41-02-03 | 02 | 1 | STDY-01 | manual | E2E: subscribe to subfolder, call get_study_cards_for_session | N/A — RPC SQL | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

*Existing infrastructure covers all phase requirements.*

This phase is pure SQL migrations. No test framework setup needed. Verification is via `supabase db reset` (migrations compile and apply) and manual SQL queries in Supabase Studio.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| search_decks returns weighted ranked results | DBSR-02 | RPC output verification requires human inspection of ranking order | Insert test decks, run `SELECT * FROM search_decks('query')`, verify A-weighted name matches rank higher than C-weighted description matches |
| Study RPCs filter by subfolder_path | DBSR-04 | Requires verifying correct card filtering with test data | Insert cards across subfolders, subscribe to one, call get_study_cards_for_session, verify only subscribed subfolder cards returned |
| Subscribed shared deck cards appear in study | STDY-01 | End-to-end flow across subscription + study pipeline | Subscribe user to subfolder, call get_study_cards_for_session, verify cards appear with SRS scheduling |
| Zero subscriptions = zero results | DBSR-04 | Negative test requires human verification | Ensure no user_repositories row exists for shared repo, call study RPCs, verify empty result |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
