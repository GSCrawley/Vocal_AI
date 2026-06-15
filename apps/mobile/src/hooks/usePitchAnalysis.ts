import { ExerciseDefinition, LivePitchFrame } from '@voice/shared-types';
import { micCheck, scoreSustainedNote } from '@voice/audio-metrics';

export function usePitchAnalysis() {
  const analyzeRecording = async (
    uri: string | null,
    rmsDbFrames: number[],
    exercise: ExerciseDefinition
  ) => {
    // Build 0.1: Derive fake LivePitchFrames from RMS data
    // TODO: replace with pYIN pitch extraction
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

    const targetHz = (exercise.targetPatternPayload as any).targetHz as number;
    const tolerance = exercise.evaluationConfig.toleranceCents as number;

    const scoreBreakdown = scoreSustainedNote(
      frames,
      targetHz,
      tolerance,
      { pitch: exercise.scoringWeights.pitch || 0.5, stability: exercise.scoringWeights.stability || 0.5 }
    );

    return {
      ok: true,
      reason: undefined,
      scoreBreakdown,
      frames,
    };
  };

  return { analyzeRecording };
}
