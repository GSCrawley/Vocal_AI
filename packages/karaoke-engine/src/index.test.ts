import { computeContourMatch } from './index';
import type { LivePitchFrame } from '@voice/shared-types';

describe('computeContourMatch', () => {
  const createFrame = (frequencyHz: number): LivePitchFrame => ({
    timestampMs: 0,
    voiced: true,
    confidence: 1,
    frequencyHz,
  });

  const createUnvoicedFrame = (): LivePitchFrame => ({
    timestampMs: 0,
    voiced: false,
    confidence: 1,
  });

  it('should return 50 if user or reference arrays are empty', () => {
    expect(computeContourMatch([], [createFrame(100)])).toBe(50);
    expect(computeContourMatch([createFrame(100)], [])).toBe(50);
    expect(computeContourMatch([], [])).toBe(50);
  });

  it('should return 50 if user or reference arrays contain no voiced frames', () => {
    expect(computeContourMatch([createUnvoicedFrame()], [createFrame(100)])).toBe(50);
    expect(computeContourMatch([createFrame(100)], [createUnvoicedFrame()])).toBe(50);
  });

  it('should match perfectly for identical upward contours', () => {
    // 10 frames, going up by 10Hz each time -> segments of length 1 (10 / 8 = 1)
    const frames = Array.from({ length: 10 }, (_, i) => createFrame(100 + i * 10));
    expect(computeContourMatch(frames, frames)).toBe(100);
  });

  it('should match perfectly for identical downward contours', () => {
    const frames = Array.from({ length: 10 }, (_, i) => createFrame(200 - i * 10));
    expect(computeContourMatch(frames, frames)).toBe(100);
  });

  it('should match perfectly for identical flat contours', () => {
    const frames = Array.from({ length: 10 }, () => createFrame(150));
    expect(computeContourMatch(frames, frames)).toBe(100);
  });

  it('should return 0 for completely opposite contours', () => {
    const upFrames = Array.from({ length: 10 }, (_, i) => createFrame(100 + i * 10));
    const downFrames = Array.from({ length: 10 }, (_, i) => createFrame(200 - i * 10));
    expect(computeContourMatch(upFrames, downFrames)).toBe(0);
  });

  it('should calculate partial matches correctly', () => {
    // 16 frames -> segment size = 2
    // User goes UP then FLAT.
    const userFrames = [
      ...Array.from({ length: 8 }, (_, i) => createFrame(100 + i * 10)), // UP
      ...Array.from({ length: 8 }, () => createFrame(180)), // FLAT
    ];
    // Reference goes UP then UP.
    const refFrames = [
      ...Array.from({ length: 8 }, (_, i) => createFrame(100 + i * 10)), // UP
      ...Array.from({ length: 8 }, (_, i) => createFrame(180 + i * 10)), // UP
    ];

    // Out of segments, half should match (the first half which is UP)
    // The second half will mismatch (FLAT vs UP)
    // So the score should be around 50
    const match = computeContourMatch(userFrames, refFrames);
    expect(match).toBeGreaterThan(0);
    expect(match).toBeLessThan(100);
  });

  it('should handle unvoiced frames gracefully by filtering them out', () => {
    // Mixed voiced and unvoiced
    const userFrames = [
      createFrame(100),
      createUnvoicedFrame(),
      createFrame(110),
      createUnvoicedFrame(),
      createFrame(120),
    ];

    // Voiced only (equivalent contour to above when unvoiced are removed)
    const refFrames = [
      createFrame(100),
      createFrame(110),
      createFrame(120),
    ];

    // Both should yield an upward contour of identical length after filtering
    expect(computeContourMatch(userFrames, refFrames)).toBe(100);
  });
});
