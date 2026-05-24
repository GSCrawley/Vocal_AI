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
    expect(feedback).toEqual({ text: 'You came in too slow. Aim for a more natural, conversational pace.' });
  });

  it('returns correct feedback for uptalk', () => {
    const feedback = generateSpeakingFeedback('uptalk');
    expect(feedback).toEqual({ text: 'Your sentences are ending like questions. Bring the pitch down at the end of each statement.' });
  });

  it('returns correct feedback for monotone', () => {
    const feedback = generateSpeakingFeedback('monotone');
    expect(feedback).toEqual({ text: 'Your voice stayed very flat - vary your pitch more to keep listeners engaged.' });
  });
});


describe('scorePace', () => {
  it('uses presentation as the default context when none is provided', () => {
    expect(scorePace(145)).toBe(100);
  });

  it('returns 100 when exactly on target WPM (presentation context)', () => {
    // presentation target is 145
    expect(scorePace(145, 'presentation')).toBe(100);
  });

  it('calculates proportional score when within range but off target', () => {
    // presentation range: 120-165. target: 145
    // wpm 155 -> distance = 10, rangeWidth = 22.5 -> 100 - (10/22.5)*15 = 93.33 -> 93
    expect(scorePace(155, 'presentation')).toBe(93);
    // wpm 135 -> distance = 10, rangeWidth = 22.5 -> 93
    expect(scorePace(135, 'presentation')).toBe(93);
  });

  it('calculates degraded score when outside range below min', () => {
    // presentation min: 120
    // wpm 110 -> distance from range = 10 -> 70 - 10*2 = 50
    expect(scorePace(110, 'presentation')).toBe(50);
  });

  it('calculates degraded score when outside range above max', () => {
    // presentation max: 165
    // wpm 175 -> distance from range = 10 -> 70 - 10*2 = 50
    expect(scorePace(175, 'presentation')).toBe(50);
  });

  it('clamps degraded score to 0 instead of returning negative values', () => {
    // presentation max: 165
    // wpm 250 -> distance from range = 85 -> 70 - 85*2 = -100 -> clamped to 0
    expect(scorePace(250, 'presentation')).toBe(0);

    // presentation min: 120
    // wpm 50 -> distance from range = 70 -> 70 - 70*2 = -70 -> clamped to 0
    expect(scorePace(50, 'presentation')).toBe(0);
  });

  it('calculates correctly for a different context', () => {
    // conversational target: 155
    expect(scorePace(155, 'conversational')).toBe(100);
  });

  it('returns fallback score of 50 for invalid context', () => {
    expect(scorePace(150, 'unknown_context' as any)).toBe(50);
  });
});
