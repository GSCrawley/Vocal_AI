import type { ExerciseDefinition } from '@voice/shared-types';
import { meetsPrerequisites, selectNextExercise, buildSessionPlan } from './index';

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

describe('buildSessionPlan', () => {
  it('generates correct warm-up exercises for speaking tier', () => {
    const available: ExerciseDefinition[] = [];
    const plan = buildSessionPlan('speaking', 1, 'pace', available, []);
    expect(plan.warmUpExerciseIds).toEqual(['breathing-diaphragm-001', 'resonance-hum-001']);
  });

  it('generates correct warm-up exercises for singing tier level 1', () => {
    const available: ExerciseDefinition[] = [];
    const plan = buildSessionPlan('singing', 1, 'pitch', available, []);
    expect(plan.warmUpExerciseIds).toEqual(['breathing-diaphragm-001', 'reference-tone-match-001']);
  });

  it('generates correct warm-up exercises for singing tier level > 1', () => {
    const available: ExerciseDefinition[] = [];
    const plan = buildSessionPlan('singing', 2, 'pitch', available, []);
    expect(plan.warmUpExerciseIds).toEqual([
      'breathing-diaphragm-001',
      'sustain-note-beginner-001',
    ]);
  });

  it('filters core exercises by tier, activeFlag, and minimumLevelRequired, limiting to 3', () => {
    const available = [
      makeExercise({
        exerciseId: 'ex1',
        tier: 'singing',
        minimumLevelRequired: 1,
        activeFlag: true,
      }),
      makeExercise({
        exerciseId: 'ex2',
        tier: 'singing',
        minimumLevelRequired: 2,
        activeFlag: true,
      }),
      makeExercise({
        exerciseId: 'ex3',
        tier: 'singing',
        minimumLevelRequired: 3,
        activeFlag: true,
      }), // Excluded due to level
      makeExercise({
        exerciseId: 'ex4',
        tier: 'speaking',
        minimumLevelRequired: 1,
        activeFlag: true,
      }), // Excluded due to tier
      makeExercise({
        exerciseId: 'ex5',
        tier: 'singing',
        minimumLevelRequired: 1,
        activeFlag: false,
      }), // Excluded due to activeFlag
      makeExercise({
        exerciseId: 'ex6',
        tier: 'singing',
        minimumLevelRequired: 1,
        activeFlag: true,
      }),
      makeExercise({
        exerciseId: 'ex7',
        tier: 'singing',
        minimumLevelRequired: 1,
        activeFlag: true,
      }), // Excluded due to limit 3
    ];

    const plan = buildSessionPlan('singing', 2, 'pitch', available, []);
    expect(plan.coreExerciseIds).toEqual(['ex1', 'ex2', 'ex6']);
  });

  it('sorts core exercises to prefer uncompleted ones', () => {
    const available = [
      makeExercise({ exerciseId: 'ex1', tier: 'singing', activeFlag: true }),
      makeExercise({ exerciseId: 'ex2', tier: 'singing', activeFlag: true }),
      makeExercise({ exerciseId: 'ex3', tier: 'singing', activeFlag: true }),
      makeExercise({ exerciseId: 'ex4', tier: 'singing', activeFlag: true }),
    ];

    const completed = ['ex1', 'ex2'];
    const plan = buildSessionPlan('singing', 2, 'pitch', available, completed);

    // Should pick ex3 and ex4 first, then one of ex1/ex2 to fill to 3
    expect(plan.coreExerciseIds.length).toBe(3);
    expect(plan.coreExerciseIds.slice(0, 2)).toEqual(expect.arrayContaining(['ex3', 'ex4']));
    expect(['ex1', 'ex2']).toContain(plan.coreExerciseIds[2]);
  });

  it('calculates estimatedDurationMinutes correctly', () => {
    // 2 warmups (2*2 = 4) + 3 cores (3*5 = 15) = 19
    const available = [
      makeExercise({ exerciseId: 'ex1', tier: 'speaking', activeFlag: true }),
      makeExercise({ exerciseId: 'ex2', tier: 'speaking', activeFlag: true }),
      makeExercise({ exerciseId: 'ex3', tier: 'speaking', activeFlag: true }),
    ];

    const plan = buildSessionPlan('speaking', 1, 'pace', available, []);
    expect(plan.estimatedDurationMinutes).toBe(19);
  });
});
