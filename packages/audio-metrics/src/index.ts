// Re-export only explicitly selected audio-metrics types here.
// Avoid wildcard re-exports from @voice/shared-types to keep this package's
// public API limited to audio-metrics concerns.

import {
  LivePitchFrame,
  SingingExerciseScoreBreakdown,
  ExerciseMetricResult,
} from '@voice/shared-types';

export { LivePitchFrame, SingingExerciseScoreBreakdown, ExerciseMetricResult };

export function hzToCents(frequencyHz: number, referenceHz: number): number {
  if (frequencyHz <= 0 || referenceHz <= 0) return 0;
  return 1200 * Math.log2(frequencyHz / referenceHz);
}

export function centsToHz(cents: number, referenceHz: number): number {
  if (referenceHz <= 0) return 0;
  return referenceHz * Math.pow(2, cents / 1200);
}

export interface FrameEvaluation {
  centsFromTarget?: number;
  inTolerance: boolean;
  usable: boolean;
}

export function evaluateFrame(
  frameHz: number,
  targetHz: number,
  toleranceCents: number,
  confidence: number
): FrameEvaluation {
  const isUsable = confidence >= 0.5 && frameHz > 0;

  if (!isUsable) {
    return {
      inTolerance: false,
      usable: false,
    };
  }

  const centsError = hzToCents(frameHz, targetHz);
  const inTolerance = Math.abs(centsError) <= toleranceCents;

  return {
    centsFromTarget: centsError,
    inTolerance,
    usable: true,
  };
}

export interface MicCheckResult {
  ok: boolean;
  reason?: 'too_quiet' | 'clipping' | 'no_voice' | 'low_confidence';
}

export function micCheck(frames: LivePitchFrame[], rmsDbFrames: number[]): MicCheckResult {
  for (const db of rmsDbFrames) {
    if (db >= 0) {
      return { ok: false, reason: 'clipping' };
    }
  }

  let hasUsableFrames = false;
  for (const frame of frames) {
    if (frame.voiced && frame.confidence >= 0.5) {
      hasUsableFrames = true;
      break;
    }
  }

  if (!hasUsableFrames) {
    return { ok: false, reason: 'low_confidence' };
  }

  return { ok: true };
}

export interface FrameAccumulator {
  usableFrames: number;
  framesInToleranceCount: number;
  absoluteErrors: number[];
  errors: number[];
  firstUsableFrameIdx: number;
  lockIdx: number;
}

export function buildFrameAccumulator(
  frames: LivePitchFrame[],
  targetHz: number,
  toleranceCents: number,
  evaluateOnset: boolean = true
): FrameAccumulator {
  const acc: FrameAccumulator = {
    usableFrames: 0,
    framesInToleranceCount: 0,
    absoluteErrors: [],
    errors: [],
    firstUsableFrameIdx: -1,
    lockIdx: -1,
  };

  let continuousLockCount = 0;
  const REQUIRED_LOCK_FRAMES = 5;

  for (let i = 0; i < frames.length; i++) {
    const frame = frames[i];
    if (!frame.voiced || frame.confidence < 0.5 || !frame.frequencyHz) continue;

    // Pitch evaluation
    acc.usableFrames++;
    const centsError = hzToCents(frame.frequencyHz, targetHz);
    frame.centsFromTarget = centsError;
    const inTolerance = Math.abs(centsError) <= toleranceCents;

    if (inTolerance) {
      acc.framesInToleranceCount++;
    }

    acc.absoluteErrors.push(Math.abs(centsError));
    acc.errors.push(centsError);

    // Onset evaluation
    if (evaluateOnset) {
      if (acc.firstUsableFrameIdx === -1) acc.firstUsableFrameIdx = i;

      if (inTolerance) {
        continuousLockCount++;
        if (continuousLockCount >= REQUIRED_LOCK_FRAMES && acc.lockIdx === -1) {
          acc.lockIdx = i - REQUIRED_LOCK_FRAMES + 1;
        }
      } else {
        continuousLockCount = 0;
      }
    }
  }

  return acc;
}

