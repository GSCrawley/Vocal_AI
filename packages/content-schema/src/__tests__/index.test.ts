import { ExerciseDefinitionSchema, build01SustainedNoteExercise } from '../index';
import { ExerciseDefinition } from '@voice/shared-types';

describe('ExerciseDefinitionSchema', () => {
  it('should validate a correct exercise definition', () => {
    expect(() => ExerciseDefinitionSchema.parse(build01SustainedNoteExercise)).not.toThrow();
  });

  it('should throw an error if scoring weights do not sum to 1.0', () => {
    const invalidExercise: ExerciseDefinition = {
      ...build01SustainedNoteExercise,
      scoringWeights: {
        pitchAccuracy: 0.5,
        stability: 0.5,
        onsetAccuracy: 0.1, // Sums to 1.1
      },
    };

    expect(() => ExerciseDefinitionSchema.parse(invalidExercise)).toThrow(
      'scoringWeights must sum to exactly 1.0'
    );
  });

  it('should allow scoring weights that sum to 1.0 within float tolerance', () => {
    const validExercise: ExerciseDefinition = {
      ...build01SustainedNoteExercise,
      scoringWeights: {
        pitchAccuracy: 0.3333,
        stability: 0.3333,
        onsetAccuracy: 0.3334, // Sums to 1.0
      },
    };

    expect(() => ExerciseDefinitionSchema.parse(validExercise)).not.toThrow();
  });
});
