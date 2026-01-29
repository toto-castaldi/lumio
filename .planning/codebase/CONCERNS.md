# Codebase Concerns

**Analysis Date:** 2026-01-29

## Tech Debt

### Edge Functions Complexity & Lack of Modularity

**Files:**
- `supabase/functions/docora-webhook/index.ts` (1151 lines)
- `supabase/functions/llm-proxy/index.ts` (969 lines)
- `supabase/functions/question-generator/index.ts` (784 lines)
- `supabase/functions/git-sync/index.ts` (700 lines)

**Issue:**
All functions are single monolithic files with inline implementations. No shared utilities or libraries for common patterns (error handling, logging, Supabase queries, Docora API calls, LLM provider abstraction).

**Impact:**
- Code duplication across functions (HMAC verification, Supabase client creation, error handling patterns)
- Difficult to maintain consistent behavior across functions
- Testing is harder without extracted, testable modules
- Changes to common patterns require updating multiple files
- Deno imports are duplicated and inconsistent

**Fix approach:**
1. Extract shared utilities to `supabase/functions/shared/`:
   - `hmac.ts` - HMAC verification (used in docora-webhook, git-sync)
   - `supabase.ts` - Client creation and auth (used in all functions)
   - `docora.ts` - Docora API integration (used in git-sync, docora-webhook)
   - `llm.ts` - LLM provider abstraction (used in llm-proxy, question-generator)
   - `logger.ts` - Structured logging with consistent format
   - `errors.ts` - Custom error types and handling

2. Import shared utilities in each function via `import_map.json`
3. Reduce each function to core logic only

---

### Study Planner Edge Function Not Implemented

**File:** `supabase/functions/study-planner/index.ts`

**Issue:**
Function is a placeholder with TODO comment. Returns hardcoded success response without calculating study plans.

**Impact:**
- Study plan recalculation (triggered nightly via n8n) does nothing
- Users don't get personalized daily study targets based on SM-2 algorithm
- Dashboard shows `daily_target = 0` or stale data
- No cards are prioritized for review based on `sm2_next_review` dates

**Status:**
This is documented in architecture as Phase 12+ feature, so expected to be incomplete.

**Fix approach:**
Implement core logic:
1. Receive `user_id` in request body
2. Load active goal from `goals` table (WHERE `is_active = TRUE`)
3. If no active goal, return success (nothing to plan)
4. Query all cards with matching tags: `SELECT * FROM cards WHERE tags && goal.tags`
5. For each card, calculate SM-2 next review via `user_cards.sm2_next_review`
6. Filter cards due today or overdue
7. Calculate daily_target: `cards_due / days_remaining_to_deadline`
8. Save to goals table: update `daily_target` and `cards_total`

---

### Excessive Console Logging in Edge Functions

**Count:** 95 console.log/error/debug statements across all edge functions

**Files:**
- `supabase/functions/docora-webhook/index.ts` - Logging sensitive webhook verification details
- `supabase/functions/llm-proxy/index.ts` - Logging configuration loading
- `supabase/functions/git-sync/index.ts` - Logging ignore filter operations
- All functions - Mixed `console.log`, `console.error`, `console.debug`

**Issue:**
- No structured logging format - inconsistent prefixes like `[verifyHmac]`, `[Webhook]`, `[git-sync]`
- Sensitive information logged: partial HMAC signatures, token status
- Difficult to filter/search logs in Sentry
- Console statements left from debugging but not removed

**Impact:**
- Security: HMAC signatures (even partial) shouldn't be logged
- Observability: Unstructured logs are hard to query in production
- Performance: High volume of synchronous logging calls

**Fix approach:**
1. Create `supabase/functions/shared/logger.ts` with structured logging:
   ```typescript
   export function createLogger(functionName: string) {
     return {
       info: (msg: string, ctx?: any) => console.log(JSON.stringify({ level: 'info', fn: functionName, msg, ...ctx })),
       error: (msg: string, err?: any) => console.error(JSON.stringify({ level: 'error', fn: functionName, msg, ...err })),
       debug: (msg: string, ctx?: any) => { /* no-op in prod */ }
     }
   }
   ```
2. Replace all console calls with logger
3. Never log: authentication tokens, HMAC signatures, encrypted values, API keys

---

## Known Bugs

### Multi-User Repository Synchronization Race Condition

**File:** `supabase/functions/docora-webhook/index.ts` (lines ~400-500)

