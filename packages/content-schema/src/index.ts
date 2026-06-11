import { z } from 'zod';
import {
  ExerciseDefinition,
  EXERCISE_CATEGORIES,
  TARGET_PATTERN_TYPES,
  SINGING_STYLE_PACKS,
} from '@voice/shared-types';

export const ExerciseDefinitionSchema = z
  .object({
    exerciseId: z.string(),
    version: z.number().int().positive(),
    tier: z.enum(['speaking', 'singing'] as const),
    category: z.enum(EXERCISE_CATEGORIES),
    subcategory: z.string(),
    title: z.string(),
    description: z.string(),
    userInstructionText: z.string(),
    durationTargetSeconds: z.number().positive(),
    repetitionsDefault: z.number().int().positive(),
    targetPatternType: z.enum(TARGET_PATTERN_TYPES),
    targetPatternPayload: z.record(z.string(), z.unknown()),
    evaluationConfig: z.record(z.string(), z.unknown()),
    scoringWeights: z.record(z.string(), z.number()),
    feedbackRuleSetId: z.string(),
    prerequisiteExerciseIds: z.array(z.string()).optional(),
    minimumLevelRequired: z.number().int().positive().optional(),
    stylePack: z.enum(SINGING_STYLE_PACKS).optional(),
    activeFlag: z.boolean(),
  })
  .superRefine((data, ctx) => {
    const weights = data.scoringWeights as Record<string, number>;
    const sum = Object.values(weights).reduce((acc, weight) => acc + weight, 0);
    if (Math.abs(sum - 1.0) > 0.0001) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `scoringWeights must sum to exactly 1.0 (with a small float tolerance). Current sum: ${sum}`,
        path: ['scoringWeights'],
      });
    }
  });

export const build01SustainedNoteExercise: ExerciseDefinition = {
  exerciseId: 'sustain-note-beginner-001',
  version: 1,
  tier: 'singing',
  category: 'sustained_hold',
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
    sustainDurationMs: 3000,
  },
  evaluationConfig: {
    centsTolerance: 25,
    minimumVoicedFrames: 20,
    sustainWindowMs: 3000,
    confidenceFloor: 70,
    allowDegradedScoring: true,
  },
  scoringWeights: {
    pitchAccuracy: 0.45,
    stability: 0.45,
    onsetAccuracy: 0.1,
  },
  feedbackRuleSetId: 'rules-sustain-note-v1',
  activeFlag: true,
};

// Expose validation explicitly so importing this module remains side-effect-free.
// Tests or build-time scripts can call this to validate static exercise definitions.
export function validateExerciseDefinition(
  exerciseDefinition: ExerciseDefinition
): ExerciseDefinition {
  return ExerciseDefinitionSchema.parse(exerciseDefinition) as ExerciseDefinition;
}
