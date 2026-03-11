# Requirements: Lumio

**Defined:** 2026-03-11
**Core Value:** Gli utenti studiano concetti tramite quiz generati dall'AI — il contenuto viene dai repository Git, le domande vengono generate e pre-cachate dal sistema.

## v3.0 Requirements

Requirements for Deck Builder Web milestone. Each maps to roadmap phases.

### Authentication & Infrastructure

- [ ] **AUTH-01**: User can login on deck builder web app with Google OAuth (same Supabase project)
- [ ] **AUTH-02**: User can login on deck builder web app with email/password (same Supabase project)
- [ ] **AUTH-03**: Web app has responsive layout with sidebar deck list and main editor area
- [ ] **AUTH-04**: Web app supports IT/EN bilingual UI with language toggle
- [ ] **AUTH-05**: Web app supports dark mode with system detection and manual toggle

### Deck Management

- [ ] **DECK-01**: User can create a new deck (creates directory in shared Git repo)
- [ ] **DECK-02**: User can rename an existing deck
- [ ] **DECK-03**: User can delete a deck with confirmation dialog
- [ ] **DECK-04**: User can see list of their own decks only

### Card Management

- [ ] **CARD-01**: User can create a new card with markdown content in a deck
- [ ] **CARD-02**: User can edit an existing card's markdown content
- [ ] **CARD-03**: User can delete a card with confirmation dialog
- [ ] **CARD-04**: User can set card metadata via structured form (title, tags, difficulty, language)
- [ ] **CARD-05**: New card starts with pre-filled template (frontmatter + placeholder body)
- [ ] **CARD-06**: User can see list of cards within a deck

### Editor

- [ ] **EDIT-01**: Markdown editor with live preview (split-pane or toggle)
- [ ] **EDIT-02**: Toolbar with buttons for bold, italic, code block, math block, heading, list
- [ ] **EDIT-03**: User receives toast feedback on successful save or error

### Backend Pipeline

- [ ] **PIPE-01**: Edge function commits card files to shared Lumio Git repo via GitHub API
- [ ] **PIPE-02**: Edge function enforces user path isolation (user can only write to `/{user_id}/`)
- [ ] **PIPE-03**: Docora syncs shared repo and generates AI questions (existing pipeline)

### Deploy

- [ ] **DEPL-01**: Web app deployed at deck.lumio.toto-castaldi.com
- [ ] **DEPL-02**: CI/CD pipeline builds and deploys web app automatically

## Future Requirements

### Deck Discovery (v3.1)

- **DISC-01**: User can search public repos/decks by name, description, and tags (fulltext)
- **DISC-02**: User can add a discovered public repo to their account
- **DISC-03**: Search results include deck metadata (card count, author, tags)

### TBD (v3.2)

- To be defined after v3.1

## Out of Scope

| Feature | Reason |
|---------|--------|
| In-browser study/quiz mode | Mobile app is the study experience, no duplication |
| WYSIWYG editor | Fights with code blocks and math notation; markdown + preview is proven |
| Real-time collaboration | Single developer, personal use — enormous complexity for zero demand |
| Image upload in cards | Git binary complexity; external URL images supported |
| Card versioning UI | Git provides history; building UI is complex and rarely needed |
| Deck sharing/publishing | Deferred to v3.1 Deck Discovery |
| Offline support | Editor requires connectivity for GitHub commits |
| Cloze deletion syntax | Lumio uses AI-generated questions, not user-authored card formats |
| Autosave | Manual save first; autosave adds commit complexity |
| Drag-and-drop card reorder | Ordering is cosmetic since AI generates questions per-card |
| Card fulltext search | Scale doesn't warrant it; hierarchical navigation sufficient |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| AUTH-01 | — | Pending |
| AUTH-02 | — | Pending |
| AUTH-03 | — | Pending |
| AUTH-04 | — | Pending |
| AUTH-05 | — | Pending |
| DECK-01 | — | Pending |
| DECK-02 | — | Pending |
| DECK-03 | — | Pending |
| DECK-04 | — | Pending |
| CARD-01 | — | Pending |
| CARD-02 | — | Pending |
| CARD-03 | — | Pending |
| CARD-04 | — | Pending |
| CARD-05 | — | Pending |
| CARD-06 | — | Pending |
| EDIT-01 | — | Pending |
| EDIT-02 | — | Pending |
| EDIT-03 | — | Pending |
| PIPE-01 | — | Pending |
| PIPE-02 | — | Pending |
| PIPE-03 | — | Pending |
| DEPL-01 | — | Pending |
| DEPL-02 | — | Pending |

**Coverage:**
- v3.0 requirements: 23 total
- Mapped to phases: 0
- Unmapped: 23 ⚠️

---
*Requirements defined: 2026-03-11*
*Last updated: 2026-03-11 after initial definition*
