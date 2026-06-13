# VOICE: Architecture Gap Analysis & AI Stack Recommendations

> This document reflects a full read of the `GSCrawley/Vocal_AI` repository as of May 2026, combined with research on the current state of vocal AI, source separation, singing voice synthesis, and adaptive coaching systems. It takes the revised product vision — voice training as the core loop, song practice as the reward, no proprietary catalog required — as the foundational constraint.

---

## What the Repo Already Does Well

Before identifying gaps, it is worth being precise about what is actually built, because the scaffold is more solid than a typical early-stage repo:

- The **session state machine** (`exercise-engine`) is clean and complete. All states are handled, transitions are explicit, and the machine is fully tested.
- The **shared type system** (`shared-types`) is well-designed. The `ExerciseDefinition`, `LivePitchFrame`, `SingingExerciseScoreBreakdown`, and `KaraokeAttemptScore` types are production-quality contracts.
- **Pitch accuracy scoring** (`audio-metrics`) covers the right fundamentals: pitch accuracy, stability, onset. The math is correct.
- The **karaoke engine** correctly implements DTW contour matching and snippet progression logic.
- The **reward engine** is complete with XP table, level thresholds, badge evaluation, and streak management.
- The **curriculum engine** provides level determination and session plan construction.
- The **coaching rules** map score bands to feedback payloads — the right pattern.
- The **avatar spec** is one of the best-designed documents in the repo: character identity, behavioral states, dialogue principles, and the two-layer (deterministic + LLM) dialogue system are all sound.

The scaffold is not missing basic plumbing. It is missing the **intelligence layer** — the system that actually understands a human singing voice across all 11 metrics you've described, adapts to what it hears, and generates a truly personalized learning path. That is the hard part, and it is currently almost entirely absent.

---

## Gap 1 — The Metric Coverage Problem

### What exists

`audio-metrics` currently measures:

- Pitch accuracy (cents from target)
- Pitch stability (standard deviation of pitch error)
- Onset accuracy (time-to-lock)
- RMS volume (structural scaffold in `SingingExerciseScoreBreakdown`, not yet implemented)
- Vibrato (type stub only, "Phase 2")

### What is missing

Of the 11 coaching metrics you've defined, 8 are either absent or stub-level:

| Metric               | Status in repo          | What's needed                                |
| -------------------- | ----------------------- | -------------------------------------------- |
| Vocal Range          | Not implemented         | Range detection from baseline assessment     |
| Tone Quality         | Not implemented         | Harmonic richness, formant analysis, CPP     |
| Pitch Accuracy       | ✅ Implemented          | Complete                                     |
| Breath Control       | Volume scaffold only    | HNR, RMS steadiness, CPP, phonation duration |
| Diction/Articulation | Not implemented         | Phoneme clarity via Whisper or wav2vec       |
| Dynamics             | Scaffold only           | Intentional crescendo/decrescendo detection  |
| Style/Expression     | Not implemented         | Style marker detection per genre             |
| Musicality           | Not implemented         | Rhythm accuracy, phrase shape matching       |
| Physical Posture     | Out of scope (no video) | Note in UI only; out of audio scope          |
| Consistency          | Session-level only      | Cross-session metric trending                |
| Repertoire Knowledge | Not implemented         | Song library completion tracking             |

### The solution stack

The audio-processor Python service is the right home for these. The implementation approach for each:

