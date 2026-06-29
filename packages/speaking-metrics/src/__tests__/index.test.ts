import type { SpeakingAnalysisResult } from '@voice/shared-types';
import {
  getSpeakingScoreBreakdown,
  generateSpeakingFeedback,
  scorePace,
  computeSpeakingScore,
  scoreProjection,
  scoreFillerRate,
} from '../index';

describe('generateSpeakingFeedback', () => {
  it('returns praise for null failureMode', () => {
    const feedback = generateSpeakingFeedback(null);
    expect(feedback).toEqual({ text: 'Great dynamic expression.' });
  });

  it('returns correct feedback for too_fast', () => {
    const feedback = generateSpeakingFeedback('too_fast');
    expect(feedback).toEqual({ text: 'You came in too fast. Slow down and trust the pauses.' });
  });

  it('returns correct feedback for too_slow', () => {
    const feedback = generateSpeakingFeedback('too_slow');
    expect(feedback).toEqual({
      text: 'You came in too slow. Aim for a more natural, conversational pace.',
    });
  });

  it('returns correct feedback for uptalk', () => {
    const feedback = generateSpeakingFeedback('uptalk');
    expect(feedback).toEqual({
      text: 'Your sentences are ending like questions. Bring the pitch down at the end of each statement.',
    });
  });

  it('returns correct feedback for monotone', () => {
    const feedback = generateSpeakingFeedback('monotone');
    expect(feedback).toEqual({
      text: 'Your voice stayed very flat - vary your pitch more to keep listeners engaged.',
    });
  });
});

describe('scorePace', () => {
  it('returns 50 for unknown context', () => {
    expect(scorePace(150, 'unknown_context')).toBe(50);
  });

  it('scores exactly on target as 100', () => {
    // 'presentation' target is 145
    expect(scorePace(145)).toBe(100);
    // 'conversational' target is 155
    expect(scorePace(155, 'conversational')).toBe(100);
  });

  it('scores within range based on proximity', () => {
    // 'presentation' range: min 120, target 145, max 165. Width is (165 - 120) / 2 = 22.5
    // Distance from target for 130 is 15.
    // Score = 100 - (15 / 22.5) * 15 = 100 - 10 = 90
    expect(scorePace(130, 'presentation')).toBe(90);

    // Distance from target for 160 is 15.
    // Score = 100 - (15 / 22.5) * 15 = 90
    expect(scorePace(160, 'presentation')).toBe(90);
  });

  it('degrades score for WPM below the minimum range', () => {
    // 'presentation' min is 120
    // At WPM 110: distance from min is 10.
    // Score = 70 - 10 * 2 = 50
    expect(scorePace(110, 'presentation')).toBe(50);

    // Score hits 0 at distance 35 (WPM 85)
    expect(scorePace(85, 'presentation')).toBe(0);
    expect(scorePace(50, 'presentation')).toBe(0);
  });

  it('degrades score for WPM above the maximum range', () => {
    // 'presentation' max is 165
    // At WPM 175: distance from max is 10.
    // Score = 70 - 10 * 2 = 50
    expect(scorePace(175, 'presentation')).toBe(50);

    // Score hits 0 at distance 35 (WPM 200)
    expect(scorePace(200, 'presentation')).toBe(0);
    expect(scorePace(250, 'presentation')).toBe(0);
  });
});

