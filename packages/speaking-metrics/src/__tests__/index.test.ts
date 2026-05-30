import { generateSpeakingFeedback, scoreProjection } from '../index';

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

describe('scoreProjection', () => {
  it('returns 70 for risk of clipping', () => {
    expect(scoreProjection(-9, 0)).toBe(70);
  });

  it('returns 100 for perfect level', () => {
    expect(scoreProjection(-15, 0)).toBe(100);
  });

  it('returns 80 for good level', () => {
    expect(scoreProjection(-20, 0)).toBe(80);
  });

  it('returns 55 for slightly quiet', () => {
    expect(scoreProjection(-30, 0)).toBe(55);
  });

  it('returns 30 for too quiet', () => {
    expect(scoreProjection(-40, 0)).toBe(30);
  });

  it('adds variance bonus up to 10', () => {
    expect(scoreProjection(-30, 3)).toBe(61); // 55 + min(10, 6) = 61
    expect(scoreProjection(-30, 6)).toBe(65); // 55 + min(10, 12) = 65
  });

  it('caps total score at 100', () => {
    expect(scoreProjection(-15, 5)).toBe(100); // 100 + 10 -> capped at 100
  });
});
