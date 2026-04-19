import type {
  KaraokeSnippet,
  KaraokeAttemptScore,
  KaraokeSnippetStatus,
  LivePitchFrame,
  CoachingPayload,
  SuccessBand,
} from '@voice/shared-types';

// ------------------------------------------------------------
// MATCH THRESHOLDS
// ------------------------------------------------------------

export const KARAOKE_MATCH_THRESHOLDS: Record<string, number> = {
  level_1_2: 70, // Level 1–2 users: 70/100 to complete a snippet
  level_3_4: 80, // Level 3–4 users: 80/100 to complete a snippet
};

export const SCORE_WEIGHTS = {
  pitchSimilarity: 0.60,
  timingAccuracy:  0.20,
  contourMatch:    0.20,
};

// ------------------------------------------------------------
// DTW UTILITIES (simplified implementation)
// Full DTW would be computed server-side or in WASM.
// This module provides the score computation contract.
// ------------------------------------------------------------

/**
 * Compute the pitch similarity score between user and reference pitch curves
 * using simplified DTW comparison.
 *
 * In production, this runs server-side with a full DTW implementation.
 * This function represents the contract and a simplified approximation.
 */
export function computePitchSimilarity(
  userFrames: LivePitchFrame[],
  referenceFrames: LivePitchFrame[]
): number {
  const userVoiced = userFrames.filter(f => f.voiced && f.centsFromTarget !== undefined);
  const refVoiced = referenceFrames.filter(f => f.voiced && f.frequencyHz !== undefined);

  if (userVoiced.length === 0 || refVoiced.length === 0) return 0;

  // Simplified: sample at equal intervals and compare
  const sampleCount = Math.min(userVoiced.length, refVoiced.length, 50);
  let totalError = 0;
  let samplesCompared = 0;

  for (let i = 0; i < sampleCount; i++) {
    const uIdx = Math.floor((i / sampleCount) * userVoiced.length);
    const rIdx = Math.floor((i / sampleCount) * refVoiced.length);

    const uFrame = userVoiced[uIdx];
    const rFrame = refVoiced[rIdx];

    if (uFrame?.centsFromTarget !== undefined && rFrame) {
      totalError += Math.abs(uFrame.centsFromTarget);
      samplesCompared++;
    }
  }

  if (samplesCompared === 0) return 0;
  const avgErrorCents = totalError / samplesCompared;

  // Map avg cents error to 0–100 score
  // 0 cents error = 100; 50 cents = ~80; 200 cents = ~30
  return Math.max(0, Math.round(100 - (avgErrorCents / 3)));
}

/**
 * Compute timing accuracy: how well the user's phrase onset/duration
 * matches the reference.
 */
export function computeTimingAccuracy(
  userDurationMs: number,
  referenceDurationMs: number,
  userOnsetOffsetMs: number,  // ms late/early vs expected start
): number {
  // Duration match: within 15% = full score; beyond 30% = 50 score
  const durationRatio = Math.abs(userDurationMs - referenceDurationMs) / referenceDurationMs;
  const durationScore = durationRatio <= 0.15 ? 100 : durationRatio <= 0.30 ? 75 : 50;

  // Onset match: within 200ms = full; beyond 500ms = 50
  const onsetAbs = Math.abs(userOnsetOffsetMs);
  const onsetScore = onsetAbs <= 200 ? 100 : onsetAbs <= 500 ? 75 : 50;

  return Math.round((durationScore + onsetScore) / 2);
}

/**
 * Compute melodic contour match: does the user's pitch curve go up and down
 * in roughly the same pattern as the original?
 */
export function computeContourMatch(
  userFrames: LivePitchFrame[],
  referenceFrames: LivePitchFrame[]
): number {
  const getContourDirection = (frames: LivePitchFrame[]): ('up' | 'down' | 'flat')[] => {
    const voiced = frames.filter(f => f.voiced && f.frequencyHz !== undefined);
    const directions: ('up' | 'down' | 'flat')[] = [];
    const segmentSize = Math.max(1, Math.floor(voiced.length / 8));

    for (let i = 0; i < voiced.length - segmentSize; i += segmentSize) {
      const start = voiced[i]?.frequencyHz ?? 0;
      const end = voiced[i + segmentSize]?.frequencyHz ?? 0;
      const diff = end - start;
      if (diff > 5) directions.push('up');
      else if (diff < -5) directions.push('down');
      else directions.push('flat');
    }
    return directions;
  };

  const userContour = getContourDirection(userFrames);
  const refContour = getContourDirection(referenceFrames);

  if (userContour.length === 0 || refContour.length === 0) return 50;

  const minLen = Math.min(userContour.length, refContour.length);
  let matches = 0;
  for (let i = 0; i < minLen; i++) {
    if (userContour[i] === refContour[i]) matches++;
  }

  return Math.round((matches / minLen) * 100);
}

// ------------------------------------------------------------
// SCORE AGGREGATION
// ------------------------------------------------------------

export function computeKaraokeScore(
  pitchSimilarity: number,
  timingAccuracy: number,
  contourMatch: number
): KaraokeAttemptScore {
  const overall = Math.round(
    pitchSimilarity * SCORE_WEIGHTS.pitchSimilarity +
    timingAccuracy  * SCORE_WEIGHTS.timingAccuracy +
    contourMatch    * SCORE_WEIGHTS.contourMatch
  );

  // Determine dominant failure mode
  let dominantFailureMode: KaraokeAttemptScore['dominantFailureMode'];
  if (pitchSimilarity < 60) {
    // Need to determine flat vs sharp — requires signed error data (passed separately)
    dominantFailureMode = 'pitch_flat'; // Placeholder; real implementation uses signed DTW
  } else if (timingAccuracy < 60) {
    dominantFailureMode = 'rushing';     // Placeholder; real implementation uses signed offset
  } else if (contourMatch < 60) {
    dominantFailureMode = 'wrong_contour';
  }

  return { pitchSimilarity, timingAccuracy, contourMatch, overall, dominantFailureMode };
}

