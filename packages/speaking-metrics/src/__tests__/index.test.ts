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
  it('uses presentation as default context', () => {
    // 160 is exact target for presentation
    expect(scorePace(160)).toEqual(100);
  });

  it('returns exactly 100 when hitting target exactly', () => {
    expect(scorePace(155, 'conversational')).toEqual(100);
    expect(scorePace(125, 'technical')).toEqual(100);
  });

  it('scores within acceptable range based on proximity', () => {
    // For presentation, target 160, min 140, max 185
    // rangeWidth = (185 - 140) / 2 = 22.5
    // distance = 10 (150 WPM) -> 100 - (10 / 22.5) * 15 = 93.33
    expect(scorePace(150, 'presentation')).toEqual(93);

    // Exact minimum bound
    // distance = 20 (140 WPM) -> 100 - (20 / 22.5) * 15 = 86.66
    expect(scorePace(140, 'presentation')).toEqual(87);

    // Exact maximum bound
    // distance = 25 (185 WPM) -> 100 - (25 / 22.5) * 15 = 83.33
    expect(scorePace(185, 'presentation')).toEqual(83);
  });

  it('scores outside acceptable range by degrading linearly (too slow)', () => {
    // For presentation, min is 140
    // distance = 1 (139 WPM) -> 70 - 1 * 2 = 68
    expect(scorePace(139, 'presentation')).toEqual(68);
    // distance = 10 (130 WPM) -> 70 - 10 * 2 = 50
    expect(scorePace(130, 'presentation')).toEqual(50);
  });

  it('scores outside acceptable range by degrading linearly (too fast)', () => {
    // For presentation, max is 185
    // distance = 1 (186 WPM) -> 70 - 1 * 2 = 68
    expect(scorePace(186, 'presentation')).toEqual(68);
    // distance = 5 (190 WPM) -> 70 - 5 * 2 = 60
    expect(scorePace(190, 'presentation')).toEqual(60);
  });

  it('scores exactly 0 when very far outside range rather than negative', () => {
    // 100 WPM is 40 below min 140 -> 70 - 40 * 2 = -10 => max(0, -10) = 0
    expect(scorePace(100, 'presentation')).toEqual(0);
    // 300 WPM is 115 above max 185 -> 70 - 115 * 2 = -160 => 0
    expect(scorePace(300, 'presentation')).toEqual(0);
  });

  it('handles invalid context gracefully', () => {
    // The function returns 50 if the context is invalid.
    // Use type assertion to bypass TypeScript type-checking for testing runtime safety.
    expect(scorePace(160, 'invalid_context' as any)).toEqual(50);
  });
});
