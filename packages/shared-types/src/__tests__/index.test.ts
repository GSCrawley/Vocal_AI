import {
  UserProfile,
  Tier,
  SpeakingGoal,
  SingingGoal,
  SuccessBand,
  ExerciseDefinition,
  ExerciseCategory,
  TargetPatternType,
  Session,
  Attempt,
  SingingAttemptMetrics,
  BestTake,
  Reflection,
  LivePitchFrame,
  CoachingPayload,
  AvatarBehaviorState,
  AvatarDialogueLine,
  XpEvent,
  UserRewardState,
  EarnedBadge,
} from '../index';

// Ensure types are not considered unused by TypeScript/ESLint while acting purely as structural checks.
export function _ensureTypesExist(
  _profile: UserProfile,
  _spkGoal: SpeakingGoal,
  _sngGoal: SingingGoal,
  _sBand: SuccessBand,
  _exCat: ExerciseCategory,
  _tpType: TargetPatternType,
  _sess: Session,
  _att: Attempt,
  _sam: SingingAttemptMetrics,
  _bt: BestTake,
  _refl: Reflection,
  _lpf: LivePitchFrame,
  _cp: CoachingPayload,
  _abs: AvatarBehaviorState,
  _adl: AvatarDialogueLine,
  _xpe: XpEvent,
  _urs: UserRewardState,
  _eb: EarnedBadge
) {}

describe('Shared Types', () => {
  it('should export all required domain types', () => {
    // This is purely a type-check test, if it compiles, the types exist.
    const dummyTier: Tier = 'speaking';
    expect(dummyTier).toBe('speaking');
  });

  it('should have correct versions for exercise definitions if modified', () => {
    const exercise: ExerciseDefinition = {
      exerciseId: 'test-001',
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
        completion: 0.1,
      },
      feedbackRuleSetId: 'rules-sustain-note-v1',
      activeFlag: true,
    };

    // Simulate behavior modification without version bump
    const modifiedExercise = { ...exercise, durationTargetSeconds: 15 };

    // This test ensures we assert a version bump is needed for behavior changes
    expect(modifiedExercise.version).toBe(exercise.version);
    // In a real scenario, this should trigger a failure if version isn't updated.
    // However, as a unit test on purely structural types, we verify the logic constraint.
    const ensureVersionBump = (oldDef: ExerciseDefinition, newDef: ExerciseDefinition) => {
      // Check for structural changes
      if (oldDef.durationTargetSeconds !== newDef.durationTargetSeconds) {
        if (oldDef.version === newDef.version) {
          throw new Error('Version must be bumped when behavior fields change');
        }
      }
    };

    expect(() => ensureVersionBump(exercise, modifiedExercise)).toThrow(
      'Version must be bumped when behavior fields change'
    );
  });
});
