import { 
  centsToHz,
  scoreSustainedNote,
  micCheck,
  evaluateFrame
} from '../index';
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
      ...options
    };
  }

  describe('evaluateFrame', () => {
    it('returns unusable when confidence is below 0.5', () => {
      const result = evaluateFrame(440, 440, 50, 0.49);
      expect(result.usable).toBe(false);
      expect(result.inTolerance).toBe(false);
      expect(result.centsFromTarget).toBeUndefined();
    });

    it('returns unusable when frameHz is 0 or negative', () => {
      const result1 = evaluateFrame(0, 440, 50, 0.9);
      expect(result1.usable).toBe(false);

      const result2 = evaluateFrame(-10, 440, 50, 0.9);
      expect(result2.usable).toBe(false);
    });

    it('returns usable and in tolerance for exact match', () => {
      const result = evaluateFrame(440, 440, 50, 0.9);
      expect(result.usable).toBe(true);
      expect(result.inTolerance).toBe(true);
      expect(result.centsFromTarget).toBe(0);
    });

    it('returns usable and in tolerance when within tolerance boundary', () => {
      // TARGET_HZ + 40 cents is within 50 cents tolerance
      const frameHz = centsToHz(40, TARGET_HZ);
      const result = evaluateFrame(frameHz, TARGET_HZ, 50, 0.9);
      expect(result.usable).toBe(true);
      expect(result.inTolerance).toBe(true);
      expect(result.centsFromTarget).toBeCloseTo(40);
    });

    it('returns usable but out of tolerance when exceeding tolerance boundary', () => {
      // TARGET_HZ - 60 cents is outside 50 cents tolerance
      const frameHz = centsToHz(-60, TARGET_HZ);
      const result = evaluateFrame(frameHz, TARGET_HZ, 50, 0.9);
      expect(result.usable).toBe(true);
      expect(result.inTolerance).toBe(false);
      expect(result.centsFromTarget).toBeCloseTo(-60);
    });
  });

  describe('micCheck', () => {
    it('returns low_confidence if all frames are unvoiced or low confidence', () => {
      const frames = [
        createFrame(0, { voiced: false }),
        createFrame(0, { confidence: 0.3 })
      ];
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
      const frames = [
        createFrame(0, { voiced: false }),
        createFrame(0, { confidence: 0.2 })
      ];
      const result = scoreSustainedNote(frames, TARGET_HZ, TOLERANCE_CENTS, weights);
      expect(result.pitchAccuracy).toBe(0);
      expect(result.stability).toBe(0);
      expect(result.overall).toBe(0);
    });

    it('scores near 100 for perfect tone', () => {
      const frames = Array(10).fill(0).map(() => createFrame(0));
      const result = scoreSustainedNote(frames, TARGET_HZ, TOLERANCE_CENTS, weights);
      expect(result.pitchAccuracy).toBe(100);
      expect(result.stability).toBe(100);
      expect(result.overall).toBe(100);
    });

    it('penalizes +20-cent drift proportionally', () => {
      const frames = Array(10).fill(0).map(() => createFrame(20));
      const result = scoreSustainedNote(frames, TARGET_HZ, TOLERANCE_CENTS, weights);
      expect(result.pitchAccuracy).toBeCloseTo(90);
      expect(result.stability).toBe(100);
      expect(result.overall).toBeCloseTo((90 * 0.5) + (100 * 0.5));
    });

    it('penalizes jittery frames (stability < 50)', () => {
      const frames = [];
      for (let i = 0; i < 20; i++) {
        frames.push(createFrame(i % 2 === 0 ? 40 : -40));
      }
      const result = scoreSustainedNote(frames, TARGET_HZ, TOLERANCE_CENTS, weights);
      expect(result.stability).toBeCloseTo(20);
      expect(result.pitchAccuracy).toBeCloseTo(80);
      expect(result.overall).toBeCloseTo((80 * 0.5) + (20 * 0.5));
    });
  });
});
