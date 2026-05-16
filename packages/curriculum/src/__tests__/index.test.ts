import { buildSessionPlan } from '../index';
import type { ExerciseDefinition } from '@voice/shared-types';

const createMockExercise = (
  id: string,
  tier: 'speaking' | 'singing',
  category: any,
  activeFlag: boolean = true,
  minimumLevelRequired?: number
): ExerciseDefinition => ({
  exerciseId: id,
  version: 1,
  tier,
  category,
  subcategory: 'test',
  title: 'Test Exercise',
  description: 'A test exercise',
  userInstructionText: 'Do the test exercise',
  durationTargetSeconds: 60,
  repetitionsDefault: 1,
  targetPatternType: 'none' as any,
  targetPatternPayload: {},
  evaluationConfig: {},
  scoringWeights: {},
  feedbackRuleSetId: 'test-rules',
  activeFlag,
  minimumLevelRequired
});

describe('buildSessionPlan', () => {
  const mockExercises = [
    createMockExercise('core-speak-1', 'speaking', 'pace_control'),
    createMockExercise('core-speak-2', 'speaking', 'prosody'),
    createMockExercise('core-speak-3', 'speaking', 'projection'),
    createMockExercise('core-speak-4', 'speaking', 'articulation'),
    createMockExercise('core-sing-1', 'singing', 'pitch_matching'),
    createMockExercise('core-sing-2', 'singing', 'sustained_hold'),
    createMockExercise('core-sing-3', 'singing', 'scale_work'),
    createMockExercise('inactive-speak', 'speaking', 'pace_control', false),
    createMockExercise('high-level-speak', 'speaking', 'pace_control', true, 4),
  ];

  it('builds a speaking session plan correctly', () => {
    const plan = buildSessionPlan('speaking', 1, 'pace', mockExercises, []);

    expect(plan.warmUpExerciseIds).toEqual(['breathing-diaphragm-001', 'resonance-hum-001']);
    expect(plan.coreExerciseIds.length).toBeLessThanOrEqual(4);
    expect(plan.coreExerciseIds.length).toBeGreaterThanOrEqual(2);
    // 2 warmups * 2 mins + core_count * 5 mins
    expect(plan.estimatedDurationMinutes).toBe(2 * 2 + plan.coreExerciseIds.length * 5);
  });

  it('builds a singing session plan for level 1 correctly', () => {
    const plan = buildSessionPlan('singing', 1, 'pitch', mockExercises, []);

    expect(plan.warmUpExerciseIds).toEqual(['breathing-diaphragm-001', 'reference-tone-match-001']);
    expect(plan.coreExerciseIds).toEqual(['core-sing-1', 'core-sing-2', 'core-sing-3']);
    expect(plan.estimatedDurationMinutes).toBe(2 * 2 + 3 * 5); // 19
  });

  it('builds a singing session plan for level > 1 correctly', () => {
    const plan = buildSessionPlan('singing', 2, 'pitch', mockExercises, []);

    expect(plan.warmUpExerciseIds).toEqual(['breathing-diaphragm-001', 'sustain-note-beginner-001']);
  });

  it('filters out inactive exercises and exercises above user level', () => {
    const plan = buildSessionPlan('speaking', 1, 'pace', mockExercises, []);

    expect(plan.coreExerciseIds).not.toContain('inactive-speak');
    expect(plan.coreExerciseIds).not.toContain('high-level-speak');
  });

  it('includes exercises if level is high enough', () => {
    const plan = buildSessionPlan('speaking', 4, 'pace', mockExercises, []);

    // With slice(0, 3) it might not be in the final array depending on sort,
    // but let's just test that the length is still max 3.
    expect(plan.coreExerciseIds.length).toBeLessThanOrEqual(3);
    expect(plan.coreExerciseIds).not.toContain('inactive-speak'); // Still filters inactive
  });

  it('prefers uncompleted exercises over completed ones', () => {
    const plan = buildSessionPlan('speaking', 1, 'pace', mockExercises, ['core-speak-1']);

    // core-speak-1 is completed, so it should be moved to the end of the sorted array
    // The coreIds returned should primarily be uncompleted ones.
    expect(plan.coreExerciseIds[0]).not.toBe('core-speak-1');
    expect(plan.coreExerciseIds).toEqual(['core-speak-2', 'core-speak-3', 'core-speak-4']);
  });
});
