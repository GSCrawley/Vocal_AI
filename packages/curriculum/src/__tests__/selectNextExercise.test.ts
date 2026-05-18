import { selectNextExercise } from '../index';
import { ExerciseDefinition, SpeakingGoal, SingingGoal, CurriculumLevel } from '@voice/shared-types';

describe('selectNextExercise', () => {
  const createMockExercise = (overrides: Partial<ExerciseDefinition>): ExerciseDefinition => ({
    exerciseId: 'default-ex',
    version: 1,
    tier: 'speaking',
    category: 'breathing',
    subcategory: 'basic',
    title: 'Default Exercise',
    description: 'Default Description',
    userInstructionText: 'Do the thing',
    durationTargetSeconds: 60,
    repetitionsDefault: 1,
    targetPatternType: 'passage_read',
    targetPatternPayload: {},
    evaluationConfig: {},
    scoringWeights: {},
    feedbackRuleSetId: 'default-rules',
    activeFlag: true,
    minimumLevelRequired: 1,
    ...overrides,
  });

  const level1: CurriculumLevel = 1;
  const level2: CurriculumLevel = 2;

  it('filters out inactive exercises', () => {
    const exercises = [
      createMockExercise({ exerciseId: 'ex1', activeFlag: false }),
      createMockExercise({ exerciseId: 'ex2', activeFlag: true }),
    ];
    const result = selectNextExercise(exercises, [], level1, 'pace', 1);
    expect(result?.exerciseId).toBe('ex2');
  });

  it('filters out exercises requiring a higher level', () => {
    const exercises = [
      createMockExercise({ exerciseId: 'ex1', minimumLevelRequired: 2 }),
      createMockExercise({ exerciseId: 'ex2', minimumLevelRequired: 1 }),
    ];
    const result = selectNextExercise(exercises, [], level1, 'pace', 1);
    expect(result?.exerciseId).toBe('ex2');
  });

  it('prioritizes uncompleted goal-matching exercises for the first session of the day', () => {
    const exercises = [
      createMockExercise({ exerciseId: 'ex1', category: 'breathing' }),
      createMockExercise({ exerciseId: 'ex2', category: 'pace_control' }), // matches 'pace' goal
    ];
    const result = selectNextExercise(exercises, [], level1, 'pace', 0);
    expect(result?.exerciseId).toBe('ex2');
  });

  it('falls back to the first uncompleted eligible exercise if no goal match is found (first session)', () => {
    const exercises = [
      createMockExercise({ exerciseId: 'ex1', category: 'breathing' }),
      createMockExercise({ exerciseId: 'ex2', category: 'articulation' }),
    ];
    const result = selectNextExercise(exercises, [], level1, 'pace', 0);
    expect(result?.exerciseId).toBe('ex1');
  });

  it('selects the first uncompleted eligible exercise for subsequent sessions (>0)', () => {
    const exercises = [
      createMockExercise({ exerciseId: 'ex1', category: 'breathing' }),
      createMockExercise({ exerciseId: 'ex2', category: 'pace_control' }), // matches goal but sessionCount > 0
    ];
    const result = selectNextExercise(exercises, [], level1, 'pace', 1);
    expect(result?.exerciseId).toBe('ex1'); // Should pick the first uncompleted one, which is ex1
  });

  it('does not select a completed exercise if there are uncompleted ones', () => {
    const exercises = [
      createMockExercise({ exerciseId: 'ex1', category: 'pace_control' }),
      createMockExercise({ exerciseId: 'ex2', category: 'breathing' }),
    ];
    const result = selectNextExercise(exercises, ['ex1'], level1, 'pace', 0);
    expect(result?.exerciseId).toBe('ex2'); // ex1 is completed, so it skips it despite matching goal
  });

  it('falls back to replay the first eligible exercise if all are completed', () => {
    const exercises = [
      createMockExercise({ exerciseId: 'ex1', category: 'pace_control' }),
      createMockExercise({ exerciseId: 'ex2', category: 'breathing' }),
    ];
    const result = selectNextExercise(exercises, ['ex1', 'ex2'], level1, 'pace', 0);
    expect(result?.exerciseId).toBe('ex1');
  });

  it('returns null if no exercises are eligible', () => {
    const exercises = [
      createMockExercise({ exerciseId: 'ex1', activeFlag: false }),
      createMockExercise({ exerciseId: 'ex2', minimumLevelRequired: 2 }),
    ];
    const result = selectNextExercise(exercises, [], level1, 'pace', 0);
    expect(result).toBeNull();
  });
});
