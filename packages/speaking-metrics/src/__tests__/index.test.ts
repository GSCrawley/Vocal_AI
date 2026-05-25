import { generateSpeakingFeedback, computeSpeakingScore } from '../index';

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

import type { SpeakingAnalysisResult } from '@voice/shared-types';

describe('computeSpeakingScore', () => {
  const baseAnalysis: SpeakingAnalysisResult = {
    wpm: 145, // perfect for presentation
    articulationRateWpm: 155,
    meanF0Hz: 120,
    f0RangeHz: 50, // expressive
    uptalkRatio: 0, // no penalty
    pauseCount: 5,
    meanPauseDurationMs: 500,
    meanRmsDb: -15, // excellent projection
    rmsVarianceDb: 5, // good variance bonus (10)
    fillerEvents: [],
    fillerRate: 0, // excellent filler rate
  };

  it('computes correct score breakdown for a good performance with pace goal', () => {
    const score = computeSpeakingScore(baseAnalysis, 'pace', 'presentation');
    const expectedPace = scorePace(baseAnalysis.wpm, 'presentation');
    const expectedProsody = scoreProsody(baseAnalysis.f0RangeHz, baseAnalysis.uptalkRatio);
    const expectedProjection = scoreProjection(baseAnalysis.meanRmsDb, baseAnalysis.rmsVarianceDb);
    const expectedFillerRate = scoreFillerRate(baseAnalysis.fillerRate);
    const expectedOverall =
      expectedPace * 0.6 +
      expectedProsody * 0.15 +
      expectedProjection * 0.15 +
      expectedFillerRate * 0.1;

    expect(score.pace!).toBe(expectedPace);
    expect(score.prosody!).toBeCloseTo(expectedProsody);
    expect(score.projection!).toBe(expectedProjection);
    expect(score.fillerRate!).toBe(expectedFillerRate);
    expect(score.overall).toBeCloseTo(expectedOverall);
  });

  it('adjusts overall score based on the primary goal weight (filler_reduction focus)', () => {
    // Bad filler rate, but good everything else
    const highFillerAnalysis: SpeakingAnalysisResult = {
      ...baseAnalysis,
      fillerRate: 8,
    };

    const scorePaceGoal = computeSpeakingScore(highFillerAnalysis, 'pace', 'presentation');
    const scoreFillerGoal = computeSpeakingScore(highFillerAnalysis, 'filler_reduction', 'presentation');
    const expectedPace = scorePace(highFillerAnalysis.wpm, 'presentation');
    const expectedProsody = scoreProsody(highFillerAnalysis.f0RangeHz, highFillerAnalysis.uptalkRatio);
    const expectedProjection = scoreProjection(highFillerAnalysis.meanRmsDb, highFillerAnalysis.rmsVarianceDb);
    const expectedFillerRate = scoreFillerRate(highFillerAnalysis.fillerRate);
    const expectedPaceGoalOverall =
      expectedPace * 0.6 +
      expectedProsody * 0.15 +
      expectedProjection * 0.15 +
      expectedFillerRate * 0.1;
    const expectedFillerGoalOverall =
      expectedPace * 0.1 +
      expectedProsody * 0.1 +
      expectedProjection * 0.1 +
      expectedFillerRate * 0.7;

    expect(scorePaceGoal.pace!).toBe(expectedPace);
    expect(scorePaceGoal.prosody!).toBeCloseTo(expectedProsody);
    expect(scorePaceGoal.projection!).toBe(expectedProjection);
    expect(scorePaceGoal.fillerRate!).toBe(expectedFillerRate);
    expect(scorePaceGoal.overall).toBeCloseTo(expectedPaceGoalOverall);

    expect(scoreFillerGoal.pace!).toBe(expectedPace);
    expect(scoreFillerGoal.prosody!).toBeCloseTo(expectedProsody);
    expect(scoreFillerGoal.projection!).toBe(expectedProjection);
    expect(scoreFillerGoal.fillerRate!).toBe(expectedFillerRate);
    expect(scoreFillerGoal.overall).toBeCloseTo(expectedFillerGoalOverall);
  });

  it('respects the speaking context for pace scoring', () => {
    // 125 WPM is slow for 'presentation', but better suited to 'technical'
    const slowAnalysis: SpeakingAnalysisResult = {
      ...baseAnalysis,
      wpm: 125,
    };

    const scorePresentation = computeSpeakingScore(slowAnalysis, 'pace', 'presentation');
    const scoreTechnical = computeSpeakingScore(slowAnalysis, 'pace', 'technical');

    expect(scoreTechnical.pace!).toBeGreaterThan(scorePresentation.pace!);
  });
});
