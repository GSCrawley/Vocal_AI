import { sessionStateToAvatarState, resolveAvatarState, AVATAR_ANIMATION_ASSETS, buildIntroDialogue } from '../index';

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
});
