import { generateSpeakingFeedback, scoreProsody } from '../index';

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

describe('scoreProsody', () => {
  it('handles very monotone speech (F0 < 10Hz)', () => {
    expect(scoreProsody(5, 0)).toBe(20);
  });

  it('handles slightly monotone speech (10 <= F0 < 20Hz)', () => {
    expect(scoreProsody(10, 0)).toBe(40);
    expect(scoreProsody(15, 0)).toBe(40);
  });

  it('handles somewhat expressive speech (20 <= F0 < 40Hz)', () => {
    expect(scoreProsody(20, 0)).toBe(65);
    expect(scoreProsody(30, 0)).toBe(65);
  });

  it('handles expressive speech (40 <= F0 <= 80Hz) and caps at 100', () => {
    // 40Hz should give 90 + 0 = 90
    expect(scoreProsody(40, 0)).toBe(90);
    // 60Hz should give 90 + 20/4 = 95
    expect(scoreProsody(60, 0)).toBe(95);
    // 80Hz should give 90 + 40/4 = 100
    expect(scoreProsody(80, 0)).toBe(100);
    // Math.min(10, ...) limit logic for 40-80: max points added is 10
    // so at >= 80, it caps. Wait, at 80, (80-40)/4 = 10. 90+10 = 100.
  });

  it('handles very wide F0 range (> 80Hz)', () => {
    expect(scoreProsody(85, 0)).toBe(85);
  });

  it('applies uptalk penalty proportional to ratio', () => {
    // 100% uptalk penalty = 40. Range score = 100. 100 - 40 = 60.
    expect(scoreProsody(80, 1.0)).toBe(60);
    // 50% uptalk penalty = 20. Range score = 90. 90 - 20 = 70.
    expect(scoreProsody(40, 0.5)).toBe(70);
  });

  it('clamps final score between 0 and 100', () => {
    // Range score 20, penalty 40 -> -20, clamped to 0
    expect(scoreProsody(5, 1.0)).toBe(0);
    // Range score 100, penalty 0 -> 100, clamped to 100
    expect(scoreProsody(80, 0)).toBe(100);
  });
});
