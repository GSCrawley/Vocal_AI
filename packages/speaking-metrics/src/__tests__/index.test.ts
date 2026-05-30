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
  it('returns 50 for unknown context', () => {
    expect(scorePace(150, 'unknown_context')).toBe(50);
  });

  it('scores exactly on target as 100', () => {
    // 'presentation' target is 145
    expect(scorePace(145)).toBe(100);
    // 'conversational' target is 155
    expect(scorePace(155, 'conversational')).toBe(100);
  });

  it('scores within range based on proximity', () => {
    // 'presentation' range: min 120, target 145, max 165. Width is (165 - 120) / 2 = 22.5
    // Distance from target for 130 is 15.
    // Score = 100 - (15 / 22.5) * 15 = 100 - 10 = 90
    expect(scorePace(130, 'presentation')).toBe(90);

    // Distance from target for 160 is 15.
    // Score = 100 - (15 / 22.5) * 15 = 90
    expect(scorePace(160, 'presentation')).toBe(90);
  });

  it('degrades score for WPM below the minimum range', () => {
    // 'presentation' min is 120
    // At WPM 110: distance from min is 10.
    // Score = 70 - 10 * 2 = 50
    expect(scorePace(110, 'presentation')).toBe(50);

    // Score hits 0 at distance 35 (WPM 85)
    expect(scorePace(85, 'presentation')).toBe(0);
    expect(scorePace(50, 'presentation')).toBe(0);
  });

  it('degrades score for WPM above the maximum range', () => {
    // 'presentation' max is 165
    // At WPM 175: distance from max is 10.
    // Score = 70 - 10 * 2 = 50
    expect(scorePace(175, 'presentation')).toBe(50);

    // Score hits 0 at distance 35 (WPM 200)
    expect(scorePace(200, 'presentation')).toBe(0);
    expect(scorePace(250, 'presentation')).toBe(0);
  });
});
import { mapSpeakingScoreToCoaching } from '../index';
import type {
  SpeakingExerciseScoreBreakdown,
  SpeakingAnalysisResult,
  SpeakingGoal,
} from '@voice/shared-types';

describe('mapSpeakingScoreToCoaching', () => {
  const defaultScore: SpeakingExerciseScoreBreakdown = {
    pace: 100,
    prosody: 100,
    projection: 100,
    fillerRate: 100,
    overall: 100,
  };

  const defaultAnalysis: SpeakingAnalysisResult = {
    wpm: 145,
    articulationRateWpm: 155,
    meanF0Hz: 120,
    f0RangeHz: 45,
    uptalkRatio: 0,
    pauseCount: 5,
    meanPauseDurationMs: 500,
    meanRmsDb: -15,
    rmsVarianceDb: 5,
    fillerEvents: [],
    fillerRate: 0,
  };

  describe('praise message and success band', () => {
    it('returns excellent for high scores', () => {
      const result = mapSpeakingScoreToCoaching(
        { ...defaultScore, overall: 95 },
        'pace',
        defaultAnalysis
      );
      expect(result.successBand).toBe('excellent');
      expect(result.praiseMessage).toBe('Really strong.');
    });

    it('returns good for good scores', () => {
      const result = mapSpeakingScoreToCoaching(
        { ...defaultScore, overall: 80 },
        'pace',
        defaultAnalysis
      );
      expect(result.successBand).toBe('good');
      expect(result.praiseMessage).toBe('Good work.');
    });

    it('returns developing for moderate scores', () => {
      const result = mapSpeakingScoreToCoaching(
        { ...defaultScore, overall: 65 },
        'pace',
        defaultAnalysis
      );
      expect(result.successBand).toBe('developing');
      expect(result.praiseMessage).toBe('Getting there.');
    });

    it('returns retry for low scores', () => {
      const result = mapSpeakingScoreToCoaching(
        { ...defaultScore, overall: 45 },
        'pace',
        defaultAnalysis
      );
      expect(result.successBand).toBe('retry');
      expect(result.praiseMessage).toBe('You got through it.');
    });
  });

  describe('corrections and action tips by goal', () => {
    it('handles pace - too fast', () => {
      const result = mapSpeakingScoreToCoaching(
        { ...defaultScore, pace: 60, overall: 60 },
        'pace',
        { ...defaultAnalysis, wpm: 170 }
      );
      expect(result.correctionMessage).toBe(
        'You came in too fast. Slow down and trust the pauses.'
      );
      expect(result.actionTip).toBe('Try reading each sentence, then pausing 1 full second.');
    });

    it('handles pace - too slow', () => {
      const result = mapSpeakingScoreToCoaching(
        { ...defaultScore, pace: 60, overall: 40 },
        'pace',
        { ...defaultAnalysis, wpm: 100 }
      );
      expect(result.correctionMessage).toBe(
        'You came in too slow. Aim for a more natural, conversational pace.'
      );
      expect(result.actionTip).toBe('Read just one paragraph. Very slowly.');
    });

    it('handles pace - good', () => {
      const result = mapSpeakingScoreToCoaching(
        { ...defaultScore, pace: 90, overall: 90 },
        'pace',
        { ...defaultAnalysis, wpm: 150 }
      );
      expect(result.correctionMessage).toBe('Good pace — keep that rhythm going.');
    });

    it('handles prosody - uptalk', () => {
      const result = mapSpeakingScoreToCoaching({ ...defaultScore, overall: 80 }, 'prosody', {
        ...defaultAnalysis,
        uptalkRatio: 0.5,
      });
      expect(result.correctionMessage).toBe(
        'Your sentences are ending like questions. Bring the pitch down at the end of each statement.'
      );
    });

    it('handles prosody - monotone', () => {
      const result = mapSpeakingScoreToCoaching({ ...defaultScore, overall: 80 }, 'prosody', {
        ...defaultAnalysis,
        f0RangeHz: 15,
      });
      expect(result.correctionMessage).toBe(
        'Your voice stayed very flat — vary your pitch more to keep listeners engaged.'
      );
    });

    it('handles projection - too quiet', () => {
      const result = mapSpeakingScoreToCoaching(
        { ...defaultScore, projection: 60, overall: 80 },
        'projection',
        { ...defaultAnalysis, meanRmsDb: -30 }
      );
      expect(result.correctionMessage).toBe(
        'Your voice was too quiet — project from the chest, not just the throat.'
      );
    });

    it('handles filler_reduction - high fillers', () => {
      const result = mapSpeakingScoreToCoaching(
        { ...defaultScore, overall: 80 },
        'filler_reduction',
        { ...defaultAnalysis, fillerRate: 5 }
      );
      expect(result.correctionMessage).toBe(
        'You used about 5 fillers per minute. Next try, replace every "um" with a silent pause.'
      );
    });

    it('handles filler_reduction - some fillers', () => {
      const result = mapSpeakingScoreToCoaching(
        { ...defaultScore, overall: 80 },
        'filler_reduction',
        { ...defaultAnalysis, fillerRate: 3 }
      );
      expect(result.correctionMessage).toBe(
        "A few fillers slipped in. You're improving — notice where they come and plan the thought before speaking."
      );
    });

    it('handles authority', () => {
      const result = mapSpeakingScoreToCoaching({ ...defaultScore, overall: 80 }, 'authority', {
        ...defaultAnalysis,
        uptalkRatio: 0.6,
      });
      expect(result.correctionMessage).toBe(
        'Too much uptalk. Every statement that ends rising sounds like a question. Drop the final note on each sentence.'
      );
    });
  });
});
