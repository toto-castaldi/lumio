# Requirements: Lumio

**Defined:** 2026-03-13
**Core Value:** Gli utenti studiano concetti tramite quiz generati dall'AI — il contenuto viene dai repository Git, le domande vengono generate e pre-cachate dal sistema.

## v3.1 Requirements

Requirements for Deck Discovery milestone. Each maps to roadmap phases.

### Database & Search

- [ ] **DBSR-01**: Platform has a deck_index table with fulltext search via tsvector/GIN using 'simple' config
- [ ] **DBSR-02**: Platform has a search_decks RPC with weighted ranking (name > tags > description) and optional category filter
- [ ] **DBSR-03**: User can subscribe to a specific deck subfolder in the shared repo (subfolder_path on user_repositories)
- [ ] **DBSR-04**: Study RPCs filter cards by subfolder_path when set, so subscribed users see only their chosen deck's cards
- [ ] **DBSR-05**: Platform has lumio-decks repo registered at platform level, always synced by Docora

### Backend Pipeline

- [ ] **PIPE-01**: docora-webhook detects and parses deck.yaml files, upserting metadata into deck_index
- [ ] **PIPE-02**: docora-webhook deletes deck_index row when deck.yaml is removed
- [ ] **PIPE-03**: deck-commit edge function has a commit_yaml action for writing deck.yaml with path validation

### Deck Builder

- [ ] **DKBL-01**: User can set deck metadata (display name, description, category, tags) via a form in the deck builder
- [ ] **DKBL-02**: User can save deck metadata as deck.yaml in the deck folder
- [ ] **DKBL-03**: Deck builder loads existing deck.yaml when selecting a deck

### Mobile Discovery

- [ ] **DISC-01**: User can access a Discovery tab (4th bottom tab with compass icon)
- [ ] **DISC-02**: User can search shared decks via fulltext search bar with 300ms debounce
- [ ] **DISC-03**: User sees search results with deck name, description, card count, and author
- [ ] **DISC-04**: User can browse decks by category via horizontal scrollable chip bar
- [ ] **DISC-05**: User can subscribe to a shared deck with single tap
- [ ] **DISC-06**: User can unsubscribe from a shared deck
- [ ] **DISC-07**: User sees appropriate empty states (no decks, no results, all subscribed)
- [ ] **DISC-08**: Discovery UI is fully localized in IT and EN

### Study Integration

- [ ] **STDY-01**: Subscribed shared deck cards appear in user's study sessions with SRS scheduling

## Future Requirements

Deferred to v3.2 or later.

### Discovery Enhancements

- **DISC-F01**: User sees subscriber count on each deck
- **DISC-F02**: User can preview deck cards before subscribing
- **DISC-F03**: User can sort by popularity/featured
- **DISC-F04**: User can view author profile page
- **DISC-F05**: Infinite scroll pagination for large deck collections

## Out of Scope

| Feature | Reason |
|---------|--------|
| Card-level fulltext search | Scale doesn't require it; hierarchical navigation sufficient |
| Deck ratings/reviews | Social feature premature at current scale |
| Deck forking/cloning | Git complexity; users subscribe, not copy |
| Real-time sync notifications | Eventual consistency via Docora is sufficient |
| Auto-generated deck metadata | Authors should intentionally describe their decks |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| DBSR-01 | — | Pending |
| DBSR-02 | — | Pending |
| DBSR-03 | — | Pending |
| DBSR-04 | — | Pending |
| DBSR-05 | — | Pending |
| PIPE-01 | — | Pending |
| PIPE-02 | — | Pending |
| PIPE-03 | — | Pending |
| DKBL-01 | — | Pending |
| DKBL-02 | — | Pending |
| DKBL-03 | — | Pending |
| DISC-01 | — | Pending |
| DISC-02 | — | Pending |
| DISC-03 | — | Pending |
| DISC-04 | — | Pending |
| DISC-05 | — | Pending |
| DISC-06 | — | Pending |
| DISC-07 | — | Pending |
| DISC-08 | — | Pending |
| STDY-01 | — | Pending |

**Coverage:**
- v3.1 requirements: 20 total
- Mapped to phases: 0
- Unmapped: 20 (pending roadmap creation)

---
*Requirements defined: 2026-03-13*
*Last updated: 2026-03-13 after initial definition*
