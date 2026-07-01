import {
  ExerciseDefinitionSchema,
  build01SustainedNoteExercise,
  validateExerciseDefinition,
} from '../index';
import { ExerciseDefinition } from '@voice/shared-types';
import { ZodError } from 'zod';

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

describe('validateExerciseDefinition', () => {
  it('should validate and return the object when optional fields are populated correctly', () => {
    const validExerciseWithOptionals: ExerciseDefinition = {
      ...build01SustainedNoteExercise,
      prerequisiteExerciseIds: ['some-other-exercise-001'],
      minimumLevelRequired: 5,
      stylePack: 'pop',
    };

    const result = validateExerciseDefinition(validExerciseWithOptionals);
    expect(result).toEqual(validExerciseWithOptionals);
  });

  it('should throw an error when a required field is missing', () => {
    const invalidExercise = {
      ...build01SustainedNoteExercise,
    } as unknown as Record<string, unknown>;
    delete invalidExercise.exerciseId;

    try {
      validateExerciseDefinition(invalidExercise as unknown as ExerciseDefinition);
      fail('Expected validateExerciseDefinition to throw a ZodError');
    } catch (e) {
      expect(e).toBeInstanceOf(ZodError);
      if (e instanceof ZodError) {
        expect(e.issues.some((issue) => issue.path.includes('exerciseId'))).toBe(true);
      }
    }
  });

  it('should throw an error when a property has an invalid enum type', () => {
    const invalidExercise = {
      ...build01SustainedNoteExercise,
      tier: 'invalid_tier' as unknown as ExerciseDefinition['tier'],
    };

    try {
      validateExerciseDefinition(invalidExercise as unknown as ExerciseDefinition);
      fail('Expected validateExerciseDefinition to throw a ZodError');
    } catch (e) {
      expect(e).toBeInstanceOf(ZodError);
      if (e instanceof ZodError) {
        expect(e.issues.some((issue) => issue.path.includes('tier'))).toBe(true);
      }
    }
  });

  it('should throw an error on invalid numerical boundaries', () => {
    const invalidExercise = {
      ...build01SustainedNoteExercise,
      durationTargetSeconds: -10,
    };

    try {
      validateExerciseDefinition(invalidExercise as unknown as ExerciseDefinition);
      fail('Expected validateExerciseDefinition to throw a ZodError');
    } catch (e) {
      expect(e).toBeInstanceOf(ZodError);
      if (e instanceof ZodError) {
        expect(e.issues.some((issue) => issue.path.includes('durationTargetSeconds'))).toBe(true);
      }
    }
  });

  it('should throw an error when provided incorrect runtime types like null', () => {
    expect(() => validateExerciseDefinition(null as unknown as ExerciseDefinition)).toThrow(
      ZodError
    );
  });

  it('should throw an error when provided incorrect runtime types like undefined', () => {
    expect(() => validateExerciseDefinition(undefined as unknown as ExerciseDefinition)).toThrow(
      ZodError
    );
  });

  it('should throw an error when provided incorrect runtime types like a string', () => {
    expect(() => validateExerciseDefinition('a string' as unknown as ExerciseDefinition)).toThrow(
      ZodError
    );
  });
});
