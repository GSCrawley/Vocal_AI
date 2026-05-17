export { type SessionState, initialSessionState } from '@voice/shared-types';
import { SessionState, ExerciseDefinition, Tier, SessionEvent } from '@voice/shared-types';



export interface Attempt {
  attemptId: string;
  exerciseId: string;
  startedAt: number;
  endedAt?: number;
  status: 'in_progress' | 'completed' | 'aborted';
}

export interface SessionPlan {
  sessionId: string;
  tier: Tier;
  exerciseIds: string[];
  currentIndex: number;
  attempts: Attempt[];
}

export function transition(state: SessionState, event: SessionEvent): SessionState {
  if (event.type === 'ERROR') {
    return 'SESSION_ERROR';
  }

  switch (state) {
    case 'IDLE':
      if (event.type === 'LOAD') return 'LOADING_SESSION';
      break;
    case 'LOADING_SESSION':
      if (event.type === 'LOADED') return 'READY';
      break;
    case 'READY':
      if (event.type === 'START_WARM_UP') return 'WARM_UP';
      if (event.type === 'START_ATTEMPT') return 'EXERCISE_INTRO';
      break;
    case 'WARM_UP':
      if (event.type === 'WARM_UP_DONE') return 'READY';
      break;
    case 'EXERCISE_INTRO':
      if (event.type === 'START_ATTEMPT') return 'AWAITING_SIGNAL';
      break;
    case 'AWAITING_SIGNAL':
      if (event.type === 'SIGNAL_DETECTED') return 'LISTENING';
      break;
    case 'LISTENING':
      if (event.type === 'LISTENING_DONE') return 'ANALYZING';
      break;
    case 'ANALYZING':
      if (event.type === 'ANALYSIS_DONE') return 'RESULT_REVIEW';
      break;
    case 'RESULT_REVIEW':
      if (event.type === 'RETRY') return 'EXERCISE_INTRO';
      if (event.type === 'CONTINUE') return 'EXERCISE_INTRO';
      if (event.type === 'START_REFLECTION') return 'REFLECTION';
      break;
    case 'REFLECTION':
      if (event.type === 'REFLECTION_DONE') return 'SESSION_COMPLETE';
      break;
    case 'SESSION_COMPLETE':
    case 'SESSION_ERROR':
      // Terminal states
      break;
  }

  throw new Error(`Invalid transition: state ${state}, event ${event.type}`);
}

export function buildSessionPlan(params: { sessionId: string; tier: Tier; exercises: ExerciseDefinition[] }): SessionPlan {
  return {
    sessionId: params.sessionId,
    tier: params.tier,
    exerciseIds: params.exercises.map(e => e.exerciseId),
    currentIndex: 0,
    attempts: []
  };
}

export function startAttempt(plan: SessionPlan, attemptId: string, now: number): SessionPlan {
  const currentExerciseId = plan.exerciseIds[plan.currentIndex];
  if (!currentExerciseId) {
    throw new Error('No exercise at current index');
  }

  const newAttempt: Attempt = {
    attemptId,
    exerciseId: currentExerciseId,
    startedAt: now,
    status: 'in_progress'
  };

  return {
    ...plan,
    attempts: [...plan.attempts, newAttempt]
  };
}

export function completeAttempt(plan: SessionPlan, attemptId: string, now: number): SessionPlan {
  const attemptIndex = plan.attempts.findIndex(a => a.attemptId === attemptId);
  if (attemptIndex === -1) {
    throw new Error(`Attempt ${attemptId} not found`);
  }

  const updatedAttempts = [...plan.attempts];
  const attempt = updatedAttempts[attemptIndex];
  
  if (attempt.status !== 'in_progress') {
    throw new Error(`Attempt ${attemptId} is not in progress`);
  }

  updatedAttempts[attemptIndex] = {
    ...attempt,
    endedAt: now,
    status: 'completed'
  };

  return {
    ...plan,
    attempts: updatedAttempts
  };
}

export function canAwardXp(plan: SessionPlan): boolean {
  return plan.attempts.some(a => a.status === 'completed');
}
