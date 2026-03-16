---
phase: 44
slug: mobile-discovery
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-15
---

# Phase 44 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | None (no test infrastructure in apps/android) |
| **Config file** | none — no automated UI tests |
| **Quick run command** | `pnpm --filter @lumio/android exec -- npx tsc --noEmit` |
| **Full suite command** | `pnpm --filter @lumio/android exec -- npx tsc --noEmit` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `pnpm --filter @lumio/android exec -- npx tsc --noEmit`
- **After every plan wave:** Run `pnpm --filter @lumio/android exec -- npx tsc --noEmit` + manual device test
- **Before `/gsd:verify-work`:** Full manual walkthrough on physical Android device
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 44-01-01 | 01 | 1 | DISC-01 | manual | Visual inspection on device | N/A | ⬜ pending |
| 44-01-02 | 01 | 1 | DISC-02 | manual | Type in search bar, observe debounce | N/A | ⬜ pending |
| 44-01-03 | 01 | 1 | DISC-03 | manual | Visual inspection of DeckCard | N/A | ⬜ pending |
| 44-01-04 | 01 | 1 | DISC-04 | manual | Tap chips, observe filtered results | N/A | ⬜ pending |
| 44-01-05 | 01 | 1 | DISC-05 | manual | Tap [+], observe checkmark + toast | N/A | ⬜ pending |
| 44-01-06 | 01 | 1 | DISC-06 | manual | Tap checkmark, confirm dialog, observe | N/A | ⬜ pending |
| 44-01-07 | 01 | 1 | DISC-07 | manual | Test with empty deck_index, no results | N/A | ⬜ pending |
| 44-01-08 | 01 | 1 | DISC-08 | manual | Switch language in settings, verify | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

*Existing infrastructure covers all phase requirements.* TypeScript compilation is the only automated check available. No automated UI test setup exists in the Android app, and adding one is out of scope.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| 4th bottom tab with compass icon | DISC-01 | Visual UI element | Open app, verify 4th tab exists with compass icon |
| Fulltext search with debounce | DISC-02 | User interaction timing | Type in search bar, verify 300ms debounce and results |
| Deck card info display | DISC-03 | Visual layout | Search for decks, verify name/description/count/author shown |
| Category chip filtering | DISC-04 | User interaction | Tap category chips, verify results filter without typing |
| Subscribe to deck | DISC-05 | User interaction + data flow | Tap [+] on a deck, verify checkmark + toast + cards in study |
| Unsubscribe from deck | DISC-06 | User interaction + data flow | Tap checkmark, confirm, verify removal from study |
| Empty states | DISC-07 | Visual + conditional | Test with no decks, no results, all subscribed |
| i18n IT/EN | DISC-08 | Visual + language | Switch language in settings, verify all discovery text |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