**Issue:**
When Docora sends webhook for a shared repository, if multiple users have subscribed to it, the webhook is processed only once. However, the webhook handler uses `SECURITY DEFINER` functions that operate with service role, bypassing RLS.

The card insertion/update doesn't check if user is subscribed - it just updates the repository's cards. This is correct for shared data, but there's no mechanism to ensure all users see the update in realtime.

**Symptoms:**
- User A adds repository → webhook creates cards
- User B adds same repository ~seconds later → webhook fires again (duplicate processing)
- Both see cards eventually, but order of processing is unpredictable

**Trigger:**
Happens when webhook arrives while user_repositories link is being created.

**Current mitigation:**
- `UNIQUE(user_id, repository_id)` constraint prevents duplicate subscriptions
- Card deduplication via `UNIQUE(repository_id, file_path)`
- But brief window of race exists

**Fix approach:**
1. Make docora-webhook idempotent by checking if `docora_repository_id` + webhook timestamp already processed
2. Add `webhook_processed_at` timestamp to repositories table
3. Skip processing if already processed within last 5 seconds
4. Or: use database transaction with row-level locking

---

### Missing Validation on Card Content Size

**Files:**
- `supabase/functions/docora-webhook/index.ts` - Processes file content without size checks
- `apps/web/src/pages/StudyPage.tsx` - Renders markdown without length limits

**Issue:**
No maximum size enforced for card content. Docora can send extremely large files (e.g., 100MB+ code files), which get:
1. Inserted as TEXT into `cards.content` column
2. Downloaded and rendered in browser
3. Processed by LLM (generating questions from huge content)

**Symptoms:**
- Database bloat if large binary files included
- Browser hangs/crashes when rendering large cards
- LLM API rejects requests with content too long

**Impact:**
- Users upload 50MB PDF → converted to markdown → sent to LLM → LLM rejects with token limit error
- Study page shows massive content, browser memory spike
- No error feedback to user

**Fix approach:**
1. Add size validation in docora-webhook:
   ```typescript
   const MAX_CARD_SIZE = 100_000; // 100KB max
   if (file.content.length > MAX_CARD_SIZE) {
     console.error(`Card too large: ${file.path} (${file.content.length} bytes)`);
     return; // Skip processing
   }
   ```

2. Add content length check before LLM API calls in llm-proxy:
   ```typescript
   if (cardContent.length > 50_000) {
     throw new Error('Card content too long for processing');
   }
   ```

3. Truncate displayed content in StudyPage if exceeds threshold

---

## Security Considerations

### API Keys Exposed in Edge Function Logs

**Files:**
- `supabase/functions/llm-proxy/index.ts` - Decrypting and using API keys
- `supabase/functions/docora-webhook/index.ts` - Using Docora auth key

**Risk:**
Edge functions log extensively. If an error occurs during API key decryption or LLM call, the full plaintext key could be logged to Sentry/console.

**Current mitigation:**
- Architecture doc states keys "never persist in logs"
- But no explicit code guards against error logging

**Recommendations:**
1. Create error wrapper that sanitizes sensitive values:
   ```typescript
   export function sanitizeError(err: any): any {
     const msg = err.message || String(err);
     if (msg.includes('sk-') || msg.includes('key:')) {
       return { message: '[REDACTED]' };
     }
     return err;
   }
   ```
2. Test error scenarios to ensure keys don't leak
3. Add Sentry before-send hook to strip keys before sending to service

---

### Docora Webhook HMAC Verification Timing

**File:** `supabase/functions/docora-webhook/index.ts` (lines ~70-112)

**Issue:**
Webhook signature is verified using current timestamp instead of the timestamp in webhook header. The header `X-Docora-Timestamp` should be used to prevent replay attacks.

**Current code:**
```typescript
async function verifyHmacSignature(
  body: string,
  timestamp: string,  // This comes from X-Docora-Timestamp
  signature: string
): Promise<boolean> {
  const message = `${timestamp}.${body}`;
  // ... verify signature
}
```

This is correct! But there's no check for timestamp staleness. An old webhook could be replayed.

**Fix approach:**
1. Add timestamp validation:
   ```typescript
   const receivedTime = new Date(timestamp).getTime();
   const now = Date.now();
   const age = (now - receivedTime) / 1000; // seconds

   if (age > 300) { // 5 minutes
     throw new Error('Webhook timestamp too old (replay attack?)');
   }
   ```

