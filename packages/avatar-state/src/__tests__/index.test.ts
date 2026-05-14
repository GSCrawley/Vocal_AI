import { sessionStateToAvatarState, resolveAvatarState, AVATAR_ANIMATION_ASSETS, buildIntroDialogue, buildCoachingDialogue } from '../index';
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

  it('builds intro dialogue properly based on context', () => {
    const lines = buildIntroDialogue({ tier: 'singing', sessionCount: 0 });
    expect(lines.length).toBeGreaterThan(0);
    expect(lines[0].text).toContain('Welcome');
  });

  describe('buildCoachingDialogue', () => {
    const mockCoaching: CoachingPayload = {
      praiseMessage: 'Great job!',
      correctionMessage: 'Try to keep your pitch steady.',
      actionTip: 'Take a deep breath and go again.',
      successBand: 'good'
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
