import { generateSpeakingFeedback, scorePace, computeSpeakingScore } from '../index';

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
