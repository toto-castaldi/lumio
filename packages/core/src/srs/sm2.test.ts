import { describe, it, expect } from 'vitest';
import { sm2, newSM2Item } from './sm2';
import { SM2_MAX_INTERVAL, SM2_EF_CEILING, SM2_DEFAULTS } from '@lumio/shared';

describe('sm2', () => {
  describe('newSM2Item', () => {
    it('returns initial state with default ease factor', () => {
      const item = newSM2Item();
      expect(item.interval).toBe(0);
      expect(item.repetition).toBe(0);
      expect(item.efactor).toBe(SM2_DEFAULTS.initialEasiness);
    });
  });

  describe('correct answers (grade 4)', () => {
    it('first correct: interval 1, repetition 1, efactor unchanged', () => {
      const result = sm2(4, newSM2Item());
      expect(result.interval).toBe(1);
      expect(result.repetition).toBe(1);
      expect(result.efactor).toBe(2.5);
    });

    it('second correct: interval 6, repetition 2', () => {
      const after1 = sm2(4, newSM2Item());
      const result = sm2(4, after1);
      expect(result.interval).toBe(6);
      expect(result.repetition).toBe(2);
      expect(result.efactor).toBe(2.5);
    });

    it('third correct: interval grows with efactor', () => {
      const after1 = sm2(4, newSM2Item());
      const after2 = sm2(4, after1);
      const result = sm2(4, after2);
      expect(result.interval).toBe(15); // 6 * 2.5 = 15
      expect(result.repetition).toBe(3);
    });
  });

  describe('incorrect answers (grade 1)', () => {
    it('first incorrect: interval 1, repetition 0, efactor reduced', () => {
      const result = sm2(1, newSM2Item());
      expect(result.interval).toBe(1);
      expect(result.repetition).toBe(0);
      expect(result.efactor).toBeCloseTo(1.96, 1); // 2.5 - 0.54
    });

    it('20 consecutive incorrect: efactor at floor 1.3', () => {
      let item = newSM2Item();
      for (let i = 0; i < 20; i++) {
        item = sm2(1, item);
      }
      expect(item.efactor).toBe(SM2_DEFAULTS.minEasiness);
      expect(item.interval).toBe(1);
    });
  });

  describe('EF ceiling (SRS-03)', () => {
    it('grade 5 cannot raise efactor above 2.5', () => {
      let item = newSM2Item();
      // Grade 5 adds +0.1 to EF per the SM-2 formula
      for (let i = 0; i < 10; i++) {
        item = sm2(5, item);
      }
      expect(item.efactor).toBe(SM2_EF_CEILING);
    });
  });

  describe('max interval cap (SRS-05)', () => {
    it('interval capped at 365 after many correct answers', () => {
      let item = newSM2Item();
      for (let i = 0; i < 100; i++) {
        item = sm2(4, item);
      }
      expect(item.interval).toBeLessThanOrEqual(SM2_MAX_INTERVAL);
    });
  });

  describe('nextReviewAt', () => {
    it('returns a Date that is interval days in the future', () => {
      const before = new Date();
      const result = sm2(4, newSM2Item());
      const after = new Date();

      // nextReviewAt should be ~1 day from now (interval=1)
      const expectedMin = new Date(before);
      expectedMin.setDate(expectedMin.getDate() + result.interval);
      const expectedMax = new Date(after);
      expectedMax.setDate(expectedMax.getDate() + result.interval);

      expect(result.nextReviewAt.getTime()).toBeGreaterThanOrEqual(expectedMin.getTime());
      expect(result.nextReviewAt.getTime()).toBeLessThanOrEqual(expectedMax.getTime());
    });
  });

  describe('all grades accepted', () => {
    it('accepts grades 0 through 5', () => {
      const item = newSM2Item();
      for (const grade of [0, 1, 2, 3, 4, 5] as const) {
        expect(() => sm2(grade, item)).not.toThrow();
      }
    });
  });
});
