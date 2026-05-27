import {
  LivePitchFrame,
  SingingExerciseScoreBreakdown,
  ExerciseMetricResult,
  SustainedNoteTarget,
  ScoringWeights,
  SingingScore,
  MicCheckOpts,
} from '@voice/shared-types';

export { LivePitchFrame, SingingExerciseScoreBreakdown, ExerciseMetricResult };

export function hzToCents(hz: number, refHz: number): number {
  if (hz <= 0 || refHz <= 0 || isNaN(hz) || isNaN(refHz)) return NaN;
  return 1200 * Math.log2(hz / refHz);
}

export function centsToHz(cents: number, refHz: number): number {
  if (refHz <= 0 || isNaN(cents) || isNaN(refHz)) return NaN;
  return refHz * Math.pow(2, cents / 1200);
}

export interface MicCheckResult {
  status: 'ok' | 'too_quiet' | 'too_loud_clipping' | 'too_noisy' | 'insufficient_voiced_frames';
}

export function runMicCheck(frames: LivePitchFrame[], opts: MicCheckOpts = {}): MicCheckResult {
  const minRmsDb = opts.minRmsDb ?? -50;
  const maxRmsDb = opts.maxRmsDb ?? -1;
  const minVoicedRatio = opts.minVoicedRatio ?? 0.3;

  if (frames.length === 0) return { status: 'insufficient_voiced_frames' };

  let voicedCount = 0;
  let hasClipping = false;
  let hasTooQuiet = false;
  let hasHighNoiseFloor = false;

  for (const frame of frames) {
    if (frame.voiced && frame.confidence >= 0.5) voicedCount++;

    if (frame.rmsDb !== undefined) {
      if (frame.rmsDb > maxRmsDb) hasClipping = true;
      if (frame.rmsDb < minRmsDb) hasTooQuiet = true;
    }

    if (frame.noiseFloorDb !== undefined && frame.noiseFloorDb > -20) {
      hasHighNoiseFloor = true;
    }
  }

  if (hasHighNoiseFloor) return { status: 'too_noisy' };
  if (hasClipping) return { status: 'too_loud_clipping' };

  const voicedRatio = voicedCount / frames.length;
  if (hasTooQuiet) return { status: 'too_quiet' };
  if (voicedRatio < minVoicedRatio) {
    return { status: 'insufficient_voiced_frames' };
  }

  return { status: 'ok' };
}

export function scorePitchAccuracy(
  frames: LivePitchFrame[],
  targetHz: number,
  opts: { toleranceCents?: number } = {}
): number {
  const toleranceCents = opts.toleranceCents ?? 25;

  let usableFrames = 0;
  let framesInTolerance = 0;
  const absoluteErrors: number[] = [];

  for (const frame of frames) {
    if (!frame.voiced || frame.confidence < 0.5 || !frame.frequencyHz) continue;

    usableFrames++;
    const centsError = hzToCents(frame.frequencyHz, targetHz);
    if (isNaN(centsError)) continue;

    if (Math.abs(centsError) <= toleranceCents) {
      framesInTolerance++;
    }
    absoluteErrors.push(Math.abs(centsError));
  }

  if (usableFrames === 0) return 0;

  const timeInToleranceRatio = framesInTolerance / usableFrames;

  absoluteErrors.sort((a, b) => a - b);
  const medianError = absoluteErrors[Math.floor(absoluteErrors.length / 2)];

  let errorScore = 1 - medianError / (toleranceCents * 2);
  if (errorScore < 0) errorScore = 0;
  if (errorScore > 1) errorScore = 1;

  return timeInToleranceRatio * 0.5 + errorScore * 0.5;
}

export function scorePitchStability(frames: LivePitchFrame[]): number {
  const validHz: number[] = [];
  for (const frame of frames) {
    if (frame.voiced && frame.confidence >= 0.5 && frame.frequencyHz) {
      validHz.push(frame.frequencyHz);
    }
  }

  if (validHz.length < 2) return 0;

  const validHzSorted = [...validHz].sort((a, b) => a - b);
  const medianHz = validHzSorted[Math.floor(validHzSorted.length / 2)];

  let count = 0;
  let mean = 0;
  let m2 = 0;

  for (const hz of validHz) {
    const cents = hzToCents(hz, medianHz);
    if (isNaN(cents)) continue;
    count++;
    const delta = cents - mean;
    mean += delta / count;
    const delta2 = cents - mean;
    m2 += delta * delta2;
  }

  if (count < 2) return 0;

  const variance = m2 / count;
  const stdDev = Math.sqrt(Math.max(0, variance));

  // Mapping std_cents to a score: 1 - clamp(stdDev / 100, 0, 1)
  let stabilityScore = 1 - stdDev / 100;
  if (stabilityScore < 0) stabilityScore = 0;
  if (stabilityScore > 1) stabilityScore = 1;

  return stabilityScore;
}

