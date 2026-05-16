// ============================================================
// VOICE — Shared Domain Types
// Single source of truth for all contracts shared between
// the mobile app, backend services, and shared packages.
// ============================================================
// ------------------------------------------------------------
// STYLE PACKS — Singing Tier
// ------------------------------------------------------------
// Runtime-safe constant array — consumed by z.enum() in content-schema
export const SINGING_STYLE_PACKS = [
    'pop',
    'jazz',
    'blues',
    'classical_opera',
    'musical_theatre',
    'rnb_soul',
    'rock',
    'heavy_metal',
    'grindcore',
    'country',
    'gospel',
];
export function scoreToBand(score) {
    if (score >= 85)
        return 'excellent';
    if (score >= 70)
        return 'good';
    if (score >= 50)
        return 'developing';
    return 'retry';
}
export const initialSessionState = 'IDLE';
// ------------------------------------------------------------
// EXERCISE TYPES
// ------------------------------------------------------------
// Runtime-safe constant arrays — consumed by z.enum() in content-schema
export const EXERCISE_CATEGORIES = [
    // Shared / foundational
    'breathing',
    // Speaking Tier
    'pace_control',
    'prosody',
    'projection',
    'resonance_speaking',
    'articulation',
    'filler_reduction',
    'authority_delivery',
    'speaking_stamina',
    // Singing Tier
    'pitch_matching',
    'sustained_hold',
    'scale_work',
    'interval_training',
    'passaggio',
    'dynamic_control',
    'vibrato',
    'style_specific',
    'karaoke_snippet',
];
export const TARGET_PATTERN_TYPES = [
    'sustained_hold', // Hold a note/pitch for duration
    'scale_ascending', // Sing up a scale
    'scale_descending', // Sing down a scale
    'interval_jump', // Jump from note A to note B
    'passage_read', // Read a text passage at target pace
    'free_speech', // Unscripted speaking for N seconds
    'phrase_sing', // Sing a melodic phrase
    'karaoke_snippet', // Sing over a reference track snippet
    'breath_only', // Breathing exercise (no pitch target)
    'hum_resonance', // Hum for resonance placement
];
