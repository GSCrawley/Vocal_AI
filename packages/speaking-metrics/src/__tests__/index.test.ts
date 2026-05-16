import { generateSpeakingFeedback, scorePace } from '../index';

describe('scorePace', () => {
  it('returns maximum score (100) exactly at the target wpm for default context', () => {
    // Default context is 'presentation' with target 160
    expect(scorePace(160)).toBe(100);
  });

  it('degrades gracefully within the target range', () => {
    // For presentation: min 140, target 160, max 185
    // wpm = 140: distanceFromTarget = 20, rangeWidth = 22.5
    // score = 100 - (20/22.5) * 15 = 100 - 13.33... = 87
    expect(scorePace(140)).toBe(87);

    // wpm = 185: distanceFromTarget = 25, rangeWidth = 22.5
    // score = 100 - (25/22.5) * 15 = 100 - 16.66... = 83
    expect(scorePace(185)).toBe(83);
  });

  it('degrades below 70 when outside the target range', () => {
    // Below minimum (140) by 10 wpm: 140 - 10 = 130
    // score = 70 - 10*2 = 50
    expect(scorePace(130)).toBe(50);

    // Above maximum (185) by 5 wpm: 185 + 5 = 190
    // score = 70 - 5*2 = 60
    expect(scorePace(190)).toBe(60);
  });

  it('bottoms out at 0 for extreme out-of-range values', () => {
    // Distance from range is very high
    expect(scorePace(0)).toBe(0);
    expect(scorePace(300)).toBe(0);
  });

  it('uses the provided context correctly', () => {
    // Conversational target is 155
    expect(scorePace(155, 'conversational')).toBe(100);
    // Technical target is 125
    expect(scorePace(125, 'technical')).toBe(100);
  });

  it('returns fallback score of 50 for unknown context', () => {
    expect(scorePace(160, 'unknown' as any)).toBe(50);
  });
});

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
