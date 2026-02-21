# Requirements: Lumio

**Defined:** 2026-02-21
**Core Value:** Gli utenti studiano concetti tramite quiz generati dall'AI — il contenuto viene dai repository Git, le domande vengono generate e pre-cachate dal sistema.

## v1.7 Requirements

Requirements for milestone v1.7 GSD Versioning. Each maps to roadmap phases.

### Cleanup

- [x] **CLEAN-01**: Rimuovere husky hooks (`.husky/` directory e dipendenza)
- [x] **CLEAN-02**: Rimuovere commitlint (`.commitlintrc.json` e dipendenza)
- [x] **CLEAN-03**: Rimuovere commitizen config da `package.json`
- [x] **CLEAN-04**: Rimuovere release-please config (`.release-please-config.json`, `.release-please-manifest.json`)
- [ ] **CLEAN-05**: Rimuovere auto-release job e git tag creation dal CI workflow
- [x] **CLEAN-06**: Rimuovere `CHANGELOG.md`

### Versioning

- [ ] **VER-01**: STATE.md contiene un campo `Milestone:` parsabile dal CI
- [ ] **VER-02**: CI estrae la versione da `.planning/STATE.md` al build time e aggiorna `version.ts`
- [ ] **VER-03**: Landing page mostra la versione corrente
- [ ] **VER-04**: Edge function `/version` usa la versione estratta da STATE.md
- [ ] **VER-05**: Documentazione `docs/VERSIONING.md` aggiornata con il nuovo flusso

## Future Requirements

Nessun requisito differito per questa milestone.

## Out of Scope

| Feature | Reason |
|---------|--------|
| Conventional commits enforcement | Rimosso intenzionalmente — commit messages liberi |
| Git tags automatici | Rimossi — solo milestone GSD |
| CHANGELOG.md auto-generato | Rimosso — MILESTONES.md GSD è sufficiente |
| Patch version (v1.7.1) | GSD usa solo major.minor, nessun patch |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| CLEAN-01 | Phase 20 | Complete |
| CLEAN-02 | Phase 20 | Complete |
| CLEAN-03 | Phase 20 | Complete |
| CLEAN-04 | Phase 20 | Complete |
| CLEAN-05 | Phase 20 | Pending |
| CLEAN-06 | Phase 20 | Complete |
| VER-01 | Phase 21 | Pending |
| VER-02 | Phase 21 | Pending |
| VER-03 | Phase 22 | Pending |
| VER-04 | Phase 22 | Pending |
| VER-05 | Phase 22 | Pending |

**Coverage:**
- v1.7 requirements: 11 total
- Mapped to phases: 11
- Unmapped: 0

---
*Requirements defined: 2026-02-21*
*Last updated: 2026-02-21 — traceability updated with phase mappings*
