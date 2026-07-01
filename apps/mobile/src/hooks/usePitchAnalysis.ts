import { ExerciseDefinition, LivePitchFrame } from '@voice/shared-types';
import { micCheck, scoreSustainedNote } from '@voice/audio-metrics';

export function usePitchAnalysis() {
  const analyzeRecording = async (
    _uri: string | null,
    rmsDbFrames: number[],
    exercise: ExerciseDefinition
  ) => {
    /**
     * @alpha PARKED FOR PHASE 2 - Native pYIN pitch extraction is currently parked
     * as it requires complex algorithms or native modules.
     * Build 0.1: Deriving placeholder LivePitchFrames directly from RMS data.
     */
    const frames: LivePitchFrame[] = rmsDbFrames.map((db, index) => {
      const voiced = db > -40; // simple threshold
      return {
        timestampMs: index * 100,
        frequencyHz: undefined, // Honest: we don't have pitch yet
        centsFromTarget: undefined,
        voiced,
        confidence: voiced ? 0.8 : 0.1,
      };
    });

    const micStatus = micCheck(frames, rmsDbFrames);

    if (!micStatus.ok) {
      return { ok: false, reason: micStatus.reason, scoreBreakdown: null, frames: [] };
    }

    const targetHzRaw = (exercise.targetPatternPayload as Record<string, unknown>)['targetHz'];
    const toleranceRaw = (exercise.evaluationConfig as Record<string, unknown>)['toleranceCents'];
    if (typeof targetHzRaw !== 'number' || typeof toleranceRaw !== 'number') {
      return { ok: false, reason: 'invalid_exercise_config', scoreBreakdown: null, frames: [] };
    }
    const targetHz = targetHzRaw;
    const tolerance = toleranceRaw;

    const scoreBreakdown = scoreSustainedNote(frames, targetHz, tolerance, {
      pitch: exercise.scoringWeights.pitch || 0.5,
      stability: exercise.scoringWeights.stability || 0.5,
    });

    return {
      ok: true,
      reason: undefined,
      scoreBreakdown,
      frames,
    };
  };

  return { analyzeRecording };
}
