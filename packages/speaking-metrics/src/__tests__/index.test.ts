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

describe('scoreProsody', () => {
  it('handles very monotone speech (F0 < 10Hz)', () => {
    expect(scoreProsody(5, 0)).toBe(20);
  });

  it('handles slightly monotone speech (10 <= F0 < 20Hz)', () => {
    expect(scoreProsody(10, 0)).toBe(40);
    expect(scoreProsody(15, 0)).toBe(40);
  });

  it('handles somewhat expressive speech (20 <= F0 < 40Hz)', () => {
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
