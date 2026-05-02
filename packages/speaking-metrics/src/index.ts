import type {
  SpeakingExerciseScoreBreakdown,
  SpeakingAnalysisResult,
  SuccessBand,
  CoachingPayload,
  SpeakingGoal,
} from '@voice/shared-types';

// ------------------------------------------------------------
// SPEAKING SCORE COMPUTATION
// ------------------------------------------------------------

/**
 * Target WPM ranges by speaking context.
 * These inform the pace scoring function.
 */
export const WPM_TARGETS: Record<string, { min: number; target: number; max: number }> = {
  presentation:    { min: 120, target: 145, max: 165 },
  conversational:  { min: 130, target: 155, max: 180 },
  short_form:      { min: 140, target: 165, max: 195 },
  technical:       { min: 100, target: 125, max: 145 },
  interview:       { min: 120, target: 140, max: 160 },
};

/**
 * Score pace based on measured WPM vs target range.
 * Full score at target; degrades gracefully outside the range.
 */
export function scorePace(
  wpm: number,
  context: keyof typeof WPM_TARGETS = 'presentation'
): number {
  const target = WPM_TARGETS[context];
  if (!target) return 50;

  if (wpm >= target.min && wpm <= target.max) {
    // Within range — score based on proximity to target
    const distanceFromTarget = Math.abs(wpm - target.target);
    const rangeWidth = (target.max - target.min) / 2;
    return Math.round(100 - (distanceFromTarget / rangeWidth) * 15);
  }

  // Outside range — score degrades
  const distanceFromRange = wpm < target.min
    ? target.min - wpm
    : wpm - target.max;
  return Math.max(0, Math.round(70 - distanceFromRange * 2));
}

/**
 * Score prosody/pitch variability.
 * Monotone (low F0 range) is penalized; healthy expressiveness is rewarded.
 * Uptalk (rising sentence-final F0) is penalized.
 */
export function scoreProsody(f0RangeHz: number, uptalkRatio: number): number {
  // F0 range scoring: < 20Hz = very monotone; 40–80Hz = expressive; > 100Hz = possibly over-emphatic
  let rangeScore: number;
  if (f0RangeHz < 10) rangeScore = 20;
  else if (f0RangeHz < 20) rangeScore = 40;
  else if (f0RangeHz < 40) rangeScore = 65;
  else if (f0RangeHz <= 80) rangeScore = 90 + Math.min(10, (f0RangeHz - 40) / 4);
  else rangeScore = 85; // Very wide range — still good but slightly penalized

  // Uptalk penalty: 0 uptalk = no penalty; 100% uptalk = -40 points
  const uptalkPenalty = Math.round(uptalkRatio * 40);

  return Math.max(0, Math.min(100, rangeScore - uptalkPenalty));
}

/**
 * Score projection based on RMS level and consistency.
 */
export function scoreProjection(meanRmsDb: number, rmsVarianceDb: number): number {
  // Target: mean RMS around -18 to -12 dBFS for a close-mic speaking scenario
  // Too quiet (< -30dB) penalized; too loud (clipping) handled upstream
  let levelScore: number;
  if (meanRmsDb > -10) levelScore = 70; // Risk of clipping
  else if (meanRmsDb > -18) levelScore = 100;
  else if (meanRmsDb > -25) levelScore = 80;
  else if (meanRmsDb > -35) levelScore = 55;
  else levelScore = 30; // Too quiet

  // Variance bonus: some variation is good (dynamic range); zero variance is flat
  const varianceBonus = Math.min(10, rmsVarianceDb * 2);

  return Math.min(100, levelScore + varianceBonus);
}

/**
 * Score filler word rate.
 * Target: < 2 fillers per minute for excellent; > 6 = retry band.
 */
export function scoreFillerRate(fillersPerMinute: number): number {
  if (fillersPerMinute <= 1) return 100;
  if (fillersPerMinute <= 2) return 90;
  if (fillersPerMinute <= 4) return 75;
  if (fillersPerMinute <= 6) return 55;
  if (fillersPerMinute <= 10) return 35;
  return 15;
}

