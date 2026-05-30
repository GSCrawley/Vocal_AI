import { generateSpeakingFeedback, scorePace, WPM_TARGETS } from '../index';

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
  const presentation = WPM_TARGETS.presentation;

  it('returns 100 when exactly at target WPM (default presentation)', () => {
    expect(scorePace(presentation.target)).toBe(100);
  });

  it('degrades score smoothly within the target range', () => {
    const rangeWidth = (presentation.max - presentation.min) / 2;
    const expectedAtMin = Math.round(
      100 - (Math.abs(presentation.min - presentation.target) / rangeWidth) * 15
    );
    const expectedAtMax = Math.round(
      100 - (Math.abs(presentation.max - presentation.target) / rangeWidth) * 15
    );

    expect(scorePace(presentation.min)).toBe(expectedAtMin);
    expect(scorePace(presentation.max)).toBe(expectedAtMax);
  });

  it('degrades score more heavily outside the target range', () => {
    const distanceOutsideRange = 10;
    const expected = Math.max(0, Math.round(70 - distanceOutsideRange * 2));

    expect(scorePace(presentation.min - distanceOutsideRange)).toBe(expected);
    expect(scorePace(presentation.max + distanceOutsideRange)).toBe(expected);
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
