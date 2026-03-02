# Requirements: Lumio

**Defined:** 2026-02-27
**Core Value:** Gli utenti studiano concetti tramite quiz generati dall'AI — il contenuto viene dai repository Git, le domande vengono generate e pre-cachate dal sistema.

## v2.1 Requirements

Requirements for email/password authentication milestone. Each maps to roadmap phases.

### Authentication

- [x] **AUTH-01**: User can sign up with email and password
- [x] **AUTH-02**: User receives OTP code via email after signup for verification
- [x] **AUTH-03**: User can verify email by entering 6-digit OTP code in-app
- [x] **AUTH-04**: User can sign in with email and password
- [x] **AUTH-05**: User can request password reset via email
- [ ] **AUTH-06**: User can set a new password after receiving reset OTP code

### Account Linking

- [ ] **LINK-01**: User can see connected authentication methods in Settings
- [ ] **LINK-02**: User can add Google to an email-only account
- [ ] **LINK-03**: User can add email/password to a Google-only account
- [ ] **LINK-04**: User can unlink an authentication method (if at least one remains)

### Infrastructure

- [x] **INFRA-01**: Database trigger handles email signups (no Google metadata)
- [x] **INFRA-02**: Sign-out works correctly for email-only users
- [x] **INFRA-03**: Supabase config enables email confirmations and manual linking
- [x] **INFRA-04**: OTP email templates customized with Lumio branding
- [x] **INFRA-05**: Login screen shows Google OAuth button on top and email form below with separator
- [x] **INFRA-06**: All new UI strings available in IT and EN

## Future Requirements

### Notifications

- **NOTF-01**: Push notification reminders for cards due (SRS)
- **NOTF-02**: Sync error push notifications

### Distribution

- **DIST-01**: Google Play Store listing and distribution
- **DIST-02**: iOS app

### Analytics

- **ANLY-01**: Study streak tracking with visual indicators
- **ANLY-02**: Progress graphs and trend visualization

## Out of Scope

| Feature | Reason |
|---------|--------|
| Deep link email verification | OTP approach chosen — more reliable on Android, no deep link infrastructure needed |
| Social login (Apple, GitHub, etc.) | Not needed — Google + email covers target users |
| Custom password policy (beyond Supabase default) | 6-char minimum sufficient for personal study app |
| Bilingual email templates | Supabase sends one template per type; single language (EN) acceptable for v2.1 |
| SMTP configuration | Production dashboard config, not code — handled outside milestone |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| AUTH-01 | Phase 29 | Complete |
| AUTH-02 | Phase 29 | Complete |
| AUTH-03 | Phase 29 | Complete |
| AUTH-04 | Phase 30 | Complete |
| AUTH-05 | Phase 30 | Complete |
| AUTH-06 | Phase 30 | Pending |
| LINK-01 | Phase 31 | Pending |
| LINK-02 | Phase 31 | Pending |
| LINK-03 | Phase 31 | Pending |
| LINK-04 | Phase 31 | Pending |
| INFRA-01 | Phase 27 | Complete |
| INFRA-02 | Phase 28 | Complete |
| INFRA-03 | Phase 27 | Complete |
| INFRA-04 | Phase 27 | Complete |
| INFRA-05 | Phase 29 | Complete |
| INFRA-06 | Phase 28 | Complete |

**Coverage:**
- v2.1 requirements: 16 total
- Mapped to phases: 16
- Unmapped: 0

---
*Requirements defined: 2026-02-27*
*Last updated: 2026-02-27 after roadmap creation*
