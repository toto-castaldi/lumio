# Requirements: Lumio

**Defined:** 2026-02-11
**Core Value:** Gli utenti studiano concetti tramite quiz generati dall'AI -- il contenuto viene dai repository Git, le domande vengono generate e pre-cachate dal sistema.

## v1.4 Requirements

Requirements for v1.4 Card Browse & Stats. Each maps to roadmap phases.

### UX Fixes

- [ ] **UX-01**: Card preview durante studio non viene coperto dalla navbar Android
- [ ] **UX-02**: "Connesso come" nelle impostazioni ha stile section header uppercase come "ASPETTO"

### Card Browse

- [x] **BROWSE-01**: Utente puo' vedere la lista delle carte di un repo tappando sul repo
- [x] **BROWSE-02**: Utente puo' aprire il dettaglio di una carta in modalita' lettura (riuso CardPreview)

### Study Stats

- [ ] **STATS-01**: Il sistema registra il risultato di ogni sessione di studio (data, repo, corrette/totali, tempo)
- [ ] **STATS-02**: Utente puo' tappare su "ultimo studio" nella dashboard per vedere la schermata storico sessioni
- [ ] **STATS-03**: La schermata storico mostra le ultime N sessioni (N configurabile da backend, default 10)

## Future Requirements

### Deferred

- Offline mode -- richiede architettura di caching significativa
- Push notifications -- da valutare in milestone futura
- Google Play Store distribution -- per ora APK diretto

## Out of Scope

| Feature | Reason |
|---------|--------|
| Dettaglio per carta nelle statistiche | Complessita' non necessaria, risultato sessione sufficiente |
| Statistiche con grafici/trend | v1.4 mostra solo lista sessioni, analytics avanzata futura |
| iOS support | Rimandato a milestone futura |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| UX-01 | Phase 13 | Pending |
| UX-02 | Phase 13 | Pending |
| BROWSE-01 | Phase 14 | Complete |
| BROWSE-02 | Phase 14 | Complete |
| STATS-01 | Phase 15 | Pending |
| STATS-02 | Phase 15 | Pending |
| STATS-03 | Phase 15 | Pending |

**Coverage:**
- v1.4 requirements: 7 total
- Mapped to phases: 7
- Unmapped: 0

---
*Requirements defined: 2026-02-11*
*Last updated: 2026-02-11 after roadmap creation*
