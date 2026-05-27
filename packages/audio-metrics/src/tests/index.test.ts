import {
  hzToCents,
  centsToHz,
  scorePitchAccuracy,
  scorePitchStability,
  scoreOnset,
  scoreCompletion,
  computeSustainedNoteScore,
  runMicCheck,
  degradedScore,
} from '../index';
// using global performance
import { LivePitchFrame, MicCheckOpts } from '@voice/shared-types';

describe('audio-metrics', () => {
  const TARGET_HZ = 440.0; // A4

  function createFrame(
    timestampMs: number,
    centsOffset: number,
    options?: Partial<LivePitchFrame>
  ): LivePitchFrame {
    return {
      timestampMs,
      frequencyHz: centsToHz(centsOffset, TARGET_HZ),
      voiced: true,
      confidence: 0.9,
      ...options,
    };
  }

  describe('hzToCents and centsToHz', () => {
    it('round-trips A4', () => {
      expect(hzToCents(TARGET_HZ, TARGET_HZ)).toBe(0);
      expect(centsToHz(0, TARGET_HZ)).toBe(TARGET_HZ);
    });

    it('round-trips 100 cents off', () => {
      const hz = centsToHz(100, TARGET_HZ);
      expect(hzToCents(hz, TARGET_HZ)).toBeCloseTo(100);
    });

    it('round-trips 1 cent off', () => {
      const hz = centsToHz(1, TARGET_HZ);
      expect(hzToCents(hz, TARGET_HZ)).toBeCloseTo(1);
    });

    it('handles edge cases (0, negative)', () => {
      expect(hzToCents(0, TARGET_HZ)).toBeNaN();
      expect(hzToCents(-100, TARGET_HZ)).toBeNaN();
      expect(centsToHz(0, 0)).toBeNaN();
    });
  });

  describe('scorePitchAccuracy', () => {
    it('pure target tone -> 1.0', () => {
      const frames = Array(10)
        .fill(0)
        .map((_, i) => createFrame(i * 10, 0));
      expect(scorePitchAccuracy(frames, TARGET_HZ)).toBe(1.0);
    });

    it('pure off-by-100 cents tone -> 0.0', () => {
      const frames = Array(10)
        .fill(0)
        .map((_, i) => createFrame(i * 10, 100));
      expect(scorePitchAccuracy(frames, TARGET_HZ)).toBe(0.0);
    });

    it('mix -> in between', () => {
      const frames = [
        ...Array(5)
          .fill(0)
          .map((_, i) => createFrame(i * 10, 0)),
        ...Array(5)
          .fill(0)
          .map((_, i) => createFrame((i + 5) * 10, 100)),
      ];
      const score = scorePitchAccuracy(frames, TARGET_HZ);
      expect(score).toBeGreaterThan(0.0);
      expect(score).toBeLessThan(1.0);
    });
  });

  describe('scorePitchStability', () => {
    it('monotone target -> high', () => {
      const frames = Array(10)
        .fill(0)
        .map((_, i) => createFrame(i * 10, 20)); // Consistent off-pitch is still stable
      expect(scorePitchStability(frames)).toBe(1.0);
    });

    it('wobbly (50 cents jitter) -> lower', () => {
      const frames = Array(20)
        .fill(0)
        .map((_, i) => createFrame(i * 10, i % 2 === 0 ? 50 : -50));
      const score = scorePitchStability(frames);
      expect(score).toBeGreaterThan(0);
      expect(score).toBeLessThan(1.0);
    });
  });

  describe('runMicCheck', () => {
    it('returns too_quiet', () => {
      const frames = [createFrame(0, 0, { rmsDb: -60 })];
      expect(runMicCheck(frames, {}).status).toBe('too_quiet');
    });

    it('returns too_loud_clipping', () => {
      const frames = [createFrame(0, 0, { rmsDb: 0 })];
      expect(runMicCheck(frames, {}).status).toBe('too_loud_clipping');
    });

    it('returns too_noisy', () => {
      const frames = [createFrame(0, 0, { noiseFloorDb: -10 })];
      expect(runMicCheck(frames, {}).status).toBe('too_noisy');
    });

    it('returns insufficient_voiced_frames', () => {
      const frames = [
        createFrame(0, 0, { voiced: false }),
        createFrame(10, 0, { confidence: 0.1 }),
      ];
      expect(runMicCheck(frames, {}).status).toBe('insufficient_voiced_frames');
    });

    it('returns ok', () => {
      const frames = [createFrame(0, 0, { rmsDb: -20, noiseFloorDb: -50 })];
      expect(runMicCheck(frames, {}).status).toBe('ok');
    });
  });

  describe('scoreCompletion', () => {
    it('only counts frames within tolerance', () => {
      // 5 in tolerance, 5 out
      const frames = [
        ...Array(5)
          .fill(0)
          .map((_, i) => createFrame(i * 10, 0)),
        ...Array(5)
          .fill(0)
          .map((_, i) => createFrame((i + 5) * 10, 100)),
      ];
      // 100ms total, 50ms in tolerance
      const targetDurationMs = 100;
      expect(scoreCompletion(frames, targetDurationMs, TARGET_HZ, { toleranceCents: 50 })).toBe(
        0.5
      );
    });
  });

  describe('computeSustainedNoteScore', () => {
    const target = { frequencyHz: TARGET_HZ, durationMs: 1000 };

    it('throws if weights do not sum to 1.0', () => {
      expect(() => {
        computeSustainedNoteScore([], target, {
          accuracy: 0.5,
          stability: 0.5,
          completion: 0.1,
          onset: 0,
        });
      }).toThrow('Scoring weights must sum to 1.0');
    });

    it('determinism: identical input -> identical output across 10 runs', () => {
      const frames = Array(20)
        .fill(0)
        .map((_, i) => createFrame(i * 10, i % 2 === 0 ? 10 : -10));
      const firstRun = computeSustainedNoteScore(frames, target);
      for (let i = 0; i < 9; i++) {
        expect(computeSustainedNoteScore(frames, target)).toEqual(firstRun);
      }
    });

    it('microbenchmark: processes 500 frames well under 80ms', () => {
      const frames = Array(500)
        .fill(0)
        .map((_, i) => createFrame(i * 10, Math.random() * 20 - 10));
      const start = performance.now();
      computeSustainedNoteScore(frames, target);
      const end = performance.now();
      expect(end - start).toBeLessThan(80);
    });
  });

  describe('degradedScore', () => {
    it('returns low confidence score', () => {
      const score = degradedScore('testing');
      expect(score.confidence).toBe('low');
      expect(score.degradedReason).toBe('testing');
    });
  });
});
