// ============================================================
// VOICE — Shared Domain Types
// Single source of truth for all contracts shared between
// the mobile app, backend services, and shared packages.
// ============================================================

// ------------------------------------------------------------
// TIERS
// ------------------------------------------------------------

export type Tier = 'speaking' | 'singing';

// ------------------------------------------------------------
// GOALS — Speaking Tier
// ------------------------------------------------------------

export type SpeakingGoal =
  | 'pace'            // Speaking rate and rhythm control
  | 'prosody'         // Pitch variability, intonation, avoiding monotone
  | 'projection'      // Volume, dynamics, carrying power
  | 'resonance'       // Tone placement, chest resonance, richness
  | 'articulation'    // Clarity, consonant precision
  | 'filler_reduction' // Reducing um/uh/like/etc.
  | 'authority'       // Downward inflection, confident delivery
  | 'breath_support'; // Breath endurance for extended speaking

// ------------------------------------------------------------
// GOALS — Singing Tier
// ------------------------------------------------------------

export type SingingGoal =
  | 'pitch'           // Pitch accuracy and matching
  | 'stability'       // Sustaining notes without wobble or drift
  | 'range'           // Expanding comfortable vocal range
  | 'breath_control'  // Breath support and endurance for singing
  | 'tone'            // Tone quality, resonance, timbre
  | 'agility'         // Moving between notes quickly and accurately
  | 'ear_training'    // Interval recognition and melodic memory
  | 'dynamics'        // Volume control (louder/softer intentionally)
  | 'vibrato';        // Developing and controlling vibrato

// ------------------------------------------------------------
// SPECIALIZATION TRACKS — Speaking Tier
// ------------------------------------------------------------

export type SpeakingTrack =
  | 'ted_conference'   // Public speaking and keynotes
  | 'podcast'          // Audio/video podcast hosting
  | 'social_media'     // Short-form video and creator content
  | 'job_interview'    // Interview confidence
  | 'classroom'        // Teaching and lecturing
  | 'executive';       // Corporate and leadership communication

// ------------------------------------------------------------
// STYLE PACKS — Singing Tier
// ------------------------------------------------------------

export type SingingStylePack =
  | 'pop'
  | 'jazz'
  | 'blues'
  | 'classical_opera'
  | 'musical_theatre'
  | 'rnb_soul'
  | 'rock'
  | 'heavy_metal'
  | 'grindcore'
  | 'country'
  | 'gospel';

// ------------------------------------------------------------
// SUCCESS BANDS — shared
// ------------------------------------------------------------

export type SuccessBand = 'excellent' | 'good' | 'developing' | 'retry';

// Maps score ranges to bands (same for both tiers)
// excellent: >= 85 | good: >= 70 | developing: >= 50 | retry: < 50

// ------------------------------------------------------------
// USER PROFILE
// ------------------------------------------------------------

export interface UserProfile {
  userId: string;
  displayName: string;
  activeTier: Tier;
  speakingGoal?: SpeakingGoal;
  singingGoal?: SingingGoal;
  speakingTrack?: SpeakingTrack;
  singingStylePack?: SingingStylePack;
  level: number;
  totalXp: number;
  streakDays: number;
  lastSessionDate?: string; // ISO 8601
  streakShieldsRemaining: number;
  createdAt: string;
}

// ------------------------------------------------------------
// SESSION STATE MACHINE — shared
// ------------------------------------------------------------

export type SessionState =
  | 'IDLE'
  | 'LOADING_SESSION'
  | 'READY'
  | 'WARM_UP'
  | 'EXERCISE_INTRO'
  | 'AWAITING_SIGNAL'
  | 'LISTENING'
  | 'ANALYZING'
  | 'RESULT_REVIEW'
  | 'REFLECTION'
  | 'SESSION_COMPLETE'
  | 'SESSION_ERROR';

export const initialSessionState: SessionState = 'IDLE';

// ------------------------------------------------------------
// EXERCISE TYPES
// ------------------------------------------------------------

