import type {
  XpSource,
  XpEvent,
  BadgeId,
  EarnedBadge,
  UserRewardState,
  SuccessBand,
  Tier,
  UnlockableContentId,
} from '@voice/shared-types';

// ------------------------------------------------------------
// XP TABLE
// ------------------------------------------------------------

export const XP_TABLE: Record<XpSource, number> = {
  session_complete:         10,
  score_good:               5,
  score_excellent:          10,
  personal_best:            15,
  karaoke_snippet_complete: 10,
  reflection_complete:      5,
  new_exercise_type:        5,
  level_complete:           50,
  style_pack_unlocked:      25,
  streak_milestone:         30, // Base; multiplied for longer streaks
};

/** Compute XP for a streak milestone (7/30/100 days) */
export function streakMilestoneXp(streakDays: number): number {
  if (streakDays >= 100) return 200;
  if (streakDays >= 30) return 75;
  if (streakDays >= 7) return 30;
  return 0;
}

// ------------------------------------------------------------
// LEVEL THRESHOLDS
// ------------------------------------------------------------

export const LEVEL_XP_THRESHOLDS: number[] = [
  0,     // Level 1:  Finding My Voice
  100,   // Level 2:  First Breath
  250,   // Level 3:  Warming Up
  500,   // Level 4:  On Pitch
  900,   // Level 5:  In the Room
  1400,  // Level 6:  Carrying It
  2100,  // Level 7:  Finding the Resonance
  3000,  // Level 8:  Full Voice
  4200,  // Level 9:  Consistent
  6000,  // Level 10: Stage Ready
];

export const LEVEL_NAMES: Record<number, string> = {
  1:  'Finding My Voice',
  2:  'First Breath',
  3:  'Warming Up',
  4:  'On Pitch',
  5:  'In the Room',
  6:  'Carrying It',
  7:  'Finding the Resonance',
  8:  'Full Voice',
  9:  'Consistent',
  10: 'Stage Ready',
};

export function getLevelForXp(totalXp: number): number {
  let level = 1;
  for (let i = 0; i < LEVEL_XP_THRESHOLDS.length; i++) {
    if (totalXp >= LEVEL_XP_THRESHOLDS[i]) {
      level = i + 1;
    } else {
      break;
    }
  }
  // Beyond level 10: +2000 XP per level
  if (totalXp >= LEVEL_XP_THRESHOLDS[9]) {
    const extra = totalXp - LEVEL_XP_THRESHOLDS[9];
    level = 10 + Math.floor(extra / 2000);
  }
  return level;
}

export function getXpToNextLevel(totalXp: number): number {
  const currentLevel = getLevelForXp(totalXp);
  if (currentLevel < 10) {
    return LEVEL_XP_THRESHOLDS[currentLevel] - totalXp;
  }
  // Beyond level 10
  const xpInCurrentLevel = (totalXp - LEVEL_XP_THRESHOLDS[9]) % 2000;
  return 2000 - xpInCurrentLevel;
}

// ------------------------------------------------------------
// XP COMPUTATION
// ------------------------------------------------------------

export function buildXpEvent(
  source: XpSource,
  context?: { sessionId?: string; exerciseId?: string; streakDays?: number; metadata?: Record<string, unknown> }
): XpEvent {
  let amount = XP_TABLE[source];

  // Override for streak milestones
  if (source === 'streak_milestone' && context?.streakDays) {
    amount = streakMilestoneXp(context.streakDays);
  }

  return {
    source,
    amount,
    timestamp: new Date().toISOString(),
    sessionId: context?.sessionId,
    exerciseId: context?.exerciseId,
    metadata: context?.metadata,
  };
}

export function computeSessionXp(
  band: SuccessBand,
  isPersonalBest: boolean,
  isNewExerciseType: boolean,
  reflectionCompleted: boolean,
): { events: XpEvent[]; total: number } {
  const events: XpEvent[] = [
    buildXpEvent('session_complete'),
  ];

  if (band === 'excellent') events.push(buildXpEvent('score_excellent'));
  else if (band === 'good') events.push(buildXpEvent('score_good'));

  if (isPersonalBest) events.push(buildXpEvent('personal_best'));
  if (isNewExerciseType) events.push(buildXpEvent('new_exercise_type'));
  if (reflectionCompleted) events.push(buildXpEvent('reflection_complete'));

  const total = events.reduce((sum, e) => sum + e.amount, 0);
  return { events, total };
}

// ------------------------------------------------------------
// BADGE EVALUATION
// ------------------------------------------------------------

export interface BadgeCheckInput {
  tier: Tier;
  sessionCount: number;
  exercisesCompleted: string[];  // Exercise IDs
  topScoreByExercise: Record<string, number>;
  fillerRateMinimum?: number;    // Best (lowest) filler rate achieved
  streakDays: number;
  karaokeSnippetsCompleted: number;
  karaokeFullSongsCompleted: number;
  stylePacks: string[];
  reflectionsCompleted: number;
  bothTiersUsed: boolean;
  vocalRangeSemitones?: number;
  rangeExpandedBy?: number;      // Semitones gained since baseline
  downturnRatioMax?: number;     // Best (highest) sentence-final downturn ratio
}

export type BadgeCheck = {
  badgeId: BadgeId;
  earned: (input: BadgeCheckInput, existingBadges: BadgeId[]) => boolean;
};

