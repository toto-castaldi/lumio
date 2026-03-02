# Roadmap: Lumio

## Milestones

- SHIPPED **v1.1 Lumio Native** -- Phases 1-5 (shipped 2026-02-08)
- SHIPPED **v1.2 Polish & UX** -- Phases 6-9 (shipped 2026-02-09)
- SHIPPED **v1.3 Bugfix & UX Polish** -- Phases 10-12 (shipped 2026-02-10)
- SHIPPED **v1.4 Card Browse & Stats** -- Phases 13-15 (shipped 2026-02-11)
- SHIPPED **v1.5 Study UX Fixes** -- Phase 16 (shipped 2026-02-12)
- SHIPPED **v1.6 Sync Error Handling** -- Phases 17-19 (shipped 2026-02-18)
- SHIPPED **v1.7 GSD Versioning** -- Phases 20-22 (shipped 2026-02-21)
- SHIPPED **v2.0 Spaced Repetition** -- Phases 23-26 (shipped 2026-02-26)
- IN PROGRESS **v2.1 Email Auth** -- Phases 27-31

## Phases

<details>
<summary>v1.1 Lumio Native (Phases 1-5) -- SHIPPED 2026-02-08</summary>

- [x] Phase 1: Foundation (3 plans) -- completed 2026-02-04
- [x] Phase 2: Auth & Navigation (4 plans) -- completed 2026-02-04
- [x] Phase 3: Core Screens (5 plans) -- completed 2026-02-07
- [x] Phase 4: Study & Cards (4 plans) -- completed 2026-02-08
- [x] Phase 5: Distribution & Cleanup (4 plans) -- completed 2026-02-08

Full details: `.planning/milestones/v1.1-ROADMAP.md`

</details>

<details>
<summary>v1.2 Polish & UX (Phases 6-9) -- SHIPPED 2026-02-09</summary>

- [x] Phase 6: Bugfix & Version (2 plans) -- completed 2026-02-09
- [x] Phase 7: Branding (2 plans) -- completed 2026-02-09
- [x] Phase 8: Configurable Study Sessions (2 plans) -- completed 2026-02-09
- [x] Phase 9: Internationalization (3 plans) -- completed 2026-02-09

Full details: `.planning/milestones/v1.2-ROADMAP.md`

</details>

<details>
<summary>v1.3 Bugfix & UX Polish (Phases 10-12) -- SHIPPED 2026-02-10</summary>

- [x] Phase 10: Branding Consistency (2 plans) -- completed 2026-02-10
- [x] Phase 11: Study Flow Simplification (1 plan) -- completed 2026-02-10
- [x] Phase 12: Dashboard & Repo Bugfixes (1 plan) -- completed 2026-02-10

Full details: `.planning/milestones/v1.3-ROADMAP.md`

</details>

<details>
<summary>v1.4 Card Browse & Stats (Phases 13-15) -- SHIPPED 2026-02-11</summary>

- [x] Phase 13: UX Fixes (1 plan) -- completed 2026-02-11
- [x] Phase 14: Card Browse (1 plan) -- completed 2026-02-11
- [x] Phase 15: Study Stats (2 plans) -- completed 2026-02-11

Full details: `.planning/milestones/v1.4-ROADMAP.md`

</details>

<details>
<summary>v1.5 Study UX Fixes (Phase 16) -- SHIPPED 2026-02-12</summary>

- [x] Phase 16: Study Screen Polish (1 plan) -- completed 2026-02-12

Full details: `.planning/milestones/v1.5-ROADMAP.md`

</details>

<details>
<summary>v1.6 Sync Error Handling (Phases 17-19) -- SHIPPED 2026-02-21</summary>

- [x] Phase 17: Sync Failure Backend (2 plans) -- completed 2026-02-17
- [x] Phase 18: Sync Error Display (1 plan) -- completed 2026-02-18
- [x] Phase 19: Token Update Flow (1 plan) -- completed 2026-02-18

Full details: `.planning/milestones/v1.6-ROADMAP.md`

</details>

<details>
<summary>v1.7 GSD Versioning (Phases 20-22) -- SHIPPED 2026-02-21</summary>

- [x] Phase 20: Cleanup Legacy Versioning (3 plans) -- completed 2026-02-21
- [x] Phase 21: GSD Version Pipeline (1 plan) -- completed 2026-02-21
- [x] Phase 22: Version Display & Docs (2 plans) -- completed 2026-02-21

Full details: `.planning/milestones/v1.7-ROADMAP.md`

</details>

<details>
<summary>v2.0 Spaced Repetition (Phases 23-26) -- SHIPPED 2026-02-26</summary>

- [x] Phase 23: SRS Schema & Algorithm (2 plans) -- completed 2026-02-26
- [x] Phase 24: Study Session Integration (3 plans) -- completed 2026-02-26
- [x] Phase 25: Dashboard & Study UI (1 plan) -- completed 2026-02-26
- [x] Phase 26: History Fix & Validation (2 plans) -- completed 2026-02-26

Full details: `.planning/milestones/v2.0-ROADMAP.md`

</details>

### v2.1 Email Auth (In Progress)

**Milestone Goal:** Add email/password authentication with OTP verification, password reset, and account linking alongside existing Google OAuth.

- [x] **Phase 27: Foundation & Database** - Supabase config, email templates, DB trigger fix for email signups (completed 2026-02-27)
- [x] **Phase 28: Auth Context & Infrastructure** - Extend AuthContext with email auth methods, fix signOut for email-only users, add i18n strings (completed 2026-02-27)
- [x] **Phase 29: Email Signup & Verification** - SignUp screen, OTP verification screen, login screen layout with email form (completed 2026-02-27)
- [ ] **Phase 30: Email Login & Password Reset** - Email login flow, forgot password screen, reset password screen with OTP
- [ ] **Phase 31: Account Linking** - Connected accounts display, add Google to email account, add email to Google account, unlink method

