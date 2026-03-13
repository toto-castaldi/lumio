---
phase: 37
slug: backend-pipeline
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-12
---

# Phase 37 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.x (jsdom environment) + manual Deno integration tests |
| **Config file** | `apps/deck-builder/vitest.config.ts` |
| **Quick run command** | `cd apps/deck-builder && pnpm test` |
| **Full suite command** | `pnpm --filter @lumio/deck-builder test` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `cd apps/deck-builder && pnpm test`
- **After every plan wave:** Run `pnpm --filter @lumio/deck-builder test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 37-01-01 | 01 | 1 | PIPE-01 | unit | `cd apps/deck-builder && pnpm test` | ❌ W0 | ⬜ pending |
| 37-01-02 | 01 | 1 | PIPE-02 | unit | `cd apps/deck-builder && pnpm test` | ❌ W0 | ⬜ pending |
| 37-01-03 | 01 | 1 | PIPE-03 | manual | Manual: commit -> sync -> check mobile app | -- | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `supabase/functions/deck-commit/index.ts` — edge function skeleton
- [ ] Path validation unit tests — pure function extracted for testability
- [ ] Environment variables — `GITHUB_PAT`, `GITHUB_REPO_OWNER`, `GITHUB_REPO_NAME` documented

*Note: Edge function runs in Deno. Path validation logic can be extracted as a pure function and tested in Vitest. Full edge function requires manual integration testing.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Edge function commits files to GitHub | PIPE-01 | Requires live GitHub repo + Supabase runtime | 1. Start Supabase locally 2. Call `deck-commit` with `commit_file` action 3. Verify file appears in GitHub repo |
| Docora syncs and generates AI questions | PIPE-03 | End-to-end across multiple services | 1. Commit card via edge function 2. Wait for Docora sync 3. Check mobile app for generated questions |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
