import { LivePitchFrame, ExerciseDefinition } from '@voice/shared-types';
import { micCheck, scoreSustainedNote, MicCheckResult, SingingExerciseScoreBreakdown } from '@voice/audio-metrics';

export function usePitchAnalysis() {
  const analyzeRecording = async (
    uri: string | null,
    rmsDbFrames: number[],
    exercise: ExerciseDefinition
  ): Promise<{
    micCheckOk: MicCheckResult;
    score: SingingExerciseScoreBreakdown | null;
  }> => {
    if (!uri) {
      return { micCheckOk: { ok: false, reason: 'no_voice' }, score: null };
    }

    // TODO: replace with pYIN pitch extraction once available.
    // For Build 0.1, we derive mock LivePitchFrame[] from the RMS volume metering data
    // to feed the scoring function, which will return 0 for pitch accuracy (honest default).
    const frames: LivePitchFrame[] = rmsDbFrames.map((db, index) => {
      // Assuming db is negative usually, if db > -30 we treat as voiced
      const voiced = db > -30;
      return {
        timestampMs: index * 100, // based on 100ms interval in useRecording
        voiced,
        confidence: voiced ? 0.8 : 0.1,
        frequencyHz: undefined, // No pitch extracted yet
      };
    });

    const checkResult = micCheck(frames, rmsDbFrames);

    if (!checkResult.ok) {
        return { micCheckOk: checkResult, score: null };
    }

    const targetHz = exercise.targetPatternPayload.targetHz as number;
    const toleranceCents = exercise.evaluationConfig.toleranceCents as number;

    const score = scoreSustainedNote(
      frames,
      targetHz,
      toleranceCents,
      {
        pitch: exercise.scoringWeights.pitch,
        stability: exercise.scoringWeights.stability
      }
    );

    return { micCheckOk: checkResult, score };
  };

  return { analyzeRecording };
}
