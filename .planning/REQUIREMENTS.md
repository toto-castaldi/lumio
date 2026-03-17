# Requirements: Lumio

**Defined:** 2026-03-17
**Core Value:** Gli utenti studiano concetti tramite quiz generati dall'AI — il contenuto viene dai repository Git, le domande vengono generate e pre-cachate dal sistema.

## v3.3 Requirements

Requirements for Shared Deck Parity. Shared deck subscriptions must behave identically to personal repositories for counting, browsing, and study.

### Stats

- [ ] **STATS-01**: Dashboard repo count include shared deck subscriptions come repository separati
- [ ] **STATS-02**: Dashboard card count include le carte dei mazzi condivisi (filtrate per subfolder_path)

### Card Browsing

- [ ] **BROWSE-01**: Utente può aprire un mazzo condiviso dalla lista repo e vedere le carte filtrate per subfolder
- [ ] **BROWSE-02**: Edge function getCards() gestisce multiple subscriptions allo stesso repository senza errore

### Studio

- [ ] **STUDY-01**: Carte dei mazzi condivisi appaiono nelle sessioni di studio
- [ ] **STUDY-02**: Conteggio "Da ripassare oggi" include carte dei mazzi condivisi

## Future Requirements

None.

## Out of Scope

| Feature | Reason |
|---------|--------|
| Shared deck card count in Discovery tab | Already working via search_decks RPC |
| Shared deck unsubscribe improvements | Already shipped in v3.2 |
| Offline mode for shared decks | Offline mode out of scope globally |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| STATS-01 | — | Pending |
| STATS-02 | — | Pending |
| BROWSE-01 | — | Pending |
| BROWSE-02 | — | Pending |
| STUDY-01 | — | Pending |
| STUDY-02 | — | Pending |

**Coverage:**
- v3.3 requirements: 6 total
- Mapped to phases: 0
- Unmapped: 6 ⚠️

---
*Requirements defined: 2026-03-17*
*Last updated: 2026-03-17 after initial definition*
