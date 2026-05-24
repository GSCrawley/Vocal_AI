import { ExerciseDefinition } from '@voice/shared-types';

export const BUILD_01_EXERCISE: ExerciseDefinition = {
  exerciseId: 'sustain-note-beginner-001',
  version: 1,
  tier: 'singing',
  category: 'pitch_matching',
  subcategory: 'sustained',
  title: 'Sustain A4',
  description: 'Hold the note A4 for 5 seconds.',
  userInstructionText: 'Take a deep breath and hold the note A4 steadily.',
  durationTargetSeconds: 5,
  repetitionsDefault: 1,
  targetPatternType: 'sustained_hold',
  targetPatternPayload: { targetHz: 440 },
  evaluationConfig: { toleranceCents: 50 },
  scoringWeights: { pitch: 0.6, stability: 0.4 },
  feedbackRuleSetId: 'sustained_note_default',
  activeFlag: true
};
