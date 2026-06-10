import { generateSpeakingFeedback, scorePace, scoreProjection } from '../index';

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

describe('scoreProjection', () => {
  describe('level score boundaries (strict > comparisons)', () => {
    it('handles the > -10 boundary (70 vs 100 band)', () => {
      // > -10 -> 70
      expect(scoreProjection(-9.99, 0)).toBe(70);
      expect(scoreProjection(0, 0)).toBe(70);

      // Exact -10 or below falls to the next condition (> -18 -> 100)
      expect(scoreProjection(-10, 0)).toBe(100);
    });

    it('handles the > -18 boundary (100 vs 80 band)', () => {
      // > -18 -> 100
      expect(scoreProjection(-17.99, 0)).toBe(100);

      // Exact -18 falls to the next condition (> -25 -> 80)
      expect(scoreProjection(-18, 0)).toBe(80);
    });

    it('handles the > -25 boundary (80 vs 55 band)', () => {
      // > -25 -> 80
      expect(scoreProjection(-24.99, 0)).toBe(80);

      // Exact -25 falls to the next condition (> -35 -> 55)
      expect(scoreProjection(-25, 0)).toBe(55);
    });

    it('handles the > -35 boundary (55 vs 30 band)', () => {
      // > -35 -> 55
      expect(scoreProjection(-34.99, 0)).toBe(55);

      // Exact -35 or below falls to the final else -> 30
      expect(scoreProjection(-35, 0)).toBe(30);
      expect(scoreProjection(-80, 0)).toBe(30); // Very quiet
    });
  });

  describe('variance bonus and cap', () => {
    it('applies no bonus for 0 variance', () => {
      // Base score 80 (since -20 is > -25)
      // Bonus = Math.min(10, 0 * 2) = 0
      expect(scoreProjection(-20, 0)).toBe(80);
    });

    it('applies the maximum bonus of 10 for variance >= 5', () => {
      // Base score 80 (-20 > -25)
      // Variance 5 -> Math.min(10, 5 * 2) = 10. Total = 80 + 10 = 90
      expect(scoreProjection(-20, 5)).toBe(90);

      // Variance 50 -> cap at 10. Total = 80 + 10 = 90
      expect(scoreProjection(-20, 50)).toBe(90);
    });

    it('decreases score for negative variance (actual physical anomaly but mathematical consequence)', () => {
      // Base score 80 (-20 > -25)
      // Variance -3 -> Math.min(10, -3 * 2) = -6. Total = 80 - 6 = 74
      expect(scoreProjection(-20, -3)).toBe(74);
    });
  });

  describe('clamping and constraints', () => {
    it('clamps the final score to 100', () => {
      // Base score 100 (-15 > -18)
      // Variance 5 -> Bonus 10. Total 110, clamped to 100
      expect(scoreProjection(-15, 5)).toBe(100);
    });
  });

  describe('defensive/extreme inputs', () => {
    it('handles NaN inputs based on mathematical evaluation', () => {
      // NaN for meanRmsDb makes all > comparisons false, landing on the final else (30)
      // Variance 0 -> bonus 0. Total = 30
      expect(scoreProjection(NaN, 0)).toBe(30);

      // NaN for variance -> Math.min(10, NaN * 2) -> Math.min(10, NaN) -> NaN
      // Final result is Math.min(100, 30 + NaN) -> NaN
      expect(scoreProjection(-20, NaN)).toBeNaN();
    });

    it('handles Infinity inputs', () => {
      // Infinity meanRmsDb -> > -10 is true -> base score 70
      // Variance 0 -> Total = 70
      expect(scoreProjection(Infinity, 0)).toBe(70);

      // -Infinity meanRmsDb -> all > false -> base score 30
      // Variance 0 -> Total = 30
      expect(scoreProjection(-Infinity, 0)).toBe(30);

      // Base score 80 (-20 > -25)
      // Infinity variance -> Math.min(10, Infinity) = 10 -> Total = 90
      expect(scoreProjection(-20, Infinity)).toBe(90);
    });
  });
});
