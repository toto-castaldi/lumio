---
status: complete
phase: 50-popular-decks-leaderboard
source: [50-01-SUMMARY.md]
started: 2026-03-18T10:45:00Z
updated: 2026-03-18T11:00:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Top Decks RPC Returns Data
expected: Call `top_decks()` RPC — returns up to 10 decks ordered by subscriber count descending, each with display_name, subscriber_count, tags, and language fields. Works without authentication (anon role).
result: pass

### 2. Leaderboard Section Visible
expected: Open landing page. If decks with subscribers exist, a "Popular Decks" / "Mazzi Popolari" section appears between Features and Screenshots. Shows numbered list with rank (#1, #2...), deck name, subscriber count, tag chips (purple), and language flag emoji.
result: pass

### 3. Language Toggle on Leaderboard
expected: Click the IT/EN toggle. Subscriber labels switch between "subscribers"/"subscriber" (EN) and "iscritti"/"iscritto" (IT). Section heading switches between "Popular Decks" and "Mazzi Popolari".
result: pass

### 4. Empty State — Section Hidden
expected: If no decks have subscribers, the Popular Decks section does NOT appear at all — no empty box, no heading, no placeholder. The page jumps from Features straight to Screenshots.
result: pass

## Summary

total: 4
passed: 4
issues: 0
pending: 0
skipped: 0

## Gaps

[none]
