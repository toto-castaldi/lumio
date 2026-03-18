# Requirements: Lumio

**Defined:** 2026-03-17
**Core Value:** Gli utenti studiano concetti tramite quiz generati dall'AI — il contenuto viene dai repository Git, le domande vengono generate e pre-cachate dal sistema.

## v3.4 Requirements

Requirements for Landing Page Enhancement milestone. Each maps to roadmap phases.

### Navigation

- [x] **NAV-01**: Link al deck builder visibile nell'header della landing page
- [x] **NAV-02**: Bottone secondario "Crea Deck" nell'hero accanto a "Download APK"

### Leaderboard

- [x] **LEAD-01**: RPC Supabase pubblica `top_decks` che ritorna top 10 deck per subscriber count
- [x] **LEAD-02**: Sezione "Popular Decks" nella landing page dopo Features con fetch client-side
- [x] **LEAD-03**: Ogni deck nella classifica mostra nome, subscriber count, tag chips, e lingua

## Future Requirements

None for this milestone.

## Out of Scope

| Feature | Reason |
|---------|--------|
| Subscribe dalla landing page | Richiede auth, l'app Android gestisce le iscrizioni |
| Ricerca deck dalla landing | Funzionalità dell'app, non della vetrina |
| Preview carte dalla landing | Complessità eccessiva, l'app è il posto giusto |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| NAV-01 | Phase 49 | Complete |
| NAV-02 | Phase 49 | Complete |
| LEAD-01 | Phase 50 | Complete |
| LEAD-02 | Phase 50 | Complete |
| LEAD-03 | Phase 50 | Complete |

**Coverage:**
- v3.4 requirements: 5 total
- Mapped to phases: 5
- Unmapped: 0

---
*Requirements defined: 2026-03-17*
*Last updated: 2026-03-17 after roadmap creation*
