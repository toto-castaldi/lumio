/**
 * Tests for getStats() - shared deck subscription parity
 *
 * These tests verify the getStats() logic for counting repositories and cards
 * when shared deck subscriptions are present. They test the filtering logic
 * extracted from the function.
 *
 * NOTE: Requires Deno runtime to execute. Run with:
 *   deno test --allow-net supabase/functions/git-sync/getStats.test.ts
 */

import { assertEquals } from "https://deno.land/std@0.177.0/testing/asserts.ts";

// --- Extracted logic types for testing ---

interface MockUserRepo {
  repository_id: string;
  subfolder_path: string | null;
  repository: {
    id: string;
    lumioignore_content: string | null;
    is_platform?: boolean;
  } | null;
}

interface MockCard {
  id: string;
  repository_id: string;
  file_path: string;
}

/**
 * Replicated filter logic from getStats():
 * - Keep non-platform repos always
 * - Keep platform repo entries that have subfolder_path (shared deck subscriptions)
 * - Exclude bare platform repo entries (is_platform=true AND subfolder_path=null)
 */
function filterRepos(userRepos: MockUserRepo[]): MockUserRepo[] {
  return userRepos.filter(ur => {
    const repo = ur.repository;
    if (!repo) return false;
    if (repo.is_platform !== true) return true;
    return ur.subfolder_path != null;
  });
}

/**
 * Replicated card counting logic from getStats():
 * - Shared deck subscriptions: filter by subfolder prefix, no lumioignore
 * - Personal repos: no lumioignore applied here (simplified for test)
 * - Uses Set to avoid double-counting
 */
function countCards(filteredRepos: MockUserRepo[], allCards: MockCard[]): number {
  const countedCardIds = new Set<string>();

  for (const ur of filteredRepos) {
    const repo = ur.repository;
    if (!repo) continue;

    const repoCards = allCards.filter(c => c.repository_id === repo.id);

    if (ur.subfolder_path) {
      for (const card of repoCards) {
        if (card.file_path.startsWith(ur.subfolder_path) && !countedCardIds.has(card.id)) {
          countedCardIds.add(card.id);
        }
      }
    } else {
      // Personal repo: count all (lumioignore not tested here)
      for (const card of repoCards) {
        if (!countedCardIds.has(card.id)) {
          countedCardIds.add(card.id);
        }
      }
    }
  }

  return countedCardIds.size;
}

// --- Tests ---

Deno.test("filterRepos: 2 personal repos + 1 shared deck = repositoryCount 3", () => {
  const userRepos: MockUserRepo[] = [
    { repository_id: "r1", subfolder_path: null, repository: { id: "r1", lumioignore_content: null, is_platform: false } },
    { repository_id: "r2", subfolder_path: null, repository: { id: "r2", lumioignore_content: null, is_platform: false } },
    { repository_id: "r3", subfolder_path: "decks/math/", repository: { id: "r3", lumioignore_content: null, is_platform: true } },
  ];
  const filtered = filterRepos(userRepos);
  assertEquals(filtered.length, 3);
});

Deno.test("filterRepos: 1 personal repo + 3 shared deck subscriptions (same platform repo) = repositoryCount 4", () => {
  const userRepos: MockUserRepo[] = [
    { repository_id: "r1", subfolder_path: null, repository: { id: "r1", lumioignore_content: null, is_platform: false } },
    { repository_id: "rp", subfolder_path: "decks/math/", repository: { id: "rp", lumioignore_content: null, is_platform: true } },
    { repository_id: "rp", subfolder_path: "decks/science/", repository: { id: "rp", lumioignore_content: null, is_platform: true } },
    { repository_id: "rp", subfolder_path: "decks/history/", repository: { id: "rp", lumioignore_content: null, is_platform: true } },
  ];
  const filtered = filterRepos(userRepos);
  assertEquals(filtered.length, 4);
});

Deno.test("filterRepos: bare platform repo excluded", () => {
  const userRepos: MockUserRepo[] = [
    { repository_id: "r1", subfolder_path: null, repository: { id: "r1", lumioignore_content: null, is_platform: false } },
    { repository_id: "rp", subfolder_path: null, repository: { id: "rp", lumioignore_content: null, is_platform: true } },
  ];
  const filtered = filterRepos(userRepos);
  assertEquals(filtered.length, 1);
  assertEquals(filtered[0].repository_id, "r1");
});

Deno.test("countCards: shared deck subscription filters by subfolder prefix", () => {
  const filteredRepos: MockUserRepo[] = [
    { repository_id: "rp", subfolder_path: "decks/math/", repository: { id: "rp", lumioignore_content: null, is_platform: true } },
  ];
  const allCards: MockCard[] = [
    { id: "c1", repository_id: "rp", file_path: "decks/math/algebra.md" },
    { id: "c2", repository_id: "rp", file_path: "decks/math/geometry.md" },
    { id: "c3", repository_id: "rp", file_path: "decks/science/physics.md" },
    { id: "c4", repository_id: "rp", file_path: "other/file.md" },
  ];
  assertEquals(countCards(filteredRepos, allCards), 2);
});

Deno.test("countCards: no double-counting when subscriptions share same repo", () => {
  const filteredRepos: MockUserRepo[] = [
    { repository_id: "rp", subfolder_path: "decks/", repository: { id: "rp", lumioignore_content: null, is_platform: true } },
    { repository_id: "rp", subfolder_path: "decks/math/", repository: { id: "rp", lumioignore_content: null, is_platform: true } },
  ];
  const allCards: MockCard[] = [
    { id: "c1", repository_id: "rp", file_path: "decks/math/algebra.md" },
    { id: "c2", repository_id: "rp", file_path: "decks/science/physics.md" },
  ];
  // c1 matches both subscriptions but should only be counted once
  // c2 matches first subscription only
  assertEquals(countCards(filteredRepos, allCards), 2);
});

Deno.test("countCards: personal repo cards counted without subfolder filtering", () => {
  const filteredRepos: MockUserRepo[] = [
    { repository_id: "r1", subfolder_path: null, repository: { id: "r1", lumioignore_content: null, is_platform: false } },
  ];
  const allCards: MockCard[] = [
    { id: "c1", repository_id: "r1", file_path: "chapter1/card1.md" },
    { id: "c2", repository_id: "r1", file_path: "chapter2/card2.md" },
  ];
  assertEquals(countCards(filteredRepos, allCards), 2);
});

Deno.test("countCards: mixed personal + shared deck subscriptions", () => {
  const filteredRepos: MockUserRepo[] = [
    { repository_id: "r1", subfolder_path: null, repository: { id: "r1", lumioignore_content: null, is_platform: false } },
    { repository_id: "rp", subfolder_path: "decks/math/", repository: { id: "rp", lumioignore_content: null, is_platform: true } },
  ];
  const allCards: MockCard[] = [
    { id: "c1", repository_id: "r1", file_path: "chapter1/card1.md" },
    { id: "c2", repository_id: "rp", file_path: "decks/math/algebra.md" },
    { id: "c3", repository_id: "rp", file_path: "decks/science/physics.md" },
  ];
  // c1: personal repo, counted. c2: matches subfolder, counted. c3: doesn't match, not counted.
  assertEquals(countCards(filteredRepos, allCards), 2);
});
