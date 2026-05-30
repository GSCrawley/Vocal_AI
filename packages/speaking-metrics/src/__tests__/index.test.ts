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
  it('returns 100 when exactly at target WPM (default presentation)', () => {
    // presentation target is 145
    expect(scorePace(145)).toBe(100);
  });

  it('degrades score smoothly within the target range', () => {
    // presentation min: 120, target: 145, max: 165. rangeWidth = 22.5
    // wpm 120 -> distanceFromTarget = 25 -> 100 - (25/22.5)*15 = 83.33 -> 83
    expect(scorePace(120)).toBe(83);
    // wpm 165 -> distanceFromTarget = 20 -> 100 - (20/22.5)*15 = 86.66 -> 87
    expect(scorePace(165)).toBe(87);
  });

  it('degrades score more heavily outside the target range', () => {
    // wpm 110 -> 10 below min(120) -> 70 - 10*2 = 50
    expect(scorePace(110)).toBe(50);
    // wpm 175 -> 10 above max(165) -> 70 - 10*2 = 50
    expect(scorePace(175)).toBe(50);
  });

  it('bottoms out at 0 for extreme values', () => {
    // wpm 0 -> 120 below min -> 70 - 240 = -170 -> 0
    expect(scorePace(0)).toBe(0);
    // wpm 300 -> 135 above max -> 70 - 270 = -200 -> 0
    expect(scorePace(300)).toBe(0);
  });

  it('uses different context configurations correctly', () => {
    // conversational target: 155
    expect(scorePace(155, 'conversational')).toBe(100);
    // technical min: 100
    // wpm 90 -> 10 below min(100) -> 70 - 10*2 = 50
    expect(scorePace(90, 'technical')).toBe(50);
  });

  it('returns 50 for unknown context', () => {
    expect(scorePace(145, 'unknown' as any)).toBe(50);
  });
});
