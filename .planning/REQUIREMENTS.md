# Requirements: Lumio

**Defined:** 2026-02-11
**Core Value:** Gli utenti studiano concetti tramite quiz generati dall'AI — il contenuto viene dai repository Git, le domande vengono generate e pre-cachate dal sistema.

## v1.4 Requirements

Requirements for v1.4 Card Browse & Stats. Each maps to roadmap phases.

### UX Fixes

- [ ] **UX-01**: Card preview durante studio non viene coperto dalla navbar Android
- [ ] **UX-02**: "Connesso come" nelle impostazioni ha stile section header uppercase come "ASPETTO"

### Card Browse

- [ ] **BROWSE-01**: Utente può vedere la lista delle carte di un repo tappando sul repo
- [ ] **BROWSE-02**: Utente può aprire il dettaglio di una carta in modalità lettura (riuso CardPreview)

### Study Stats

- [ ] **STATS-01**: Il sistema registra il risultato di ogni sessione di studio (data, repo, corrette/totali, tempo)
- [ ] **STATS-02**: Utente può tappare su "ultimo studio" nella dashboard per vedere la schermata storico sessioni
- [ ] **STATS-03**: La schermata storico mostra le ultime N sessioni (N configurabile da backend, default 10)

## Future Requirements

### Deferred

- Offline mode — richiede architettura di caching significativa
- Push notifications — da valutare in milestone futura
- Google Play Store distribution — per ora APK diretto

## Out of Scope

| Feature | Reason |
|---------|--------|
| Dettaglio per carta nelle statistiche | Complessità non necessaria, risultato sessione sufficiente |
| Statistiche con grafici/trend | v1.4 mostra solo lista sessioni, analytics avanzata futura |
| iOS support | Rimandato a milestone futura |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| UX-01 | TBD | Pending |
| UX-02 | TBD | Pending |
| BROWSE-01 | TBD | Pending |
| BROWSE-02 | TBD | Pending |
| STATS-01 | TBD | Pending |
| STATS-02 | TBD | Pending |
| STATS-03 | TBD | Pending |

**Coverage:**
- v1.4 requirements: 7 total
- Mapped to phases: 0
- Unmapped: 7 ⚠️

---
*Requirements defined: 2026-02-11*
*Last updated: 2026-02-11 after initial definition*