export type ExerciseCategory =
  // Shared / foundational
  | 'breathing'
  // Speaking Tier
  | 'pace_control'
  | 'prosody'
  | 'projection'
  | 'resonance_speaking'
  | 'articulation'
  | 'filler_reduction'
  | 'authority_delivery'
  | 'speaking_stamina'
  // Singing Tier
  | 'pitch_matching'
  | 'sustained_hold'
  | 'scale_work'
  | 'interval_training'
  | 'passaggio'
  | 'dynamic_control'
  | 'vibrato'
  | 'style_specific'
  | 'karaoke_snippet';

export type TargetPatternType =
  | 'sustained_hold'      // Hold a note/pitch for duration
  | 'scale_ascending'     // Sing up a scale
  | 'scale_descending'    // Sing down a scale
  | 'interval_jump'       // Jump from note A to note B
  | 'passage_read'        // Read a text passage at target pace
  | 'free_speech'         // Unscripted speaking for N seconds
  | 'phrase_sing'         // Sing a melodic phrase
  | 'karaoke_snippet'     // Sing over a reference track snippet
  | 'breath_only'         // Breathing exercise (no pitch target)
  | 'hum_resonance';      // Hum for resonance placement

export interface ExerciseDefinition {
  exerciseId: string;
  version: number;
  tier: Tier;
  category: ExerciseCategory;
  subcategory: string;
  title: string;
  description: string;
  userInstructionText: string;
  durationTargetSeconds: number;
  repetitionsDefault: number;
  targetPatternType: TargetPatternType;
  targetPatternPayload: Record<string, unknown>;
  evaluationConfig: Record<string, unknown>;
  scoringWeights: Record<string, number>;
  feedbackRuleSetId: string;
  prerequisiteExerciseIds?: string[];
  minimumLevelRequired?: number;
  stylePack?: SingingStylePack;
  activeFlag: boolean;
}

// ------------------------------------------------------------
// AUDIO METRICS — Singing Tier
// ------------------------------------------------------------

export interface LivePitchFrame {
  timestampMs: number;
  frequencyHz?: number;
  centsFromTarget?: number;
  voiced: boolean;
  confidence: number;
}

export interface SingingExerciseScoreBreakdown {
  pitchAccuracy: number;   // 0–100: time-in-tolerance + median cents error
  stability: number;       // 0–100: inverse of std dev of cents error
  onsetAccuracy?: number;  // 0–100: time-to-lock normalized
  dynamics?: number;       // 0–100: RMS consistency (Phase 2)
  vibrato?: number;        // 0–100: vibrato rate/width match (Phase 2)
  overall: number;
}

export interface ExerciseMetricResult {
  metricType: string;
  rawValue?: number;
  normalizedValue?: number;
  confidenceScore?: number;
  metadata?: Record<string, unknown>;
}

// ------------------------------------------------------------
// AUDIO METRICS — Speaking Tier
// ------------------------------------------------------------

export interface LiveSpeakingFrame {
  timestampMs: number;
  frequencyHz?: number;      // F0 (fundamental frequency)
  rmsDb?: number;            // Volume level
  voiced: boolean;
  confidence: number;
  isInPausePeriod?: boolean; // True during detected silence gap
}

export interface SpeakingExerciseScoreBreakdown {
  pace?: number;             // 0–100: WPM vs target range
  prosody?: number;          // 0–100: F0 range + intonation patterns
  projection?: number;       // 0–100: RMS level + consistency
  fillerRate?: number;       // 0–100: inverse of fillers-per-minute
  authorityMarkers?: number; // 0–100: sentence-final downward inflection rate
  overall: number;
}

export interface FillerWordEvent {
  timestampMs: number;
  word: string;
  confidence: number;
}

export interface SpeakingAnalysisResult {
  wpm: number;
  articulationRateWpm: number; // WPM excluding pauses
  meanF0Hz: number;
  f0RangeHz: number;           // Max F0 - min F0 during voiced frames
  uptalkRatio: number;         // 0–1: proportion of clauses with rising final F0
  pauseCount: number;
  meanPauseDurationMs: number;
  meanRmsDb: number;
  rmsVarianceDb: number;
  fillerEvents: FillerWordEvent[];
  fillerRate: number;          // fillers per minute
  hnr?: number;                // Harmonics-to-Noise Ratio (Phase 2)
}

// ------------------------------------------------------------
// KARAOKE MODE — Singing Tier, Phase 2
// ------------------------------------------------------------

export type KaraokeProcessingStatus =
  | 'queued'
  | 'separating'
  | 'analyzing'
  | 'ready'
  | 'error';

