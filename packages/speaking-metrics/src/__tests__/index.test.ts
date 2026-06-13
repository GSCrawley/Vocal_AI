import { generateSpeakingFeedback, scoreProsody } from '../index';

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

describe('scoreProsody', () => {
  it('handles very monotone speech (F0 < 10Hz)', () => {
    expect(scoreProsody(5, 0)).toBe(20);
  });

  it('handles slightly monotone speech (10 <= F0 < 20Hz)', () => {
    expect(scoreProsody(10, 0)).toBe(40);
    expect(scoreProsody(15, 0)).toBe(40);
  });

  it('handles somewhat expressive speech (20 <= F0 < 40Hz)', () => {
    expect(scoreProsody(20, 0)).toBe(65);
    expect(scoreProsody(30, 0)).toBe(65);
  });

  it('handles expressive speech (40 <= F0 <= 80Hz) and caps at 100', () => {
    // 40Hz should give 90 + 0 = 90
    expect(scoreProsody(40, 0)).toBe(90);
    // 60Hz should give 90 + 20/4 = 95
    expect(scoreProsody(60, 0)).toBe(95);
    // 80Hz should give 90 + 40/4 = 100
    expect(scoreProsody(80, 0)).toBe(100);
    // Math.min(10, ...) limit logic for 40-80: max points added is 10
    // so at >= 80, it caps. Wait, at 80, (80-40)/4 = 10. 90+10 = 100.
  });

  it('handles very wide F0 range (> 80Hz)', () => {
    expect(scoreProsody(85, 0)).toBe(85);
  });

  it('applies uptalk penalty proportional to ratio', () => {
    // 100% uptalk penalty = 40. Range score = 100. 100 - 40 = 60.
    expect(scoreProsody(80, 1.0)).toBe(60);
    // 50% uptalk penalty = 20. Range score = 90. 90 - 20 = 70.
    expect(scoreProsody(40, 0.5)).toBe(70);
  });

  it('clamps final score between 0 and 100', () => {
    // Range score 20, penalty 40 -> -20, clamped to 0
    expect(scoreProsody(5, 1.0)).toBe(0);
    // Range score 100, penalty 0 -> 100, clamped to 100
    expect(scoreProsody(80, 0)).toBe(100);
  });
});