2. Optionally: track processed webhook IDs to prevent duplicates

---

### ENCRYPTION_KEY Rotation Not Implemented

**File:** `supabase/functions/llm-proxy/index.ts` (API key encryption)

**Issue:**
API keys are encrypted with `ENCRYPTION_KEY` which is a static secret. If key is leaked or needs rotation, all encrypted keys become unreadable.

**Impact:**
- Can't rotate encryption key without re-encrypting all stored keys
- If CI/CD secret is leaked, all user API keys are compromised
- No way to revoke or update the master key

**Fix approach:**
1. Add `key_version` field to `user_api_keys.encryption_key_version`
2. Store multiple versions of ENCRYPTION_KEY in Supabase secrets
3. When decrypting, check key_version and use appropriate key
4. Provide admin endpoint to re-encrypt keys with new version
5. Schedule periodic key rotation (e.g., quarterly)

---

## Performance Bottlenecks

### StudyPage Component Size & Complexity

**File:** `apps/web/src/pages/StudyPage.tsx` (558 lines)

**Problem:**
Monolithic component handling:
- Loading cards from database
- Managing quiz state (currentCard, currentQuestion, userAnswer, userVote)
- Generating questions via LLM API
- Validating answers
- Rendering quiz UI, card preview, progress
- Vote submission logic

**Impact:**
- Re-renders entire component when any state changes
- Multiple setState calls trigger cascading renders
- Large memory footprint during study sessions
- Difficult to test individual features
- Performance degrades with hundreds of cards

**Improvement path:**
1. Extract sub-components:
   - `<QuizCard>` - Just the question/options rendering
   - `<CardPreview>` - Full card markdown display
   - `<StudyProgress>` - Progress bar and stats
   - `<QuizFeedback>` - Explanation and validation UI

2. Use `useCallback` to memoize handlers
3. Consider Zustand store for study session state (separate from React render cycle)
4. Virtualize card list if needed

---

### Question Generator API Response Time

**File:** `supabase/functions/question-generator/index.ts` (784 lines)

**Issue:**
Function makes synchronous LLM API calls for every card. If user has 100 cards to study, that's 100 sequential API calls (~3-5 seconds each = 300-500 seconds total).

**Current behavior:**
1. User starts study session
2. For each card: call LLM to generate question (await)
3. Display question only after generation completes

**Impact:**
- 5+ minute wait to generate questions for 100 cards
- Poor UX - user waits staring at loading spinner
- Wastes API quota

**Fix approach:**
1. **Pre-generate questions on repository sync:**
   - When docora-webhook processes new cards, call question-generator immediately
   - Store `pregenerated_questions` table (question, options, correctAnswer, explanation)

2. **Batch question generation:**
   - Instead of 1 question per card, generate in batches of 5-10
   - Use Promise.all() instead of sequential awaits

3. **Cache questions:**
   - Check if question exists before calling LLM
   - Reuse same question for same card across all users (optional)

---

### Docora Webhook Processing Time for Large Repositories

**File:** `supabase/functions/docora-webhook/index.ts`

**Issue:**
For large repositories (thousands of cards), webhook processing is slow:
1. Parse YAML frontmatter for each card
2. Upload images to Supabase Storage
3. Insert/update card record
4. All synchronously in a single request

**Impact:**
- Webhook timeout if >30 seconds
- User waits for repository to sync before seeing cards
- N8n job hangs if webhook slow

**Fix approach:**
1. Make webhook fast by queueing work:
   - Webhook validates webhook signature
   - Queues job: `INSERT INTO sync_queue (repository_id, file_path, content)`
   - Responds immediately

2. Separate worker function processes queue asynchronously:
   - Polls queue every 5 seconds
   - Processes 10 cards at a time
   - Updates `repositories.sync_status` to show progress

3. Or use Deno's KV store to queue work

---

## Fragile Areas

### Card Asset Deduplication via Content Hash

**Files:**
- `supabase/functions/docora-webhook/index.ts` - Computes SHA-256 hash
- `packages/core/src/supabase/assets.ts` - References content_hash

**Why fragile:**
Hash collision (even theoretically impossible with SHA-256) would cause wrong assets to be reused. More likely: content changes but hash remains same if copying old content.

**Safe modification:**
1. Always verify hash matches actual content when retrieving
2. Add `size_bytes` check alongside hash
3. Don't rely solely on hash for deduplication - include content-based fingerprint

