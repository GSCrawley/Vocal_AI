import { transition, buildSessionPlan, startAttempt, completeAttempt, canAwardXp } from '../index';
import {
  SessionState,
  initialSessionState,
  ExerciseDefinition,
  SessionEvent,
} from '@voice/shared-types';

describe('exercise-engine', () => {
  describe('transition', () => {
    it('handles ERROR event from any state', () => {
      expect(transition('IDLE', { type: 'ERROR' })).toBe('SESSION_ERROR');
      expect(transition('LISTENING', { type: 'ERROR' })).toBe('SESSION_ERROR');
    });

    it('throws on illegal transitions (e.g. LISTENING -> SESSION_COMPLETE directly)', () => {
      expect(() => {
        transition('LISTENING', { type: 'END_SESSION' });
      }).toThrow('Invalid transition: state LISTENING, event END_SESSION');
    });

    it('throws on RESULT_REVIEW -> SESSION_COMPLETE directly', () => {
      expect(() => {
        transition('RESULT_REVIEW', { type: 'END_SESSION' });
      }).toThrow('Invalid transition: state RESULT_REVIEW, event END_SESSION');
    });

    it('supports sustained-note Build 0.1 happy path', () => {
      let state = initialSessionState;

      const events: SessionEvent[] = [
        { type: 'LOAD' },
        { type: 'LOADED' },
        { type: 'START_ATTEMPT' }, // Goes to EXERCISE_INTRO
        { type: 'START_ATTEMPT' }, // User clicks start -> AWAITING_SIGNAL
        { type: 'SIGNAL_DETECTED' },
        { type: 'LISTENING_DONE' },
        { type: 'ANALYSIS_DONE' },
        { type: 'START_REFLECTION' },
        { type: 'REFLECTION_DONE' },
      ];

      const expectedStates: SessionState[] = [
        'LOADING_SESSION',
        'READY',
        'EXERCISE_INTRO',
        'AWAITING_SIGNAL',
        'LISTENING',
        'ANALYZING',
        'RESULT_REVIEW',
        'REFLECTION',
        'SESSION_COMPLETE',
      ];

      events.forEach((event, i) => {
        state = transition(state, event);
        expect(state).toBe(expectedStates[i]);
      });
    });
  });

  describe('session plan', () => {
    const mockExercise: ExerciseDefinition = {
      exerciseId: 'ex-1',
      version: 1,
      tier: 'singing',
      category: 'pitch_matching',
      subcategory: 'sustained_note',
      title: 'Sustain A4',
      description: 'Hold the note A4 for 5 seconds.',
      userInstructionText: 'Sing A4',
      durationTargetSeconds: 5,
      repetitionsDefault: 1,
      targetPatternType: 'sustained_hold',
      targetPatternPayload: {},
      evaluationConfig: {},
      scoringWeights: { pitch: 1.0, stability: 0.0, onset: 0.0 },
      feedbackRuleSetId: 'default_singing_rules',
      activeFlag: true,
    };

    it('buildSessionPlan returns initial plan where canAwardXp is false', () => {
      const plan = buildSessionPlan({
        sessionId: 'session-1',
        tier: 'singing',
        exercises: [mockExercise],
      });

      expect(plan.sessionId).toBe('session-1');
      expect(plan.attempts).toHaveLength(0);
      expect(canAwardXp(plan)).toBe(false);
    });

    it('startAttempt and completeAttempt correctly update the plan and canAwardXp becomes true', () => {
      let plan = buildSessionPlan({
        sessionId: 'session-1',
        tier: 'singing',
        exercises: [mockExercise],
      });

      const now = Date.now();
      plan = startAttempt(plan, 'attempt-1', now);

      expect(plan.attempts).toHaveLength(1);
      expect(plan.attempts[0].status).toBe('in_progress');
      expect(canAwardXp(plan)).toBe(false);

      plan = completeAttempt(plan, 'attempt-1', now + 5000);

      expect(plan.attempts[0].status).toBe('completed');
      expect(canAwardXp(plan)).toBe(true);
    });
  });
});