export interface KaraokeSong {
  songId: string;
  title: string;
  artist: string;
  albumArtUrl?: string;
  durationSeconds: number;
  estimatedDifficulty: 1 | 2 | 3 | 4 | 5; // 1 = easiest
  keySignature?: string;
  tempoRange?: { minBpm: number; maxBpm: number };
  vocalRange?: { lowestNote: string; highestNote: string };
  styleTags: SingingStylePack[];
  processingStatus: KaraokeProcessingStatus;
  instrumentalUrl?: string;   // Available when processingStatus = 'ready'
  vocalAnalysisId?: string;   // Reference to stored vocal analysis data
}

export interface KaraokeSnippet {
  snippetId: string;
  songId: string;
  startMs: number;
  endMs: number;
  durationMs: number;
  difficulty: 1 | 2 | 3 | 4 | 5;
  lyricsText?: string;
  referencePitchCurve: LivePitchFrame[]; // Extracted from original vocal stem
  orderInSong: number;                   // Snippet index for phrase map
}

export type KaraokeSnippetStatus = 'locked' | 'active' | 'in_progress' | 'completed';

export interface KaraokeSnippetProgress {
  snippetId: string;
  status: KaraokeSnippetStatus;
  bestMatchScore?: number;         // 0–100
  bestAttemptId?: string;
  totalAttempts: number;
  completedAt?: string;            // ISO 8601
}

export interface KaraokeSongProgress {
  songId: string;
  userId: string;
  snippetProgress: KaraokeSnippetProgress[];
  overallMatchScore?: number;      // Average of completed snippets
  isCompleted: boolean;
  startedAt: string;
  completedAt?: string;
}

export interface KaraokeAttemptScore {
  pitchSimilarity: number;         // 0–100: DTW pitch comparison
  timingAccuracy: number;          // 0–100: phrase onset + duration
  contourMatch: number;            // 0–100: gross melodic shape
  overall: number;                 // Weighted composite
  dominantFailureMode?: 'pitch_flat' | 'pitch_sharp' | 'rushing' | 'dragging' | 'wrong_contour' | 'pitch_instability';
}

// ------------------------------------------------------------
// AVATAR STATE MACHINE
// ------------------------------------------------------------

export type AvatarBehaviorState =
  | 'IDLE'
  | 'INTRO'
  | 'LISTENING'
  | 'ANALYZING'
  | 'COACHING'
  | 'CELEBRATING';

export interface AvatarDialogueLine {
  text: string;
  state: AvatarBehaviorState;
  durationMs?: number; // How long to display before auto-advance
  awaitUserAction?: boolean;
}

export interface CoachingPayload {
  praiseMessage: string;
  correctionMessage: string;
  actionTip: string;
  successBand: SuccessBand;
  microExerciseCue?: string; // Optional 10-second drill suggestion
}

// ------------------------------------------------------------
// REWARD SYSTEM
// ------------------------------------------------------------

export type XpSource =
  | 'session_complete'
  | 'score_good'
  | 'score_excellent'
  | 'personal_best'
  | 'karaoke_snippet_complete'
  | 'reflection_complete'
  | 'new_exercise_type'
  | 'level_complete'
  | 'style_pack_unlocked'
  | 'streak_milestone';

export interface XpEvent {
  source: XpSource;
  amount: number;
  timestamp: string; // ISO 8601
  sessionId?: string;
  exerciseId?: string;
  metadata?: Record<string, unknown>;
}

export type BadgeId =
  // Speaking
  | 'first_word'
  | 'under_control'
  | 'no_filler'
  | 'pause_master'
  | 'authority_voice'
  | 'the_hook'
  | 'streak_30_speaking'
  // Singing
  | 'first_note'
  | 'in_tune'
  | 'steady'
  | 'found_the_note'
  | 'one_octave'
  | 'range_expanded'
  | 'first_song'
  | 'style_pioneer'
  | 'streak_30_singing'
  // Cross-tier
  | 'both_voices'
  | 'sessions_100'
  | 'best_take'
  | 'reflector';

export interface EarnedBadge {
  badgeId: BadgeId;
  earnedAt: string; // ISO 8601
  sessionId?: string;
}

