import type {
  AvatarBehaviorState,
  AvatarDialogueLine,
  CoachingPayload,
  SessionState,
  Tier,
  SuccessBand,
} from '@voice/shared-types';

// ------------------------------------------------------------
// STATE MACHINE TRANSITIONS
// ------------------------------------------------------------

/**
 * Map a SessionState to the appropriate AvatarBehaviorState.
 * The avatar mirrors the session's current phase.
 */
export function sessionStateToAvatarState(sessionState: SessionState): AvatarBehaviorState {
  const map: Record<SessionState, AvatarBehaviorState> = {
    IDLE:             'IDLE',
    LOADING_SESSION:  'IDLE',
    READY:            'IDLE',
    WARM_UP:          'INTRO',
    EXERCISE_INTRO:   'INTRO',
    AWAITING_SIGNAL:  'INTRO',
    LISTENING:        'LISTENING',
    ANALYZING:        'ANALYZING',
    RESULT_REVIEW:    'COACHING',
    REFLECTION:       'COACHING',
    SESSION_COMPLETE: 'IDLE',
    SESSION_ERROR:    'COACHING',
  };
  return map[sessionState];
}

/**
 * Override COACHING → CELEBRATING when a personal best or milestone is reached.
 */
export function resolveAvatarState(
  sessionState: SessionState,
  isPersonalBest: boolean,
  isMilestone: boolean,
  successBand?: SuccessBand
): AvatarBehaviorState {
  const base = sessionStateToAvatarState(sessionState);
  if (
    sessionState === 'RESULT_REVIEW' &&
    (isPersonalBest || isMilestone || successBand === 'excellent')
  ) {
    return 'CELEBRATING';
  }
  return base;
}

// ------------------------------------------------------------
// DIALOGUE TEMPLATES
// ------------------------------------------------------------

export interface DialogueContext {
  tier: Tier;
  exerciseTitle?: string;
  exerciseInstruction?: string;
  coaching?: CoachingPayload;
  sessionCount?: number;       // How many sessions the user has completed total
  isPersonalBest?: boolean;
  isMilestone?: boolean;
  milestoneDescription?: string;
  lastSessionFocus?: string;
}

/**
 * Generate an INTRO dialogue sequence for an exercise.
 */
export function buildIntroDialogue(ctx: DialogueContext): AvatarDialogueLine[] {
  const { tier, exerciseTitle, exerciseInstruction, sessionCount = 0 } = ctx;

  const lines: AvatarDialogueLine[] = [];

  // First session greeting vs returning user
  if (sessionCount === 0) {
    lines.push({
      text: tier === 'speaking'
        ? "Let's start with something simple. We're just going to get a baseline for your voice — no pressure."
        : "Welcome. Let's find out where your voice is today. We'll start easy.",
      state: 'INTRO',
      durationMs: 4000,
    });
  } else if (ctx.lastSessionFocus) {
    lines.push({
      text: `Last time you were working on ${ctx.lastSessionFocus}. Let's pick up from there.`,
      state: 'INTRO',
      durationMs: 3000,
    });
  }

  if (exerciseTitle) {
    lines.push({
      text: `Today's exercise: ${exerciseTitle}.`,
      state: 'INTRO',
      durationMs: 2000,
    });
  }

  if (exerciseInstruction) {
    lines.push({
      text: exerciseInstruction,
      state: 'INTRO',
      awaitUserAction: true,
    });
  }

  return lines;
}

/**
 * Generate a COACHING dialogue sequence after a result.
 */
export function buildCoachingDialogue(
  coaching: CoachingPayload,
  isPersonalBest: boolean
): AvatarDialogueLine[] {
  const lines: AvatarDialogueLine[] = [];

  if (isPersonalBest) {
    lines.push({
      text: `${coaching.praiseMessage} That's a personal best.`,
      state: 'CELEBRATING',
      durationMs: 3000,
    });
  } else {
    lines.push({
      text: coaching.praiseMessage,
      state: 'COACHING',
      durationMs: 2000,
    });
  }

  lines.push({
    text: coaching.correctionMessage,
    state: 'COACHING',
    durationMs: 3500,
  });

  lines.push({
    text: coaching.actionTip,
    state: 'COACHING',
    awaitUserAction: true,
  });

  return lines;
}

/**
 * Generate CELEBRATING dialogue for milestones.
 */
