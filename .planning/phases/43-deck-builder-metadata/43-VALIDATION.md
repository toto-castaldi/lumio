---
phase: 43
slug: deck-builder-metadata
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-13
---

# Phase 43 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 4.0.0 |
| **Config file** | apps/deck-builder/vitest.config.ts |
| **Quick run command** | `pnpm --filter @lumio/deck-builder test` |
| **Full suite command** | `pnpm --filter @lumio/deck-builder test` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `pnpm --filter @lumio/deck-builder test`
- **After every plan wave:** Run `pnpm --filter @lumio/deck-builder test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 43-01-01 | 01 | 1 | DKBL-02 | unit | `pnpm --filter @lumio/deck-builder exec -- npx vitest run src/lib/__tests__/api.test.ts` | ✅ (needs extension) | ⬜ pending |
| 43-01-02 | 01 | 1 | DKBL-03 | unit | `pnpm --filter @lumio/deck-builder exec -- npx vitest run src/lib/__tests__/api.test.ts` | ✅ (needs extension) | ⬜ pending |
| 43-02-01 | 02 | 1 | DKBL-01 | manual-only | N/A | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/lib/__tests__/api.test.ts` — add test stubs for `commitYaml()` and `getDeckYaml()` functions (DKBL-02, DKBL-03)

*Existing test infrastructure covers all automatable phase requirements with extensions.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Form fields render with correct layout and accept input | DKBL-01 | Component rendering requires React test utils (jsdom + @testing-library/react) not in current vitest config | 1. Open deck builder, select a deck 2. Expand metadata section 3. Verify display_name, description, tags, language fields present 4. Fill in values, verify save button enables |
| Existing deck.yaml loads into form | DKBL-03 | Requires live Supabase + GitHub integration | 1. Select deck with existing deck.yaml 2. Expand metadata section 3. Verify fields populated from deck.yaml |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