**Tone Quality (HNR + CPP + Formants)**
Use `parselmouth` (Praat's Python wrapper). Praat's [harmonics-to-noise ratio](https://www.fon.hum.uva.nl/praat/) and cepstral peak prominence are standard clinical voice quality measures. CPP correlates strongly with perceived voice quality and breathiness. Extract F1/F2 formants for vowel quality coaching.

```python
import parselmouth
sound = parselmouth.Sound(audio_path)
harmonicity = sound.to_harmonicity()  # HNR
hnr = harmonicity.values.mean()
```

**Breath Control / Phonation**
Combine RMS envelope steadiness (already partially in spec) with phonation duration (how long can the user sustain a voiced frame continuously) and HNR variance. A real breath control metric is the combination of: (1) how steady is the energy across a sustained note, and (2) how long can they sustain it without pitch drift beginning.

**Diction and Articulation**
Use [OpenAI Whisper](https://github.com/openai/whisper) (already referenced in `FillerDetectionJob`) on user recordings, compare phoneme sequence to expected lyrics, flag substitutions and elisions. The filler detection job type already exists in the audio-processor contract — the same infrastructure handles diction scoring.

**Vibrato**
Already partially designed in the singing tier spec. Implementation: apply FFT to the pitch curve (not the audio) to detect oscillation rate (Hz) and width (cents deviation). Target: 5–7 Hz rate, ±50 cents width. This is a post-processing step on pitch frames, not a new audio analysis pass.

**Vocal Range Baseline**
The baseline assessment needs to systematically walk the user through their range. Play a reference tone starting at a comfortable mid-range note (E4 for most voices), then step up by semitones until the user's pYIN confidence drops below threshold for two consecutive attempts, then step down. Store `{lowestNote, highestNote, comfortableRange}` in the user profile. This populates `vocalRangeSemitones` used by the badge engine.

**Cross-session Consistency**
The `BestTake` table already stores per-exercise best scores. Consistency scoring is trend analysis over that table: compute the standard deviation of `overallScore` across the last N attempts per exercise. Low variance = high consistency. This is a Supabase query, not new audio processing.

---

## Gap 2 — The Baseline Assessment Loop

### What exists

The product vision mentions a "baseline assessment" and the curriculum engine has level determination logic based on `completedSessions`. But there is no baseline assessment exercise type, no baseline assessment session plan, and no mechanism to populate a fresh user's `UserProfile` with their actual vocal starting point before placing them in Level 1.

### What is missing

Without a real baseline assessment, the system cannot:

- Know the user's vocal range and set appropriate exercise keys
- Assign accurate initial metric grades across the 11 dimensions
- Know which Level 1 exercises are in the user's comfortable range
- Motivate the user by showing them measurable progress from a documented starting point

### The solution

Add a `baseline_assessment` session type (distinct from a regular practice session) that runs once, at onboarding, before any exercises are assigned. The assessment needs to cover:

1. **Range scan** — descending/ascending tone-matching from E4 outward (3–5 minutes)
2. **Sustained hold** — single note, 8 seconds, no coaching pressure (establishes breath control baseline and pitch stability baseline)
3. **Scale walk** — 5-note ascending scale on "ah" (establishes onset accuracy and agility baseline)
4. **Free vocal** — 30 seconds of the user singing anything they like (establishes tone quality, HNR, diction baseline via Whisper)

Each metric gets an initial score from this assessment. The coaching avatar frames this explicitly as "I'm learning your voice, not grading you" — sets tone correctly and matches the spec's philosophy.

Store the result as a `VocalProfile` type (to be added to `shared-types`):

```typescript
export interface VocalProfile {
  userId: string;
  assessedAt: string; // ISO 8601
  lowestNoteHz: number;
  highestNoteHz: number;
  comfortableRangeLowHz: number;
  comfortableRangeHighHz: number;
  baselineMetrics: Record<string, number>; // 0–100 per metric
  recommendedStartingKey: string; // e.g. "C4", "G3"
  voiceType?: 'soprano' | 'mezzo' | 'alto' | 'tenor' | 'baritone' | 'bass';
}
```

The `recommendedStartingKey` feeds every subsequent exercise definition — so a user whose comfortable range centers on D3 is not being asked to sustain C5 in their first week.

---

## Gap 3 — The Adaptive Coaching Engine (The Most Important Gap)

### What exists

The `coaching-rules` package currently maps a score band (excellent / good / developing / retry) to a single hardcoded coaching payload. This is deterministic and correct for MVP, but it is not adaptive and it is not personalized. The avatar spec describes a two-layer system (deterministic templates + LLM personalization) but the LLM layer does not exist yet.

### What is missing

The system currently has no mechanism to:

- Identify _which specific metric_ is the weakest and should be the next training focus
- Sequence exercises based on what the user's actual performance data reveals
- Adapt difficulty within an exercise type (key, tempo, duration, interval size) based on performance history
- Generate coaching cues that reference the user's specific history ("last time you held this for 3.2 seconds — let's go for 4")
- Decide when a user has mastered a skill well enough to move to the next one

This is the gap between "an app that scores singing" and "an app that coaches singing." The difference is the engine that decides what comes next and why.

### The solution architecture

A three-tier coaching AI system (consistent with the [Singing Carrots approach](https://singingcarrots.com/blog/top-7-ai-vocal-coaches/), which is the most advanced publicly documented example in the market):

**Tier 1 — Metric Prioritization Engine (deterministic)**

A rules-based system that reads the user's current metric scores and identifies the highest-leverage gap. Input: the user's current metric scores. Output: a ranked list of training priorities.

```typescript
export interface MetricPriority {
  metric: SingingMetric;
  currentScore: number; // 0–100
  targetScore: number; // 0–100 (mastery threshold for this level)
  gap: number; // targetScore - currentScore
  blockedByMetric?: SingingMetric; // prerequisite that must be addressed first
}

export function rankMetricPriorities(
  profile: VocalProfile,
  history: MetricHistory
): MetricPriority[];
```

The ranking logic should encode vocal pedagogy knowledge: breath control is foundational and must be addressed before pitch stability work becomes reliable; pitch accuracy before dynamics; dynamics before style. These are not arbitrary — they reflect the actual dependency graph of vocal technique.

**Tier 2 — Exercise Selector (deterministic + adaptive)**

Maps the top-priority metric to the appropriate exercise type and configures it for the user's level and voice. This replaces and extends the current `selectNextExercise` in `curriculum`. The key difference: it sets exercise parameters dynamically based on the user's `VocalProfile`.

```typescript
export interface AdaptiveExerciseConfig {
  exerciseType: ExerciseCategory;
  targetNote: string; // Derived from user's comfortable range midpoint
  targetFrequencyHz: number;
  targetDurationSeconds: number; // Scaled to user's current breath control score
  toleranceCents: number; // Narrower as pitch accuracy improves
  repetitions: number;
  difficultyDelta: number; // +1 if last 3 attempts were excellent; -1 if retry
}
```

The exercise difficulty self-calibrates: if the user hits "excellent" three times in a row on sustained holds, the duration target increases by 1 second. If they hit "retry" twice, the note drops by a semitone into more comfortable territory. This is mastery-based progression, the same pedagogical model used by [adaptive tutoring systems like Carnegie Learning](https://iacis.org/iis/2025/4_iis_2025_45-55.pdf) and the theoretical basis for why [spaced repetition works](https://learnexperts.ai/blog/spaced-practice/).

**Tier 3 — LLM Coaching Layer (context-aware, server-side)**

This is where the avatar's dialogue actually becomes personalized. An LLM (Claude API, already referenced in the avatar spec) receives a structured context object and generates a coaching message that the deterministic templates cannot produce:

```typescript
export interface CoachingContext {
  userId: string;
  currentMetricScores: Record<string, number>;
  targetMetric: string;
  lastAttemptScore: SingingExerciseScoreBreakdown;
  sessionHistory: {
    attemptCount: number;
    bestScoreForExercise: number;
    progressTrend: 'improving' | 'plateau' | 'declining';
  };
  userGoal: SingingGoal;
  stylePack?: SingingStylePack;
}
```

The LLM's constraint: it may reframe but not fabricate. It can say "your breath support has been improving steadily — that's showing in your pitch stability" only if the metric data actually shows that trend. The prompt should be structured so the model cannot invent metric claims.

This three-tier system maps cleanly onto the existing architecture: Tier 1 and 2 live in an expanded `coaching-rules` package; Tier 3 lives as a server-side call in `services/api`, keeping the LLM key server-side.

---

## Gap 4 — The Song Practice Loop (Reframed)

### How the new vision changes the architecture

Under your revised vision, the karaoke mode does not need a stored catalog. It needs:

1. **User uploads a song file** (any format, any song)
2. **Audio processor separates stems** ephemerally — vocal + instrumental
3. **Vocal stem is analyzed** — pitch curve extracted, key identified, tempo estimated, vocal range mapped
4. **A short target segment is selected** (the chorus, or whatever the user designates)
5. **The user sings the segment** — their performance is compared against the extracted vocal pitch curve
6. **Avatar coaches them** — not "match the artist" but "here's what your voice needs to produce to hit those notes, given where your training is"
7. **Stems are discarded** after the session — not cached across users

The karaoke engine already implements the DTW comparison. The source separation job type already exists in the audio-processor contract. The primary thing missing is the **user upload pipeline** on the mobile side (an audio file picker + upload to Supabase Storage with a `processing_session: true` flag for ephemeral handling) and the **post-session cleanup job** that deletes the stems once the session ends.

### The critical reframe: song practice as diagnostic, not performance

The most important architectural insight for the new vision: when a user attempts a song chorus, VOICE should read that attempt not just as "how close were you to the original" but as a **metric diagnostic**. If the user is consistently flat on the high notes in the chorus, that feeds back into the metric prioritization engine as evidence that their `range` or `pitch` metric needs work. The song attempt becomes input to the coaching adaptation loop, not just a scoring exercise.

This means adding a `song_practice_diagnostic` output type from `KaraokeCompareJob` that maps identified failure modes back to the 11 coaching metrics:

```typescript
export interface SongPracticeDiagnostic {
  attemptId: string;
  songId: string;
  metricSignals: Partial<Record<SingingMetric, number>>; // derived from failure modes
  recommendedNextExercise: ExerciseCategory; // what to work on after this
}
```

---

## Gap 5 — The "Reward Song" Experience

### What exists

The reward system (XP, badges, unlocks) is well-implemented. `karaoke_mode` is an `UnlockableContentId` gated at level 4. The concept of using song practice as reward is implicit in the spec but not architecturally distinct.

### What is missing

If singing a song (the chorus) is the reward for completing exercise goals, there needs to be a clean UX trigger and a distinct session mode. Currently the session state machine has no "reward mode" — only a single session type.

### The solution

Add a `RewardSongSession` as a separate session type (not a regular practice session, not a karaoke snippet grinding loop). It triggers when:

- The user completes a mastery goal (e.g., holds a note in tolerance for 5 consecutive sessions)
- The system transitions to `CELEBRATING` state
- The avatar says something like: "You've earned it. Let's hear that chorus."

This session type uses the same karaoke infrastructure but is framed and scored differently — the user is not being graded against a target, they are experiencing their progress. The score is shown as "here's how your voice sounded today vs your first attempt on this song" — a progress delta, not a match score.

This distinction matters for retention: the reward must feel like a reward, not another test.

---

## Gap 6 — The AI "Reward Song" Synthesis Option (The 2026 Unlock)

### The key insight you've already identified

You noted that AI models can now take a recording of someone's voice and create a song in any genre, sounding like a particular style. This is exactly right, and in 2026 it is an actually deployable capability — not a research prototype.

The specific tools that make this work:

**[Suno AI "Voices" feature](https://help.suno.com/en/articles/11362369):** Suno's API/platform now accepts a user's voice recording (15 seconds minimum, up to 4 minutes), verifies it's the same person (voice biometric check), creates a persistent voice profile, and generates songs that use _the user's actual voice_ singing in any style they specify. The pipeline: upload 15–60 seconds of the user's voice → Suno creates a voice DNA → prompt "sing this chorus in a jazz style" → Suno generates a full song using the user's voice identity. This is available on [Suno's Pro/Premier plans](https://suno.com/hub/ai-song-writer) with API access via third-party wrappers like [AI Music API](https://udioapi.pro).

**[Kits.ai API](https://www.kits.ai/api):** Kits offers a commercial API for voice cloning + vocal conversion. Their workflow: upload 10+ minutes of clean voice recordings → train a custom voice model → convert any audio to sound like that voice. Unlike Suno (which generates new audio), Kits performs conversion on existing audio. This is more appropriate for the "sing along to the original instrumental, convert your output to sound more polished" use case.

**[SeedVC / FreeSVC](https://github.com/freds0/free-svc) (open source):** The [2025 Singing Voice Conversion Challenge](https://www.vc-challenge.org) produced several state-of-the-art open-source models for singing style conversion. SeedVC uses flow-matching to convert a user's sung performance to a different voice/style while preserving the performance's pitch and timing. This could be hosted on your Python service (Render) for the conversion step — no third-party API dependency.

### How this integrates with VOICE's reward loop

The reward song experience can take two forms:

**Form A — Standard reward** (no synthesis):
User's actual voice, unprocessed, sings the chorus over the instrumental. Raw and real. Good for beginners because it's unfiltered progress tracking.

**Form B — AI-enhanced reward** (synthesis, opt-in):
User's sung performance is passed through a style conversion model (Kits API or self-hosted SeedVC) that polishes the vocal quality while preserving the user's pitch and timing. The user hears what they'd sound like with better technique, not a different singer — their phrasing and melody choices, their voice, but with improved resonance and breath support modeled in.

This is motivationally powerful: it gives the user a preview of their own potential voice, not a simulation of someone else's. This is a genuinely differentiated feature that no current app offers.

**Form C — AI composition** (Suno integration, premium):
The user's voice profile, stored from baseline assessment, is submitted to Suno's Voices API. The avatar generates a short original song "written for your voice" in the user's target style. The user gets a 30-second original track using their actual voice in, say, a jazz ballad arrangement. This works at zero licensing cost — no copyrighted material involved, Suno generates original compositions, and the user's voice is their own.

---

## Gap 7 — The Audio Processor Service Is a Stub

### What exists

`services/audio-processor/src/index.ts` is a TypeScript contract file — it defines the job types and result shapes. The actual Python implementation is referenced as "see services/audio-processor/README.md" but that README is not in the repository. The Python service does not appear to exist yet.

### What is missing

The entire server-side audio intelligence. Every non-trivial metric computation, every stem separation, every filler word detection, every DTW comparison — all of it runs in a Python service that has not been written.

### The implementation stack

The Python service should use:

| Capability              | Library                              | Notes                                       |
| ----------------------- | ------------------------------------ | ------------------------------------------- |
| Pitch extraction        | `pyworld` + `pyin` (librosa)         | pYIN already specified in singing-tier-spec |
| Tone quality (HNR, CPP) | `parselmouth` (Praat)                | Best clinical voice quality measurement     |
| Formant analysis        | `parselmouth`                        | F1/F2 for vowel coaching                    |
| Jitter/Shimmer          | `parselmouth`                        | Advanced metric, Phase 2                    |
| Vocal range detection   | `librosa.pyin` + custom range walker | See baseline assessment section             |
| Breath/RMS              | `librosa.feature.rms`                | Already partially in spec                   |
| Vibrato detection       | FFT on pitch curve (numpy)           | Post-process pitch frames                   |
| Filler word detection   | `openai-whisper`                     | Already in job contract                     |
| Source separation       | `demucs` (htdemucs)                  | Already chosen in architecture              |
| DTW comparison          | `librosa.sequence.dtw`               | Already used conceptually in karaoke engine |
| Job queue               | Redis + `rq` (Redis Queue)           | Matches existing render.yaml structure      |
| FastAPI                 | Standard                             | Already specified                           |

The [openSMILE Python library](https://www.audeering.com/research/opensmile/) is worth considering as a feature extraction complement: it extracts 88 acoustic features in a single call (pitch, voice quality, formants, jitter/shimmer) which covers most of the 11 metrics efficiently. It is slower than targeted extraction but reduces code surface area significantly.

---

## Gap 8 — Missing Types for the New Vision

The following types need to be added to `shared-types` to support the reframed architecture:

```typescript
// Vocal profile from baseline assessment
export interface VocalProfile { ... }  // See Gap 2

// Per-metric scores and history
export type SingingMetric =
  | 'vocal_range' | 'tone_quality' | 'pitch_accuracy' | 'breath_control'
  | 'diction' | 'dynamics' | 'style_expression' | 'musicality' | 'consistency';

export interface MetricScore {
  metric: SingingMetric;
  score: number;            // 0–100
  grade: SuccessBand;
  assessedAt: string;       // ISO 8601
  sessionId?: string;
}

export interface MetricHistory {
  userId: string;
  metric: SingingMetric;
  scores: MetricScore[];    // Ordered chronologically
  trend: 'improving' | 'plateau' | 'declining';
  sessionsToNextGrade: number; // Estimated, from ML model
}

// Adaptive exercise configuration
export interface AdaptiveExerciseConfig { ... }  // See Gap 3

// Song session (ephemeral, user-uploaded)
export interface EphemeralSongSession {
  sessionId: string;
  userId: string;
  uploadedFileId: string;   // Supabase Storage, TTL = session duration + 1 hour
  vocalStemId?: string;     // Deleted post-session
  instrumentalStemId?: string; // Deleted post-session
  targetSegmentStartMs: number;
  targetSegmentEndMs: number;
  isRewardSession: boolean; // Changes scoring frame if true
}

// Song practice diagnostic output
export interface SongPracticeDiagnostic { ... }  // See Gap 4

// AI synthesis reward request
export interface AIRewardRequest {
  userId: string;
  sessionId: string;
  userVoiceAudioUrl: string;  // The user's best take from this session
  targetStyle: SingingStylePack;
  form: 'enhanced' | 'ai_composition';
}
```

---

## Gap 9 — No LLM Integration Exists Yet

The avatar spec describes a two-layer dialogue system — deterministic templates plus LLM personalization. The avatar state machine exists. The coaching payload interface exists. But there is no server-side LLM call anywhere in the codebase.

### Where to add it

A `coaching-generation` endpoint in `services/api` that accepts a `CoachingContext` (defined in Gap 3) and returns a `CoachingPayload`. This is a server-side call (keeping the API key off the device) that:

1. Fetches the user's recent metric history from Supabase
2. Constructs a structured prompt containing metric data, trend, current exercise, and last attempt result
3. Calls Claude API (claude-3-5-haiku for latency, claude-opus-4 for quality — switchable)
4. Validates the response doesn't fabricate metric claims
5. Returns the `CoachingPayload`

The system prompt for this call is among the most important engineering documents VOICE will produce. It determines whether the avatar sounds like a real coach or a chatbot. It should encode the coaching philosophy rules from `product-vision.md` explicitly: one correction at a time, no shame, agency language, specificity.

---

## Recommended Build Sequence

### Immediate priorities (before anything else)

**1. Write the Python audio processor service.** Everything else is blocked by this. Without real HNR, formant, CPP, breath measurement, and a real pYIN implementation, every score is a placeholder. This is the foundational engineering work. Use FastAPI + Redis Queue + Render as already specified. Start with: pYIN pitch extraction, RMS envelope, parselmouth HNR. Ship those three; add the rest incrementally.

**2. Add `VocalProfile` and the baseline assessment session.** Without a real starting point for each user, the adaptive coaching engine has nothing to adapt from. The baseline assessment is the entry point to personalization. Build it as a distinct onboarding session type.

**3. Add `SingingMetric` types and metric history tracking to Supabase.** The per-metric score history is the data that makes everything else work — coaching prioritization, consistency scoring, progress visualization, adaptive exercise configuration. Define the schema and start populating it from the first day of launch.

### Short-term (Build 1.0)

**4. Build the three-tier adaptive coaching engine.** Metric prioritization rules → exercise configuration → LLM coaching layer. Start with Tier 1 (rules-based prioritization), which can be shipped without the LLM. Add Tier 3 after launch.

**5. Add the ephemeral song session pipeline.** Upload picker on mobile → Supabase Storage → separation job → session → cleanup job. This enables song practice as reward without any licensing exposure. The karaoke engine already handles the comparison side.

### Medium-term (Phase 2)

**6. Integrate Kits.ai API for AI-enhanced reward mode.** This is a high-value, low-complexity integration. POST the user's best take audio to Kits' vocal conversion endpoint, return the enhanced version. Frame it as "hear what you'll sound like in three months" — a motivational preview, not a perfection tool.

**7. Explore Suno "Voices" API for AI composition reward.** This is the more novel feature — generating an original song using the user's voice. Requires the user to have a voice profile enrolled via the Suno Voices flow. Could be a premium-tier feature that gives users a monthly personalized song as a training milestone reward.

**8. Expand the metric coverage to all 11 dimensions.** Diction/articulation (Whisper phoneme comparison), style markers (genre-specific acoustic features), musicality (rhythm accuracy). These are Phase 2 because they require labeled training data to calibrate accurately.

---

## The One Decision That Unlocks Everything

**Build the Python audio processor first and correctly.**

Every product capability — personalized coaching, the 11-metric grade, baseline assessment, adaptive exercise difficulty, song practice diagnostic, consistency tracking — runs through or originates from that service. As long as it is a stub, VOICE is a pitch meter with nice UI. Once it produces real multi-metric analysis, it becomes a coaching system.

The architecture for it is already correctly designed in the TypeScript contract. The implementation is straightforward: FastAPI, librosa, parselmouth, HTDemucs, Whisper, Redis Queue. None of these are experimental. They are production-grade, well-documented libraries running in a well-understood configuration.

Estimate: 3–4 weeks of focused Python development produces a service that covers the core metrics (pitch accuracy, stability, HNR, CPP, RMS, breath duration, basic range detection). Everything downstream of that can then be built on real data.

---

## The Risk You Didn't Ask About (Again, Different This Time)

With the licensing concern removed, the highest-impact risk is **pitch detection failure in adverse acoustic conditions.**

pYIN, CREPE, and FCPE all degrade meaningfully in the presence of room reverberation, background noise, and at the passaggio (the vocal break between registers) — precisely the moments when coaching feedback matters most. A user attempting to navigate their break and getting contradictory pitch feedback will not trust the system, regardless of how good the rest of the product is.

The [FCPE model (ICASSP 2025)](https://arxiv.org/html/2509.15140v1) achieves 96.79% Raw Pitch Accuracy on MIR-1K with a Real-Time Factor of 0.0062 on an RTX 4090 — it is faster and more robust than pYIN in noisy conditions. The mobile app should display mic quality indicators (room noise floor, clipping detection) and actively prompt the user to move to a quieter environment or adjust mic distance before evaluating any singing. The `micCheck` function in `audio-metrics` already exists — it just needs to be shown to the user prominently before every session, not silently discarded.

Pitch feedback credibility is the foundation of the entire product trust relationship. No amount of beautiful avatar coaching language compensates for a user who thinks the app told them they were flat when they weren't.

---

_Sources: [Suno Voices documentation](https://help.suno.com/en/articles/11362369), [Kits.ai API](https://www.kits.ai/api), [FreeSVC ICASSP 2025](https://github.com/freds0/free-svc), [SVCC 2025](https://www.vc-challenge.org), [FCPE pitch estimation](https://arxiv.org/html/2509.15140v1), [parselmouth/Praat](https://www.fon.hum.uva.nl/praat/), [openSMILE 3.0](https://www.audeering.com/research/opensmile/), [librosa feature extraction](https://librosa.org/doc/0.11.0/feature.html), [comparative toolkit evaluation](https://arxiv.org/html/2506.01129v2), [Singing Carrots AI architecture](https://singingcarrots.com/blog/top-7-ai-vocal-coaches/), [vocal singing evaluation neural network research](https://pmc.ncbi.nlm.nih.gov/articles/PMC9142326/), [vocal register classification ML](https://arxiv.org/html/2505.11378v1), [mastery learning adaptive systems](https://iacis.org/iis/2025/4_iis_2025_45-55.pdf), [AI Music API](https://udioapi.pro), [Soundverse Voice Swap](https://www.soundverse.ai/blog/article/voice-swap-for-exploring-different-vocal-styles-1017)_
