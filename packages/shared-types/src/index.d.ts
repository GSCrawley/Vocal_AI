export type Tier = 'speaking' | 'singing';
export type SpeakingGoal = 'pace' | 'prosody' | 'projection' | 'resonance' | 'articulation' | 'filler_reduction' | 'authority' | 'breath_support';
export type SingingGoal = 'pitch' | 'stability' | 'range' | 'breath_control' | 'tone' | 'agility' | 'ear_training' | 'dynamics' | 'vibrato';
export type SpeakingTrack = 'ted_conference' | 'podcast' | 'social_media' | 'job_interview' | 'classroom' | 'executive';
export declare const SINGING_STYLE_PACKS: readonly ["pop", "jazz", "blues", "classical_opera", "musical_theatre", "rnb_soul", "rock", "heavy_metal", "grindcore", "country", "gospel"];
export type SingingStylePack = (typeof SINGING_STYLE_PACKS)[number];
export type SuccessBand = 'excellent' | 'good' | 'developing' | 'retry';
export declare function scoreToBand(score: number): SuccessBand;
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
    lastSessionDate?: string;
    streakShieldsRemaining: number;
    createdAt: string;
}
export type SessionState = 'IDLE' | 'LOADING_SESSION' | 'READY' | 'WARM_UP' | 'EXERCISE_INTRO' | 'AWAITING_SIGNAL' | 'LISTENING' | 'ANALYZING' | 'RESULT_REVIEW' | 'REFLECTION' | 'SESSION_COMPLETE' | 'SESSION_ERROR';
export declare const initialSessionState: SessionState;
export declare const EXERCISE_CATEGORIES: readonly ["breathing", "pace_control", "prosody", "projection", "resonance_speaking", "articulation", "filler_reduction", "authority_delivery", "speaking_stamina", "pitch_matching", "sustained_hold", "scale_work", "interval_training", "passaggio", "dynamic_control", "vibrato", "style_specific", "karaoke_snippet"];
export type ExerciseCategory = (typeof EXERCISE_CATEGORIES)[number];
export declare const TARGET_PATTERN_TYPES: readonly ["sustained_hold", "scale_ascending", "scale_descending", "interval_jump", "passage_read", "free_speech", "phrase_sing", "karaoke_snippet", "breath_only", "hum_resonance"];
export type TargetPatternType = (typeof TARGET_PATTERN_TYPES)[number];
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
export interface LivePitchFrame {
    timestampMs: number;
    frequencyHz?: number;
    centsFromTarget?: number;
    voiced: boolean;
    confidence: number;
}
export interface SingingExerciseScoreBreakdown {
    pitchAccuracy: number;
    stability: number;
    onsetAccuracy?: number;
    dynamics?: number;
    vibrato?: number;
    overall: number;
}
export interface ExerciseMetricResult {
    metricType: string;
    rawValue?: number;
    normalizedValue?: number;
    confidenceScore?: number;
    metadata?: Record<string, unknown>;
}
export interface LiveSpeakingFrame {
    timestampMs: number;
    frequencyHz?: number;
    rmsDb?: number;
    voiced: boolean;
    confidence: number;
    isInPausePeriod?: boolean;
}
export interface SpeakingExerciseScoreBreakdown {
    pace?: number;
    prosody?: number;
    projection?: number;
    fillerRate?: number;
    authorityMarkers?: number;
    overall: number;
}
export interface FillerWordEvent {
    timestampMs: number;
    word: string;
    confidence: number;
}
export interface SpeakingAnalysisResult {
    wpm: number;
    articulationRateWpm: number;
    meanF0Hz: number;
    f0RangeHz: number;
    uptalkRatio: number;
    pauseCount: number;
    meanPauseDurationMs: number;
    meanRmsDb: number;
    rmsVarianceDb: number;
    fillerEvents: FillerWordEvent[];
    fillerRate: number;
    hnr?: number;
}
export type KaraokeProcessingStatus = 'queued' | 'separating' | 'analyzing' | 'ready' | 'error';
export interface KaraokeSong {
    songId: string;
    title: string;
    artist: string;
    albumArtUrl?: string;
    durationSeconds: number;
    estimatedDifficulty: 1 | 2 | 3 | 4 | 5;
    keySignature?: string;
    tempoRange?: {
        minBpm: number;
        maxBpm: number;
    };
    vocalRange?: {
        lowestNote: string;
        highestNote: string;
    };
    styleTags: SingingStylePack[];
    processingStatus: KaraokeProcessingStatus;
    instrumentalUrl?: string;
    vocalAnalysisId?: string;
}
export interface KaraokeSnippet {
    snippetId: string;
    songId: string;
    startMs: number;
    endMs: number;
    durationMs: number;
    difficulty: 1 | 2 | 3 | 4 | 5;
    lyricsText?: string;
    referencePitchCurve: LivePitchFrame[];
    orderInSong: number;
}
export type KaraokeSnippetStatus = 'locked' | 'active' | 'in_progress' | 'completed';
export interface KaraokeSnippetProgress {
    snippetId: string;
    status: KaraokeSnippetStatus;
    bestMatchScore?: number;
    bestAttemptId?: string;
    totalAttempts: number;
    completedAt?: string;
}
export interface KaraokeSongProgress {
    songId: string;
    userId: string;
    snippetProgress: KaraokeSnippetProgress[];
    overallMatchScore?: number;
    isCompleted: boolean;
    startedAt: string;
    completedAt?: string;
}
export interface KaraokeAttemptScore {
    pitchSimilarity: number;
    timingAccuracy: number;
    contourMatch: number;
    overall: number;
    dominantFailureMode?: 'pitch_flat' | 'pitch_sharp' | 'rushing' | 'dragging' | 'wrong_contour' | 'pitch_instability';
}
export type AvatarBehaviorState = 'IDLE' | 'INTRO' | 'LISTENING' | 'ANALYZING' | 'COACHING' | 'CELEBRATING';
export interface AvatarDialogueLine {
    text: string;
    state: AvatarBehaviorState;
    durationMs?: number;
    awaitUserAction?: boolean;
}
export interface CoachingPayload {
    praiseMessage: string;
    correctionMessage: string;
    actionTip: string;
    successBand: SuccessBand;
    microExerciseCue?: string;
}
export type XpSource = 'session_complete' | 'score_good' | 'score_excellent' | 'personal_best' | 'karaoke_snippet_complete' | 'reflection_complete' | 'new_exercise_type' | 'level_complete' | 'style_pack_unlocked' | 'streak_milestone';
export interface XpEvent {
    source: XpSource;
    amount: number;
    timestamp: string;
    sessionId?: string;
    exerciseId?: string;
    metadata?: Record<string, unknown>;
}
export type BadgeId = 'first_word' | 'under_control' | 'no_filler' | 'pause_master' | 'authority_voice' | 'the_hook' | 'streak_30_speaking' | 'first_note' | 'in_tune' | 'steady' | 'found_the_note' | 'one_octave' | 'range_expanded' | 'first_song' | 'style_pioneer' | 'streak_30_singing' | 'both_voices' | 'sessions_100' | 'best_take' | 'reflector';
export interface EarnedBadge {
    badgeId: BadgeId;
    earnedAt: string;
    sessionId?: string;
}
export type UnlockableContentId = 'karaoke_mode' | `style_pack_${SingingStylePack}` | `speaking_track_${SpeakingTrack}` | 'long_form_exercises' | 'avatar_color_variant_1' | 'avatar_color_variant_2' | 'avatar_accessory_headphones' | 'avatar_accessory_microphone' | 'app_theme_dark' | 'app_theme_warm';
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
export type CurriculumLevel = 1 | 2 | 3 | 4;
export interface LessonPlan {
    planId: string;
    tier: Tier;
    level: CurriculumLevel;
    goal: SpeakingGoal | SingingGoal;
    sessionCount: number;
    exerciseSequence: string[];
    unlockCondition?: {
        requiredLevel?: CurriculumLevel;
        requiredBadges?: BadgeId[];
        minSessionCount?: number;
    };
}
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
    audioFileUrl?: string;
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
    prompt1Answer: string;
    prompt2Answer: string;
    submittedAt: string;
}
export type AnalyticsEventName = 'mic_permission_prompted' | 'mic_permission_granted' | 'mic_permission_denied' | 'mic_check_started' | 'mic_check_passed' | 'mic_check_failed' | 'tier_selected' | 'goal_selected' | 'session_started' | 'session_completed' | 'exercise_started' | 'exercise_completed' | 'attempt_started' | 'attempt_completed' | 'attempt_scored' | 'personal_best_set' | 'best_take_updated' | 'best_take_replay_started' | 'best_take_replay_completed' | 'reflection_submitted' | 'badge_earned' | 'level_up' | 'streak_extended' | 'streak_broken' | 'karaoke_song_selected' | 'karaoke_snippet_attempted' | 'karaoke_snippet_completed' | 'style_pack_unlocked' | 'style_pack_exercise_started';
export interface AnalyticsEvent {
    eventName: AnalyticsEventName;
    userId: string;
    sessionId?: string;
    tier?: Tier;
    timestamp: string;
    properties?: Record<string, unknown>;
}
