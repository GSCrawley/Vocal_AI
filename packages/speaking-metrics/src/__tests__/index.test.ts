import {
  generateSpeakingFeedback,
  scorePace,
  computeSpeakingScore,
  scoreProjection,
  scoreFillerRate,
  mapSpeakingScoreToCoaching,
} from '../index';
import type { SpeakingExerciseScoreBreakdown, SpeakingAnalysisResult } from '@voice/shared-types';

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

describe('computeSpeakingScore', () => {
  it('correctly computes a weighted score', () => {
    // 80 * 0.5 + 90 * 0.2 + 70 * 0.2 + 100 * 0.1 = 40 + 18 + 14 + 10 = 82
    const score = computeSpeakingScore(80, 90, 70, 100, {
      pace: 0.5,
      prosody: 0.2,
      projection: 0.2,
      fillerRate: 0.1,
    });
    expect(score).toBe(82);
  });

  it('correctly rounds the computed score', () => {
    // 80 * 0.5 + 85 * 0.2 + 70 * 0.2 + 100 * 0.1 = 40 + 17 + 14 + 10 = 81
    const score = computeSpeakingScore(80, 85, 70, 100, {
      pace: 0.5,
      prosody: 0.2,
      projection: 0.2,
      fillerRate: 0.1,
    });
    expect(score).toBe(81);

    // 80 * 0.5 + 88 * 0.2 + 70 * 0.2 + 100 * 0.1 = 40 + 17.6 + 14 + 10 = 81.6 -> 82
    const scoreRoundedUp = computeSpeakingScore(80, 88, 70, 100, {
      pace: 0.5,
      prosody: 0.2,
      projection: 0.2,
      fillerRate: 0.1,
    });
    expect(scoreRoundedUp).toBe(82);
  });

  it('throws an error if weights do not sum to 1.0', () => {
    expect(() => {
      computeSpeakingScore(80, 90, 70, 100, {
        pace: 0.5,
        prosody: 0.2,
        projection: 0.2,
        fillerRate: 0.2, // Sum is 1.1
      });
    }).toThrow('Scoring weights must sum to 1.0');

    expect(() => {
      computeSpeakingScore(80, 90, 70, 100, {
        pace: 0.5,
        prosody: 0.2,
        projection: 0.2,
        fillerRate: 0.0, // Sum is 0.9
      });
    }).toThrow('Scoring weights must sum to 1.0');
  });

  it('handles floating point precision when checking weight sum', () => {
    // 0.1 + 0.2 + 0.3 + 0.4 usually doesn't sum exactly to 1 in JS
    expect(() => {
      computeSpeakingScore(80, 90, 70, 100, {
        pace: 0.1,
        prosody: 0.2,
        projection: 0.3,
        fillerRate: 0.4,
      });
    }).not.toThrow();
  });

  it('throws an error if any weight is not a finite number', () => {
    expect(() => {
      computeSpeakingScore(80, 90, 70, 100, {
        pace: Number.NaN,
        prosody: 0.2,
        projection: 0.3,
        fillerRate: 0.5,
      });
    }).toThrow('Scoring weights must be finite numbers');

    expect(() => {
      computeSpeakingScore(80, 90, 70, 100, {
        pace: 0.1,
        prosody: Number.POSITIVE_INFINITY,
        projection: 0.3,
        fillerRate: 0.6,
      });
    }).toThrow('Scoring weights must be finite numbers');
  });

  it('handles zero scores correctly', () => {
    const score = computeSpeakingScore(0, 0, 0, 0, {
      pace: 0.5,
      prosody: 0.2,
      projection: 0.2,
      fillerRate: 0.1,
    });
    expect(score).toBe(0);
  });
});

