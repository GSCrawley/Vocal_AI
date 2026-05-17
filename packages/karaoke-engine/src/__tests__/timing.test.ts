import { computeTimingAccuracy } from '../index';

describe('computeTimingAccuracy', () => {
  it('returns 100 for perfect match', () => {
    expect(computeTimingAccuracy(1000, 1000, 0)).toBe(100);
  });

  describe('Duration scoring', () => {
    it('returns 100 for duration within 15% (e.g., 10%)', () => {
      // ratio: 0.1, score: 100
      // onset score: 100
      // total: 100
      expect(computeTimingAccuracy(1100, 1000, 0)).toBe(100);
      expect(computeTimingAccuracy(900, 1000, 0)).toBe(100);
    });

    it('scores 75 for duration within 30% (e.g., 20%)', () => {
      // ratio: 0.2, score: 75
      // onset score: 100
      // total: (75 + 100) / 2 = 87.5 => 88
      expect(computeTimingAccuracy(1200, 1000, 0)).toBe(88);
      expect(computeTimingAccuracy(800, 1000, 0)).toBe(88);
    });

    it('scores 50 for duration beyond 30% (e.g., 40%)', () => {
      // ratio: 0.4, score: 50
      // onset score: 100
      // total: (50 + 100) / 2 = 75
      expect(computeTimingAccuracy(1400, 1000, 0)).toBe(75);
      expect(computeTimingAccuracy(600, 1000, 0)).toBe(75);
    });
  });

  describe('Onset scoring', () => {
    it('returns 100 for onset within 200ms', () => {
      // duration score: 100
      // onset score: 100
      // total: 100
      expect(computeTimingAccuracy(1000, 1000, 150)).toBe(100);
      expect(computeTimingAccuracy(1000, 1000, -150)).toBe(100);
    });

    it('scores 75 for onset within 500ms', () => {
      // duration score: 100
      // onset score: 75
      // total: (100 + 75) / 2 = 87.5 => 88
      expect(computeTimingAccuracy(1000, 1000, 300)).toBe(88);
      expect(computeTimingAccuracy(1000, 1000, -300)).toBe(88);
    });

    it('scores 50 for onset beyond 500ms', () => {
      // duration score: 100
      // onset score: 50
      // total: (100 + 50) / 2 = 75
      expect(computeTimingAccuracy(1000, 1000, 600)).toBe(75);
      expect(computeTimingAccuracy(1000, 1000, -600)).toBe(75);
    });
  });

  describe('Combined scoring', () => {
    it('calculates average for both duration and onset being poor', () => {
      // duration: beyond 30% -> 50
      // onset: beyond 500ms -> 50
      // total: (50 + 50) / 2 = 50
      expect(computeTimingAccuracy(1400, 1000, 600)).toBe(50);
    });

    it('calculates average for mixed performance', () => {
      // duration: within 30% -> 75
      // onset: beyond 500ms -> 50
      // total: (75 + 50) / 2 = 62.5 => 63
      expect(computeTimingAccuracy(1200, 1000, 600)).toBe(63);
    });
  });
});
