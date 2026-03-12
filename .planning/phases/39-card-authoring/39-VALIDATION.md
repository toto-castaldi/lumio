---
phase: 39
slug: card-authoring
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-12
---

# Phase 39 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.0 + jsdom |
| **Config file** | `apps/deck-builder/vitest.config.ts` |
| **Quick run command** | `cd apps/deck-builder && pnpm test` |
| **Full suite command** | `cd apps/deck-builder && pnpm test && pnpm typecheck` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `cd apps/deck-builder && pnpm test`
- **After every plan wave:** Run `cd apps/deck-builder && pnpm test && pnpm typecheck`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 39-01-01 | 01 | 0 | CARD-01, CARD-02, CARD-04, CARD-05 | unit | `cd apps/deck-builder && pnpm vitest run src/lib/__tests__/frontmatter.test.ts -x` | ❌ W0 | ⬜ pending |
| 39-01-02 | 01 | 0 | CARD-03, CARD-06 | unit | `cd apps/deck-builder && pnpm vitest run src/lib/__tests__/card-validation.test.ts -x` | ❌ W0 | ⬜ pending |
| 39-01-03 | 01 | 0 | ALL | integration | `cd apps/deck-builder && pnpm test` | ❌ W0 | ⬜ pending |
| 39-02-01 | 02 | 1 | CARD-06 | unit | `cd apps/deck-builder && pnpm vitest run src/lib/__tests__/card-validation.test.ts -x` | ❌ W0 | ⬜ pending |
| 39-02-02 | 02 | 1 | CARD-01, CARD-05 | unit | `cd apps/deck-builder && pnpm vitest run src/lib/__tests__/frontmatter.test.ts -x` | ❌ W0 | ⬜ pending |
| 39-03-01 | 03 | 1 | EDIT-01, EDIT-02 | manual-only | N/A (visual UI / textarea interaction) | N/A | ⬜ pending |
| 39-03-02 | 03 | 1 | CARD-04 | unit | `cd apps/deck-builder && pnpm vitest run src/lib/__tests__/frontmatter.test.ts -x` | ❌ W0 | ⬜ pending |
| 39-04-01 | 04 | 2 | CARD-02, EDIT-03 | manual-only | N/A (save flow integration) | N/A | ⬜ pending |
| 39-04-02 | 04 | 2 | CARD-03 | manual-only | N/A (delete flow integration) | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/lib/__tests__/frontmatter.test.ts` — stubs for CARD-01, CARD-02, CARD-04, CARD-05 (parse, serialize, template, round-trip)
- [ ] `src/lib/__tests__/card-validation.test.ts` — stubs for CARD-03, CARD-06 (validateCardTitle, slugify)
- [ ] Install dependencies: `pnpm add @uiw/react-md-editor gray-matter katex && pnpm add -D @types/katex`
- [ ] Verify gray-matter works in browser (Buffer polyfill check)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Split-pane / toggle editor modes | EDIT-01 | Visual layout behavior depends on viewport | Resize browser: ≥1024px shows split-pane, <1024px shows toggle tabs |
| Toolbar buttons insert markdown | EDIT-02 | Requires textarea interaction + cursor position | Click each of 8 toolbar buttons, verify correct markdown inserted |
| Toast on save success/error | EDIT-03 | Integration with API and toast library | Save a card → see success toast; disconnect network → save → see error toast |
| Delete card with confirm dialog | CARD-03 | Integration with ConfirmDialog + API | Click delete → confirm dialog appears → confirm → card removed from list |
| Card save/edit round-trip | CARD-02 | Full flow: load → edit → save → reload → verify | Edit card body, save, navigate away, come back, verify content persisted |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