---

### SM-2 Algorithm State Management

**Files:**
- `packages/core/src/supabase/study.ts` - SM-2 calculations
- `apps/web/src/pages/StudyPage.tsx` - State updates
- Postgres function `update_sm2()` in DATA-MODEL.md

**Why fragile:**
SM-2 state (repetitions, easiness, interval, next_review) is mutable and depends on answer correctness. If update fails mid-session:
- Client thinks answer was recorded
- Database doesn't have update
- Next session shows stale SM-2 state
- User repeats cards already mastered

**Safe modification:**
1. Make SM-2 updates transactional in Edge Function:
   ```typescript
   await supabase.rpc('update_sm2_with_response', {
     user_card_id: '...',
     is_correct: true,
     response_id: '...' // For idempotency
   });
   ```

2. Store response ID in `user_card_responses` to prevent duplicate updates
3. Client retries failed SM-2 updates before loading next card

---

### Repository Shared Access Without Explicit User Permission

**File:** `supabase/functions/git-sync/index.ts` and `DATA-MODEL.md`

**Issue:**
When user adds a repository URL, any other user who adds the same URL gets the same cards automatically via RLS policies. This is by design (shared repositories), but could be surprising.

**Implications:**
- User A adds `https://github.com/toto-castaldi/study-deck` → creates cards
- User B adds same URL → sees user A's cards immediately
- User A could pollute repository with poor-quality cards
- No way for user B to "trust" user A's contributions

**This is documented design**, but increases social engineering risk.

**Mitigation:**
Document in UI that repositories are shared. Consider future feature: repository reputation/quality scores.

---

## Scaling Limits

### PostgreSQL Row Count for Large User Base

**Table:** `user_card_responses` (audit trail)

**Current capacity:**
- Per user per year: ~36,500 responses (100 cards/day * 365 days)
- For 10,000 users: 365M rows/year
- PostgreSQL handles this, but queries slow down

**Limit:**
- After 5+ years with 10k users: 1B+ rows
- Table becomes unwieldy for analytics
- Indexes grow large

**Scaling path:**
1. Implement table partitioning by `created_at` (monthly or yearly)
2. Archive old responses to cold storage (S3) after 2 years
3. Create materialized views for analytics (aggregate by user/month)

---

### Supabase Storage for Card Assets

**Current capacity:**
- Each card can have up to 20 images (MAX_IMAGES_PER_CARD)
- Each image up to 5MB
- Max per card: 100MB of assets
- No cleanup policy

**Limit:**
- After 10k users, 50k cards, avg 5 images per card = 250k images
- Even at 500KB average = 125GB of storage
- Supabase charges per GB

**Scaling path:**
1. Set storage quota per user/repository
2. Implement image compression in docora-webhook (downscale large images)
3. Implement cleanup: delete unused assets after 90 days
4. Archive to cold storage (S3/Backblaze) if exceeds quota

---

### LLM API Rate Limits

**Files:**
- `supabase/functions/llm-proxy/index.ts` - Calls OpenAI/Anthropic

**Current implementation:**
No rate limiting. Each user can generate unlimited questions. If 100 users each generate 100 questions in parallel, that's 10k requests to LLM in minutes.

**Limit:**
- OpenAI tier 1: 3 requests/minute, $0.01/1k tokens
- Anthropic: similar limits
- Cost: 10k requests * ~200 tokens = 2M tokens = $0.02 per batch
- But hitting rate limits → errors

**Scaling path:**
1. Implement rate limiting in llm-proxy (max 10 requests/minute per user)
2. Queue requests: return 202 Accepted, process async
3. Add cost tracking: store tokens_used in user_card_responses
4. Alert if user exceeds monthly quota
5. Consider shared question pool: multiple users get same question for same card (privacy tradeoff)

---

## Scaling Limits

### Edge Function Cold Starts

**Issue:**
Deno edge functions have cold start latency (~1-3 seconds on Supabase). Multiple sequential calls compound this.

**Example study session flow:**
1. User starts study → calls question-generator (cold start ~1s)
2. User answers → calls llm-proxy for validation (cold start ~1s)
3. Each of 50 cards = 50s+ latency

**Scaling path:**
1. Pre-warm functions: periodic dummy requests
2. Batch questions: generate 5 at once instead of 1
3. Consider Supabase Realtime to push updates instead of polling

