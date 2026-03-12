---
phase: 40
slug: deploy-ci-cd
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-12
---

# Phase 40 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.0.0 |
| **Config file** | `apps/deck-builder/vitest.config.ts` |
| **Quick run command** | `pnpm --filter @lumio/deck-builder test` |
| **Full suite command** | `pnpm --filter @lumio/deck-builder test` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `pnpm --filter @lumio/deck-builder test`
- **After every plan wave:** Run `pnpm --filter @lumio/deck-builder test` + push to main triggers CI pipeline
- **Before `/gsd:verify-work`:** Full suite must be green + `curl -f https://deck.lumio.toto-castaldi.com/` returns 200 with SSL
- **Max feedback latency:** 10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 40-01-01 | 01 | 1 | DEPL-02 | manual-only | Manual: push to main, verify CI job succeeds | N/A | ⬜ pending |
| 40-01-02 | 01 | 1 | DEPL-01 | manual-only | Manual: `curl -I https://deck.lumio.toto-castaldi.com` | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Existing infrastructure covers all testable behavior. DEPL-01 and DEPL-02 are infrastructure requirements verified manually after deployment.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Web app served at deck.lumio.toto-castaldi.com with SSL | DEPL-01 | Requires live server with DNS and SSL certificate | 1. `curl -I https://deck.lumio.toto-castaldi.com` returns 200 2. Certificate is valid Let's Encrypt cert 3. HTTP redirects to HTTPS |
| CI/CD pipeline builds and deploys on push | DEPL-02 | Requires a real GitHub Actions run triggered by push | 1. Push to main 2. Verify `deploy-deck-builder` job appears in GitHub Actions 3. Job completes successfully 4. Site serves updated content |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
