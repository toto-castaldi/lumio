---
phase: 38
slug: deck-management
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-12
---

# Phase 38 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.0.0 with jsdom |
| **Config file** | `apps/deck-builder/vitest.config.ts` |
| **Quick run command** | `cd apps/deck-builder && npx vitest run` |
| **Full suite command** | `cd apps/deck-builder && npx vitest run && cd apps/deck-builder && npx tsc --noEmit` |
| **Estimated runtime** | ~10 seconds |

---

## Sampling Rate

- **After every task commit:** Run `cd apps/deck-builder && npx vitest run`
- **After every plan wave:** Run `cd apps/deck-builder && npx vitest run && cd apps/deck-builder && npx tsc --noEmit`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 38-01-01 | 01 | 0 | DECK-01 | unit | `cd apps/deck-builder && npx vitest run src/lib/__tests__/validation.test.ts` | ❌ W0 | ⬜ pending |
| 38-01-02 | 01 | 0 | DECK-01, DECK-02, DECK-03 | unit | `cd apps/deck-builder && npx vitest run src/lib/__tests__/api.test.ts` | ❌ W0 (extend) | ⬜ pending |
| 38-xx-xx | xx | 1 | DECK-01 | unit | `cd apps/deck-builder && npx vitest run src/lib/__tests__/api.test.ts` | ❌ W0 | ⬜ pending |
| 38-xx-xx | xx | 1 | DECK-02 | unit | `cd apps/deck-builder && npx vitest run src/lib/__tests__/api.test.ts` | ❌ W0 | ⬜ pending |
| 38-xx-xx | xx | 1 | DECK-03 | unit | `cd apps/deck-builder && npx vitest run src/lib/__tests__/api.test.ts` | ❌ W0 | ⬜ pending |
| 38-xx-xx | xx | 1 | DECK-04 | unit | `cd apps/deck-builder && npx vitest run src/lib/__tests__/api.test.ts` | ✅ | ⬜ pending |
| 38-xx-xx | xx | 1 | DECK-01 | manual | N/A — edge function create_deck | manual-only | ⬜ pending |
| 38-xx-xx | xx | 1 | DECK-02 | manual | N/A — edge function rename_deck | manual-only | ⬜ pending |
| 38-xx-xx | xx | 1 | DECK-03 | manual | N/A — edge function delete_deck | manual-only | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/lib/__tests__/validation.test.ts` — stubs for DECK-01/DECK-02 deck name validation
- [ ] Extend `src/lib/__tests__/api.test.ts` — stubs for DECK-01/DECK-02/DECK-03 new API functions (createDeck, renameDeck, deleteDeck)
- [ ] Note: Vitest config only includes `src/lib/__tests__/**/*.test.ts` — component tests out of scope (no @testing-library/react)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Edge function create_deck creates .gitkeep in new directory | DECK-01 | Edge function runs in Deno, outside Vitest scope | Call edge function with create_deck action, verify .gitkeep in GitHub repo |
| Edge function rename_deck moves all files to new path | DECK-02 | Edge function runs in Deno, outside Vitest scope | Call edge function with rename_deck action, verify old path deleted and new path exists |
| Edge function delete_deck removes all files recursively | DECK-03 | Edge function runs in Deno, outside Vitest scope | Call edge function with delete_deck action, verify directory removed from GitHub repo |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
