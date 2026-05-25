// Re-export only explicitly selected audio-metrics types here.
// Avoid wildcard re-exports from @voice/shared-types to keep this package's
// public API limited to audio-metrics concerns.

import {
  LivePitchFrame,
  SingingExerciseScoreBreakdown,
  ExerciseMetricResult
} from '@voice/shared-types';

export {
  LivePitchFrame,
  SingingExerciseScoreBreakdown,
  ExerciseMetricResult
};

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
      usable: false
    };
  }

  const centsError = hzToCents(frameHz, targetHz);
  const inTolerance = Math.abs(centsError) <= toleranceCents;

  return {
    centsFromTarget: centsError,
    inTolerance,
    usable: true
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

export function scorePitchAccuracy(frames: LivePitchFrame[], targetHz: number, toleranceCents: number): number {
  let usableFrames = 0;
  let framesInTolerance = 0;
  const absoluteErrors: number[] = [];

  for (const frame of frames) {
    if (!frame.voiced || frame.confidence < 0.5 || !frame.frequencyHz) continue;
    
    usableFrames++;
    const evaluation = evaluateFrame(frame.frequencyHz, targetHz, toleranceCents, frame.confidence);
    
    if (evaluation.inTolerance) {
      framesInTolerance++;
    }
    if (evaluation.centsFromTarget !== undefined) {
      absoluteErrors.push(Math.abs(evaluation.centsFromTarget));
    }
  }

  if (usableFrames === 0) return 0;

  const timeInToleranceRatio = framesInTolerance / usableFrames;

  absoluteErrors.sort((a, b) => a - b);
  const medianError = absoluteErrors[Math.floor(absoluteErrors.length / 2)];

  let errorScore = 100 - (medianError / (toleranceCents * 2)) * 100;
  if (errorScore < 0) errorScore = 0;
  if (errorScore > 100) errorScore = 100;

  return (timeInToleranceRatio * 100 * 0.5) + (errorScore * 0.5);
}

export function scoreStability(frames: LivePitchFrame[]): number {
  let count = 0;
  let mean = 0;
  let m2 = 0;
  
  for (let i = 0; i < frames.length; i++) {
    const frame = frames[i];
    if (!frame.voiced || frame.confidence < 0.5 || frame.centsFromTarget === undefined) continue;

    const val = frame.centsFromTarget;
    count++;
    const delta = val - mean;
    mean += delta / count;
    const delta2 = val - mean;
    m2 += delta * delta2;
  }

  if (count < 2) return 0;

  const variance = m2 / count; // population variance
  const stdDev = Math.sqrt(Math.max(0, variance));

  let stabilityScore = 100 - (stdDev / 50) * 100;
  if (stabilityScore < 0) stabilityScore = 0;
  if (stabilityScore > 100) stabilityScore = 100;

  return stabilityScore;
}

export function scoreOnset(frames: LivePitchFrame[], targetHz: number, toleranceCents: number): number {
  let firstUsableFrameIdx = -1;
  let lockIdx = -1;
  let continuousLockCount = 0;
  const REQUIRED_LOCK_FRAMES = 5;

  for (let i = 0; i < frames.length; i++) {
    const frame = frames[i];
    if (!frame.voiced || frame.confidence < 0.5 || !frame.frequencyHz) continue;
    
    if (firstUsableFrameIdx === -1) firstUsableFrameIdx = i;

    const evaluation = evaluateFrame(frame.frequencyHz, targetHz, toleranceCents, frame.confidence);
    if (evaluation.inTolerance) {
      continuousLockCount++;
      if (continuousLockCount >= REQUIRED_LOCK_FRAMES && lockIdx === -1) {
        lockIdx = i - REQUIRED_LOCK_FRAMES + 1;
        break;
      }
    } else {
      continuousLockCount = 0;
    }
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
  scoringWeights: { pitch: number; stability: number; onset?: number; dynamics?: number; vibrato?: number }
): SingingExerciseScoreBreakdown {
  
  const sumWeights = Object.values(scoringWeights).reduce((a, b) => a + (b || 0), 0);
  if (Math.abs(sumWeights - 1.0) > 0.001) {
    throw new Error('Scoring weights must sum to 1.0');
  }

  const enrichedFrames: LivePitchFrame[] = frames.map(frame => {
    if (frame.frequencyHz && frame.voiced && frame.confidence >= 0.5) {
      return { ...frame, centsFromTarget: hzToCents(frame.frequencyHz, targetHz) };
    }
    return frame;
  });

  const pitchAccuracy = scorePitchAccuracy(enrichedFrames, targetHz, toleranceCents);
  const stability = scoreStability(enrichedFrames);
  
  let overall = (pitchAccuracy * scoringWeights.pitch) + (stability * scoringWeights.stability);

  let onsetAccuracy;
  if (scoringWeights.onset) {
      onsetAccuracy = scoreOnset(enrichedFrames, targetHz, toleranceCents);
      overall += (onsetAccuracy * scoringWeights.onset);
  }

  return {
    pitchAccuracy,
    stability,
    onsetAccuracy,
    overall
  };
}
