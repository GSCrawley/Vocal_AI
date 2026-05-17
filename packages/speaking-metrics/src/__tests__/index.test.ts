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
    expect(scorePace(160)).toEqual(100);
  });

  it('returns exactly 100 when hitting target exactly', () => {
    expect(scorePace(155, 'conversational')).toEqual(100);
    expect(scorePace(125, 'technical')).toEqual(100);
  });

  it('scores within acceptable range based on proximity', () => {
    expect(scorePace(150, 'presentation')).toEqual(93);
    expect(scorePace(140, 'presentation')).toEqual(87);
    expect(scorePace(185, 'presentation')).toEqual(83);
  });

  it('scores outside acceptable range by degrading linearly (too slow)', () => {
    expect(scorePace(139, 'presentation')).toEqual(68);
    expect(scorePace(130, 'presentation')).toEqual(50);
  });

  it('scores outside acceptable range by degrading linearly (too fast)', () => {
    expect(scorePace(186, 'presentation')).toEqual(68);
    expect(scorePace(190, 'presentation')).toEqual(60);
  });

  it('scores exactly 0 when very far outside range rather than negative', () => {
    expect(scorePace(100, 'presentation')).toEqual(0);
    expect(scorePace(300, 'presentation')).toEqual(0);
  });

  it('handles invalid context gracefully', () => {
    expect(scorePace(160, 'invalid_context' as any)).toEqual(50);
  });
});
