import {
  sessionStateToAvatarState,
  resolveAvatarState,
  AVATAR_ANIMATION_ASSETS,
  buildIntroDialogue,
  buildCoachingDialogue,
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
});