export function scorePitchAccuracy(
  framesOrAcc: LivePitchFrame[] | FrameAccumulator,
  targetHz: number,
  toleranceCents: number
): number {
  let acc: FrameAccumulator;
  if (Array.isArray(framesOrAcc)) {
    acc = buildFrameAccumulator(framesOrAcc as LivePitchFrame[], targetHz, toleranceCents, false);
  } else {
    acc = framesOrAcc;
  }

  if (acc.usableFrames === 0) return 0;

  const timeInToleranceRatio = acc.framesInToleranceCount / acc.usableFrames;

  acc.absoluteErrors.sort((a, b) => a - b);
  const medianError = acc.absoluteErrors[Math.floor(acc.absoluteErrors.length / 2)];

  let errorScore = 100 - (medianError / (toleranceCents * 2)) * 100;
  if (errorScore < 0) errorScore = 0;
  if (errorScore > 100) errorScore = 100;

  return timeInToleranceRatio * 100 * 0.5 + errorScore * 0.5;
}

export function scoreStability(framesOrAcc: LivePitchFrame[] | FrameAccumulator): number {
  let errors: number[];

  if (Array.isArray(framesOrAcc)) {
    errors = [];
    for (const frame of framesOrAcc as LivePitchFrame[]) {
      if (!frame.voiced || frame.confidence < 0.5 || frame.centsFromTarget === undefined) continue;
      errors.push(frame.centsFromTarget);
    }
  } else {
    errors = framesOrAcc.errors;
  }

  if (errors.length < 2) return 0;

  const mean = errors.reduce((sum, val) => sum + val, 0) / errors.length;
  const variance = errors.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / errors.length;
  const stdDev = Math.sqrt(variance);

  let stabilityScore = 100 - (stdDev / 50) * 100;
  if (stabilityScore < 0) stabilityScore = 0;
  if (stabilityScore > 100) stabilityScore = 100;

  return stabilityScore;
}

export function scoreOnset(
  framesOrAcc: LivePitchFrame[] | FrameAccumulator,
  targetHz: number,
  toleranceCents: number
): number {
  let firstUsableFrameIdx = -1;
  let lockIdx = -1;

  if (Array.isArray(framesOrAcc)) {
    const acc = buildFrameAccumulator(
      framesOrAcc as LivePitchFrame[],
      targetHz,
      toleranceCents,
      true
    );
    firstUsableFrameIdx = acc.firstUsableFrameIdx;
    lockIdx = acc.lockIdx;
  } else {
    firstUsableFrameIdx = framesOrAcc.firstUsableFrameIdx;
    lockIdx = framesOrAcc.lockIdx;
  }

  if (firstUsableFrameIdx === -1 || lockIdx === -1) return 0;

  const framesToLock = lockIdx - firstUsableFrameIdx;
  let onsetScore = 100 - (framesToLock / 20) * 100;
  if (onsetScore < 0) onsetScore = 0;
  if (onsetScore > 100) onsetScore = 100;

  return onsetScore;
}

export function scoreSustainedNote(
  frames: LivePitchFrame[],
  targetHz: number,
  toleranceCents: number,
  scoringWeights: {
    pitch: number;
    stability: number;
    onset?: number;
    dynamics?: number;
    vibrato?: number;
  }
): SingingExerciseScoreBreakdown {
  const sumWeights = Object.values(scoringWeights).reduce((a, b) => a + (b || 0), 0);
  if (Math.abs(sumWeights - 1.0) > 0.001) {
    throw new Error('Scoring weights must sum to 1.0');
  }

  const evaluateOnset = scoringWeights.onset !== undefined && scoringWeights.onset > 0;
  const acc = buildFrameAccumulator(frames, targetHz, toleranceCents, evaluateOnset);

  const pitchAccuracy = scorePitchAccuracy(acc, targetHz, toleranceCents);
  const stability = scoreStability(acc);

  let overall = pitchAccuracy * scoringWeights.pitch + stability * scoringWeights.stability;

  let onsetAccuracy;
  if (scoringWeights.onset) {
    onsetAccuracy = scoreOnset(acc, targetHz, toleranceCents);
    overall += onsetAccuracy * scoringWeights.onset;
  }

  return {
    pitchAccuracy,
    stability,
    onsetAccuracy,
    overall,
  };
}
