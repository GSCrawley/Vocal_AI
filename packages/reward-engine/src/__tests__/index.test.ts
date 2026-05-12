import {
  streakMilestoneXp,
  getLevelForXp,
  getXpToNextLevel,
  buildXpEvent,
  computeSessionXp,
  evaluateBadges,
  evaluateUnlocks,
  computeStreakUpdate,
  computeShieldsEarned,
  BadgeCheckInput,
} from '../index';

describe('streakMilestoneXp', () => {
  it('returns correct XP for milestones', () => {
    expect(streakMilestoneXp(7)).toBe(30);
    expect(streakMilestoneXp(30)).toBe(75);
    expect(streakMilestoneXp(100)).toBe(200);
    expect(streakMilestoneXp(1)).toBe(0);
  });
});

describe('getLevelForXp', () => {
  it('starts at level 1 with 0 XP', () => {
    expect(getLevelForXp(0)).toBe(1);
  });

  it('stays at level 1 before threshold', () => {
    expect(getLevelForXp(50)).toBe(1);
    expect(getLevelForXp(99)).toBe(1);
  });

  it('advances to level 2 at 100 XP', () => {
    expect(getLevelForXp(100)).toBe(2);
    expect(getLevelForXp(249)).toBe(2);
  });

  it('advances to level 3 at 250 XP', () => {
    expect(getLevelForXp(250)).toBe(3);
  });

  it('handles beyond level 10', () => {
    const level = getLevelForXp(6000 + 2000);
    expect(level).toBe(11);
  });
});

describe('getXpToNextLevel', () => {
  it('returns XP remaining to next level', () => {
    expect(getXpToNextLevel(0)).toBe(100);   // Level 1 → 2 at 100
    expect(getXpToNextLevel(100)).toBe(150); // Level 2 → 3 at 250
  });

  it('returns correct value beyond level 10', () => {
    expect(getXpToNextLevel(6000)).toBe(2000);
    expect(getXpToNextLevel(7000)).toBe(1000);
  });
});

describe('buildXpEvent', () => {
  it('builds an event with the correct source and amount', () => {
    const event = buildXpEvent('session_complete');
    expect(event.source).toBe('session_complete');
    expect(event.amount).toBe(10);
    expect(event.timestamp).toBeTruthy();
  });

  it('overrides amount for streak_milestone based on streak days', () => {
    const event = buildXpEvent('streak_milestone', { streakDays: 30 });
    expect(event.amount).toBe(75);
  });

  it('includes optional context fields', () => {
    const event = buildXpEvent('personal_best', { sessionId: 'sess-1', exerciseId: 'ex-1' });
    expect(event.sessionId).toBe('sess-1');
    expect(event.exerciseId).toBe('ex-1');
  });
});

describe('computeSessionXp', () => {
  it('always includes session_complete XP', () => {
    const { events, total } = computeSessionXp('developing', false, false, false);
    expect(events.some(e => e.source === 'session_complete')).toBe(true);
    expect(total).toBeGreaterThanOrEqual(10);
  });

  it('adds bonus XP for excellent score', () => {
    const { events } = computeSessionXp('excellent', false, false, false);
    expect(events.some(e => e.source === 'score_excellent')).toBe(true);
  });

  it('adds bonus XP for personal best', () => {
    const { events } = computeSessionXp('good', true, false, false);
    expect(events.some(e => e.source === 'personal_best')).toBe(true);
  });

  it('adds reflection XP when completed', () => {
    const { events } = computeSessionXp('good', false, false, true);
    expect(events.some(e => e.source === 'reflection_complete')).toBe(true);
  });

  it('adds new exercise type XP', () => {
    const { events } = computeSessionXp('developing', false, true, false);
    expect(events.some(e => e.source === 'new_exercise_type')).toBe(true);
  });
});