/**
 * Compute overall speaking exercise score weighted by goal focus.
 */
export function computeSpeakingScore(
  analysis: SpeakingAnalysisResult,
  primaryGoal: SpeakingGoal,
  context: keyof typeof WPM_TARGETS = 'presentation'
): SpeakingExerciseScoreBreakdown {
  const pace = scorePace(analysis.wpm, context);
  const prosody = scoreProsody(analysis.f0RangeHz, analysis.uptalkRatio);
  const projection = scoreProjection(analysis.meanRmsDb, analysis.rmsVarianceDb);
  const fillerRate = scoreFillerRate(analysis.fillerRate);

  // Weight the overall score by primary goal
  const weights: Record<SpeakingGoal, Record<string, number>> = {
    pace:            { pace: 0.6, prosody: 0.15, projection: 0.15, fillerRate: 0.1 },
    prosody:         { pace: 0.2, prosody: 0.6, projection: 0.1, fillerRate: 0.1 },
    projection:      { pace: 0.1, prosody: 0.2, projection: 0.6, fillerRate: 0.1 },
    filler_reduction:{ pace: 0.1, prosody: 0.1, projection: 0.1, fillerRate: 0.7 },
    authority:       { pace: 0.2, prosody: 0.5, projection: 0.2, fillerRate: 0.1 },
    resonance:       { pace: 0.1, prosody: 0.3, projection: 0.5, fillerRate: 0.1 },
    articulation:    { pace: 0.2, prosody: 0.2, projection: 0.4, fillerRate: 0.2 },
    breath_support:  { pace: 0.2, prosody: 0.2, projection: 0.5, fillerRate: 0.1 },
  };

  const w = weights[primaryGoal];
  const overall = Math.round(
    pace * w.pace +
    prosody * w.prosody +
    projection * w.projection +
    fillerRate * w.fillerRate
  );

  return { pace, prosody, projection, fillerRate, overall };
}

/**
 * Map a speaking score to a coaching payload.
 * Each goal has a different dominant failure message.
 */
