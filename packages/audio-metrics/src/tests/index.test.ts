import { centsToHz, scoreSustainedNote, micCheck } from '../index';
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