export const BADGE_CHECKS: BadgeCheck[] = [
  // Speaking
  { badgeId: 'first_word',     earned: (i) => i.tier === 'speaking' && i.sessionCount >= 1 },
  { badgeId: 'under_control',  earned: (i) => (i.topScoreByExercise['pace'] ?? 0) >= 80 },
  { badgeId: 'no_filler',      earned: (i) => (i.fillerRateMinimum ?? 99) < 1 },
  { badgeId: 'pause_master',   earned: (i) => (i.exercisesCompleted.filter(e => e.includes('pause')).length) >= 10 },
  { badgeId: 'authority_voice',earned: (i) => (i.downturnRatioMax ?? 0) >= 0.9 },
  { badgeId: 'the_hook',       earned: (i) => (i.topScoreByExercise['hook'] ?? 0) >= 85 },
  { badgeId: 'streak_30_speaking', earned: (i) => i.tier === 'speaking' && i.streakDays >= 30 },
  // Singing
  { badgeId: 'first_note',     earned: (i) => i.tier === 'singing' && i.sessionCount >= 1 },
  { badgeId: 'in_tune',        earned: (i) => Object.values(i.topScoreByExercise).some(s => s >= 80) },
  { badgeId: 'steady',         earned: (i) => (i.topScoreByExercise['stability'] ?? 0) >= 80 },
  { badgeId: 'found_the_note', earned: (i) => (i.topScoreByExercise['onset'] ?? 0) >= 80 },
  { badgeId: 'one_octave',     earned: (i) => (i.vocalRangeSemitones ?? 0) >= 12 },
  { badgeId: 'range_expanded', earned: (i) => (i.rangeExpandedBy ?? 0) >= 1 },
  { badgeId: 'first_song',     earned: (i) => i.karaokeFullSongsCompleted >= 1 },
  { badgeId: 'style_pioneer',  earned: (i) => i.stylePacks.length >= 1 },
  { badgeId: 'streak_30_singing', earned: (i) => i.tier === 'singing' && i.streakDays >= 30 },
  // Cross-tier
  { badgeId: 'both_voices',    earned: (i) => i.bothTiersUsed },
  { badgeId: 'sessions_100',   earned: (i) => i.sessionCount >= 100 },
  { badgeId: 'reflector',      earned: (i) => i.reflectionsCompleted >= 20 },
];

export function evaluateBadges(
  input: BadgeCheckInput,
  existingBadges: BadgeId[]
): EarnedBadge[] {
  const newBadges: EarnedBadge[] = [];
  const now = new Date().toISOString();

  for (const check of BADGE_CHECKS) {
    if (!existingBadges.includes(check.badgeId) && check.earned(input, existingBadges)) {
      newBadges.push({ badgeId: check.badgeId, earnedAt: now });
    }
  }

  return newBadges;
}

// ------------------------------------------------------------
// UNLOCK EVALUATION
// ------------------------------------------------------------

export function evaluateUnlocks(
  rewardState: UserRewardState,
  sessionCount: number
): UnlockableContentId[] {
  const newUnlocks: UnlockableContentId[] = [];
  const existing = rewardState.unlockedContent;

  const check = (id: UnlockableContentId, condition: boolean) => {
    if (!existing.includes(id) && condition) newUnlocks.push(id);
  };

  check('karaoke_mode',     rewardState.level >= 4);
  check('long_form_exercises', sessionCount >= 30);
  check('avatar_color_variant_1', rewardState.level >= 4);
  check('avatar_color_variant_2', rewardState.level >= 6);
  check('avatar_accessory_headphones', rewardState.streakDays >= 30);
  check('avatar_accessory_microphone', rewardState.streakDays >= 60);
  check('app_theme_dark',   rewardState.level >= 5);
  check('app_theme_warm',   rewardState.level >= 5);

  return newUnlocks;
}

// ------------------------------------------------------------
// STREAK MANAGEMENT
// ------------------------------------------------------------

export interface StreakUpdateResult {
  newStreakDays: number;
  streakExtended: boolean;
  streakBroken: boolean;
  shieldUsed: boolean;
  milestoneReached: boolean;
  milestoneXp: number;
}

export function computeStreakUpdate(
  lastSessionDate: string | undefined,
  currentStreakDays: number,
  streakShieldsRemaining: number,
  todayIso: string
): StreakUpdateResult {
  if (!lastSessionDate) {
    return { newStreakDays: 1, streakExtended: true, streakBroken: false, shieldUsed: false, milestoneReached: false, milestoneXp: 0 };
  }

  const last = new Date(lastSessionDate);
  const today = new Date(todayIso);
  const daysDiff = Math.floor((today.getTime() - last.getTime()) / (1000 * 60 * 60 * 24));

  if (daysDiff === 0) {
    // Already practiced today — no change
    return { newStreakDays: currentStreakDays, streakExtended: false, streakBroken: false, shieldUsed: false, milestoneReached: false, milestoneXp: 0 };
  }

  if (daysDiff === 1) {
    // Practiced yesterday — extend streak
    const newStreak = currentStreakDays + 1;
    const milestoneReached = [7, 14, 30, 60, 100].includes(newStreak);
    return { newStreakDays: newStreak, streakExtended: true, streakBroken: false, shieldUsed: false, milestoneReached, milestoneXp: milestoneReached ? streakMilestoneXp(newStreak) : 0 };
  }

  if (daysDiff === 2 && streakShieldsRemaining > 0) {
    // Missed one day — use shield
    const newStreak = currentStreakDays + 1;
    return { newStreakDays: newStreak, streakExtended: true, streakBroken: false, shieldUsed: true, milestoneReached: false, milestoneXp: 0 };
  }

  // Streak broken — reset to 1
  return { newStreakDays: 1, streakExtended: false, streakBroken: true, shieldUsed: false, milestoneReached: false, milestoneXp: 0 };
}

/** Compute shields remaining after a week — one shield earned per 7-day streak */
export function computeShieldsEarned(streakDays: number): number {
  return Math.floor(streakDays / 7);
}
