import { generateSpeakingFeedback, scorePace } from '../index';

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
    expect(scorePace(150, 'unknown_context' as any)).toBe(50);
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
