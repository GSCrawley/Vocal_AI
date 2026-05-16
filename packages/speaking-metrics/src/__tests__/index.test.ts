import { generateSpeakingFeedback, scoreProsody } from '../index';

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
      expect(scoreProsody(60, 0)).toBe(95); // 90 + (60 - 40)/4
      expect(scoreProsody(80, 0)).toBe(100); // 90 + 10
      expect(scoreProsody(70, 0)).toBe(97.5); // 90 + 30/4 = 97.5
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
      // Base score for 60Hz is 95
      // Penalty for 0.5 is 0.5 * 40 = 20
      // 95 - 20 = 75
      expect(scoreProsody(60, 0.5)).toBe(75);
    });

    it('applies full penalty for 100% uptalk', () => {
      // Base score for 60Hz is 95
      // Penalty for 1.0 is 1.0 * 40 = 40
      // 95 - 40 = 55
      expect(scoreProsody(60, 1.0)).toBe(55);
    });
  });

  describe('score boundaries', () => {
    it('caps the score at 100 maximum', () => {
      // 80Hz gets base 100, no uptalk -> 100
      expect(scoreProsody(80, 0)).toBe(100);
      // Even if logic somehow tried to exceed 100, it should clamp.
    });

    it('floors the score at 0 minimum', () => {
      // Base score for 5Hz is 20
      // Penalty for 1.0 uptalk is 40
      // 20 - 40 = -20, which floors to 0
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