describe('scoreProjection', () => {
  it('handles boundary conditions based on strict > logic', () => {
    // meanRmsDb > -10 -> 70
    // -9.99 passes, so levelScore = 70. Bonus = 0.
    expect(scoreProjection(-9.99, 0)).toBe(70);

    // meanRmsDb > -18 -> 100
    // -10 fails > -10, falls to > -18. levelScore = 100. Bonus = 0.
    expect(scoreProjection(-10, 0)).toBe(100);
    // -17.99 passes > -18. levelScore = 100. Bonus = 0.
    expect(scoreProjection(-17.99, 0)).toBe(100);

    // meanRmsDb > -25 -> 80
    // -18 fails > -18, falls to > -25. levelScore = 80. Bonus = 0.
    expect(scoreProjection(-18, 0)).toBe(80);
    // -24.99 passes > -25. levelScore = 80. Bonus = 0.
    expect(scoreProjection(-24.99, 0)).toBe(80);

    // meanRmsDb > -35 -> 55
    // -25 fails > -25, falls to > -35. levelScore = 55. Bonus = 0.
    expect(scoreProjection(-25, 0)).toBe(55);
    // -34.99 passes > -35. levelScore = 55. Bonus = 0.
    expect(scoreProjection(-34.99, 0)).toBe(55);

    // else -> 30
    // -35 fails > -35, falls to else. levelScore = 30. Bonus = 0.
    expect(scoreProjection(-35, 0)).toBe(30);
  });

  it('calculates and caps variance bonus correctly', () => {
    // 0 variance -> bonus 0
    // levelScore = 100 (-15 dB). 100 + 0 = 100
    expect(scoreProjection(-15, 0)).toBe(100);

    // 5 variance -> bonus 10 (capped)
    // levelScore = 80 (-20 dB). 80 + (5 * 2) = 90
    expect(scoreProjection(-20, 5)).toBe(90);

    // large variance (50) -> bonus capped at 10
    // levelScore = 55 (-30 dB). 55 + Math.min(10, 100) = 65
    expect(scoreProjection(-30, 50)).toBe(65);
  });

  it('handles negative variance', () => {
    // negative variance (-3) -> bonus -6
    // levelScore = 80 (-20 dB). 80 + Math.min(10, -6) = 74
    expect(scoreProjection(-20, -3)).toBe(74);
  });

  it('clamps the final score to 100', () => {
    // levelScore = 100 (-15 dB), high variance -> +10 bonus
    // 100 + 10 = 110, clamped to 100
    expect(scoreProjection(-15, 10)).toBe(100);
  });

  it('handles defensive/extreme inputs', () => {
    // very loud (0 dB) -> hits first branch (> -10). levelScore = 70.
    expect(scoreProjection(0, 0)).toBe(70);

    // very loud (+6 dB) -> hits first branch (> -10). levelScore = 70.
    expect(scoreProjection(6, 0)).toBe(70);

    // very quiet (-80 dB) -> hits else branch. levelScore = 30.
    expect(scoreProjection(-80, 0)).toBe(30);

    // NaN meanRmsDb -> all > comparisons false -> else branch. levelScore = 30.
    expect(scoreProjection(Number.NaN, 0)).toBe(30);

    // NaN variance -> Math.min(10, NaN) yields NaN. Final Math.min yields NaN.
    expect(scoreProjection(-20, Number.NaN)).toBeNaN();

    // Infinity meanRmsDb -> hits first branch. levelScore = 70.
    expect(scoreProjection(Number.POSITIVE_INFINITY, 0)).toBe(70);

    // -Infinity meanRmsDb -> hits else branch. levelScore = 30.
    expect(scoreProjection(Number.NEGATIVE_INFINITY, 0)).toBe(30);

    // Infinity variance -> bonus capped at 10. levelScore = 80 (-20 dB) + 10 = 90
    expect(scoreProjection(-20, Number.POSITIVE_INFINITY)).toBe(90);
  });
});

describe('scoreFillerRate', () => {
  it('returns 100 for <= 1 filler per minute', () => {
    expect(scoreFillerRate(0)).toBe(100);
    expect(scoreFillerRate(0.5)).toBe(100);
    expect(scoreFillerRate(1)).toBe(100);
  });

  it('returns 100 for negative input as expected by logic', () => {
    // Documenting existing behavior: a negative value is <= 1
    expect(scoreFillerRate(-5)).toBe(100);
  });

  it('returns 90 for > 1 and <= 2 fillers per minute', () => {
    expect(scoreFillerRate(1.1)).toBe(90);
    expect(scoreFillerRate(1.5)).toBe(90);
    expect(scoreFillerRate(2)).toBe(90);
  });

  it('returns 75 for > 2 and <= 4 fillers per minute', () => {
    expect(scoreFillerRate(2.1)).toBe(75);
    expect(scoreFillerRate(3)).toBe(75);
    expect(scoreFillerRate(4)).toBe(75);
  });

  it('returns 55 for > 4 and <= 6 fillers per minute', () => {
    expect(scoreFillerRate(4.1)).toBe(55);
    expect(scoreFillerRate(5)).toBe(55);
    expect(scoreFillerRate(6)).toBe(55);
  });

  it('returns 35 for > 6 and <= 10 fillers per minute', () => {
    expect(scoreFillerRate(6.1)).toBe(35);
    expect(scoreFillerRate(8)).toBe(35);
    expect(scoreFillerRate(10)).toBe(35);
  });

  it('returns 15 for > 10 fillers per minute', () => {
    expect(scoreFillerRate(10.1)).toBe(15);
    expect(scoreFillerRate(15)).toBe(15);
    expect(scoreFillerRate(100)).toBe(15);
  });
});