## Phase Details

### Phase 27: Foundation & Database
**Goal**: Supabase is configured for email auth and the database correctly handles email signups
**Depends on**: Nothing (first phase of v2.1)
**Requirements**: INFRA-01, INFRA-03, INFRA-04
**Success Criteria** (what must be TRUE):
  1. A user signing up with email/password gets a non-null display_name in public.users (derived from email prefix)
  2. Supabase config.toml has email confirmations enabled and manual identity linking enabled
  3. OTP email templates with Lumio branding exist and deliver 6-digit codes (testable via Inbucket locally)
**Plans**: 2 plans

Plans:
- [ ] 27-01-PLAN.md — Supabase config for email auth + branded OTP email templates
- [ ] 27-02-PLAN.md — Provider-aware database trigger for email signups

### Phase 28: Auth Context & Infrastructure
**Goal**: AuthContext supports email auth lifecycle and all new UI strings are translatable
**Depends on**: Phase 27
**Requirements**: INFRA-02, INFRA-06
**Success Criteria** (what must be TRUE):
  1. An email-only user can sign out without the app crashing (GoogleSignin.signOut guarded)
  2. All new auth-related strings (approximately 30 keys) are available in both IT and EN
  3. AuthContext exposes signUpWithEmail, signInWithEmail, resetPassword, updatePassword, and passwordRecoveryPending state
**Plans**: 2 plans

Plans:
- [ ] 28-01-PLAN.md — Extend AuthContext with email auth methods, signOut guard, recovery state machine
- [ ] 28-02-PLAN.md — Add ~30 i18n keys for auth screens in EN and IT

### Phase 29: Email Signup & Verification
**Goal**: Users can create an account with email/password and verify their email via OTP code
**Depends on**: Phase 28
**Requirements**: AUTH-01, AUTH-02, AUTH-03, INFRA-05
**Success Criteria** (what must be TRUE):
  1. User can fill email and password on a SignUp screen and submit to create an account
  2. User receives a 6-digit OTP code via email after signup
  3. User can enter the OTP code on a verification screen to confirm their email and be logged in
  4. Login screen shows Google OAuth button prominently on top and email form below an "oppure"/"or" separator
  5. Duplicate email signup (email already registered via Google) is detected and shows a meaningful error
**Plans**: 2 plans

Plans:
- [ ] 29-01-PLAN.md -- Login screen redesign + AuthNavigator expansion + AuthContext OTP methods + i18n keys
- [ ] 29-02-PLAN.md -- SignUp screen + OTP verification screen

### Phase 30: Email Login & Password Reset
**Goal**: Users can log in with email/password and recover a forgotten password via OTP
**Depends on**: Phase 29
**Requirements**: AUTH-04, AUTH-05, AUTH-06
**Success Criteria** (what must be TRUE):
  1. User can log in with email and password from the login screen
  2. User can tap "Forgot password?" and receive a reset OTP code via email
  3. User can enter the reset OTP code and set a new password, then is signed out and redirected to login
  4. Invalid credentials and unverified email show appropriate error messages
**Plans**: 2 plans

Plans:
- [ ] 30-01-PLAN.md — Auth infrastructure: verifyRecoveryOtp, global signOut, navigation guard, wire forgot password & resend verification
- [ ] 30-02-PLAN.md — ForgotPasswordScreen + UpdatePasswordScreen with OTP entry and new password

### Phase 31: Account Linking
**Goal**: Users can connect multiple auth methods to a single account from Settings
**Depends on**: Phase 30
**Requirements**: LINK-01, LINK-02, LINK-03, LINK-04
**Success Criteria** (what must be TRUE):
  1. User can see which authentication methods (Google, email) are connected in Settings
  2. A Google-only user can add a password to their account from Settings
  3. An email-only user can link their Google account from Settings
  4. User can unlink an authentication method as long as at least one method remains
  5. SecureStore handles dual-identity JWT size without session loss
**Plans**: TBD

Plans:
- [ ] 31-01: TBD
- [ ] 31-02: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 27 -> 28 -> 29 -> 30 -> 31

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1-5. Foundation to Cleanup | v1.1 | 20/20 | Complete | 2026-02-08 |
| 6-9. Polish to i18n | v1.2 | 9/9 | Complete | 2026-02-09 |
| 10-12. Branding to Bugfixes | v1.3 | 4/4 | Complete | 2026-02-10 |
| 13-15. UX to Stats | v1.4 | 4/4 | Complete | 2026-02-11 |
| 16. Study Screen Polish | v1.5 | 1/1 | Complete | 2026-02-12 |
| 17-19. Sync Error Handling | v1.6 | 4/4 | Complete | 2026-02-18 |
| 20-22. GSD Versioning | v1.7 | 6/6 | Complete | 2026-02-21 |
| 23-26. Spaced Repetition | v2.0 | 8/8 | Complete | 2026-02-26 |
| 27. Foundation & Database | 2/2 | Complete    | 2026-02-27 | - |
| 28. Auth Context & Infrastructure | 2/2 | Complete    | 2026-02-27 | - |
| 29. Email Signup & Verification | 2/2 | Complete    | 2026-02-27 | - |
| 30. Email Login & Password Reset | 1/2 | In Progress|  | - |
| 31. Account Linking | v2.1 | 0/? | Not started | - |

---
*Roadmap created: 2026-01-29*
*v2.0 shipped: 2026-02-26*
*v2.1 roadmap added: 2026-02-27*
