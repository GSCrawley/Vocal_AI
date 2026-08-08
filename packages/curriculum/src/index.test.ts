import type { ExerciseDefinition } from '@voice/shared-types';
import { meetsPrerequisites, selectNextExercise, determineLevel } from './index';

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
  describe('determineLevel', () => {
    describe('speaking tier', () => {
      // thresholds: 1: 10, 2: 20, 3: 30, 4: Infinity
      // Level 1: < 10
      // Level 2: < 30 (10+20)
      // Level 3: < 60 (10+20+30)
      // Level 4: >= 60
      it.each([
        [0, 1],
        [9, 1],
        [10, 2],
        [29, 2],
        [30, 3],
        [59, 3],
        [60, 4],
        [100, 4],
      ])('completedSessions=%i returns level %i', (completedSessions, expectedLevel) => {
        expect(determineLevel('speaking', completedSessions)).toBe(expectedLevel);
      });
    });

    describe('singing tier', () => {
      // thresholds: 1: 15, 2: 25, 3: 40, 4: Infinity
      // Level 1: < 15
      // Level 2: < 40 (15+25)
      // Level 3: < 80 (15+25+40)
      // Level 4: >= 80
      it.each([
        [0, 1],
        [14, 1],
        [15, 2],
        [39, 2],
        [40, 3],
        [79, 3],
        [80, 4],
        [100, 4],
      ])('completedSessions=%i returns level %i', (completedSessions, expectedLevel) => {
        expect(determineLevel('singing', completedSessions)).toBe(expectedLevel);
      });
    });
  });

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
