export interface ExerciseDefinition {
  exerciseId: string;
  version: number;
  category: string;
  subcategory: string;
  title: string;
  description: string;
  userInstructionText: string;
  durationTargetSeconds: number;
  repetitionsDefault: number;
  targetPatternType: string;
  targetPatternPayload: Record<string, unknown>;
  evaluationConfig: Record<string, unknown>;
  scoringWeights: Record<string, number>;
  feedbackRuleSetId: string;
  activeFlag: boolean;
}

export const build01SustainedNoteExercise: ExerciseDefinition = {
  exerciseId: 'sustain-note-beginner-001',
  version: 1,
  category: 'stability',
  subcategory: 'sustained_hold',
  title: 'Hold the Note',
  description: 'Sustain a single target note as steadily as you can.',
  userInstructionText: 'Listen to the note, then hold it steadily until the timer ends.',
  durationTargetSeconds: 30,
  repetitionsDefault: 3,
  targetPatternType: 'sustained_hold',
  targetPatternPayload: {
    targetNote: 'A3',
    referenceToneDurationMs: 1500,
    sustainDurationMs: 3000
  },
  evaluationConfig: {
    centsTolerance: 25,
    minimumVoicedFrames: 20,
    sustainWindowMs: 3000,
    confidenceFloor: 70,
    allowDegradedScoring: true
  },
  scoringWeights: {
    pitchAccuracy: 0.45,
    stability: 0.45,
    completion: 0.1
  },
  feedbackRuleSetId: 'rules-sustain-note-v1',
  activeFlag: true
};