export function scoreOnset(
  frames: LivePitchFrame[],
  targetHz: number,
  opts: { settleMs?: number; toleranceCents?: number } = {}
): number {
  const settleMs = opts.settleMs ?? 500;
  const toleranceCents = opts.toleranceCents ?? 50;

  let firstUsableTimestamp = -1;
  let lockedTimestamp = -1;
  let continuousLockCount = 0;
  const REQUIRED_LOCK_FRAMES = 5;

  let currentLockStartTimestamp = -1;

  for (let i = 0; i < frames.length; i++) {
    const frame = frames[i];
    if (!frame.voiced || frame.confidence < 0.5 || !frame.frequencyHz) continue;

    if (firstUsableTimestamp === -1) firstUsableTimestamp = frame.timestampMs;

    const centsError = hzToCents(frame.frequencyHz, targetHz);
    if (!isNaN(centsError) && Math.abs(centsError) <= toleranceCents) {
      if (continuousLockCount === 0) {
        currentLockStartTimestamp = frame.timestampMs;
      }
      continuousLockCount++;
      if (continuousLockCount >= REQUIRED_LOCK_FRAMES && lockedTimestamp === -1) {
        lockedTimestamp = currentLockStartTimestamp;
        break;
      }
    } else {
      continuousLockCount = 0;
    }
  }

  if (firstUsableTimestamp === -1 || lockedTimestamp === -1) return 0;

  const timeToLockMs = lockedTimestamp - firstUsableTimestamp;

  let onsetScore = 1 - timeToLockMs / settleMs;
  if (onsetScore < 0) onsetScore = 0;
  if (onsetScore > 1) onsetScore = 1;

  return onsetScore;
}

export function scoreCompletion(
  frames: LivePitchFrame[],
  targetDurationMs: number,
  targetHz: number,
  opts: { toleranceCents?: number } = {}
): number {
  if (targetDurationMs <= 0) return 0;

  // Assume frames are sorted by timestamp. The duration is simply the amount of time
  // covered by voiced frames, or we can just count the time delta of usable frames.
  // We'll calculate the total duration covered by valid frames. Let's assume each frame covers 10ms.
  const FRAME_DURATION_MS = 10;
  let voicedMs = 0;

  const toleranceCents = opts.toleranceCents ?? 50;
  for (const frame of frames) {
    if (frame.voiced && frame.confidence >= 0.5 && frame.frequencyHz) {
      const centsError = hzToCents(frame.frequencyHz, targetHz);
      if (!isNaN(centsError) && Math.abs(centsError) <= toleranceCents) {
        voicedMs += FRAME_DURATION_MS;
      }
    }
  }

  let completion = voicedMs / targetDurationMs;
  if (completion > 1) completion = 1;
  if (completion < 0) completion = 0;

  return completion;
}

const DEFAULT_WEIGHTS: ScoringWeights = {
  accuracy: 0.5,
  stability: 0.3,
  completion: 0.15,
  onset: 0.05,
};

export function computeSustainedNoteScore(
  frames: LivePitchFrame[],
  target: SustainedNoteTarget,
  weights: ScoringWeights = DEFAULT_WEIGHTS
): SingingScore {
  const sumWeights = weights.accuracy + weights.stability + weights.completion + weights.onset;
  if (Math.abs(sumWeights - 1.0) > 0.001) {
    throw new Error('Scoring weights must sum to 1.0');
  }

  const accuracy = scorePitchAccuracy(frames, target.frequencyHz, {
    toleranceCents: target.toleranceCents,
  });
  const stability = scorePitchStability(frames);
  const completion = scoreCompletion(frames, target.durationMs, target.frequencyHz, {
    toleranceCents: target.toleranceCents,
  });
  const onset = scoreOnset(frames, target.frequencyHz, { toleranceCents: target.toleranceCents });

  const overallScore =
    accuracy * weights.accuracy +
    stability * weights.stability +
    completion * weights.completion +
    onset * weights.onset;

  // Default to high confidence; this function assumes clean input, degradedScore is used otherwise
  return {
    overallScore,
    pitchAccuracy: accuracy,
    stability,
    completion,
    onset,
    confidence: 'high',
  };
}

export function degradedScore(reason: string): SingingScore {
  return {
    overallScore: 0,
    pitchAccuracy: 0,
    stability: 0,
    completion: 0,
    onset: 0,
    confidence: 'low',
    degradedReason: reason,
  };
}
