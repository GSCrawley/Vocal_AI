import { computePitchSimilarity } from '../index';
import type { LivePitchFrame } from '@voice/shared-types';

describe('computePitchSimilarity Benchmark', () => {
  it.skip('runs within reasonable time', () => {
    const userFrames: LivePitchFrame[] = [];
    const refFrames: LivePitchFrame[] = [];

    for (let i = 0; i < 500; i++) {
      userFrames.push({
        timestampMs: i * 10,
        frequencyHz: 440 + Math.sin(i * 0.1) * 20,
        voiced: true,
        confidence: 0.9,
        centsFromTarget: 1,
      });
      refFrames.push({
        timestampMs: i * 10,
        frequencyHz: 440 + Math.sin(i * 0.1) * 20 + (Math.random() * 5 - 2.5),
        voiced: true,
        confidence: 0.9,
        centsFromTarget: 1,
      });
    }

    const start = performance.now();
    computePitchSimilarity(userFrames, refFrames);
    const end = performance.now();

    expect(end - start).toBeLessThan(1000);
  });
});