describe('computeSpeakingScore', () => {
  it('correctly computes a weighted score', () => {
    // 80 * 0.5 + 90 * 0.2 + 70 * 0.2 + 100 * 0.1 = 40 + 18 + 14 + 10 = 82
    const score = computeSpeakingScore(80, 90, 70, 100, {
      pace: 0.5,
      prosody: 0.2,
      projection: 0.2,
      fillerRate: 0.1,
    });
    expect(score).toBe(82);
  });

  it('correctly rounds the computed score', () => {
    // 80 * 0.5 + 85 * 0.2 + 70 * 0.2 + 100 * 0.1 = 40 + 17 + 14 + 10 = 81
    const score = computeSpeakingScore(80, 85, 70, 100, {
      pace: 0.5,
      prosody: 0.2,
      projection: 0.2,
      fillerRate: 0.1,
    });
    expect(score).toBe(81);

    // 80 * 0.5 + 88 * 0.2 + 70 * 0.2 + 100 * 0.1 = 40 + 17.6 + 14 + 10 = 81.6 -> 82
    const scoreRoundedUp = computeSpeakingScore(80, 88, 70, 100, {
      pace: 0.5,
      prosody: 0.2,
      projection: 0.2,
      fillerRate: 0.1,
    });
    expect(scoreRoundedUp).toBe(82);
  });

  it('throws an error if weights do not sum to 1.0', () => {
    expect(() => {
      computeSpeakingScore(80, 90, 70, 100, {
        pace: 0.5,
        prosody: 0.2,
        projection: 0.2,
        fillerRate: 0.2, // Sum is 1.1
      });
    }).toThrow('Scoring weights must sum to 1.0');

    expect(() => {
      computeSpeakingScore(80, 90, 70, 100, {
        pace: 0.5,
        prosody: 0.2,
        projection: 0.2,
        fillerRate: 0.0, // Sum is 0.9
      });
    }).toThrow('Scoring weights must sum to 1.0');
  });

  it('handles floating point precision when checking weight sum', () => {
    // 0.1 + 0.2 + 0.3 + 0.4 usually doesn't sum exactly to 1 in JS
    expect(() => {
      computeSpeakingScore(80, 90, 70, 100, {
        pace: 0.1,
        prosody: 0.2,
        projection: 0.3,
        fillerRate: 0.4,
      });
    }).not.toThrow();
  });

  it('throws an error if any weight is not a finite number', () => {
    expect(() => {
      computeSpeakingScore(80, 90, 70, 100, {
        pace: Number.NaN,
        prosody: 0.2,
        projection: 0.3,
        fillerRate: 0.5,
      });
    }).toThrow('Scoring weights must be finite numbers');

    expect(() => {
      computeSpeakingScore(80, 90, 70, 100, {
        pace: 0.1,
        prosody: Number.POSITIVE_INFINITY,
        projection: 0.3,
        fillerRate: 0.6,
      });
    }).toThrow('Scoring weights must be finite numbers');
  });

  it('handles zero scores correctly', () => {
    const score = computeSpeakingScore(0, 0, 0, 0, {
      pace: 0.5,
      prosody: 0.2,
      projection: 0.2,
      fillerRate: 0.1,
    });
    expect(score).toBe(0);
  });
});