describe('mapSpeakingScoreToCoaching', () => {
  // We'll import it here, since it might not be imported at the top of the file yet
  const mockAnalysis = {
    wpm: 150,
    articulationRateWpm: 150,
    meanF0Hz: 120,
    f0RangeHz: 30,
    uptalkRatio: 0.2,
    pauseCount: 5,
    meanPauseDurationMs: 500,
    meanRmsDb: -20,
    rmsVarianceDb: 5,
    fillerEvents: [],
    fillerRate: 0,
  };

  const mockScore = {
    pace: 85,
    prosody: 85,
    projection: 85,
    fillerRate: 85,
    overall: 85, // 'excellent' band
  };

  describe('praiseMessage generation', () => {
    it('returns "Really strong." for excellent band (score >= 85)', () => {
      const result = mapSpeakingScoreToCoaching({ ...mockScore, overall: 85 }, 'pace', mockAnalysis);
      expect(result.praiseMessage).toBe('Really strong.');
    });

    it('returns "Good work." for good band (70 <= score < 85)', () => {
      const result = mapSpeakingScoreToCoaching({ ...mockScore, overall: 75 }, 'pace', mockAnalysis);
      expect(result.praiseMessage).toBe('Good work.');
    });

    it('returns "Getting there." for developing band (50 <= score < 70)', () => {
      const result = mapSpeakingScoreToCoaching({ ...mockScore, overall: 60 }, 'pace', mockAnalysis);
      expect(result.praiseMessage).toBe('Getting there.');
    });

    it('returns "You got through it." for retry band (score < 50)', () => {
      const result = mapSpeakingScoreToCoaching({ ...mockScore, overall: 40 }, 'pace', mockAnalysis);
      expect(result.praiseMessage).toBe('You got through it.');
    });
  });

  describe('correctionMessage generation by primaryGoal', () => {
    describe('pace', () => {
      it('gives slow down advice if pace is low and wpm is high', () => {
        const result = mapSpeakingScoreToCoaching(
          { ...mockScore, pace: 60 },
          'pace',
          { ...mockAnalysis, wpm: 170 }
        );
        expect(result.correctionMessage).toBe('You came in too fast. Slow down and trust the pauses.');
      });

      it('gives speed up advice if pace is low and wpm is low', () => {
        const result = mapSpeakingScoreToCoaching(
          { ...mockScore, pace: 60 },
          'pace',
          { ...mockAnalysis, wpm: 140 }
        );
        expect(result.correctionMessage).toBe('You came in too slow. Aim for a more natural, conversational pace.');
      });

      it('gives good pace advice if pace is high', () => {
        const result = mapSpeakingScoreToCoaching(
          { ...mockScore, pace: 80 },
          'pace',
          mockAnalysis
        );
        expect(result.correctionMessage).toBe('Good pace — keep that rhythm going.');
      });
    });

    describe('prosody', () => {
      it('gives uptalk advice if uptalkRatio is > 0.4', () => {
        const result = mapSpeakingScoreToCoaching(
          mockScore,
          'prosody',
          { ...mockAnalysis, uptalkRatio: 0.5 }
        );
        expect(result.correctionMessage).toBe('Your sentences are ending like questions. Bring the pitch down at the end of each statement.');
      });

      it('gives flat voice advice if f0RangeHz is < 20', () => {
        const result = mapSpeakingScoreToCoaching(
          mockScore,
          'prosody',
          { ...mockAnalysis, uptalkRatio: 0.2, f0RangeHz: 15 }
        );
        expect(result.correctionMessage).toBe('Your voice stayed very flat — vary your pitch more to keep listeners engaged.');
      });

      it('gives good expressiveness advice if prosody is good', () => {
        const result = mapSpeakingScoreToCoaching(
          mockScore,
          'prosody',
          { ...mockAnalysis, uptalkRatio: 0.2, f0RangeHz: 30 }
        );
        expect(result.correctionMessage).toBe('Good expressiveness — your pitch was varied and engaging.');
      });
    });

    describe('projection', () => {
      it('gives quiet advice if projection is low and meanRmsDb < -25', () => {
        const result = mapSpeakingScoreToCoaching(
          { ...mockScore, projection: 60 },
          'projection',
          { ...mockAnalysis, meanRmsDb: -30 }
        );
        expect(result.correctionMessage).toBe('Your voice was too quiet — project from the chest, not just the throat.');
      });

      it('gives vary dynamics advice if projection is low but not too quiet', () => {
        const result = mapSpeakingScoreToCoaching(
          { ...mockScore, projection: 60 },
          'projection',
          { ...mockAnalysis, meanRmsDb: -20 }
        );
        expect(result.correctionMessage).toBe('Good volume. Work on varying dynamics for emphasis.');
      });

      it('gives strong projection advice if projection is good', () => {
        const result = mapSpeakingScoreToCoaching(
          { ...mockScore, projection: 80 },
          'projection',
          mockAnalysis
        );
        expect(result.correctionMessage).toBe('Strong projection — it carried well.');
      });
    });

    describe('filler_reduction', () => {
      it('gives high filler advice if fillerRate > 4', () => {
        const result = mapSpeakingScoreToCoaching(
          mockScore,
          'filler_reduction',
          { ...mockAnalysis, fillerRate: 5 }
        );
        expect(result.correctionMessage).toContain('replace every "um" with a silent pause.');
      });

      it('gives medium filler advice if fillerRate > 2 but <= 4', () => {
        const result = mapSpeakingScoreToCoaching(
          mockScore,
          'filler_reduction',
          { ...mockAnalysis, fillerRate: 3 }
        );
        expect(result.correctionMessage).toContain('A few fillers slipped in.');
      });

      it('gives good filler advice if fillerRate <= 2', () => {
        const result = mapSpeakingScoreToCoaching(
          mockScore,
          'filler_reduction',
          { ...mockAnalysis, fillerRate: 1 }
        );
        expect(result.correctionMessage).toBe('Almost filler-free — well done.');
      });
    });

    describe('authority', () => {
      it('gives uptalk advice if uptalkRatio > 0.5', () => {
        const result = mapSpeakingScoreToCoaching(
          mockScore,
          'authority',
          { ...mockAnalysis, uptalkRatio: 0.6 }
        );
        expect(result.correctionMessage).toContain('Too much uptalk.');
      });

      it('gives good authority advice if uptalkRatio <= 0.5', () => {
        const result = mapSpeakingScoreToCoaching(
          mockScore,
          'authority',
          { ...mockAnalysis, uptalkRatio: 0.3 }
        );
        expect(result.correctionMessage).toBe('Authority markers were good — confident, direct delivery.');
      });
    });

    describe('static corrections', () => {
      it('returns correct static string for resonance', () => {
        const result = mapSpeakingScoreToCoaching(mockScore, 'resonance', mockAnalysis);
        expect(result.correctionMessage).toBe('Focus on feeling the vibration in your chest as you speak. Think "low and forward," not "high and back."');
      });

      it('returns correct static string for articulation', () => {
        const result = mapSpeakingScoreToCoaching(mockScore, 'articulation', mockAnalysis);
        expect(result.correctionMessage).toBe('Consonants were clear. Keep opening your mouth fully — clarity comes from space, not force.');
      });

      it('returns correct static string for breath_support', () => {
        const result = mapSpeakingScoreToCoaching(mockScore, 'breath_support', mockAnalysis);
        expect(result.correctionMessage).toBe('Keep the breath flowing through to the end of each sentence. Don\'t run out of air before the period.');
      });
    });
  });

  describe('actionTip generation', () => {
    it('returns appropriate tip for a given goal and band', () => {
      const result = mapSpeakingScoreToCoaching({ ...mockScore, overall: 40 }, 'pace', mockAnalysis);
      // retry band, pace goal
      expect(result.actionTip).toBe('Read just one paragraph. Very slowly.');
    });

    it('returns appropriate tip for another goal and band combination', () => {
      const result = mapSpeakingScoreToCoaching({ ...mockScore, overall: 75 }, 'prosody', mockAnalysis);
      // good band, prosody goal
      expect(result.actionTip).toBe('Try emphasizing the key word in each sentence.');
    });
  });

  describe('edge cases and unexpected inputs', () => {
    it('handles unexpected goal gracefully', () => {
      // By bypassing type checking, simulate what happens if a new or invalid goal is passed
      const result = mapSpeakingScoreToCoaching(mockScore, 'unknown_goal' as any, mockAnalysis);
      expect(result.correctionMessage).toBe("Keep practicing and focusing on your goals.");
      expect(result.actionTip).toBe("Keep going.");
    });
  });
});
