export { type SessionState, initialSessionState } from '@voice/shared-types';
import { SessionState, ExerciseDefinition, Tier } from '@voice/shared-types';
export type SessionEvent = {
    type: 'LOAD';
} | {
    type: 'LOADED';
} | {
    type: 'START_WARM_UP';
} | {
    type: 'WARM_UP_DONE';
} | {
    type: 'START_ATTEMPT';
} | {
    type: 'SIGNAL_DETECTED';
} | {
    type: 'LISTENING_DONE';
} | {
    type: 'ANALYSIS_DONE';
} | {
    type: 'RETRY';
} | {
    type: 'CONTINUE';
} | {
    type: 'START_REFLECTION';
} | {
    type: 'REFLECTION_DONE';
} | {
    type: 'END_SESSION';
} | {
    type: 'ERROR';
};
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
export declare function transition(state: SessionState, event: SessionEvent): SessionState;
export declare function buildSessionPlan(params: {
    sessionId: string;
    tier: Tier;
    exercises: ExerciseDefinition[];
}): SessionPlan;
export declare function startAttempt(plan: SessionPlan, attemptId: string, now: number): SessionPlan;
export declare function completeAttempt(plan: SessionPlan, attemptId: string, now: number): SessionPlan;
export declare function canAwardXp(plan: SessionPlan): boolean;
