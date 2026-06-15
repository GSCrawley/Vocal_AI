import { ExerciseDefinition } from '@voice/shared-types';

export const BUILD_01_EXERCISE: ExerciseDefinition = {
  exerciseId: 'sustain-note-beginner-001',
  version: 1,
  tier: 'singing',
  category: 'sustained_hold',
  subcategory: 'fundamental_pitch',
  title: 'Hold the Note',
  description: 'Practice holding a steady pitch for 5 seconds.',
  userInstructionText: 'Take a breath and hold A4 clearly and steadily.',
  durationTargetSeconds: 5,
  repetitionsDefault: 1,
  targetPatternType: 'sustained_hold',
  targetPatternPayload: {
    targetHz: 440, // A4
  },
  evaluationConfig: {
    toleranceCents: 50,
  },
  scoringWeights: {
    pitch: 0.6,
    stability: 0.4,
  },
  feedbackRuleSetId: 'sustained-note-rules-001',
  activeFlag: true,
};