export function mapSpeakingScoreToCoaching(
  score: SpeakingExerciseScoreBreakdown,
  primaryGoal: SpeakingGoal,
  analysis: SpeakingAnalysisResult
): CoachingPayload {
  const band = scoreToBand(score.overall);

  // Determine the dominant failure for targeted correction
  const corrections: Record<SpeakingGoal, () => string> = {
    pace: () => {
      if (!score.pace || score.pace < 70) {
        return analysis.wpm > 165
          ? 'You came in too fast. Slow down and trust the pauses.'
          : 'You came in too slow. Aim for a more natural, conversational pace.';
      }
      return 'Good pace — keep that rhythm going.';
    },
    prosody: () => {
      if (analysis.uptalkRatio > 0.4) return 'Your sentences are ending like questions. Bring the pitch down at the end of each statement.';
      if (analysis.f0RangeHz < 20) return 'Your voice stayed very flat — vary your pitch more to keep listeners engaged.';
      return 'Good expressiveness — your pitch was varied and engaging.';
    },
    projection: () => {
      if (!score.projection || score.projection < 70) {
        return analysis.meanRmsDb < -25
          ? 'Your voice was too quiet — project from the chest, not just the throat.'
          : 'Good volume. Work on varying dynamics for emphasis.';
      }
      return 'Strong projection — it carried well.';
    },
    filler_reduction: () => {
      if (analysis.fillerRate > 4) return `You used about ${Math.round(analysis.fillerRate)} fillers per minute. Next try, replace every "um" with a silent pause.`;
      if (analysis.fillerRate > 2) return 'A few fillers slipped in. You\'re improving — notice where they come and plan the thought before speaking.';
      return 'Almost filler-free — well done.';
    },
    authority: () => {
      if (analysis.uptalkRatio > 0.5) return 'Too much uptalk. Every statement that ends rising sounds like a question. Drop the final note on each sentence.';
      return 'Authority markers were good — confident, direct delivery.';
    },
    resonance: () => 'Focus on feeling the vibration in your chest as you speak. Think "low and forward," not "high and back."',
    articulation: () => 'Consonants were clear. Keep opening your mouth fully — clarity comes from space, not force.',
    breath_support: () => 'Keep the breath flowing through to the end of each sentence. Don\'t run out of air before the period.',
  };

  const actionTips: Record<SpeakingGoal, Record<SuccessBand, string>> = {
    pace:            { excellent: 'One more at this pace.', good: 'Focus on the pauses.', developing: 'Try reading each sentence, then pausing 1 full second.', retry: 'Read just one paragraph. Very slowly.' },
    prosody:         { excellent: 'One more with that expressiveness.', good: 'Try emphasizing the key word in each sentence.', developing: 'Record yourself and listen back — where does the pitch go flat?', retry: 'Exaggerate the pitch on every important word — go over the top on purpose.' },
    projection:      { excellent: 'Sustain this energy through a longer passage.', good: 'Add a little more energy on key phrases.', developing: 'Project to an imaginary person at the back of the room.', retry: 'Start louder than feels comfortable. You can always come down.' },
    filler_reduction:{ excellent: 'Clean run — keep it going.', good: 'You\'re close. Notice where the fillers cluster and plan those moments.', developing: 'Replace "um" with silence. Just pause. It sounds better.', retry: 'Speak for 30 seconds. Stop before every "um."' },
    authority:       { excellent: 'That\'s authority. Take note of how it felt.', good: 'Drop the pitch at the end of one more sentence.', developing: 'Say one sentence, then drop your chin slightly on the last word.', retry: 'Repeat: "This is my statement." Make it land with a full stop.' },
    resonance:       { excellent: 'That resonance is strong. Remember how that feels.', good: 'Hum for 10 seconds before the next try to set the placement.', developing: 'Speak from lower in your chest. Feel the vibration there.', retry: 'Try a resonance hum first, then go straight into the exercise.' },
    articulation:    { excellent: 'Crystal clear.', good: 'A little more mouth opening on vowels.', developing: 'Exaggerate lip and tongue movement intentionally.', retry: 'Read very slowly, hitting every consonant.' },
    breath_support:  { excellent: 'Solid breath support throughout.', good: 'Breathe one beat earlier than you think you need to.', developing: 'Mark the breath points before you start.', retry: 'Read half as much text per breath.' },
  };

  return {
    praiseMessage: band === 'excellent' ? 'Really strong.' : band === 'good' ? 'Good work.' : band === 'developing' ? 'Getting there.' : 'You got through it.',
    correctionMessage: corrections[primaryGoal](),
    actionTip: actionTips[primaryGoal][band],
    successBand: band,
  };
}

function scoreToBand(score: number): SuccessBand {
  if (score >= 85) return 'excellent';
  if (score >= 70) return 'good';
  if (score >= 50) return 'developing';
  return 'retry';
}

/**
 * Generate feedback based on the failure mode.
 */
export type SpeakingFailureMode = 'too_fast' | 'too_slow' | 'uptalk' | 'monotone';

export interface SpeakingFeedback {
  text: string;
}

export function generateSpeakingFeedback(failureMode: SpeakingFailureMode | null): SpeakingFeedback {
  if (!failureMode) {
    return { text: 'Great dynamic expression.' };
  }

  switch (failureMode) {
    case 'too_fast':
      return { text: 'You came in too fast. Slow down and trust the pauses.' };
    case 'too_slow':
      return { text: 'You came in too slow. Aim for a more natural, conversational pace.' };
    case 'uptalk':
      return { text: 'Your sentences are ending like questions. Bring the pitch down at the end of each statement.' };
    case 'monotone':
      return { text: 'Your voice stayed very flat - vary your pitch more to keep listeners engaged.' };
  }
}