export function buildCelebrationDialogue(
  ctx: DialogueContext
): AvatarDialogueLine[] {
  const { isMilestone, milestoneDescription, tier } = ctx;

  if (!isMilestone && !ctx.isPersonalBest) return [];

  const lines: AvatarDialogueLine[] = [];

  if (milestoneDescription) {
    lines.push({
      text: milestoneDescription,
      state: 'CELEBRATING',
      durationMs: 4000,
    });
  } else {
    lines.push({
      text: tier === 'speaking'
        ? "That's a milestone. Your voice is building something real."
        : "That's a milestone. Listen to how far you've come.",
      state: 'CELEBRATING',
      durationMs: 3500,
    });
  }

  return lines;
}

/**
 * Generate REFLECTION dialogue — two prompts at session end.
 */
export function buildReflectionDialogue(tier: Tier): AvatarDialogueLine[] {
  return [
    {
      text: "Two quick questions before you go.",
      state: 'COACHING',
      durationMs: 2000,
    },
    {
      text: "What felt easiest in today's session?",
      state: 'COACHING',
      awaitUserAction: true,
    },
    {
      text: "And what will you focus on next time you practice?",
      state: 'COACHING',
      awaitUserAction: true,
    },
  ];
}

/**
 * Generate LISTENING state entry dialogue.
 */
export function buildListeningPrompt(tier: Tier, isRetry: boolean): AvatarDialogueLine {
  if (isRetry) {
    return {
      text: tier === 'speaking' ? "Go ahead when you're ready." : "Try again — take a breath first.",
      state: 'LISTENING',
      durationMs: 1500,
    };
  }
  return {
    text: tier === 'speaking' ? "I'm listening." : "Whenever you're ready.",
    state: 'LISTENING',
    durationMs: 1500,
  };
}

// ------------------------------------------------------------
// VOCAL SAFETY DIALOGUE
// ------------------------------------------------------------

/**
 * Dialogue for when strain-risk heuristics are triggered.
 */
export const STRAIN_WARNING_DIALOGUE: AvatarDialogueLine = {
  text: "Let's ease off for a moment. If your voice is feeling any strain or tension, take a break — it's always worth protecting. Ease-first, always.",
  state: 'COACHING',
  awaitUserAction: true,
};

/**
 * Dialogue for mic check failure (too noisy / clipping).
 */
export const MIC_CHECK_FAIL_DIALOGUE: AvatarDialogueLine[] = [
  {
    text: "I'm having trouble hearing you clearly — there might be too much background noise or the mic is too close.",
    state: 'COACHING',
    durationMs: 3500,
  },
  {
    text: "Try moving to a quieter spot, or move the mic a little further from your mouth. Let's check again.",
    state: 'COACHING',
    awaitUserAction: true,
  },
];

/**
 * Dialogue for session error state.
 */
export const SESSION_ERROR_DIALOGUE: AvatarDialogueLine = {
  text: "Something went wrong on my end. Your progress is saved — let's try that again.",
  state: 'COACHING',
  awaitUserAction: true,
};

// ------------------------------------------------------------
// AVATAR ANIMATION ASSET MAP
// ------------------------------------------------------------

/**
 * Maps behavioral states to Lottie animation asset file names.
 * Actual file paths will be resolved in the mobile app.
 */
export const AVATAR_ANIMATION_ASSETS: Record<AvatarBehaviorState, string> = {
  IDLE:       'avatar_idle.json',
  INTRO:      'avatar_intro.json',
  LISTENING:  'avatar_listening.json',
  ANALYZING:  'avatar_analyzing.json',
  COACHING:   'avatar_coaching.json',
  CELEBRATING:'avatar_celebrating.json',
};

export type AvatarTierColor = {
  primary: string;
  accent: string;
  background: string;
};

/**
 * Avatar color theme shifts based on active tier.
 * These drive the avatar's background tint and UI color scheme.
 */
export const AVATAR_TIER_COLORS: Record<Tier, AvatarTierColor> = {
  speaking: {
    primary:    '#D97706', // Amber
    accent:     '#F59E0B', // Gold
    background: '#FEF3C7', // Warm cream
  },
  singing: {
    primary:    '#6D28D9', // Violet
    accent:     '#8B5CF6', // Purple
    background: '#EDE9FE', // Lavender
  },
};
