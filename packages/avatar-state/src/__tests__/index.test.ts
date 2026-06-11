import {
  sessionStateToAvatarState,
  resolveAvatarState,
  AVATAR_ANIMATION_ASSETS,
  buildIntroDialogue,
  buildCoachingDialogue,
  buildCelebrationDialogue,
  buildReflectionDialogue,
} from '../index';
import type { CoachingPayload } from '@voice/shared-types';

describe('Avatar State', () => {
  it('maps session states to avatar states correctly', () => {
    expect(sessionStateToAvatarState('EXERCISE_INTRO')).toBe('INTRO');
    expect(sessionStateToAvatarState('LISTENING')).toBe('LISTENING');
    expect(sessionStateToAvatarState('ANALYZING')).toBe('ANALYZING');
  });

  it('triggers celebrating on personal best or excellent band', () => {
    expect(resolveAvatarState('RESULT_REVIEW', true, false, 'good')).toBe('CELEBRATING');
    expect(resolveAvatarState('RESULT_REVIEW', false, false, 'excellent')).toBe('CELEBRATING');
  });

  it('triggers coaching on normal result review', () => {
    expect(resolveAvatarState('RESULT_REVIEW', false, false, 'good')).toBe('COACHING');
  });

  it('maps all states to assets', () => {
    expect(AVATAR_ANIMATION_ASSETS['IDLE']).toBe('avatar_idle.json');
    expect(AVATAR_ANIMATION_ASSETS['CELEBRATING']).toBe('avatar_celebrating.json');
  });

  describe('buildIntroDialogue', () => {
    it('returns first session greeting for speaking tier', () => {
      const lines = buildIntroDialogue({ tier: 'speaking', sessionCount: 0 });
      expect(lines.length).toBe(1);
      expect(lines[0]).toEqual({
        text: "Let's start with something simple. We're just going to get a baseline for your voice — no pressure.",
        state: 'INTRO',
        durationMs: 4000,
      });
    });

    it('returns first session greeting for singing tier', () => {
      const lines = buildIntroDialogue({ tier: 'singing', sessionCount: 0 });
      expect(lines.length).toBe(1);
      expect(lines[0]).toEqual({
        text: "Welcome. Let's find out where your voice is today. We'll start easy.",
        state: 'INTRO',
        durationMs: 4000,
      });
    });

    it('treats undefined sessionCount as 0', () => {
      const lines = buildIntroDialogue({ tier: 'singing' });
      expect(lines.length).toBe(1);
      expect(lines[0]).toEqual({
        text: "Welcome. Let's find out where your voice is today. We'll start easy.",
        state: 'INTRO',
        durationMs: 4000,
      });
    });

    it('returns last session focus for returning user', () => {
      const lines = buildIntroDialogue({
        tier: 'singing',
        sessionCount: 1,
        lastSessionFocus: 'breath control',
      });
      expect(lines.length).toBe(1);
      expect(lines[0]).toEqual({
        text: "Last time you were working on breath control. Let's pick up from there.",
        state: 'INTRO',
        durationMs: 3000,
      });
    });

    it('returns no greeting for returning user without lastSessionFocus', () => {
      const lines = buildIntroDialogue({ tier: 'singing', sessionCount: 1 });
      expect(lines.length).toBe(0);
    });

    it('appends exercise title if provided', () => {
      const lines = buildIntroDialogue({
        tier: 'singing',
        sessionCount: 1,
        exerciseTitle: 'Vocal Warmup',
      });
      expect(lines.length).toBe(1);
      expect(lines[0]).toEqual({
        text: "Today's exercise: Vocal Warmup.",
        state: 'INTRO',
        durationMs: 2000,
      });
    });

    it('appends exercise instruction if provided', () => {
      const lines = buildIntroDialogue({
        tier: 'singing',
        sessionCount: 1,
        exerciseInstruction: 'Take a deep breath and start.',
      });
      expect(lines.length).toBe(1);
      expect(lines[0]).toEqual({
        text: 'Take a deep breath and start.',
        state: 'INTRO',
        awaitUserAction: true,
      });
    });

    it('appends all provided fields correctly', () => {
      const lines = buildIntroDialogue({
        tier: 'speaking',
        sessionCount: 0,
        exerciseTitle: 'Pitch Control',
        exerciseInstruction: 'Speak the sentence clearly.',
      });

      expect(lines.length).toBe(3);
      expect(lines[0]).toEqual({
        text: "Let's start with something simple. We're just going to get a baseline for your voice — no pressure.",
        state: 'INTRO',
        durationMs: 4000,
      });
      expect(lines[1]).toEqual({
        text: "Today's exercise: Pitch Control.",
        state: 'INTRO',
        durationMs: 2000,
      });
      expect(lines[2]).toEqual({
        text: 'Speak the sentence clearly.',
        state: 'INTRO',
        awaitUserAction: true,
      });
    });
  });

  describe('buildCoachingDialogue', () => {
    const mockCoaching: CoachingPayload = {
      praiseMessage: 'Great job!',
      correctionMessage: 'Try to keep your pitch steady.',
      actionTip: 'Take a deep breath and go again.',
      successBand: 'good',
    };

    it('builds dialogue for a personal best', () => {
      const lines = buildCoachingDialogue(mockCoaching, true);
      expect(lines.length).toBe(3);

      expect(lines[0]).toEqual({
        text: "Great job! That's a personal best.",
        state: 'CELEBRATING',
        durationMs: 3000,
      });

      expect(lines[1]).toEqual({
        text: 'Try to keep your pitch steady.',
        state: 'COACHING',
        durationMs: 3500,
      });

      expect(lines[2]).toEqual({
        text: 'Take a deep breath and go again.',
        state: 'COACHING',
        awaitUserAction: true,
      });
    });

    it('builds dialogue for a normal result', () => {
      const lines = buildCoachingDialogue(mockCoaching, false);
      expect(lines.length).toBe(3);

      expect(lines[0]).toEqual({
        text: 'Great job!',
        state: 'COACHING',
        durationMs: 2000,
      });

      expect(lines[1]).toEqual({
        text: 'Try to keep your pitch steady.',
        state: 'COACHING',
        durationMs: 3500,
      });

      expect(lines[2]).toEqual({
        text: 'Take a deep breath and go again.',
        state: 'COACHING',
        awaitUserAction: true,
      });
    });
  });

  describe('buildCoachingDialogue', () => {
    const mockCoaching: CoachingPayload = {
      praiseMessage: 'Great job!',
      correctionMessage: 'Try to keep your pitch steady.',
      actionTip: 'Take a deep breath and go again.',
      successBand: 'good',
    };

    it('builds dialogue for a personal best', () => {
      const lines = buildCoachingDialogue(mockCoaching, true);
      expect(lines.length).toBe(3);

      expect(lines[0]).toEqual({
        text: "Great job! That's a personal best.",
        state: 'CELEBRATING',
        durationMs: 3000,
      });

      expect(lines[1]).toEqual({
        text: 'Try to keep your pitch steady.',
        state: 'COACHING',
        durationMs: 3500,
      });

      expect(lines[2]).toEqual({
        text: 'Take a deep breath and go again.',
        state: 'COACHING',
        awaitUserAction: true,
      });
    });

    it('builds dialogue for a normal result', () => {
      const lines = buildCoachingDialogue(mockCoaching, false);
      expect(lines.length).toBe(3);

      expect(lines[0]).toEqual({
        text: 'Great job!',
        state: 'COACHING',
        durationMs: 2000,
      });

      expect(lines[1]).toEqual({
        text: 'Try to keep your pitch steady.',
        state: 'COACHING',
        durationMs: 3500,
      });

      expect(lines[2]).toEqual({
        text: 'Take a deep breath and go again.',
        state: 'COACHING',
        awaitUserAction: true,
      });
    });
  });

  describe('buildCelebrationDialogue', () => {
    it('returns empty array when neither isMilestone nor isPersonalBest are true', () => {
      const lines = buildCelebrationDialogue({ tier: 'speaking', isMilestone: false });
      expect(lines.length).toBe(0);
    });

    it('returns empty array if only isPersonalBest is true but milestoneDescription is missing', () => {
      const lines = buildCelebrationDialogue({
        tier: 'speaking',
        isPersonalBest: true,
        isMilestone: false,
      });
      expect(lines.length).toBe(0);
    });

    it('returns custom milestone description when provided and isMilestone is true', () => {
      const lines = buildCelebrationDialogue({
        tier: 'speaking',
        isMilestone: true,
        milestoneDescription: 'You completed 10 exercises!',
      });
      expect(lines.length).toBe(1);
      expect(lines[0]).toEqual({
        text: 'You completed 10 exercises!',
        state: 'CELEBRATING',
        durationMs: 4000,
      });
    });

    it('returns custom milestone description when provided and isPersonalBest is true', () => {
      const lines = buildCelebrationDialogue({
        tier: 'speaking',
        isPersonalBest: true,
        milestoneDescription: 'Awesome job!',
      });
      expect(lines.length).toBe(1);
      expect(lines[0]).toEqual({
        text: 'Awesome job!',
        state: 'CELEBRATING',
        durationMs: 4000,
      });
    });

    it('returns default milestone description for speaking tier', () => {
      const lines = buildCelebrationDialogue({ tier: 'speaking', isMilestone: true });
      expect(lines.length).toBe(1);
      expect(lines[0]).toEqual({
        text: "That's a milestone. Your voice is building something real.",
        state: 'CELEBRATING',
        durationMs: 3500,
      });
    });

    it('returns default milestone description for singing tier', () => {
      const lines = buildCelebrationDialogue({ tier: 'singing', isMilestone: true });
      expect(lines.length).toBe(1);
      expect(lines[0]).toEqual({
        text: "That's a milestone. Listen to how far you've come.",
        state: 'CELEBRATING',
        durationMs: 3500,
      });
    });
  });

  describe('buildReflectionDialogue', () => {
    it.each(['speaking', 'singing'] as const)(
      'returns consistent reflection dialogue structure for tier %s',
      (tier) => {
        const lines = buildReflectionDialogue(tier);

        // 1. Array length assertion
        expect(lines).toHaveLength(3);

        // 2. Exact structural match
        expect(lines).toEqual([
          {
            text: 'Two quick questions before you go.',
            state: 'COACHING',
            durationMs: 2000,
          },
          {
            text: "What felt easiest in today's session?",
            state: 'COACHING',
            awaitUserAction: true,
          },
          {
            text: 'And what will you focus on next time you practice?',
            state: 'COACHING',
            awaitUserAction: true,
          },
        ]);

        // 3. Document function's contract through explicit properties
        const [introLine, question1, question2] = lines;

        expect(introLine.state).toBe('COACHING');
        expect(introLine.awaitUserAction).toBeFalsy();

        expect(question1.state).toBe('COACHING');
        expect(question1.awaitUserAction).toBe(true);

        expect(question2.state).toBe('COACHING');
        expect(question2.awaitUserAction).toBe(true);
      }
    );
  });
});
