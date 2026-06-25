import { hzToCents, centsToHz, scoreSustainedNote, micCheck, scoreStability } from '../index';
import { LivePitchFrame } from '@voice/shared-types';

describe('audio-metrics', () => {
  const TARGET_HZ = 440.0; // A4
  const TOLERANCE_CENTS = 50;

  function createFrame(centsOffset: number, options?: Partial<LivePitchFrame>): LivePitchFrame {
    return {
      timestampMs: 0,
      frequencyHz: centsToHz(centsOffset, TARGET_HZ),
      voiced: true,
      confidence: 0.9,
      ...options,
    };
  }

  describe('hzToCents / centsToHz', () => {
    describe('exact conversions (toBe)', () => {
      it('converts to expected cents', () => {
        expect(hzToCents(880, 440)).toBe(1200);
        expect(hzToCents(220, 440)).toBe(-1200);
        expect(hzToCents(440, 440)).toBe(0);
      });

      it('converts to expected Hz', () => {
        expect(centsToHz(1200, 440)).toBe(880);
        expect(centsToHz(-1200, 440)).toBe(220);
        expect(centsToHz(0, 440)).toBe(440);
      });
    });

    describe('approximate conversions (toBeCloseTo)', () => {
      it('handles a semitone of ~100 cents', () => {
        // 440 * 2^(100/1200) ≈ 466.16
        expect(centsToHz(100, 440)).toBeCloseTo(466.16, 2);
        expect(hzToCents(466.16, 440)).toBeCloseTo(100, 0);
      });
    });

    describe('round-trip inverse operations', () => {
      it('returns original frequency when converted to cents and back', () => {
        const frequencies = [220, 440, 660, 880];
        for (const f of frequencies) {
          const cents = hzToCents(f, 440);
          expect(centsToHz(cents, 440)).toBeCloseTo(f);
        }
      });

      it('returns original cents when converted to hz and back', () => {
        const centsList = [-600, -100, 0, 100, 600, 1200];
        for (const c of centsList) {
          const hz = centsToHz(c, 440);
          expect(hzToCents(hz, 440)).toBeCloseTo(c);
        }
      });
    });

    describe('guard / boundary cases', () => {
      it('hzToCents returns 0 for invalid inputs', () => {
        expect(hzToCents(0, 440)).toBe(0);
        expect(hzToCents(-100, 440)).toBe(0);
        expect(hzToCents(440, 0)).toBe(0);
        expect(hzToCents(440, -100)).toBe(0);
      });

      it('centsToHz returns 0 for invalid inputs', () => {
        expect(centsToHz(100, 0)).toBe(0);
        expect(centsToHz(100, -50)).toBe(0);
      });

      it('centsToHz handles negative cents normally without guarding', () => {
        // Just verifying it doesn't return 0
        expect(centsToHz(-600, 440)).not.toBe(0);
      });
    });

    describe('non-440 reference frequency', () => {
      const C4 = 261.63;

      it('converts correctly using C4 reference', () => {
        // 1 octave above C4
        expect(hzToCents(C4 * 2, C4)).toBe(1200);
        expect(centsToHz(1200, C4)).toBeCloseTo(C4 * 2);
      });

      it('round-trips correctly using C4 reference', () => {
        const testFreqs = [C4 / 2, C4, C4 * 1.5, C4 * 2];
        for (const f of testFreqs) {
          const cents = hzToCents(f, C4);
          expect(centsToHz(cents, C4)).toBeCloseTo(f);
        }
      });
    });
  });

  describe('micCheck', () => {
    it('returns low_confidence if all frames are unvoiced or low confidence', () => {
      const frames = [createFrame(0, { voiced: false }), createFrame(0, { confidence: 0.3 })];
      const result = micCheck(frames, [-10, -20]);
      expect(result.ok).toBe(false);
      expect(result.reason).toBe('low_confidence');
    });

    it('returns clipping if any RMS frame >= 0', () => {
      const frames = [createFrame(0)];
      const result = micCheck(frames, [-10, 0, -20]);
      expect(result.ok).toBe(false);
      expect(result.reason).toBe('clipping');
    });

    it('returns ok for valid frames', () => {
      const frames = [createFrame(0)];
      const result = micCheck(frames, [-10, -20]);
      expect(result.ok).toBe(true);
    });
  });

  describe('scoreStability', () => {
    it('returns 0 when fewer than 2 valid frames are provided', () => {
      // 0 valid frames
      expect(scoreStability([])).toBe(0);
      // 1 valid frame
      expect(scoreStability([createFrame(0, { centsFromTarget: 0 })])).toBe(0);
    });

    it('ignores unvoiced or low confidence frames', () => {
      const frames = [
        createFrame(0, { centsFromTarget: 0 }),
        createFrame(0, { centsFromTarget: 0, voiced: false }),
        createFrame(0, { centsFromTarget: 0, confidence: 0.4 }),
      ];
      // Only 1 valid frame remains, so returns 0
      expect(scoreStability(frames)).toBe(0);
    });

    it('scores 100 for perfect stability (zero variance)', () => {
      const frames = [
        createFrame(0, { centsFromTarget: 10 }),
        createFrame(0, { centsFromTarget: 10 }),
        createFrame(0, { centsFromTarget: 10 }),
      ];
      expect(scoreStability(frames)).toBe(100);
    });

    it('returns higher score for low variance compared to high variance', () => {
      const lowVarianceFrames = [
        createFrame(0, { centsFromTarget: 0 }),
        createFrame(0, { centsFromTarget: 5 }),
        createFrame(0, { centsFromTarget: -5 }),
        createFrame(0, { centsFromTarget: 0 }),
      ];

      const highVarianceFrames = [
        createFrame(0, { centsFromTarget: 0 }),
        createFrame(0, { centsFromTarget: 30 }),
        createFrame(0, { centsFromTarget: -30 }),
        createFrame(0, { centsFromTarget: 0 }),
      ];

      const lowScore = scoreStability(lowVarianceFrames);
      const highScore = scoreStability(highVarianceFrames);

      expect(lowScore).toBeGreaterThan(highScore);
      expect(lowScore).toBeGreaterThan(50);
      expect(highScore).toBeLessThan(100);
    });
  });

  describe('scoreSustainedNote', () => {
    const weights = { pitch: 0.5, stability: 0.5 };

    it('throws if weights do not sum to 1.0', () => {
      expect(() => {
        scoreSustainedNote([], TARGET_HZ, TOLERANCE_CENTS, { pitch: 0.5, stability: 0.4 });
      }).toThrow('Scoring weights must sum to 1.0');
    });

    it('returns 0 for unvoiced/low-confidence frames (fake high score prevention)', () => {
      const frames = [createFrame(0, { voiced: false }), createFrame(0, { confidence: 0.2 })];
      const result = scoreSustainedNote(frames, TARGET_HZ, TOLERANCE_CENTS, weights);
      expect(result.pitchAccuracy).toBe(0);
      expect(result.stability).toBe(0);
      expect(result.overall).toBe(0);
    });

    it('scores near 100 for perfect tone', () => {
      const frames = Array(10)
        .fill(0)
        .map(() => createFrame(0));
      const result = scoreSustainedNote(frames, TARGET_HZ, TOLERANCE_CENTS, weights);
      expect(result.pitchAccuracy).toBe(100);
      expect(result.stability).toBe(100);
      expect(result.overall).toBe(100);
    });

    it('penalizes +20-cent drift proportionally', () => {
      const frames = Array(10)
        .fill(0)
        .map(() => createFrame(20));
      const result = scoreSustainedNote(frames, TARGET_HZ, TOLERANCE_CENTS, weights);
      expect(result.pitchAccuracy).toBeCloseTo(90);
      expect(result.stability).toBe(100);
      expect(result.overall).toBeCloseTo(90 * 0.5 + 100 * 0.5);
    });

    it('penalizes jittery frames (stability < 50)', () => {
      const frames = [];
      for (let i = 0; i < 20; i++) {
        frames.push(createFrame(i % 2 === 0 ? 40 : -40));
      }
      const result = scoreSustainedNote(frames, TARGET_HZ, TOLERANCE_CENTS, weights);
      expect(result.stability).toBeCloseTo(20);
      expect(result.pitchAccuracy).toBeCloseTo(80);
      expect(result.overall).toBeCloseTo(80 * 0.5 + 20 * 0.5);
    });
  });
});
