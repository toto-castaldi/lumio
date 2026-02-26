import { supermemo, SuperMemoGrade } from 'supermemo';
import type { SM2Item, SM2Result } from '@lumio/shared';
import { SM2_DEFAULTS, SM2_MAX_INTERVAL, SM2_EF_CEILING } from '@lumio/shared';

/**
 * Create a new SM-2 item with default values.
 * Use this as the starting state for cards with no review history.
 */
export function newSM2Item(): SM2Item {
  return {
    interval: 0,
    repetition: 0,
    efactor: SM2_DEFAULTS.initialEasiness,
  };
}

/**
 * Run the SM-2 algorithm on an item with a given quality grade.
 *
 * Wraps the `supermemo` package with project-specific constraints:
 * - Max interval: 365 days (SRS-05)
 * - EF ceiling: 2.5 (SRS-03)
 * - EF floor: 1.3 (enforced by supermemo package)
 *
 * @param quality - Grade 0-5 (0=blackout, 1=wrong, 4=correct, 5=perfect)
 * @param item - Current SM-2 state for the card
 * @returns Updated SM-2 state with nextReviewAt date
 */
export function sm2(quality: SuperMemoGrade, item: SM2Item): SM2Result {
  const result = supermemo(
    { interval: item.interval, repetition: item.repetition, efactor: item.efactor },
    quality
  );

  // Enforce 365-day max interval (SRS-05)
  const clampedInterval = Math.min(result.interval, SM2_MAX_INTERVAL);

  // Enforce EF ceiling at 2.5 (SRS-03)
  const clampedEF = Math.min(result.efactor, SM2_EF_CEILING);

  // Compute next review date
  const nextReviewAt = new Date();
  nextReviewAt.setDate(nextReviewAt.getDate() + clampedInterval);

  return {
    interval: clampedInterval,
    repetition: result.repetition,
    efactor: clampedEF,
    nextReviewAt,
  };
}
