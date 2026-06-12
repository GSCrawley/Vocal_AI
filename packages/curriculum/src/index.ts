import type {
  Tier,
  CurriculumLevel,
  SpeakingGoal,
  SingingGoal,
  ExerciseDefinition,
  LessonPlan,
} from '@voice/shared-types';

// ------------------------------------------------------------
// CURRICULUM LEVEL DEFINITIONS
// ------------------------------------------------------------

export const CURRICULUM_LEVEL_NAMES: Record<Tier, Record<CurriculumLevel, string>> = {
  speaking: {
    1: 'Foundation',
    2: 'Control',
    3: 'Expression',
    4: 'Mastery',
  },
  singing: {
    1: 'Foundation',
    2: 'Core Skills',
    3: 'Musicality',
    4: 'Expression and Style',
  },
};

export const CURRICULUM_LEVEL_SESSION_COUNTS: Record<Tier, Record<CurriculumLevel, number>> = {
  speaking: { 1: 10, 2: 20, 3: 30, 4: Infinity },
  singing:  { 1: 15, 2: 25, 3: 40, 4: Infinity },
};

// ------------------------------------------------------------
// LEVEL DETERMINATION
// ------------------------------------------------------------

export function determineLevel(tier: Tier, completedSessions: number): CurriculumLevel {
  const thresholds = CURRICULUM_LEVEL_SESSION_COUNTS[tier];
  if (completedSessions < thresholds[1]) return 1;
  if (completedSessions < thresholds[1] + thresholds[2]) return 2;
  if (completedSessions < thresholds[1] + thresholds[2] + thresholds[3]) return 3;
  return 4;
}

// ------------------------------------------------------------
// EXERCISE SEQUENCING
// ------------------------------------------------------------

/**
 * Determines if a user meets the prerequisites to attempt a given exercise.
 */
export function meetsPrerequisites(
  exercise: ExerciseDefinition,
  completedExerciseIds: string[],
  userLevel: number
): boolean {
  if (exercise.minimumLevelRequired && userLevel < exercise.minimumLevelRequired) {
    return false;
  }
  if (exercise.prerequisiteExerciseIds && exercise.prerequisiteExerciseIds.length > 0) {
    return exercise.prerequisiteExerciseIds.every(id => completedExerciseIds.includes(id));
  }
  return true;
}

/**
 * Select the next exercise for a session given the user's current state.
 * Applies the "easy win first" principle for early sessions.
 */
export function selectNextExercise(
  availableExercises: ExerciseDefinition[],
  completedExerciseIds: string[],
  currentLevel: CurriculumLevel,
  primaryGoal: SpeakingGoal | SingingGoal,
  sessionCountToday: number
): ExerciseDefinition | null {
  // Filter to exercises the user can do
  const eligible = availableExercises.filter(ex =>
    ex.activeFlag &&
    (!ex.minimumLevelRequired || ex.minimumLevelRequired <= currentLevel)
  );

  // For the first exercise in a session, prefer exercises matching the primary goal
  if (sessionCountToday === 0) {
    const goalMatch = eligible.find(ex =>
      !completedExerciseIds.includes(ex.exerciseId) &&
      ex.category.includes(primaryGoal.replace('_', ''))
    );
    if (goalMatch) return goalMatch;
  }

  // Otherwise, select the next uncompleted exercise in level order
  const uncompleted = eligible.filter(ex => !completedExerciseIds.includes(ex.exerciseId));
  return uncompleted[0] ?? eligible[0] ?? null; // Fall back to replay if all done
}

// ------------------------------------------------------------
// SESSION STRUCTURE
// ------------------------------------------------------------

export interface SessionPlan {
  warmUpExerciseIds: string[];
  coreExerciseIds: string[];
  estimatedDurationMinutes: number;
}

/**
 * Build a session plan for the given user context.
 * Always: 1 warm-up + 2–4 core exercises.
 */
export function buildSessionPlan(
  tier: Tier,
  level: CurriculumLevel,
  primaryGoal: SpeakingGoal | SingingGoal,
  availableExercises: ExerciseDefinition[],
  completedExerciseIds: string[]
): SessionPlan {
  const warmUpIds = getWarmUpExercises(tier, level);
  const coreIds = getCoreExercises(tier, level, primaryGoal, availableExercises, completedExerciseIds);

  const estimatedMinutes = warmUpIds.length * 2 + coreIds.length * 5;

  return {
    warmUpExerciseIds: warmUpIds,
    coreExerciseIds: coreIds,
    estimatedDurationMinutes: estimatedMinutes,
  };
}

function getWarmUpExercises(tier: Tier, level: CurriculumLevel): string[] {
  // Warm-up exercises are short (1–2 min each) and always come first
  if (tier === 'speaking') {
    return ['breathing-diaphragm-001', 'resonance-hum-001'];
  }
  // Singing: breathing + reference tone match
  if (level === 1) {
    return ['breathing-diaphragm-001', 'reference-tone-match-001'];
  }
  return ['breathing-diaphragm-001', 'sustain-note-beginner-001'];
}

function getCoreExercises(
  tier: Tier,
  level: CurriculumLevel,
  goal: SpeakingGoal | SingingGoal,
  available: ExerciseDefinition[],
  completed: string[]
): string[] {
  // Core: 2–4 exercises targeted at the primary goal
  const goalExercises = available
    .filter(ex =>
      ex.tier === tier &&
      ex.activeFlag &&
      (!ex.minimumLevelRequired || ex.minimumLevelRequired <= level)
    )
    .sort((a, b) => {
      // Prefer uncompleted exercises; secondarily sort by version (newest)
      const aNew = !completed.includes(a.exerciseId) ? 0 : 1;
      const bNew = !completed.includes(b.exerciseId) ? 0 : 1;
      return aNew - bNew;
    })
    .slice(0, 3)
    .map(ex => ex.exerciseId);

  return goalExercises;
}

// ------------------------------------------------------------
// LESSON PLAN REGISTRY (MVP seed data)
// ------------------------------------------------------------

export const SPEAKING_FOUNDATION_PLAN: LessonPlan = {
  planId: 'speaking-foundation-v1',
  tier: 'speaking',
  level: 1,
  goal: 'pace',
  sessionCount: 10,
  exerciseSequence: [
    'breathing-diaphragm-001',
    'resonance-hum-001',
    'slow-read-001',
    'pause-practice-001',
    'filler-audit-001',
  ],
};

export const SINGING_FOUNDATION_PLAN: LessonPlan = {
  planId: 'singing-foundation-v1',
  tier: 'singing',
  level: 1,
  goal: 'pitch',
  sessionCount: 15,
  exerciseSequence: [
    'breathing-diaphragm-001',
    'reference-tone-match-001',
    'sustain-note-beginner-001',
    'scale-walk-001',
    'octave-jump-001',
  ],
};