export type UnlockableContentId =
  | 'karaoke_mode'
  | `style_pack_${SingingStylePack}`
  | `speaking_track_${SpeakingTrack}`
  | 'long_form_exercises'
  | 'avatar_color_variant_1'
  | 'avatar_color_variant_2'
  | 'avatar_accessory_headphones'
  | 'avatar_accessory_microphone'
  | 'app_theme_dark'
  | 'app_theme_warm';

export interface UserRewardState {
  userId: string;
  totalXp: number;
  level: number;
  streakDays: number;
  streakShieldsRemaining: number;
  lastStreakDate?: string;
  earnedBadges: EarnedBadge[];
  unlockedContent: UnlockableContentId[];
}

// ------------------------------------------------------------
// CURRICULUM / LESSON PLAN
// ------------------------------------------------------------

export type CurriculumLevel = 1 | 2 | 3 | 4;

export interface LessonPlan {
  planId: string;
  tier: Tier;
  level: CurriculumLevel;
  goal: SpeakingGoal | SingingGoal;
  sessionCount: number;            // Expected number of sessions in this plan
  exerciseSequence: string[];      // Ordered list of exerciseIds
  unlockCondition?: {
    requiredLevel?: CurriculumLevel;
    requiredBadges?: BadgeId[];
    minSessionCount?: number;
  };
}

// ------------------------------------------------------------
// SESSION AND ATTEMPT RECORDS
// ------------------------------------------------------------

export interface Session {
  sessionId: string;
  userId: string;
  tier: Tier;
  startedAt: string;
  completedAt?: string;
  exerciseIds: string[];
  xpEarned: number;
  reflectionSubmitted: boolean;
}

export interface Attempt {
  attemptId: string;
  sessionId: string;
  exerciseId: string;
  userId: string;
  tier: Tier;
  startedAt: string;
  completedAt?: string;
  audioFileUrl?: string;       // Stored in Supabase Storage
  durationMs?: number;
}

export interface SingingAttemptMetrics {
  attemptId: string;
  pitchScore: number;
  stabilityScore: number;
  onsetScore?: number;
  overallScore: number;
  successBand: SuccessBand;
  medianCentsError?: number;
  timeInToleranceMs?: number;
  pitchFrames?: LivePitchFrame[];
}

export interface SpeakingAttemptMetrics {
  attemptId: string;
  paceScore?: number;
  prosodyScore?: number;
  projectionScore?: number;
  fillerScore?: number;
  authorityScore?: number;
  overallScore: number;
  successBand: SuccessBand;
  analysis?: SpeakingAnalysisResult;
}

export interface BestTake {
  bestTakeId: string;
  userId: string;
  exerciseId: string;
  tier: Tier;
  attemptId: string;
  overallScore: number;
  createdAt: string;
  audioFileUrl?: string;
}

export interface Reflection {
  reflectionId: string;
  sessionId: string;
  userId: string;
  prompt1Answer: string;  // "What felt easiest?"
  prompt2Answer: string;  // "What will you focus on next time?"
  submittedAt: string;
}

// ------------------------------------------------------------
// ANALYTICS EVENTS
// ------------------------------------------------------------

export type AnalyticsEventName =
  | 'mic_permission_prompted'
  | 'mic_permission_granted'
  | 'mic_permission_denied'
  | 'mic_check_started'
  | 'mic_check_passed'
  | 'mic_check_failed'
  | 'tier_selected'
  | 'goal_selected'
  | 'session_started'
  | 'session_completed'
  | 'exercise_started'
  | 'exercise_completed'
  | 'attempt_started'
  | 'attempt_completed'
  | 'attempt_scored'
  | 'personal_best_set'
  | 'best_take_updated'
  | 'best_take_replay_started'
  | 'best_take_replay_completed'
  | 'reflection_submitted'
  | 'badge_earned'
  | 'level_up'
  | 'streak_extended'
  | 'streak_broken'
  | 'karaoke_song_selected'
  | 'karaoke_snippet_attempted'
  | 'karaoke_snippet_completed'
  | 'style_pack_unlocked'
  | 'style_pack_exercise_started';

export interface AnalyticsEvent {
  eventName: AnalyticsEventName;
  userId: string;
  sessionId?: string;
  tier?: Tier;
  timestamp: string; // ISO 8601
  properties?: Record<string, unknown>;
}
