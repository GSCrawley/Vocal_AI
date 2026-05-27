import {
  SessionState,
  createSession,
  nextState,
  buildSessionPlan,
  submitAttempt,
  canAwardXp,
  InvalidTransitionError,
} from '../index';
import {
  SessionEvent,
  AttemptResult,
  CurriculumEntry,
  UserSessionContext,
} from '@voice/shared-types';

describe('exercise-engine', () => {
  const mockCurriculum: CurriculumEntry[] = [
    {
      exerciseId: 'warmup',
      title: 'Warmup',
      category: 'breathing',
      tier: 'singing',
      minimumLevelRequired: 1,
    },
    {
      exerciseId: 'sustain_01',
      title: 'Sustain A4',
      category: 'pitch_matching',
      tier: 'singing',
      minimumLevelRequired: 1,
    },
  ];

  const mockContext: UserSessionContext = {
    userId: 'user1',
    tier: 'singing',
    currentLevel: 1,
    sessionCountToday: 0,
  };

  const mockAttempt: AttemptResult = {
    attemptId: 'att1',
    score: {
      overallScore: 90,
      pitchAccuracy: 90,
      stability: 90,
      completion: 1.0,
      onset: 0.8,
      confidence: 'high',
    },
    durationMs: 5000,
  };

  describe('buildSessionPlan & createSession', () => {
    it('creates a session successfully', () => {
      const plan = buildSessionPlan(mockCurriculum, mockContext);
      const session = createSession(plan);
      expect(session.state).toBe('IDLE');
      expect(session.attempts).toHaveLength(0);
      expect(session.reflectionProcessed).toBe(false);
    });
  });

  describe('nextState invariant enforcements', () => {
    let session: ReturnType<typeof createSession>;

    beforeEach(() => {
      const plan = buildSessionPlan(mockCurriculum, mockContext);
      session = createSession(plan);
    });

    it('rejects invalid transitions (e.g. LISTENING -> SESSION_COMPLETE)', () => {
      session.state = 'LISTENING';
      expect(() => nextState(session, { type: 'END_SESSION' })).toThrow(InvalidTransitionError);
    });

    it('mic-check failures route back to mic_check', () => {
      session.state = 'MIC_CHECK';
      const updated = nextState(session, { type: 'MIC_CHECK_FAIL' });
      expect(updated.state).toBe('MIC_CHECK');
    });

    it('strain warnings force transition to reflection', () => {
      session.state = 'LISTENING';
      const updated = nextState(session, { type: 'STRAIN_WARNING' });
      expect(updated.state).toBe('REFLECTION');
    });

    it('session with zero attempts cannot reach complete', () => {
      session.state = 'REFLECTION';
      expect(() => nextState(session, { type: 'REFLECTION_DONE' })).toThrow(InvalidTransitionError);
    });
  });

  describe('submitAttempt and canAwardXp', () => {
    let session: ReturnType<typeof createSession>;

    beforeEach(() => {
      const plan = buildSessionPlan(mockCurriculum, mockContext);
      session = createSession(plan);
    });

    it('only allows submitAttempt in ANALYZING', () => {
      session.state = 'LISTENING';
      expect(() => submitAttempt(session, mockAttempt)).toThrow(InvalidTransitionError);

      session.state = 'ANALYZING';
      const updated = submitAttempt(session, mockAttempt);
      expect(updated.state).toBe('RESULT_REVIEW');
      expect(updated.attempts).toHaveLength(1);
    });

    it('canAwardXp is true only after attempt AND reflection', () => {
      session.state = 'ANALYZING';
      let updated = submitAttempt(session, mockAttempt);
      expect(canAwardXp(updated)).toBe(false); // No reflection yet

      updated = nextState(updated, { type: 'START_REFLECTION' });
      updated = nextState(updated, { type: 'REFLECTION_DONE' });
      expect(updated.reflectionProcessed).toBe(true);
      expect(canAwardXp(updated)).toBe(true);
    });
  });

  describe('Integration Test: Build 0.1 sustained-note loop', () => {
    it('runs end-to-end and asserts canAwardXp returns true', () => {
      const plan = buildSessionPlan(mockCurriculum, mockContext);
      let s = createSession(plan);

      s = nextState(s, { type: 'LOAD' });
      s = nextState(s, { type: 'LOADED' });
      s = nextState(s, { type: 'START_ATTEMPT' }); // EXERCISE_INTRO
      s = nextState(s, { type: 'DO_MIC_CHECK' }); // MIC_CHECK
      s = nextState(s, { type: 'MIC_CHECK_PASS' }); // AWAITING_SIGNAL
      s = nextState(s, { type: 'SIGNAL_DETECTED' }); // LISTENING
      s = nextState(s, { type: 'LISTENING_DONE' }); // ANALYZING
      s = submitAttempt(s, mockAttempt); // RESULT_REVIEW
      s = nextState(s, { type: 'START_REFLECTION' }); // REFLECTION
      s = nextState(s, { type: 'REFLECTION_DONE' }); // SESSION_COMPLETE

      expect(s.state).toBe('SESSION_COMPLETE');
      expect(canAwardXp(s)).toBe(true);
    });
  });
});