describe('scoreProjection', () => {
  it('handles boundary conditions based on strict > logic', () => {
    // meanRmsDb > -10 -> 70
    // -9.99 passes, so levelScore = 70. Bonus = 0.
    expect(scoreProjection(-9.99, 0)).toBe(70);

    // meanRmsDb > -18 -> 100
    // -10 fails > -10, falls to > -18. levelScore = 100. Bonus = 0.
    expect(scoreProjection(-10, 0)).toBe(100);
    // -17.99 passes > -18. levelScore = 100. Bonus = 0.
    expect(scoreProjection(-17.99, 0)).toBe(100);

    // meanRmsDb > -25 -> 80
    // -18 fails > -18, falls to > -25. levelScore = 80. Bonus = 0.
    expect(scoreProjection(-18, 0)).toBe(80);
    // -24.99 passes > -25. levelScore = 80. Bonus = 0.
    expect(scoreProjection(-24.99, 0)).toBe(80);

    // meanRmsDb > -35 -> 55
    // -25 fails > -25, falls to > -35. levelScore = 55. Bonus = 0.
    expect(scoreProjection(-25, 0)).toBe(55);
    // -34.99 passes > -35. levelScore = 55. Bonus = 0.
    expect(scoreProjection(-34.99, 0)).toBe(55);

    // else -> 30
    // -35 fails > -35, falls to else. levelScore = 30. Bonus = 0.
    expect(scoreProjection(-35, 0)).toBe(30);
  });

  it('calculates and caps variance bonus correctly', () => {
    // 0 variance -> bonus 0
    // levelScore = 100 (-15 dB). 100 + 0 = 100
    expect(scoreProjection(-15, 0)).toBe(100);

    // 5 variance -> bonus 10 (capped)
    // levelScore = 80 (-20 dB). 80 + (5 * 2) = 90
    expect(scoreProjection(-20, 5)).toBe(90);

    // large variance (50) -> bonus capped at 10
    // levelScore = 55 (-30 dB). 55 + Math.min(10, 100) = 65
    expect(scoreProjection(-30, 50)).toBe(65);
  });

  it('handles negative variance', () => {
    // negative variance (-3) -> bonus -6
    // levelScore = 80 (-20 dB). 80 + Math.min(10, -6) = 74
    expect(scoreProjection(-20, -3)).toBe(74);
  });

  it('clamps the final score to 100', () => {
    // levelScore = 100 (-15 dB), high variance -> +10 bonus
    // 100 + 10 = 110, clamped to 100
    expect(scoreProjection(-15, 10)).toBe(100);
  });

  it('handles defensive/extreme inputs', () => {
    // very loud (0 dB) -> hits first branch (> -10). levelScore = 70.
    expect(scoreProjection(0, 0)).toBe(70);

    // very loud (+6 dB) -> hits first branch (> -10). levelScore = 70.
    expect(scoreProjection(6, 0)).toBe(70);

    // very quiet (-80 dB) -> hits else branch. levelScore = 30.
    expect(scoreProjection(-80, 0)).toBe(30);

    // NaN meanRmsDb -> all > comparisons false -> else branch. levelScore = 30.
    expect(scoreProjection(Number.NaN, 0)).toBe(30);

    // NaN variance -> Math.min(10, NaN) yields NaN. Final Math.min yields NaN.
    expect(scoreProjection(-20, Number.NaN)).toBeNaN();

    // Infinity meanRmsDb -> hits first branch. levelScore = 70.
    expect(scoreProjection(Number.POSITIVE_INFINITY, 0)).toBe(70);

    // -Infinity meanRmsDb -> hits else branch. levelScore = 30.
    expect(scoreProjection(Number.NEGATIVE_INFINITY, 0)).toBe(30);

    // Infinity variance -> bonus capped at 10. levelScore = 80 (-20 dB) + 10 = 90
    expect(scoreProjection(-20, Number.POSITIVE_INFINITY)).toBe(90);
  });
});

describe('scoreFillerRate', () => {
  it('returns 100 for <= 1 filler per minute', () => {
    expect(scoreFillerRate(0)).toBe(100);
    expect(scoreFillerRate(0.5)).toBe(100);
    expect(scoreFillerRate(1)).toBe(100);
  });

  it('returns 100 for negative input as expected by logic', () => {
    // Documenting existing behavior: a negative value is <= 1
    expect(scoreFillerRate(-5)).toBe(100);
  });

  it('returns 90 for > 1 and <= 2 fillers per minute', () => {
    expect(scoreFillerRate(1.1)).toBe(90);
    expect(scoreFillerRate(1.5)).toBe(90);
    expect(scoreFillerRate(2)).toBe(90);
  });

  it('returns 75 for > 2 and <= 4 fillers per minute', () => {
    expect(scoreFillerRate(2.1)).toBe(75);
    expect(scoreFillerRate(3)).toBe(75);
    expect(scoreFillerRate(4)).toBe(75);
  });

  it('returns 55 for > 4 and <= 6 fillers per minute', () => {
    expect(scoreFillerRate(4.1)).toBe(55);
    expect(scoreFillerRate(5)).toBe(55);
    expect(scoreFillerRate(6)).toBe(55);
  });

  it('returns 35 for > 6 and <= 10 fillers per minute', () => {
    expect(scoreFillerRate(6.1)).toBe(35);
    expect(scoreFillerRate(8)).toBe(35);
    expect(scoreFillerRate(10)).toBe(35);
  });

  it('returns 15 for > 10 fillers per minute', () => {
    expect(scoreFillerRate(10.1)).toBe(15);
    expect(scoreFillerRate(15)).toBe(15);
    expect(scoreFillerRate(100)).toBe(15);
  });
});

