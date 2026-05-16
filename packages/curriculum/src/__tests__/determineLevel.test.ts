import { determineLevel } from '../index';

describe('determineLevel', () => {
  describe('speaking tier', () => {
    // Level 1: < 10
    it('returns level 1 when sessions are below the first threshold (10)', () => {
      expect(determineLevel('speaking', 0)).toBe(1);
      expect(determineLevel('speaking', 5)).toBe(1);
      expect(determineLevel('speaking', 9)).toBe(1);
    });

    // Level 2: < 10 + 20 = 30
    it('returns level 2 when sessions are between first threshold and second cumulative threshold (30)', () => {
      expect(determineLevel('speaking', 10)).toBe(2);
      expect(determineLevel('speaking', 20)).toBe(2);
      expect(determineLevel('speaking', 29)).toBe(2);
    });

    // Level 3: < 10 + 20 + 30 = 60
    it('returns level 3 when sessions are between second and third cumulative threshold (60)', () => {
      expect(determineLevel('speaking', 30)).toBe(3);
      expect(determineLevel('speaking', 45)).toBe(3);
      expect(determineLevel('speaking', 59)).toBe(3);
    });

    // Level 4: >= 60
    it('returns level 4 when sessions are at or above the final cumulative threshold', () => {
      expect(determineLevel('speaking', 60)).toBe(4);
      expect(determineLevel('speaking', 100)).toBe(4);
      expect(determineLevel('speaking', 999)).toBe(4);
    });
  });

  describe('singing tier', () => {
    // Level 1: < 15
    it('returns level 1 when sessions are below the first threshold (15)', () => {
      expect(determineLevel('singing', 0)).toBe(1);
      expect(determineLevel('singing', 7)).toBe(1);
      expect(determineLevel('singing', 14)).toBe(1);
    });

    // Level 2: < 15 + 25 = 40
    it('returns level 2 when sessions are between first threshold and second cumulative threshold (40)', () => {
      expect(determineLevel('singing', 15)).toBe(2);
      expect(determineLevel('singing', 25)).toBe(2);
      expect(determineLevel('singing', 39)).toBe(2);
    });

    // Level 3: < 15 + 25 + 40 = 80
    it('returns level 3 when sessions are between second and third cumulative threshold (80)', () => {
      expect(determineLevel('singing', 40)).toBe(3);
      expect(determineLevel('singing', 60)).toBe(3);
      expect(determineLevel('singing', 79)).toBe(3);
    });

    // Level 4: >= 80
    it('returns level 4 when sessions are at or above the final cumulative threshold', () => {
      expect(determineLevel('singing', 80)).toBe(4);
      expect(determineLevel('singing', 150)).toBe(4);
      expect(determineLevel('singing', 999)).toBe(4);
    });
  });
});
