import { computePitchSimilarity } from '../index';
import { LivePitchFrame } from '@voice/shared-types';

describe('computePitchSimilarity', () => {
  it('computes similarity accurately', () => {
    const ref: LivePitchFrame[] = [
      { timestampMs: 0, frequencyHz: 200, voiced: true, confidence: 1 },
      { timestampMs: 10, frequencyHz: 205, voiced: true, confidence: 1 },
      { timestampMs: 20, frequencyHz: 210, voiced: true, confidence: 1 }
    ];
    const user: LivePitchFrame[] = [
      { timestampMs: 0, frequencyHz: 200, centsFromTarget: 0, voiced: true, confidence: 1 },
      { timestampMs: 15, frequencyHz: 210, centsFromTarget: 10, voiced: true, confidence: 1 }, // Note offset in time but matches sequence
      { timestampMs: 25, frequencyHz: 210, centsFromTarget: 0, voiced: true, confidence: 1 }
    ];

    const similarity = computePitchSimilarity(user, ref);
    expect(similarity).toBeGreaterThan(80);
  });
});
