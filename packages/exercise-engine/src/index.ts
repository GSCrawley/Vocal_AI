import { SessionState, SessionEvent, AttemptResult, Tier, CurriculumEntry, UserSessionContext } from '@voice/shared-types';

export { SessionState, SessionEvent };

export interface SessionPlan {
  sessionId: string;
  tier: Tier;
  exerciseIds: string[];
  currentExerciseIndex: number;
}

export interface Session {
  sessionId: string;
  state: SessionState;
  plan: SessionPlan;
  attempts: AttemptResult[];
  reflectionProcessed: boolean;
}

export class InvalidTransitionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidTransitionError';
  }
}

export function buildSessionPlan(curriculum: CurriculumEntry[], userContext: UserSessionContext): SessionPlan {
  // Picks the Build 0.1 sustained-note exercise and any required warm-up/mic-check entries from curriculum
  // Tier-aware (singing tier for Build 0.1).
  const tierEligible = curriculum.filter(c => c.tier === userContext.tier && (!c.minimumLevelRequired || c.minimumLevelRequired <= userContext.currentLevel));
  // In a real implementation this would sort and pick based on context.
  // Let's pick up to 3 exercises for the session.
  const exerciseIds = tierEligible.slice(0, 3).map(e => e.exerciseId);
  return {
    sessionId: `session-${Date.now()}`,
    tier: userContext.tier,
    exerciseIds,
    currentExerciseIndex: 0
  };
}

export function createSession(plan: SessionPlan): Session {
  return {
    sessionId: plan.sessionId,
    state: 'IDLE',
    plan,
    attempts: [],
    reflectionProcessed: false
  };
}

export function nextState(session: Session, event: SessionEvent): Session {
  if (event.type === 'ERROR') {
    return { ...session, state: 'SESSION_ERROR' };
  }

  // Strain warning overrides everything
  if (event.type === 'STRAIN_WARNING') {
    return { ...session, state: 'REFLECTION' };
  }

  const newState = getNextState(session.state, event);

  if (!newState) {
    throw new InvalidTransitionError(`Invalid transition: state ${session.state}, event ${event.type}`);
  }

  // Additional invariant checks
  if (newState === 'SESSION_COMPLETE' && session.attempts.length === 0) {
    throw new InvalidTransitionError('Cannot complete session with zero attempts');
  }

  const updatedSession = { ...session, state: newState };

  if (event.type === 'REFLECTION_DONE') {
    updatedSession.reflectionProcessed = true;
  }

  if (event.type === 'SUBMIT_ATTEMPT') {
    updatedSession.attempts = [...updatedSession.attempts, event.attempt];
  }

  return updatedSession;
}

function getNextState(state: SessionState, event: SessionEvent): SessionState | null {
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
      if (event.type === 'DO_MIC_CHECK') return 'MIC_CHECK';
      if (event.type === 'START_ATTEMPT') return 'AWAITING_SIGNAL';
      break;
    case 'MIC_CHECK':
      if (event.type === 'MIC_CHECK_PASS') return 'AWAITING_SIGNAL';
      if (event.type === 'MIC_CHECK_FAIL') return 'MIC_CHECK'; // Stays in mic check
      break;
    case 'AWAITING_SIGNAL':
      if (event.type === 'SIGNAL_DETECTED') return 'LISTENING';
      break;
    case 'LISTENING':
      if (event.type === 'LISTENING_DONE') return 'ANALYZING';
      break;
    case 'ANALYZING':
      if (event.type === 'SUBMIT_ATTEMPT') return 'RESULT_REVIEW';
      if (event.type === 'ANALYSIS_DONE') return 'RESULT_REVIEW';
      break;
    case 'RESULT_REVIEW':
      if (event.type === 'RETRY') return 'RETRY_PROMPT';
      if (event.type === 'CONTINUE') return 'EXERCISE_INTRO';
      if (event.type === 'START_REFLECTION') return 'REFLECTION';
      break;
    case 'RETRY_PROMPT':
      if (event.type === 'START_ATTEMPT') return 'AWAITING_SIGNAL';
      break;
    case 'REFLECTION':
      if (event.type === 'REFLECTION_DONE') return 'SESSION_COMPLETE';
      break;
    case 'SESSION_COMPLETE':
    case 'SESSION_ERROR':
      // Terminal
      break;
  }
  return null;
}

export function submitAttempt(session: Session, attempt: AttemptResult): Session {
  if (session.state !== 'ANALYZING') {
    throw new InvalidTransitionError('Attempts can only be submitted in ANALYZING state');
  }
  return nextState(session, { type: 'SUBMIT_ATTEMPT', attempt });
}

export function canAwardXp(session: Session): boolean {
  return session.attempts.length > 0 && session.reflectionProcessed;
}
