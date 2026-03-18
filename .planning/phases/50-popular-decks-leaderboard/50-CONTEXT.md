# Phase 50: Popular Decks Leaderboard - Context

**Gathered:** 2026-03-18
**Status:** Ready for planning

<domain>
## Phase Boundary

Add a "Popular Decks" section to the static landing page (apps/landing/) showing a live top-10 leaderboard of shared decks ranked by subscriber count. Requires a public Supabase RPC (no auth) and client-side fetch on page load. Pure landing page feature — no changes to the Android app or deck builder.

</domain>

<decisions>
## Implementation Decisions

### Leaderboard layout
- Numbered vertical list with position numbers (#1, #2, #3...)
- Not a card grid or table — emphasizes ranking
- Each entry is a row with rank, name, subscriber count, tags, and language

### Deck entry content
- Display: deck name, subscriber count (bilingual label), tag chips (purple), language flag emoji
- No description, no card count — keep it scannable
- Subscriber count as "24 subscribers" (EN) / "24 iscritti" (IT) — bilingual with `<span lang>` pattern
- Tags as small purple chip elements

### Empty state & loading
- If zero decks: hide the entire section (don't render it at all)
- No loading indicator — section appears only when data arrives
- Fetch fires on page load, fast enough that skeleton/spinner adds noise

### Click behavior
- Deck entries are not interactive — purely informational showcase
- No links, no cursor change, no hover link state
- Subscribe is in-app only (per Out of Scope)

### Claude's Discretion
- Supabase integration approach (direct REST vs client library — landing page currently has zero dependencies)
- Exact responsive breakpoints for the list
- Tag chip limit per entry (if too many tags, truncate)
- Language flag emoji mapping
- Section placement (after Features, before Screenshots — per LEAD-02)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Landing page
- `apps/landing/index.html` — Current HTML structure, bilingual `<span lang>` pattern, section ordering
- `apps/landing/styles.css` — Existing section styling, card patterns, responsive breakpoints, CSS custom properties
- `apps/landing/script.js` — Language toggle logic (localStorage + `document.documentElement.lang`)

### Database schema
- `supabase/migrations/20260313000001_deck_index_table.sql` — deck_index table schema (display_name, tags, language, repository_id, subfolder_path)
- `supabase/migrations/20260313000004_search_decks_rpc.sql` — Existing search_decks RPC pattern (card_count computed at query time via subquery)
- `supabase/migrations/20260115000001_shared_repositories.sql` — user_repositories table (subscriber counting via COUNT on repository_id + subfolder_path)
- `supabase/migrations/20260313000002_user_repositories_subfolder.sql` — subfolder_path column for deck-level subscriptions

### Requirements
- `.planning/REQUIREMENTS.md` — LEAD-01 (public RPC), LEAD-02 (landing section after Features), LEAD-03 (name, subscriber count, tags, language per entry)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- CSS custom properties: `--purple-primary`, `--amber-primary`, `--card-bg`, `--text-light`, `--text-secondary`
- `.feature-card` border/hover pattern: `1px solid rgba(124, 58, 237, 0.15)` with hover to `0.4`
- Bilingual `<span lang="en/it">` pattern with CSS toggle (`html[lang="en"] [lang="it"] { display: none !important }`)

### Established Patterns
- Section padding: `4rem 0`
- Section headings: `1.75rem`, `font-weight: 700`, `text-align: center`, `margin-bottom: 2.5rem`
- Responsive: 768px desktop breakpoint, 480px small screen
- search_decks RPC computes card_count at query time — subscriber_count should follow same pattern

### Integration Points
- New section goes after `.features` section and before `.screenshots` section in index.html
- New RPC `top_decks` as public Supabase function (no auth required — unlike search_decks which needs auth.uid())
- script.js needs new fetch logic on DOMContentLoaded to call Supabase RPC and render results
- deck_index + user_repositories JOIN for subscriber counting

</code_context>

<specifics>
## Specific Ideas

No specific requirements — standard approach with the decisions captured above.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 50-popular-decks-leaderboard*
*Context gathered: 2026-03-18*