---

## Dependencies at Risk

### Docora Webhook - External Dependency

**Risk:**
Lumio depends on Docora to sync repositories. If Docora goes down:
- New repositories can't be added
- Existing cards don't get updated
- Users can't see new files pushed to GitHub

**Current mitigation:**
- Graceful degradation: show cards last synced, don't throw errors
- But no fallback mechanism

**Migration plan:**
1. Keep GitHub API integration as fallback (only for public repos)
2. Implement manual sync trigger: user can force re-sync from web UI
3. Add repository health indicator: "Last synced 2 hours ago"
4. Consider alternative webhook service (e.g., self-hosted)

---

### Fixed LLM Provider List

**Files:**
- `supabase/functions/llm-proxy/index.ts` - Only OpenAI and Anthropic
- `packages/shared/src/types/index.ts` - Enum: `'openai' | 'anthropic'`

**Risk:**
Adding new provider requires code changes across multiple files and database migration.

**Fix approach:**
1. Centralize provider config in `platform_config` table with JSON schema
2. Make llm-proxy provider-agnostic via adapter pattern
3. Allow runtime provider addition without code changes

---

## Missing Critical Features

### No Error Recovery for Failed Syncs

**Problem:**
If docora-webhook fails partway through processing (e.g., image upload fails), the repository is left in `sync_status = 'syncing'` indefinitely. User sees loading spinner forever.

**Impact:**
- UI hangs
- User can't recover
- Must manually delete and re-add repository

**Fix approach:**
1. Add timeout: if sync_status = 'syncing' for >30 minutes, reset to 'error'
2. Provide "retry sync" button in UI
3. Show last error message to user

---

### No Audit Trail for Admin Actions

**Problem:**
No logging of who deleted repositories, modified configuration, etc. Can't trace changes.

**Fix approach:**
1. Create `audit_log` table with admin actions
2. Log: user_id, action, resource_id, timestamp, changes
3. Expose audit log in admin panel (future feature)

---

## Test Coverage Gaps

### Edge Functions Have No Automated Tests

**Files:**
- `supabase/functions/*/index.ts` - No `.test.ts` or `.spec.ts` files

**What's not tested:**
- HMAC signature verification (critical security)
- Card parsing from webhook payloads
- LLM response handling and error cases
- Docora API error handling
- Concurrent webhook processing

**Risk:**
Changes to functions could break silently. Security bugs in HMAC verification wouldn't be caught.

**Priority:** High

**Fix approach:**
1. Create `supabase/functions/__tests__/` directory
2. Write tests using Deno testing framework:
   ```typescript
   import { test, assertEquals } from "https://deno.land/std/testing/mod.ts";

   test("verifyHmacSignature validates correct signature", () => {
     const body = '{"test": true}';
     const timestamp = '2025-01-29T00:00:00Z';
     const signature = computeHmac(body, timestamp);
     const result = await verifyHmacSignature(body, timestamp, signature);
     assertEquals(result, true);
   });
   ```

3. Run tests in CI/CD before deploying functions

---

### StudyPage Missing Integration Tests

**File:** `apps/web/src/pages/StudyPage.tsx`

**What's not tested:**
- Full study session flow: generate question → answer → validate → next card
- Loading states and error handling
- Card preview dialog integration
- Progress tracking accuracy
- Vote submission and rating

**Priority:** High

**Fix approach:**
1. Create `apps/web/src/pages/__tests__/StudyPage.test.tsx`
2. Mock `@lumio/core` functions
3. Test scenarios:
   - Generate question successfully
   - LLM API error → show error toast
   - Answer correctly → show positive feedback
   - Answer incorrectly → show correction
   - Vote on question → update database
   - Skip card → move to next
   - All cards completed → show completion screen

---

### Mobile App (PWA) Has Minimal Test Coverage

**Files:**
- `apps/mobile/src/pages/StudyPage.tsx` (627 lines)
- `apps/mobile/src/pages/RepositoriesPage.tsx` (180 lines)

**What's not tested:**
- Offline mode (PWA service worker)
- Install prompt functionality
- Touch interactions (gestures)
- Responsive layout on different screen sizes
- Network failure recovery

**Priority:** Medium (after web app)

**Fix approach:**
1. Add PWA testing with Playwright
2. Test service worker registration and cache
3. Test responsive breakpoints

---

*Concerns audit: 2026-01-29*