describe('computeStreakUpdate', () => {
  it('initializes streak on first session', () => {
    const res = computeStreakUpdate(undefined, 0, 0, '2025-01-01');
    expect(res.newStreakDays).toBe(1);
    expect(res.streakBroken).toBe(false);
    expect(res.streakExtended).toBe(true);
  });

  it('increments streak on consecutive days', () => {
    const res = computeStreakUpdate('2025-01-01', 1, 0, '2025-01-02');
    expect(res.newStreakDays).toBe(2);
    expect(res.streakExtended).toBe(true);
    expect(res.streakBroken).toBe(false);
  });

  it('does not change streak if already practiced today', () => {
    const res = computeStreakUpdate('2025-01-01', 3, 0, '2025-01-01');
    expect(res.newStreakDays).toBe(3);
    expect(res.streakExtended).toBe(false);
    expect(res.streakBroken).toBe(false);
  });

  it('uses a shield when one day is missed', () => {
    const res = computeStreakUpdate('2025-01-01', 10, 1, '2025-01-03');
    expect(res.streakBroken).toBe(false);
    expect(res.newStreakDays).toBe(11);
    expect(res.shieldUsed).toBe(true);
  });

  it('breaks streak and resets to 1 when no shields remain', () => {
    const res = computeStreakUpdate('2025-01-01', 10, 0, '2025-01-03');
    expect(res.streakBroken).toBe(true);
    expect(res.newStreakDays).toBe(1);
    expect(res.shieldUsed).toBe(false);
  });

  it('reports milestone reached at 7-day streak', () => {
    const res = computeStreakUpdate('2025-01-06', 6, 0, '2025-01-07');
    expect(res.milestoneReached).toBe(true);
    expect(res.milestoneXp).toBe(30);
  });
});

describe('computeShieldsEarned', () => {
  it('returns 0 for streaks under 7 days', () => {
    expect(computeShieldsEarned(6)).toBe(0);
  });

  it('returns 1 shield per 7 days', () => {
    expect(computeShieldsEarned(7)).toBe(1);
    expect(computeShieldsEarned(14)).toBe(2);
    expect(computeShieldsEarned(21)).toBe(3);
  });
});

describe('evaluateBadges', () => {
  const baseInput: BadgeCheckInput = {
    tier: 'singing',
    sessionCount: 1,
    exercisesCompleted: [],
    topScoreByExercise: {},
    streakDays: 0,
    karaokeSnippetsCompleted: 0,
    karaokeFullSongsCompleted: 0,
    stylePacks: [],
    reflectionsCompleted: 0,
    bothTiersUsed: false,
  };

  it('awards first_note on first singing session', () => {
    const badges = evaluateBadges(baseInput, []);
    expect(badges.some(b => b.badgeId === 'first_note')).toBe(true);
  });

  it('awards steady when stability score >= 80', () => {
    const input: BadgeCheckInput = { ...baseInput, topScoreByExercise: { stability: 85 } };
    const badges = evaluateBadges(input, []);
    expect(badges.some(b => b.badgeId === 'steady')).toBe(true);
  });

  it('awards in_tune when any exercise score >= 80', () => {
    const input: BadgeCheckInput = { ...baseInput, topScoreByExercise: { pitch: 82 } };
    const badges = evaluateBadges(input, []);
    expect(badges.some(b => b.badgeId === 'in_tune')).toBe(true);
  });

  it('does not re-award already earned badges', () => {
    const badges = evaluateBadges(baseInput, ['first_note']);
    expect(badges.some(b => b.badgeId === 'first_note')).toBe(false);
  });

  it('awards both_voices when both tiers have been used', () => {
    const input: BadgeCheckInput = { ...baseInput, bothTiersUsed: true };
    const badges = evaluateBadges(input, []);
    expect(badges.some(b => b.badgeId === 'both_voices')).toBe(true);
  });
});

describe('evaluateUnlocks', () => {
  const baseState = {
    userId: 'user-1',
    totalXp: 0,
    level: 1,
    streakDays: 0,
    streakShieldsRemaining: 0,
    earnedBadges: [],
    unlockedContent: [] as import('@voice/shared-types/src/index').UnlockableContentId[],
  };

  it('unlocks karaoke_mode at level 4', () => {
    const unlocks = evaluateUnlocks({ ...baseState, level: 4 }, 0);
    expect(unlocks).toContain('karaoke_mode');
  });

  it('does not re-unlock already unlocked content', () => {
    const unlocks = evaluateUnlocks(
      { ...baseState, level: 4, unlockedContent: ['karaoke_mode' as const] },
      0
    );
    expect(unlocks).not.toContain('karaoke_mode');
  });

  it('unlocks long_form_exercises after 30 sessions', () => {
    const unlocks = evaluateUnlocks(baseState, 30);
    expect(unlocks).toContain('long_form_exercises');
  });
});
