import { buildTemplateFallback } from '../template-fallback';
import type { LLMCoachingRequest, SingingMetricKey, SuccessBand } from '@voice/shared-types';

describe('buildTemplateFallback', () => {
  const baseRequest: LLMCoachingRequest = {
    userId: 'user-1',
    sessionId: 'session-1',
    attemptId: 'attempt-1',
    exerciseId: 'exercise-1',
    exerciseTitle: 'Sustained A4',
    tier: 'singing',
    goal: 'pitch',
    overallScore: 80,
    successBand: 'good',
    isPersonalBest: false,
    weaknessReport: {
      focusMetric: 'pitchAccuracy',
      focusScore: 75,
      rationale: 'Pitch was slightly off.',
    },
    difficultyConfig: {
      currentDifficulty: 2,
      nextDifficulty: 2,
      signal: 'maintain',
      adaptationReason: 'Steady progress.',
    },
    sessionHistory: {
      totalAttemptsOnExercise: 2,
      consecutiveGoodOrExcellent: 1,
      consecutiveRetry: 0,
    },
  };

  const metrics: SingingMetricKey[] = [
    'pitchAccuracy',
    'stability',
    'breathControl',
    'toneQuality',
    'dynamics',
    'diction',
    'styleExpression',
    'musicality',
    'posture',
    'consistency',
    'repertoire',
  ];

  const bands: SuccessBand[] = ['excellent', 'good', 'developing', 'retry'];

  for (const metric of metrics) {
    for (const band of bands) {
      it(`returns a valid template for ${metric} / ${band}`, () => {
        const req: LLMCoachingRequest = {
          ...baseRequest,
          successBand: band,
          weaknessReport: {
            ...baseRequest.weaknessReport,
            focusMetric: metric,
          },
        };

        const res = buildTemplateFallback(req);

        expect(res.praiseMessage).toBeDefined();
        expect(res.correctionMessage).toBeDefined();
        expect(res.actionTip).toBeDefined();
        expect(res.avatarMood).toBeDefined();
        expect(res.generatedBy).toBe('template');
      });
    }
  }

  it('returns ultimate fallback for unknown metric', () => {
    const req = {
      ...baseRequest,
      weaknessReport: {
        focusMetric: 'unknownMetric' as unknown as SingingMetricKey,
        focusScore: 50,
        rationale: 'Unknown.',
      },
    };

    const res = buildTemplateFallback(req);
    expect(res.praiseMessage).toBe('You completed the rep.');
    expect(res.generatedBy).toBe('template');
  });
});
