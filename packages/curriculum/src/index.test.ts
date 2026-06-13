import type { ExerciseDefinition } from '@voice/shared-types';
import { meetsPrerequisites, selectNextExercise } from './index';

function makeExercise(overrides: Partial<ExerciseDefinition> = {}): ExerciseDefinition {
  return {
    exerciseId: 'ex-1',
    version: 1,
    tier: 'speaking',
    category: 'pace_control',
    subcategory: 'test',
    title: 'Test',
    description: 'Test',
    userInstructionText: 'Do it',
    durationTargetSeconds: 60,
    repetitionsDefault: 1,
    targetPatternType: 'free_speech',
    targetPatternPayload: {},
    evaluationConfig: {},
    scoringWeights: {},
    feedbackRuleSetId: 'rules',
    activeFlag: true,
    ...overrides,
  };
}

describe('curriculum', () => {
  it('meetsPrerequisites returns true only when all prerequisites are completed', () => {
    const ex = makeExercise({ prerequisiteExerciseIds: ['a', 'b'] });
    expect(meetsPrerequisites(ex, ['a', 'b', 'c'], 1)).toBe(true);
    expect(meetsPrerequisites(ex, ['a'], 1)).toBe(false);
  });

  it('meetsPrerequisites returns false when userLevel is below minimumLevelRequired', () => {
    const ex = makeExercise({ minimumLevelRequired: 3 });
    expect(meetsPrerequisites(ex, [], 2)).toBe(false);
  });

  it('meetsPrerequisites returns true when userLevel meets or exceeds minimumLevelRequired', () => {
    const ex = makeExercise({ minimumLevelRequired: 3 });
    expect(meetsPrerequisites(ex, [], 3)).toBe(true);
    expect(meetsPrerequisites(ex, [], 4)).toBe(true);
  });

  it('meetsPrerequisites returns true when neither minimumLevelRequired nor prerequisiteExerciseIds are provided', () => {
    const ex = makeExercise({
      minimumLevelRequired: undefined,
      prerequisiteExerciseIds: undefined,
    });
    expect(meetsPrerequisites(ex, [], 1)).toBe(true);
  });

  it('meetsPrerequisites returns false when userLevel meets minimumLevelRequired but prerequisites are not completed', () => {
    const ex = makeExercise({ minimumLevelRequired: 2, prerequisiteExerciseIds: ['a', 'b'] });
    expect(meetsPrerequisites(ex, ['a'], 2)).toBe(false);
    expect(meetsPrerequisites(ex, ['a'], 3)).toBe(false);
  });

  it('meetsPrerequisites returns false when completedExerciseIds is an empty array but prerequisites exist', () => {
    const ex = makeExercise({ prerequisiteExerciseIds: ['a'] });
    expect(meetsPrerequisites(ex, [], 1)).toBe(false);
  });

  it('selectNextExercise prefers an uncompleted primary-goal match for the first session', () => {
    const available = [
      makeExercise({ exerciseId: 'done', category: 'pace_control' }),
      makeExercise({ exerciseId: 'next', category: 'pace_control' }),
    ];

    const result = selectNextExercise(available, ['done'], 1, 'pace', 0);
    expect(result?.exerciseId).toBe('next');
  });
});
