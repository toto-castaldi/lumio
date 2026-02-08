# Requirements: Lumio

**Defined:** 2026-02-08
**Core Value:** Gli utenti studiano concetti tramite quiz generati dall'AI -- il contenuto viene dai repository Git, le domande vengono generate e pre-cachate dal sistema.

## v1.2 Requirements

Requirements for milestone v1.2 Polish & UX. Each maps to roadmap phases.

### Bugfix

- [ ] **BUG-01**: User can view full card content in preview without top cutoff
- [ ] **BUG-02**: User sees actual app version in Settings (from @lumio/shared, not hardcoded)

### Branding

- [ ] **BRAND-01**: User sees Lumio logo on Login screen (replaces text placeholder)
- [ ] **BRAND-02**: User sees Lumio logo icon in Dashboard navigation header
- [ ] **BRAND-03**: Landing page displays Lumio logo

### Studio

- [ ] **STUDY-01**: User can configure cards-per-session (10/20/50/All) in Settings
- [ ] **STUDY-02**: User sees "studying Y of X" count on study ready screen
- [ ] **STUDY-03**: Study session ends after configured card limit is reached

### Internazionalizzazione

- [ ] **I18N-01**: User can switch app language between IT and EN in Settings
- [ ] **I18N-02**: Language preference persists across app restarts
- [ ] **I18N-03**: All UI strings (buttons, labels, headers, toasts, empty states) update on language change
- [ ] **I18N-04**: Card content and AI-generated questions remain in original language

## Future Requirements

Deferred to follow-up milestones.

### Branding

- **BRAND-04**: Animated splash screen with logo

### Internazionalizzazione

- **I18N-05**: Language-aware date formatting ("2 ore fa" in Italian)
- **I18N-06**: Auto-detect device locale on first launch

## Out of Scope

| Feature | Reason |
|---------|--------|
| react-native-svg for logo | Native rebuild required, SDK 54 press event regressions -- use PNG conversion |
| Slider for cards-per-session | Decision paralysis -- use preset radio buttons (10/20/50/All) |
| Card content translation | Educational material must stay in original language |
| RTL language support | No RTL languages planned |
| Translation management platform (Crowdin etc.) | 2 languages, ~84 strings, single developer -- JSON files sufficient |
| Per-screen language switching | Over-engineered for 2-language app |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| BUG-01 | Phase 6 | Pending |
| BUG-02 | Phase 6 | Pending |
| BRAND-01 | Phase 7 | Pending |
| BRAND-02 | Phase 7 | Pending |
| BRAND-03 | Phase 7 | Pending |
| STUDY-01 | Phase 8 | Pending |
| STUDY-02 | Phase 8 | Pending |
| STUDY-03 | Phase 8 | Pending |
| I18N-01 | Phase 9 | Pending |
| I18N-02 | Phase 9 | Pending |
| I18N-03 | Phase 9 | Pending |
| I18N-04 | Phase 9 | Pending |

**Coverage:**
- v1.2 requirements: 12 total
- Mapped to phases: 12
- Unmapped: 0

---
*Requirements defined: 2026-02-08*
*Last updated: 2026-02-09 after roadmap creation (traceability complete)*