describe('getSpeakingScoreBreakdown', () => {
  const defaultAnalysis = {
    wpm: 145, // presentation target -> scorePace = 100
    articulationRateWpm: 150,
    meanF0Hz: 120,
    f0RangeHz: 50, // -> scoreProsody ~ 90 (assumed typical value)
    uptalkRatio: 0.1, // -> scoreProsody penalty small
    pauseCount: 5,
    meanPauseDurationMs: 500,
    meanRmsDb: -15, // -> scoreProjection levelScore = 100
    rmsVarianceDb: 5, // -> scoreProjection bonus = 10 (capped), total = 100
    fillerEvents: [],
    fillerRate: 0, // -> scoreFillerRate = 100
  };

  it('computes breakdown and overall score correctly based on goal weights (pace)', () => {
    // For goal 'pace': { pace: 0.6, prosody: 0.15, projection: 0.15, fillerRate: 0.1 }
    // Based on defaultAnalysis:
    // wpm = 145 -> target 145 -> paceScore = 100
    // f0RangeHz = 50, uptalkRatio = 0.1 -> prosodyScore = 90
    // meanRmsDb = -15, rmsVarianceDb = 5 -> projectionScore = 100 (100 + 10 = 110 clamped to 100)
    // fillerRate = 0 -> fillerRateScore = 100

    const result = getSpeakingScoreBreakdown(defaultAnalysis, 'pace');

    expect(result.pace).toBe(100);
    expect(result.prosody).toBe(88.5);
    expect(result.projection).toBe(100);
    expect(result.fillerRate).toBe(100);

    // overall = 100 * 0.6 + 88.5 * 0.15 + 100 * 0.15 + 100 * 0.1
    // = 60 + 13.275 + 15 + 10 = 98.275 -> 98
    expect(result.overall).toBe(98);
  });

  it('computes breakdown and overall score differently for a different goal (filler_reduction)', () => {
    // For goal 'filler_reduction': { pace: 0.1, prosody: 0.1, projection: 0.1, fillerRate: 0.7 }
    const result = getSpeakingScoreBreakdown(defaultAnalysis, 'filler_reduction');

    // Component scores should be identical to the 'pace' goal test above
    expect(result.pace).toBe(100);
    expect(result.prosody).toBe(88.5);
    expect(result.projection).toBe(100);
    expect(result.fillerRate).toBe(100);

    // overall = 100 * 0.1 + 88.5 * 0.1 + 100 * 0.1 + 100 * 0.7
    // = 10 + 8.85 + 10 + 70 = 98.85 -> 99
    expect(result.overall).toBe(99);
  });

  it('reflects changes in context correctly', () => {
    // conversational target is 155, max 180, min 130. WPM 145 is 10 off target. Width is 25.
    // scorePace = 100 - (10 / 25) * 15 = 100 - 6 = 94
    const result = getSpeakingScoreBreakdown(defaultAnalysis, 'pace', 'conversational');

    expect(result.pace).toBe(94);

    // overall = 94 * 0.6 + 88.5 * 0.15 + 100 * 0.15 + 100 * 0.1
    // = 56.4 + 13.275 + 15 + 10 = 94.675 -> 95
    expect(result.overall).toBe(95);
  });

  it('handles lower scores logically', () => {
    const poorAnalysis: SpeakingAnalysisResult = {
      ...defaultAnalysis,
      wpm: 85, // pace = 0
      f0RangeHz: 15, // prosody penalty = 20 -> prosody = 80
      uptalkRatio: 0.6, // prosody penalty = 20 -> prosody = 60
      meanRmsDb: -35, // projection level = 30
      rmsVarianceDb: 0, // projection bonus = 0 -> projection = 30
      fillerRate: 15, // fillerRate = 15
    };

    const result = getSpeakingScoreBreakdown(poorAnalysis, 'authority');
    // authority weights: { pace: 0.2, prosody: 0.5, projection: 0.2, fillerRate: 0.1 }

    expect(result.pace).toBe(0);
    expect(result.prosody).toBe(16);
    expect(result.projection).toBe(30);
    expect(result.fillerRate).toBe(15);

    // overall = 0 * 0.2 + 16 * 0.5 + 30 * 0.2 + 15 * 0.1
    // = 0 + 8 + 6 + 1.5 = 15.5 -> 16
    expect(result.overall).toBe(16);
  });
});
