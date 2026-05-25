import { generateSpeakingFeedback, mapSpeakingScoreToCoaching } from '../index';
import { SpeakingAnalysisResult, SpeakingExerciseScoreBreakdown, SpeakingGoal } from '@voice/shared-types';

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


describe('mapSpeakingScoreToCoaching', () => {
  const defaultAnalysis: SpeakingAnalysisResult = {
    wpm: 150,
    articulationRateWpm: 160,
    meanF0Hz: 120,
    f0RangeHz: 40,
    uptalkRatio: 0.1,
    pauseCount: 5,
    meanPauseDurationMs: 500,
    meanRmsDb: -15,
    rmsVarianceDb: 5,
    fillerEvents: [],
    fillerRate: 1,
  };

  const defaultScore: SpeakingExerciseScoreBreakdown = {
    overall: 90,
    pace: 90,
    prosody: 90,
    projection: 90,
    fillerRate: 90,
  };

  it('maps excellent pace correctly', () => {
    const result = mapSpeakingScoreToCoaching(defaultScore, 'pace', defaultAnalysis);
    expect(result.successBand).toBe('excellent');
    expect(result.praiseMessage).toBe('Really strong.');
    expect(result.correctionMessage).toBe('Good pace — keep that rhythm going.');
    expect(result.actionTip).toBe('One more at this pace.');
  });

  it('maps too fast pace correctly', () => {
    const result = mapSpeakingScoreToCoaching(
      { ...defaultScore, pace: 60, overall: 60 },
      'pace',
      { ...defaultAnalysis, wpm: 170 }
    );
    expect(result.successBand).toBe('developing');
    expect(result.correctionMessage).toBe('You came in too fast. Slow down and trust the pauses.');
  });

  it('maps too slow pace correctly', () => {
    const result = mapSpeakingScoreToCoaching(
      { ...defaultScore, pace: 60, overall: 60 },
      'pace',
      { ...defaultAnalysis, wpm: 100 }
    );
    expect(result.correctionMessage).toBe('You came in too slow. Aim for a more natural, conversational pace.');
  });

  it('maps prosody uptalk correctly', () => {
    const result = mapSpeakingScoreToCoaching(
      defaultScore,
      'prosody',
      { ...defaultAnalysis, uptalkRatio: 0.5 }
    );
    expect(result.correctionMessage).toBe('Your sentences are ending like questions. Bring the pitch down at the end of each statement.');
  });

  it('maps prosody monotone correctly', () => {
    const result = mapSpeakingScoreToCoaching(
      defaultScore,
      'prosody',
      { ...defaultAnalysis, f0RangeHz: 15 }
    );
    expect(result.correctionMessage).toBe('Your voice stayed very flat — vary your pitch more to keep listeners engaged.');
  });

  it('maps prosody good correctly', () => {
    const result = mapSpeakingScoreToCoaching(defaultScore, 'prosody', defaultAnalysis);
    expect(result.correctionMessage).toBe('Good expressiveness — your pitch was varied and engaging.');
  });

  it('maps projection too quiet correctly', () => {
    const result = mapSpeakingScoreToCoaching(
      { ...defaultScore, projection: 60, overall: 60 },
      'projection',
      { ...defaultAnalysis, meanRmsDb: -30 }
    );
    expect(result.correctionMessage).toBe('Your voice was too quiet — project from the chest, not just the throat.');
  });

  it('maps projection good volume but low score correctly', () => {
    const result = mapSpeakingScoreToCoaching(
      { ...defaultScore, projection: 60, overall: 60 },
      'projection',
      { ...defaultAnalysis, meanRmsDb: -15 }
    );
    expect(result.correctionMessage).toBe('Good volume. Work on varying dynamics for emphasis.');
  });

  it('maps projection good correctly', () => {
    const result = mapSpeakingScoreToCoaching(defaultScore, 'projection', defaultAnalysis);
    expect(result.correctionMessage).toBe('Strong projection — it carried well.');
  });

  it('maps filler_reduction high correctly', () => {
    const result = mapSpeakingScoreToCoaching(
      defaultScore,
      'filler_reduction',
      { ...defaultAnalysis, fillerRate: 5 }
    );
    expect(result.correctionMessage).toContain('replace every "um" with a silent pause');
  });

  it('maps filler_reduction medium correctly', () => {
    const result = mapSpeakingScoreToCoaching(
      defaultScore,
      'filler_reduction',
      { ...defaultAnalysis, fillerRate: 3 }
    );
    expect(result.correctionMessage).toContain('A few fillers slipped in');
  });

  it('maps filler_reduction low correctly', () => {
    const result = mapSpeakingScoreToCoaching(defaultScore, 'filler_reduction', defaultAnalysis);
    expect(result.correctionMessage).toBe('Almost filler-free — well done.');
  });

  it('maps authority uptalk correctly', () => {
    const result = mapSpeakingScoreToCoaching(
      defaultScore,
      'authority',
      { ...defaultAnalysis, uptalkRatio: 0.6 }
    );
    expect(result.correctionMessage).toContain('Too much uptalk');
  });

  it('maps authority good correctly', () => {
    const result = mapSpeakingScoreToCoaching(defaultScore, 'authority', defaultAnalysis);
    expect(result.correctionMessage).toBe('Authority markers were good — confident, direct delivery.');
  });

  it('maps other goals correctly', () => {
    expect(mapSpeakingScoreToCoaching(defaultScore, 'resonance', defaultAnalysis).correctionMessage)
      .toContain('vibration in your chest');
    expect(mapSpeakingScoreToCoaching(defaultScore, 'articulation', defaultAnalysis).correctionMessage)
      .toContain('Consonants were clear');
    expect(mapSpeakingScoreToCoaching(defaultScore, 'breath_support', defaultAnalysis).correctionMessage)
      .toContain('flowing through to the end');
  });

  it('maps success bands correctly based on overall score', () => {
    const excellent = mapSpeakingScoreToCoaching({ ...defaultScore, overall: 90 }, 'pace', defaultAnalysis);
    expect(excellent.successBand).toBe('excellent');
    expect(excellent.praiseMessage).toBe('Really strong.');
    expect(excellent.actionTip).toBe('One more at this pace.');

    const good = mapSpeakingScoreToCoaching({ ...defaultScore, overall: 75 }, 'pace', defaultAnalysis);
    expect(good.successBand).toBe('good');
    expect(good.praiseMessage).toBe('Good work.');
    expect(good.actionTip).toBe('Focus on the pauses.');

    const developing = mapSpeakingScoreToCoaching({ ...defaultScore, overall: 60 }, 'pace', defaultAnalysis);
    expect(developing.successBand).toBe('developing');
    expect(developing.praiseMessage).toBe('Getting there.');
    expect(developing.actionTip).toBe('Try reading each sentence, then pausing 1 full second.');

    const retry = mapSpeakingScoreToCoaching({ ...defaultScore, overall: 40 }, 'pace', defaultAnalysis);
    expect(retry.successBand).toBe('retry');
    expect(retry.praiseMessage).toBe('You got through it.');
    expect(retry.actionTip).toBe('Read just one paragraph. Very slowly.');
  });
});
