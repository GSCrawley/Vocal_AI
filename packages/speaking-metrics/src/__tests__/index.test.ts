import { generateSpeakingFeedback, scorePace, scoreProsody } from '../index';

describe('scoreProsody', () => {
  describe('F0 range scoring (with 0 uptalk)', () => {
    it('scores 20 for very monotone (< 10Hz)', () => {
      expect(scoreProsody(5, 0)).toBe(20);
      expect(scoreProsody(9.9, 0)).toBe(20);
    });

    it('scores 40 for monotone (10-19Hz)', () => {
      expect(scoreProsody(10, 0)).toBe(40);
      expect(scoreProsody(15, 0)).toBe(40);
      expect(scoreProsody(19.9, 0)).toBe(40);
    });

    it('scores 65 for somewhat expressive (20-39Hz)', () => {
      expect(scoreProsody(20, 0)).toBe(65);
      expect(scoreProsody(30, 0)).toBe(65);
      expect(scoreProsody(39.9, 0)).toBe(65);
    });

    it('scores dynamically between 90 and 100 for expressive (40-80Hz)', () => {
      expect(scoreProsody(40, 0)).toBe(90);
      expect(scoreProsody(60, 0)).toBe(95);
      expect(scoreProsody(80, 0)).toBe(100);
      expect(scoreProsody(70, 0)).toBe(97.5);
    });

    it('scores 85 for over-emphatic (> 80Hz)', () => {
      expect(scoreProsody(80.1, 0)).toBe(85);
      expect(scoreProsody(100, 0)).toBe(85);
      expect(scoreProsody(150, 0)).toBe(85);
    });
  });

  describe('uptalk penalty', () => {
    it('applies no penalty for 0 uptalk', () => {
      expect(scoreProsody(60, 0)).toBe(95);
    });

    it('applies proportional penalty for partial uptalk', () => {
      expect(scoreProsody(60, 0.5)).toBe(75);
    });

    it('applies full penalty for 100% uptalk', () => {
      expect(scoreProsody(60, 1.0)).toBe(55);
    });
  });

  describe('score boundaries', () => {
    it('caps the score at 100 maximum', () => {
      expect(scoreProsody(80, 0)).toBe(100);
    });

    it('floors the score at 0 minimum', () => {
      expect(scoreProsody(5, 1.0)).toBe(0);
    });
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
