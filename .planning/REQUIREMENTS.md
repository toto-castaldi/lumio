# Requirements: Lumio

**Defined:** 2026-02-25
**Core Value:** Gli utenti studiano concetti tramite quiz generati dall'AI — il contenuto viene dai repository Git, le domande vengono generate e pre-cachate dal sistema.

## v2.0 Requirements

Requirements for spaced repetition milestone. Each maps to roadmap phases.

### SRS Scheduling

- [ ] **SRS-01**: User studia carte schedulate in base alle risposte precedenti (giusto → intervallo più lungo, sbagliato → reset a 1 giorno)
- [ ] **SRS-02**: Sessione presenta carte scadute prima, poi nuove carte riempiono i posti restanti
- [ ] **SRS-03**: Ease factor si adatta per carta (EF parte da 2.5, floor 1.3, ceiling 2.5)
- [ ] **SRS-04**: Carte più in ritardo hanno priorità nella sessione (ORDER BY next_review_at ASC)
- [ ] **SRS-05**: Intervallo massimo 365 giorni per evitare carte "perse"
- [ ] **SRS-06**: SRS state si resetta quando il contenuto della carta cambia (sync da GitHub)

### Dashboard & Visibility

- [ ] **DASH-01**: Dashboard mostra counter "carte da ripassare oggi"
- [ ] **DASH-02**: Durante studio, badge "Ripasso"/"Nuova" indica il tipo di carta

### Study History

- [ ] **HIST-01**: Storico sessioni mostra conteggio carte al posto di "tutti i repository"

## Future Requirements

### Advanced SRS

- **SRS-F01**: Upgrade a FSRS quando ci sono 400+ review per utente
- **SRS-F02**: Push notification per carte in scadenza
- **SRS-F03**: Statistiche dettagliate per carta (storico review, curva EF)

## Out of Scope

| Feature | Reason |
|---------|--------|
| Full SM-2 grade scale (0-5 buttons) | Ridondante con quiz multiple choice binario |
| Undo/reschedule button | Compromette integrità algoritmo; studio forward-only |
| FSRS algorithm | Richiede 400+ review per calibrare ML; prematuro per v2.0 |
| New cards per day setting (Anki-style) | Proporzionamento automatico elimina questa configurazione |
| Per-card statistics detail | Risultato sessione sufficiente per v2.0 |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| SRS-01 | — | Pending |
| SRS-02 | — | Pending |
| SRS-03 | — | Pending |
| SRS-04 | — | Pending |
| SRS-05 | — | Pending |
| SRS-06 | — | Pending |
| DASH-01 | — | Pending |
| DASH-02 | — | Pending |
| HIST-01 | — | Pending |

**Coverage:**
- v2.0 requirements: 9 total
- Mapped to phases: 0
- Unmapped: 9 ⚠️

---
*Requirements defined: 2026-02-25*
*Last updated: 2026-02-25 after initial definition*