describe('mapSpeakingScoreToCoaching', () => {
  const baseAnalysis: SpeakingAnalysisResult = {
    wpm: 150,
    articulationRateWpm: 160,
    meanF0Hz: 120,
    f0RangeHz: 30,
    uptalkRatio: 0.1,
    pauseCount: 5,
    meanPauseDurationMs: 400,
    meanRmsDb: -20,
    rmsVarianceDb: 5,
    fillerEvents: [],
    fillerRate: 0,
  };

  const baseScore: SpeakingExerciseScoreBreakdown = {
    overall: 80,
    pace: 80,
    prosody: 80,
    projection: 80,
    fillerRate: 80,
  };

  it('handles pace goal with excellent score', () => {
    const score = { ...baseScore, overall: 95, pace: 95 };
    const result = mapSpeakingScoreToCoaching(score, 'pace', baseAnalysis);

    expect(result.successBand).toBe('excellent');
    expect(result.praiseMessage).toBe('Really strong.');
    expect(result.correctionMessage).toBe('Good pace — keep that rhythm going.');
    expect(result.actionTip).toBe('One more at this pace.');
  });

  it('handles pace goal when too fast', () => {
    const score = { ...baseScore, overall: 60, pace: 60 };
    const analysis = { ...baseAnalysis, wpm: 170 };
    const result = mapSpeakingScoreToCoaching(score, 'pace', analysis);

    expect(result.successBand).toBe('developing');
    expect(result.praiseMessage).toBe('Getting there.');
    expect(result.correctionMessage).toBe('You came in too fast. Slow down and trust the pauses.');
    expect(result.actionTip).toBe('Try reading each sentence, then pausing 1 full second.');
  });

  it('handles pace goal when too slow', () => {
    const score = { ...baseScore, overall: 49, pace: 49 };
    const analysis = { ...baseAnalysis, wpm: 110 };
    const result = mapSpeakingScoreToCoaching(score, 'pace', analysis);

    expect(result.successBand).toBe('retry');
    expect(result.praiseMessage).toBe('You got through it.');
    expect(result.correctionMessage).toBe('You came in too slow. Aim for a more natural, conversational pace.');
    expect(result.actionTip).toBe('Read just one paragraph. Very slowly.'); // Not logical text but matches original actionTips
  });

  it('handles prosody goal with uptalk', () => {
    const score = { ...baseScore, overall: 75 };
    const analysis = { ...baseAnalysis, uptalkRatio: 0.5 };
    const result = mapSpeakingScoreToCoaching(score, 'prosody', analysis);

    expect(result.successBand).toBe('good');
    expect(result.praiseMessage).toBe('Good work.');
    expect(result.correctionMessage).toBe('Your sentences are ending like questions. Bring the pitch down at the end of each statement.');
    expect(result.actionTip).toBe('Try emphasizing the key word in each sentence.');
  });

  it('handles prosody goal with flat pitch', () => {
    const score = { ...baseScore, overall: 49 };
    const analysis = { ...baseAnalysis, f0RangeHz: 15 };
    const result = mapSpeakingScoreToCoaching(score, 'prosody', analysis);

    expect(result.successBand).toBe('retry');
    expect(result.correctionMessage).toBe('Your voice stayed very flat — vary your pitch more to keep listeners engaged.');
    expect(result.actionTip).toBe('Exaggerate the pitch on every important word — go over the top on purpose.');
  });

  it('handles prosody goal with good pitch', () => {
    const score = { ...baseScore, overall: 90 };
    const result = mapSpeakingScoreToCoaching(score, 'prosody', baseAnalysis);

    expect(result.correctionMessage).toBe('Good expressiveness — your pitch was varied and engaging.');
  });

  it('handles projection goal when too quiet', () => {
    const score = { ...baseScore, overall: 65, projection: 60 };
    const analysis = { ...baseAnalysis, meanRmsDb: -30 };
    const result = mapSpeakingScoreToCoaching(score, 'projection', analysis);

    expect(result.successBand).toBe('developing');
    expect(result.correctionMessage).toBe('Your voice was too quiet — project from the chest, not just the throat.');
  });

  it('handles projection goal when loud but poor score', () => {
    const score = { ...baseScore, overall: 65, projection: 60 };
    const analysis = { ...baseAnalysis, meanRmsDb: -20 };
    const result = mapSpeakingScoreToCoaching(score, 'projection', analysis);

    expect(result.successBand).toBe('developing');
    expect(result.correctionMessage).toBe('Good volume. Work on varying dynamics for emphasis.');
  });

  it('handles projection goal with good projection', () => {
    const score = { ...baseScore, overall: 95, projection: 95 };
    const result = mapSpeakingScoreToCoaching(score, 'projection', baseAnalysis);

    expect(result.successBand).toBe('excellent');
    expect(result.correctionMessage).toBe('Strong projection — it carried well.');
  });

  it('handles filler_reduction goal with high fillers', () => {
    const score = { ...baseScore, overall: 49 };
    const analysis = { ...baseAnalysis, fillerRate: 5 };
    const result = mapSpeakingScoreToCoaching(score, 'filler_reduction', analysis);

    expect(result.successBand).toBe('retry');
    expect(result.correctionMessage).toBe('You used about 5 fillers per minute. Next try, replace every "um" with a silent pause.');
  });

  it('handles filler_reduction goal with some fillers', () => {
    const score = { ...baseScore, overall: 75 };
    const analysis = { ...baseAnalysis, fillerRate: 3 };
    const result = mapSpeakingScoreToCoaching(score, 'filler_reduction', analysis);

    expect(result.successBand).toBe('good');
    expect(result.correctionMessage).toBe("A few fillers slipped in. You're improving — notice where they come and plan the thought before speaking.");
  });

  it('handles filler_reduction goal with almost no fillers', () => {
    const score = { ...baseScore, overall: 95 };
    const analysis = { ...baseAnalysis, fillerRate: 1 };
    const result = mapSpeakingScoreToCoaching(score, 'filler_reduction', analysis);

    expect(result.successBand).toBe('excellent');
    expect(result.correctionMessage).toBe('Almost filler-free — well done.');
  });

  it('handles authority goal with too much uptalk', () => {
    const score = { ...baseScore, overall: 60 };
    const analysis = { ...baseAnalysis, uptalkRatio: 0.6 };
    const result = mapSpeakingScoreToCoaching(score, 'authority', analysis);

    expect(result.successBand).toBe('developing');
    expect(result.correctionMessage).toBe('Too much uptalk. Every statement that ends rising sounds like a question. Drop the final note on each sentence.');
  });

  it('handles authority goal with good markers', () => {
    const score = { ...baseScore, overall: 84 };
    const analysis = { ...baseAnalysis, uptalkRatio: 0.1 };
    const result = mapSpeakingScoreToCoaching(score, 'authority', analysis);

    expect(result.successBand).toBe('good');
    expect(result.correctionMessage).toBe('Authority markers were good — confident, direct delivery.');
  });

  it('handles static goals: resonance, articulation, breath_support', () => {
    const resonanceResult = mapSpeakingScoreToCoaching(baseScore, 'resonance', baseAnalysis);
    expect(resonanceResult.correctionMessage).toBe('Focus on feeling the vibration in your chest as you speak. Think "low and forward," not "high and back."');

    const articulationResult = mapSpeakingScoreToCoaching(baseScore, 'articulation', baseAnalysis);
    expect(articulationResult.correctionMessage).toBe('Consonants were clear. Keep opening your mouth fully — clarity comes from space, not force.');

    const breathResult = mapSpeakingScoreToCoaching(baseScore, 'breath_support', baseAnalysis);
    expect(breathResult.correctionMessage).toBe("Keep the breath flowing through to the end of each sentence. Don't run out of air before the period.");
  });
});
