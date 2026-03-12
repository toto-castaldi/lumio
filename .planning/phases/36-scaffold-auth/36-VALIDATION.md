---
phase: 36
slug: scaffold-auth
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-12
---

# Phase 36 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest ^4.0 |
| **Config file** | none — Wave 0 installs |
| **Quick run command** | `pnpm --filter @lumio/deck-builder test` |
| **Full suite command** | `pnpm test` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `pnpm --filter @lumio/deck-builder typecheck`
- **After every plan wave:** Run `pnpm typecheck && pnpm --filter @lumio/deck-builder test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 36-01-01 | 01 | 1 | AUTH-01 | unit | `pnpm --filter @lumio/deck-builder exec vitest run src/lib/__tests__/auth.test.ts -t "google"` | ❌ W0 | ⬜ pending |
| 36-01-02 | 01 | 1 | AUTH-02 | unit | `pnpm --filter @lumio/deck-builder exec vitest run src/lib/__tests__/auth.test.ts -t "email"` | ❌ W0 | ⬜ pending |
| 36-03-01 | 03 | 2 | AUTH-03 | manual-only | Visual inspection at multiple breakpoints | N/A | ⬜ pending |
| 36-03-02 | 03 | 2 | AUTH-04 | unit | `pnpm --filter @lumio/deck-builder exec vitest run src/lib/__tests__/i18n.test.ts` | ❌ W0 | ⬜ pending |
| 36-03-03 | 03 | 2 | AUTH-05 | unit | `pnpm --filter @lumio/deck-builder exec vitest run src/lib/__tests__/theme.test.ts` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `apps/deck-builder/vitest.config.ts` — vitest config for deck-builder
- [ ] `apps/deck-builder/src/lib/__tests__/auth.test.ts` — auth helper unit tests (AUTH-01, AUTH-02)
- [ ] `apps/deck-builder/src/lib/__tests__/theme.test.ts` — theme toggle unit tests (AUTH-05)
- [ ] `apps/deck-builder/src/lib/__tests__/i18n.test.ts` — i18n locale switching tests (AUTH-04)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Layout responsive breakpoints | AUTH-03 | CSS layout behavior, no unit test possible | Open at 320px, 768px, 1024px, 1440px widths. Verify: sidebar hidden < 1024px with hamburger menu; sidebar always visible >= 1024px; content reflows properly |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
