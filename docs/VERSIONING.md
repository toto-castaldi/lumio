# Versioning Strategy

> Legacy versioning infrastructure (husky, commitlint, commitizen, release-please, auto-release CI, git tags) was removed in v1.7 Phase 20.

## Current State

The version is currently a static value in `packages/shared/src/version.ts`.

Phase 21 will wire `STATE.md` milestone field as the single source of truth for versioning.
Phase 22 will update all public surfaces (landing page, edge function, this documentation).

## Version File

```
packages/shared/src/version.ts  <- static placeholder (Phase 21 wires to STATE.md)
```

---
*Updated: Phase 20 cleanup*