// ------------------------------------------------------------
// SNIPPET COMPLETION CHECK
// ------------------------------------------------------------

export function isSnippetComplete(
  score: KaraokeAttemptScore,
  userLevel: number
): boolean {
  const threshold = userLevel >= 3
    ? KARAOKE_MATCH_THRESHOLDS.level_3_4
    : KARAOKE_MATCH_THRESHOLDS.level_1_2;
  return score.overall >= threshold;
}

// ------------------------------------------------------------
// KARAOKE COACHING
// ------------------------------------------------------------

export function mapKaraokeScoreToCoaching(
  score: KaraokeAttemptScore
): CoachingPayload {
  const band = scoreToBand(score.overall);

  const coachingByFailureMode: Record<
    NonNullable<KaraokeAttemptScore['dominantFailureMode']>,
    { correction: string; tip: string }
  > = {
    pitch_flat: {
      correction: 'You\'re hitting that passage a bit flat — support the note with more breath from underneath.',
      tip: 'Listen to the original one more time, then try again — pay attention to where it sits in your range.',
    },
    pitch_sharp: {
      correction: 'You\'re going sharp in places — relax the tension and let the note settle.',
      tip: 'Soften your approach. Don\'t push for the pitch — guide it.',
    },
    rushing: {
      correction: 'You\'re moving through the phrase a little fast — the original hangs on certain words longer.',
      tip: 'Listen for where the original breathes, and match that breath.',
    },
    dragging: {
      correction: 'The phrasing is dragging a little behind the track — try entering the phrase a beat earlier.',
      tip: 'Anticipate the phrase start instead of reacting to it.',
    },
    wrong_contour: {
      correction: 'The shape of the melody isn\'t quite matching — there\'s a curve in the middle you\'re missing.',
      tip: 'Hum the phrase first without any lyrics. Just follow the shape of it.',
    },
    pitch_instability: {
      correction: 'There\'s some wobble in the sustained parts. Steady breath = steady pitch.',
      tip: 'Think of the note as a thread you\'re pulling — keep the tension even.',
    },
  };

  const defaultCoaching = {
    correction: 'Good effort — keep listening to the original phrase and matching the feel of it.',
    tip: 'Try once more, this time focusing on the opening note.',
  };

  const { correction, tip } = score.dominantFailureMode
    ? coachingByFailureMode[score.dominantFailureMode]
    : defaultCoaching;

  const praiseByBand: Record<SuccessBand, string> = {
    excellent: 'That\'s it — sounding like you.',
    good:      'Really close. Getting there.',
    developing:'You\'re learning the phrase.',
    retry:     'It takes a few tries. Keep going.',
  };

  return {
    praiseMessage: praiseByBand[band],
    correctionMessage: correction,
    actionTip: tip,
    successBand: band,
  };
}

function scoreToBand(score: number): SuccessBand {
  if (score >= 85) return 'excellent';
  if (score >= 70) return 'good';
  if (score >= 50) return 'developing';
  return 'retry';
}

// ------------------------------------------------------------
// SNIPPET SELECTION
// ------------------------------------------------------------

/**
 * Select the next snippet to practice from a song's snippet list.
 * Uses an "easy win first" strategy for new users.
 */
export function selectNextSnippet(
  snippets: KaraokeSnippet[],
  snippetStatuses: Record<string, KaraokeSnippetStatus>,
  userLevel: number
): KaraokeSnippet | null {
  // Prefer active (in-progress) snippets first
  const active = snippets.find(s => snippetStatuses[s.snippetId] === 'active');
  if (active) return active;

  // Otherwise find the first unlocked snippet that isn't completed
  const available = snippets
    .filter(s =>
      snippetStatuses[s.snippetId] !== 'completed' &&
      snippetStatuses[s.snippetId] !== 'locked'
    )
    .sort((a, b) => {
      // For lower levels, sort by difficulty ASC (easiest first)
      // For higher levels, allow natural song order
      if (userLevel <= 2) return a.difficulty - b.difficulty;
      return a.orderInSong - b.orderInSong;
    });

  return available[0] ?? null;
}

/**
 * Determine which snippets should be unlocked given current progress.
 * Rule: the next 2 snippets after the last completed one are available.
 */
export function computeSnippetUnlocks(
  snippets: KaraokeSnippet[],
  currentStatuses: Record<string, KaraokeSnippetStatus>
): Record<string, KaraokeSnippetStatus> {
  const updated = { ...currentStatuses };
  const sorted = [...snippets].sort((a, b) => a.orderInSong - b.orderInSong);

  let lastCompletedIndex = -1;
  for (let i = 0; i < sorted.length; i++) {
    const s = sorted[i];
    if (s && currentStatuses[s.snippetId] === 'completed') {
      lastCompletedIndex = i;
    }
  }

  // Unlock the first 2 snippets after the last completed one
  const unlockUpTo = lastCompletedIndex + 2;
  for (let i = 0; i < sorted.length; i++) {
    const s = sorted[i];
    if (!s) continue;
    if (i <= unlockUpTo && updated[s.snippetId] === 'locked') {
      updated[s.snippetId] = 'active';
    }
  }

  // Always unlock the first snippet if nothing is unlocked yet
  const first = sorted[0];
  if (first && !updated[first.snippetId]) {
    updated[first.snippetId] = 'active';
  }

  return updated;
}
