import { computeContourMatch } from '../src/index';
import { LivePitchFrame } from '@voice/shared-types';

describe('computeContourMatch', () => {
  const createFrames = (frequencies: number[]): LivePitchFrame[] => {
    return frequencies.map((freq, i) => ({
      timestampMs: i * 10,
      frequencyHz: freq,
      voiced: true,
      confidence: 0.9,
    }));
  };

  it('should return 100 for exact matching contours', () => {
    // Both go up, then down
    const ref = createFrames([100, 110, 120, 130, 120, 110, 100, 90]);
    const user = createFrames([100, 110, 120, 130, 120, 110, 100, 90]);
    expect(computeContourMatch(user, ref)).toBe(100);
  });

  it('should return 0 for completely opposite contours', () => {
    // Ref goes up, user goes down
    const ref = createFrames([100, 110, 120, 130, 140, 150, 160, 170]);
    const user = createFrames([170, 160, 150, 140, 130, 120, 110, 100]);
    expect(computeContourMatch(user, ref)).toBe(0);
  });

  it('should handle unvoiced frames by ignoring them', () => {
    const ref = createFrames([100, 110, 120, 130, 140, 150, 160, 170]);
    const user = createFrames([100, 110, 120, 130, 140, 150, 160, 170]);
    // Make every other user frame unvoiced
    user.forEach((f, i) => {
      if (i % 2 === 1) f.voiced = false;
    });
    // So user voiced are: [100, 120, 140, 160]
    // Contour is still going 'up' constantly, same as ref
    expect(computeContourMatch(user, ref)).toBe(100);
  });

  it('should return 50 if user or ref has no voiced frames', () => {
    const ref = createFrames([100, 110, 120]);
    const user = createFrames([100, 110, 120]).map(f => ({ ...f, voiced: false }));
    expect(computeContourMatch(user, ref)).toBe(50);
  });

  it('should calculate partial matches correctly', () => {
    // Both 8 elements, segment size = 1.
    // 7 comparisons each.
    // Ref: [10, 20, 30, 40, 30, 20, 10, 20] -> up, up, up, down, down, down, up
    // User: [10, 20, 30, 40, 50, 60, 50, 60] -> up, up, up, up, up, down, up
    // Matches:
    // 1: up == up (match)
    // 2: up == up (match)
    // 3: up == up (match)
    // 4: down != up
    // 5: down != up
    // 6: down == down (match)
    // 7: up == up (match)
    // 5 / 7 matches = ~71%
    const ref = createFrames([10, 20, 30, 40, 30, 20, 10, 20]);
    const user = createFrames([10, 20, 30, 40, 50, 60, 50, 60]);
    expect(computeContourMatch(user, ref)).toBe(71);
  });

  it('should truncate to minimum contour length when shapes have different lengths', () => {
    // Ref: 4 voiced -> segment size 1 -> 3 intervals
    // Ref directions: up, up, up
    const ref = createFrames([10, 20, 30, 40]);
    // User: 8 voiced -> segment size 1 -> 7 intervals
    // User directions: up, up, up, down, down, down, down
    const user = createFrames([10, 20, 30, 40, 30, 20, 10, 0]);

    // Min length is 3 intervals. The first 3 intervals for both are 'up'.
    // Result should be 100%
    expect(computeContourMatch(user, ref)).toBe(100);
  });

  it('should identify flat contours (difference <= 5)', () => {
    // Ref: [100, 101, 102, 103, 104, 105, 104, 103] -> flat everywhere
    const ref = createFrames([100, 101, 102, 103, 104, 105, 104, 103]);
    const user = createFrames([100, 100, 100, 100, 100, 100, 100, 100]);

    expect(computeContourMatch(user, ref)).toBe(100);
  });
});
