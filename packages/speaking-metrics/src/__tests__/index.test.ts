import { generateSpeakingFeedback, computeSpeakingScore } from '../index';
import type { SpeakingAnalysisResult } from '@voice/shared-types';

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

describe('computeSpeakingScore', () => {
  const defaultAnalysis: SpeakingAnalysisResult = {
    wpm: 145, // perfect for presentation
    f0RangeHz: 50, // good prosody
    uptalkRatio: 0, // perfect
    meanRmsDb: -15, // good projection
    rmsVarianceDb: 5, // good variance
    fillerRate: 1, // excellent filler rate
    articulationRateWpm: 150,
    meanF0Hz: 120,
    pauseCount: 5,
    meanPauseDurationMs: 500,
    fillerEvents: [],
  };

  it('computes correct scores with pace goal and presentation context', () => {
    const result = computeSpeakingScore(defaultAnalysis, 'pace');

    expect(result.pace).toBe(100);
    expect(result.prosody).toBeGreaterThan(80);
    expect(result.projection).toBeGreaterThan(80);
    expect(result.fillerRate).toBe(100);
    expect(result.overall).toBeGreaterThan(80);
  });

  it('weights overall score differently based on primary goal', () => {
    // Analysis that is good on pace but bad on fillers
    const analysis: SpeakingAnalysisResult = {
      ...defaultAnalysis,
      fillerRate: 8, // bad
    };

    const paceGoalResult = computeSpeakingScore(analysis, 'pace');
    const fillerGoalResult = computeSpeakingScore(analysis, 'filler_reduction');

    // pace goal weight on fillers is 0.1, filler_reduction weight is 0.7
    // So fillerGoalResult.overall should be significantly lower than paceGoalResult.overall
    expect(fillerGoalResult.overall).toBeLessThan(paceGoalResult.overall);
  });

  it('uses different WPM targets based on context', () => {
    // 100 WPM is good for technical, but too slow for conversational
    const analysis: SpeakingAnalysisResult = {
      ...defaultAnalysis,
      wpm: 100,
    };

    const techResult = computeSpeakingScore(analysis, 'pace', 'technical');
    const convResult = computeSpeakingScore(analysis, 'pace', 'conversational');

    // check that techResult.pace is defined before using it
    expect(techResult.pace).toBeDefined();
    expect(convResult.pace).toBeDefined();
    expect(techResult.pace!).toBeGreaterThan(convResult.pace!);
  });
});
