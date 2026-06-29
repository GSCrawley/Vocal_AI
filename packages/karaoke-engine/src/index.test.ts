import { computeContourMatch, computePitchSimilarity } from './index';
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

    // Expected contour segments:
    // user: [up, up, up, up, flat, flat, flat]
    // ref:  [up, up, up, up, up,   up,   up  ]
    // => 4/7 matches => 57
    const match = computeContourMatch(userFrames, refFrames);
    expect(match).toBe(57);
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
    const refFrames = [createFrame(100), createFrame(110), createFrame(120)];

    // Both should yield an upward contour of identical length after filtering
    expect(computeContourMatch(userFrames, refFrames)).toBe(100);
  });

  describe('computePitchSimilarity', () => {
    const createRefFrame = (frequencyHz: number): LivePitchFrame => ({
      timestampMs: 0,
      voiced: true,
      confidence: 1,
      frequencyHz,
    });

    const createUserFrame = (centsFromTarget: number): LivePitchFrame => ({
      timestampMs: 0,
      voiced: true,
      confidence: 1,
      centsFromTarget,
    });

    const createUnvoicedFrame = (): LivePitchFrame => ({
      timestampMs: 0,
      voiced: false,
      confidence: 1,
    });

    it('should return 0 if user or reference arrays are empty', () => {
      expect(computePitchSimilarity([], [createRefFrame(100)])).toBe(0);
      expect(computePitchSimilarity([createUserFrame(0)], [])).toBe(0);
      expect(computePitchSimilarity([], [])).toBe(0);
    });

    it('should return 0 if no valid samples are compared', () => {
      // Both arrays are not empty, but neither has the required fields.
      // userVoiced needs centsFromTarget !== undefined
      // refVoiced needs frequencyHz !== undefined
      const invalidUserFrame: LivePitchFrame = {
        timestampMs: 0,
        voiced: true,
        confidence: 1,
        frequencyHz: 100,
      }; // Missing centsFromTarget
      const invalidRefFrame: LivePitchFrame = {
        timestampMs: 0,
        voiced: true,
        confidence: 1,
        centsFromTarget: 0,
      }; // Missing frequencyHz

      expect(computePitchSimilarity([invalidUserFrame], [createRefFrame(100)])).toBe(0);
      expect(computePitchSimilarity([createUserFrame(0)], [invalidRefFrame])).toBe(0);
    });

    it('should return 100 for a perfect match (0 cents error)', () => {
      const userFrames = Array.from({ length: 10 }, () => createUserFrame(0));
      const refFrames = Array.from({ length: 10 }, () => createRefFrame(100));
      expect(computePitchSimilarity(userFrames, refFrames)).toBe(100);
    });

    it('should return 83 for an average error of 50 cents', () => {
      const userFrames = Array.from({ length: 10 }, () => createUserFrame(50));
      const refFrames = Array.from({ length: 10 }, () => createRefFrame(100));
      expect(computePitchSimilarity(userFrames, refFrames)).toBe(83);
    });

    it('should clamp the score to 0 for an average error >= 300 cents', () => {
      const userFrames = Array.from({ length: 10 }, () => createUserFrame(300));
      const refFrames = Array.from({ length: 10 }, () => createRefFrame(100));
      expect(computePitchSimilarity(userFrames, refFrames)).toBe(0);

      const userFramesMore = Array.from({ length: 10 }, () => createUserFrame(400));
      expect(computePitchSimilarity(userFramesMore, refFrames)).toBe(0);
    });

    it('should cap the sample count at 50 frames', () => {
      // We create 100 frames. The calculation will limit sampleCount to 50.
      const userFrames = Array.from({ length: 100 }, () => createUserFrame(50));
      const refFrames = Array.from({ length: 100 }, () => createRefFrame(100));
      expect(computePitchSimilarity(userFrames, refFrames)).toBe(83);
    });

    it('should handle unvoiced frames gracefully by filtering them out', () => {
      const userFrames = [createUserFrame(50), createUnvoicedFrame(), createUserFrame(50)];
      const refFrames = [createRefFrame(100), createRefFrame(100), createUnvoicedFrame()];
      expect(computePitchSimilarity(userFrames, refFrames)).toBe(83);
    });
  });

  describe('computeTimingAccuracy', () => {
    it('should return 100 for a perfect timing match', () => {
      expect(computeTimingAccuracy(1000, 1000, 0)).toBe(100);
    });

    it('should return 100 at the full-score duration and onset boundaries', () => {
      expect(computeTimingAccuracy(1150, 1000, 200)).toBe(100);
      expect(computeTimingAccuracy(850, 1000, -200)).toBe(100);
    });

    it('should return 75 at the mid-score duration and onset boundaries', () => {
      expect(computeTimingAccuracy(1300, 1000, 500)).toBe(75);
      expect(computeTimingAccuracy(700, 1000, -500)).toBe(75);
    });

    it('should return 50 for the worst timing mismatch', () => {
      expect(computeTimingAccuracy(1310, 1000, 501)).toBe(50);
      expect(computeTimingAccuracy(680, 1000, -501)).toBe(50);
    });
  });
});
