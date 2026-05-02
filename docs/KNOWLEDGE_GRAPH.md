# VOICE — Comprehensive Knowledge Graph
> **Purpose**: Complete semantic model of the VOICE app. Intended as a single-file briefing for coding agents, code reviewers, and new engineers. All entities, relationships, invariants, formulas, state machines, data flows, and constraints are defined here. If something contradicts another source file, this document is the authority.

---

## TABLE OF CONTENTS

1. [System Identity](#1-system-identity)
2. [Monorepo Package Graph](#2-monorepo-package-graph)
3. [Domain Entity Catalog](#3-domain-entity-catalog)
4. [Relationship Map](#4-relationship-map)
5. [State Machines](#5-state-machines)
6. [Data Flow Graphs](#6-data-flow-graphs)
7. [Audio Pipeline Specifications](#7-audio-pipeline-specifications)
8. [Scoring Formulas and Invariants](#8-scoring-formulas-and-invariants)
9. [Reward System Rules](#9-reward-system-rules)
10. [API Surface](#10-api-surface)
11. [Navigation Graph](#11-navigation-graph)
12. [Business Rules and Constraints](#12-business-rules-and-constraints)
13. [Technology Bindings](#13-technology-bindings)
14. [Phased Feature Flags](#14-phased-feature-flags)

---

## 1. SYSTEM IDENTITY

```
App name:        VOICE
Platform:        iOS + Android (Expo / React Native)
Monorepo root:   VOCAL_AI/
Package scope:   @voice/*
Backend:         Node.js / Fastify + Supabase (PostgreSQL + Auth + Storage)
Audio service:   Python / FastAPI (Demucs, pYIN, Whisper, DTW)
State mgmt:      Zustand (mobile)
Animation:       Lottie (avatar)
```

### Core value proposition
VOICE builds accurate self-hearing, self-trust, and repeatable practice habits that turn isolated good vocal moments into stable, transferable skill. It is NOT a measurement dashboard — it is a coached practice loop.

### Two tiers (domain-level split)
| | Speaking Tier | Singing Tier |
|---|---|---|
| Color token | amber `#D97706` | violet `#6D28D9` |
| Light bg | `#FEF3C7` | `#EDE9FE` |
| Accent | `#F59E0B` | `#8B5CF6` |
| Primary metric | WPM, F0 range, RMS, filler rate | Cents error, stability std dev |
| On-device analysis | pYIN F0 + Silero VAD + Whisper (tiny) | pYIN pitch Hz → cents |
| Server-side analysis | Whisper (full) filler detection | Demucs, DTW (karaoke only) |

---

## 2. MONOREPO PACKAGE GRAPH

### Dependency edges (A → B means A imports B)

```
apps/mobile              → @voice/shared-types
                         → @voice/exercise-engine
                         → @voice/audio-metrics
                         → @voice/speaking-metrics
                         → @voice/coaching-rules
                         → @voice/avatar-state
                         → @voice/reward-engine
                         → @voice/curriculum
                         → @voice/karaoke-engine     [Phase 2]
                         → @voice/ui-tokens

apps/admin               → @voice/shared-types
                         → @voice/content-schema

services/api             → @voice/shared-types
                         → @voice/audio-processor    [job contracts only]
                         → @voice/reward-engine
                         → @voice/curriculum

services/audio-processor → @voice/shared-types       [TypeScript contracts]
                           [Python impl: Demucs, pYIN, Whisper, DTW]

services/analytics-worker→ @voice/shared-types

services/notification-worker → @voice/shared-types

@voice/exercise-engine   → @voice/shared-types
                         → @voice/audio-metrics
                         → @voice/speaking-metrics
                         → @voice/coaching-rules

@voice/coaching-rules    → @voice/shared-types
                         → @voice/audio-metrics
                         → @voice/speaking-metrics

@voice/karaoke-engine    → @voice/shared-types
                         → @voice/audio-metrics

@voice/reward-engine     → @voice/shared-types

@voice/curriculum        → @voice/shared-types

@voice/avatar-state      → @voice/shared-types

@voice/audio-metrics     → @voice/shared-types

@voice/speaking-metrics  → @voice/shared-types

@voice/content-schema    → @voice/shared-types

@voice/ui-tokens         → [no @voice/* deps — design tokens only]
@voice/shared-types      → [no @voice/* deps — LEAF node]
```

### Architectural invariants
- `@voice/shared-types` is the ONLY leaf. No circular deps.
- The mobile app imports ZERO domain logic directly — only through shared packages.
- Scoring, coaching, curriculum sequencing, and reward computation all live in packages.
- The Python audio-processor is reached only through TypeScript job contracts in `services/audio-processor/src/`.

---

## 3. DOMAIN ENTITY CATALOG

Each entity below lists: fields with types, constraints, and which package/service owns it.

---

### 3.1 UserProfile
**Owner**: `@voice/shared-types` (type) · `services/api` + Supabase (persistence)

```typescript
UserProfile {
  userId:                  string        // UUID, Supabase Auth UID
  displayName:             string        // 1–50 chars
  activeTier:              Tier          // 'speaking' | 'singing'
  speakingGoal?:           SpeakingGoal
  singingGoal?:            SingingGoal
  speakingTrack?:          SpeakingTrack           // Phase 2
  singingStylePack?:       SingingStylePack         // Phase 3
  level:                   number        // 1–∞, derived from totalXp
  totalXp:                 number        // ≥ 0, monotonically increasing
  streakDays:              number        // ≥ 0, reset when broken
  lastSessionDate?:        string        // ISO 8601
  streakShieldsRemaining:  number        // 0–N (1 earned per 7 consecutive days)
  createdAt:               string        // ISO 8601
}
```

**Constraints**:
- `level` is always `getLevelForXp(totalXp)` — never stored independently
- `streakDays` resets to 1 (not 0) on first session after break
- `streakShieldsRemaining` ≤ `Math.floor(streakDays / 7)` at time of earning

---

### 3.2 Tier (enum)
**Owner**: `@voice/shared-types`

```
'speaking' | 'singing'
```

Both tiers share session structure, scoring bands, avatar state machine, and reward system. They differ in: metric stack, exercise library, avatar color, coaching language persona.

---

### 3.3 SpeakingGoal (enum)
**Owner**: `@voice/shared-types`

| Value | Description | Primary metric |
|---|---|---|
| `pace` | Speaking rate and rhythm | WPM vs target range |
| `prosody` | Pitch variability, intonation | F0 range Hz, uptalk ratio |
| `projection` | Volume, carrying power | mean RMS dB, RMS variance |
| `resonance` | Tone placement, richness | HNR (Phase 2), subjective |
| `articulation` | Consonant clarity | Articulation rate WPM |
| `filler_reduction` | Reduce um/uh/like/etc. | Fillers per minute |
| `authority` | Downward inflection confidence | Sentence-final F0 downturn ratio |
| `breath_support` | Breath endurance | Pause count, mean pause duration |

---

### 3.4 SingingGoal (enum)
**Owner**: `@voice/shared-types`

| Value | Description | Primary metric |
|---|---|---|
| `pitch` | Pitch accuracy and matching | Cents error from target |
| `stability` | Sustaining without wobble | Std dev of cents error |
| `range` | Expanding comfortable range | Semitones covered |
| `breath_control` | Breath support for singing | Phrase duration, phrase count |
| `tone` | Tone quality, timbre | HNR, CPP (Phase 2) |
| `agility` | Moving between notes quickly | Onset accuracy, interval error |
| `ear_training` | Interval recognition | Pitch discrimination tasks |
| `dynamics` | Volume control | RMS range |
| `vibrato` | Developing and controlling | Vibrato rate Hz, width cents (Phase 2) |

---

### 3.5 SpeakingTrack (enum) — Phase 2
`'ted_conference' | 'podcast' | 'social_media' | 'job_interview' | 'classroom' | 'executive'`

Maps to WPM target context in `@voice/speaking-metrics`:
- `ted_conference` → `'presentation'` (120–165 WPM)
- `podcast` → `'conversational'` (130–180 WPM)
- `social_media` → `'short_form'` (140–195 WPM)
- `job_interview` → `'interview'` (120–160 WPM)
- `classroom` → `'presentation'` (120–165 WPM)
- `executive` → `'presentation'` (120–165 WPM)

---

### 3.6 SingingStylePack (enum) — Phase 3
`'pop' | 'jazz' | 'blues' | 'classical_opera' | 'musical_theatre' | 'rnb_soul' | 'rock' | 'heavy_metal' | 'grindcore' | 'country' | 'gospel'`

Each style pack unlocks at Level 3+ and adds style-specific exercises with specialized scoring.
`grindcore` is the only style pack requiring a mandatory vocal safety disclaimer on first entry.

---

### 3.7 SuccessBand (enum)
**Owner**: `@voice/shared-types`

| Band | Score range | Meaning |
|---|---|---|
| `'excellent'` | ≥ 85 | Mastery — ready to advance |
| `'good'` | 70–84 | Solid — one more rep or move on |
| `'developing'` | 50–69 | Progress — needs more practice |
| `'retry'` | < 50 | Not passing — same exercise again |

**Invariant**: SuccessBand thresholds are identical for both tiers.

---

### 3.8 ExerciseDefinition
**Owner**: `@voice/shared-types` (type) · `@voice/content-schema` (versioned schema) · Supabase (persistence)

```typescript
ExerciseDefinition {
  exerciseId:              string        // e.g. "speak_pace_001_v1"
  version:                 number        // increment on behavior change; never mutate existing
  tier:                    Tier
  category:                ExerciseCategory
  subcategory:             string
  title:                   string
  description:             string
  userInstructionText:     string        // Shown in ExerciseIntro screen
  durationTargetSeconds:   number
  repetitionsDefault:      number
  targetPatternType:       TargetPatternType
  targetPatternPayload:    Record<string, unknown>  // Pattern-specific config
  evaluationConfig:        Record<string, unknown>  // Scoring thresholds
  scoringWeights:          Record<string, number>   // Sub-score weights, must sum to 1.0
  feedbackRuleSetId:       string
  prerequisiteExerciseIds?: string[]
  minimumLevelRequired?:   number
  stylePack?:              SingingStylePack
  activeFlag:              boolean
}
```

**Constraints**:
- `scoringWeights` values must sum to exactly 1.0
- Changing exercise behavior requires creating a new version (new `exerciseId` suffix `_v{N}`)
- `activeFlag: false` exercises are never included in session plans

---

### 3.9 ExerciseCategory (enum)
**Owner**: `@voice/shared-types`

```
breathing | pace_control | prosody | projection | resonance_speaking |
articulation | filler_reduction | authority_delivery | speaking_stamina |
pitch_matching | sustained_hold | scale_work | interval_training |
passaggio | dynamic_control | vibrato | style_specific | karaoke_snippet
```

`breathing` is the only cross-tier category. All others map exclusively to one tier.

---

### 3.10 TargetPatternType (enum)
**Owner**: `@voice/shared-types`

```
sustained_hold | scale_ascending | scale_descending | interval_jump |
passage_read | free_speech | phrase_sing | karaoke_snippet |
breath_only | hum_resonance
```

---

### 3.11 Session
**Owner**: `@voice/shared-types` (type) · `services/api` + Supabase (persistence)

```typescript
Session {
  sessionId:          string    // UUID
  userId:             string    // FK → UserProfile.userId
  tier:               Tier
  startedAt:          string    // ISO 8601
  completedAt?:       string    // ISO 8601; null if abandoned
  exerciseIds:        string[]  // Ordered list of exerciseIds in this session
  xpEarned:          number    // Computed at session end
  reflectionSubmitted: boolean
}
```

**Constraints**:
- A session without `completedAt` does not count toward streak or XP
- Minimum viable session = 1 exercise completed

---

### 3.12 Attempt
**Owner**: `@voice/shared-types` (type) · Supabase (persistence)

```typescript
Attempt {
  attemptId:     string    // UUID
  sessionId:     string    // FK → Session.sessionId
  exerciseId:    string    // FK → ExerciseDefinition.exerciseId
  userId:        string    // FK → UserProfile.userId
  tier:          Tier
  startedAt:     string    // ISO 8601
  completedAt?:  string
  audioFileUrl?: string    // Supabase Storage; stored only if user consents
  durationMs?:   number
}
```

One attempt = one recording pass on one exercise. Users may attempt the same exercise multiple times per session.

---

### 3.13 SingingAttemptMetrics
**Owner**: `@voice/shared-types` · Supabase

```typescript
SingingAttemptMetrics {
  attemptId:           string   // 1:1 with Attempt
  pitchScore:          number   // 0–100
  stabilityScore:      number   // 0–100
  onsetScore?:         number   // 0–100
  overallScore:        number   // 0–100, weighted by exercise scoringWeights
  successBand:         SuccessBand
  medianCentsError?:   number   // signed; positive = sharp
  timeInToleranceMs?:  number   // ms spent within ±25 cents of target
  pitchFrames?:        LivePitchFrame[]  // stored for best-take replay
}
```

---

### 3.14 SpeakingAttemptMetrics
**Owner**: `@voice/shared-types` · Supabase

```typescript
SpeakingAttemptMetrics {
  attemptId:      string
  paceScore?:     number   // 0–100
  prosodyScore?:  number   // 0–100
  projectionScore?: number // 0–100
  fillerScore?:   number   // 0–100
  authorityScore?: number  // 0–100
  overallScore:   number   // 0–100
  successBand:    SuccessBand
  analysis?:      SpeakingAnalysisResult
}
```

---

### 3.15 BestTake
**Owner**: `@voice/shared-types` · Supabase

```typescript
BestTake {
  bestTakeId:    string   // UUID
  userId:        string
  exerciseId:    string   // One BestTake per (userId, exerciseId)
  tier:          Tier
  attemptId:     string   // The specific attempt that set the best score
  overallScore:  number
  createdAt:     string
  audioFileUrl?: string
}
```

**Invariant**: There is exactly ONE active BestTake per (userId, exerciseId). When a new attempt scores higher, the BestTake record is updated (not duplicated).

---

### 3.16 Reflection
**Owner**: `@voice/shared-types` · Supabase

```typescript
Reflection {
  reflectionId:   string
  sessionId:      string   // 1:1 with Session
  userId:         string
  prompt1Answer:  string   // Response to "What felt easiest?"
  prompt2Answer:  string   // Response to "What will you focus on next time?"
  submittedAt:    string
}
```

**UX constraint**: Reflection answers are tap-to-select, not freeform text. Completing reflection awards +5 XP.

---

### 3.17 LivePitchFrame
**Owner**: `@voice/shared-types` · produced in real-time on mobile

```typescript
LivePitchFrame {
  timestampMs:      number    // ms since recording start
  frequencyHz?:     number    // undefined when unvoiced
  centsFromTarget?: number    // Hz converted to cents relative to target note
  voiced:           boolean   // VAD output
  confidence:       number    // 0–1, pYIN confidence
}
```

**Latency target**: Frame computation + UI update ≤ 80ms from voice onset.

---

### 3.18 LiveSpeakingFrame
**Owner**: `@voice/shared-types` · produced in real-time on mobile

```typescript
LiveSpeakingFrame {
  timestampMs:       number
  frequencyHz?:      number   // F0 in speaking context (for prosody)
  rmsDb?:            number   // Volume level in dBFS
  voiced:            boolean  // Silero VAD output
  confidence:        number   // 0–1
  isInPausePeriod?:  boolean  // True when silence gap > 250ms
}
```

---

### 3.19 SpeakingAnalysisResult
**Owner**: `@voice/shared-types` · computed post-recording

```typescript
SpeakingAnalysisResult {
  wpm:                   number   // Words per minute (total, including pauses)
  articulationRateWpm:   number   // WPM excluding silence gaps
  meanF0Hz:              number   // Average fundamental frequency (voiced frames)
  f0RangeHz:             number   // max(F0) - min(F0) across voiced frames
  uptalkRatio:           number   // 0–1: proportion of clause-final segments with rising F0
  pauseCount:            number   // Number of silence gaps > 250ms
  meanPauseDurationMs:   number
  meanRmsDb:             number   // Average volume
  rmsVarianceDb:         number   // Variance of volume (higher = more dynamic)
  fillerEvents:          FillerWordEvent[]
  fillerRate:            number   // fillers per minute
  hnr?:                  number   // Harmonics-to-Noise Ratio (Phase 2)
}
```

---

### 3.20 CoachingPayload
**Owner**: `@voice/shared-types` · produced by `@voice/coaching-rules`

```typescript
CoachingPayload {
  praiseMessage:      string   // Max 1 sentence. Specific to what went well.
  correctionMessage:  string   // Max 1 sentence. ONE correction only.
  actionTip:          string   // What to do on the very next attempt.
  successBand:        SuccessBand
  microExerciseCue?:  string   // Optional 10-second drill suggestion (Phase 2)
}
```

**Invariant**: `correctionMessage` contains exactly ONE correction. No bulleted lists. No "also try".

---

### 3.21 AvatarDialogueLine
**Owner**: `@voice/shared-types` · produced by `@voice/avatar-state`

```typescript
AvatarDialogueLine {
  text:            string           // Display text
  state:           AvatarBehaviorState
  durationMs?:     number           // Auto-advance after this duration
  awaitUserAction?: boolean         // If true, wait for tap before advancing
}
```

---

### 3.22 KaraokeSong — Phase 2
**Owner**: `@voice/shared-types` · Supabase

```typescript
KaraokeSong {
  songId:              string
  title:               string
  artist:              string
  albumArtUrl?:        string
  durationSeconds:     number
  estimatedDifficulty: 1 | 2 | 3 | 4 | 5
  keySignature?:       string      // e.g. "C major"
  tempoRange?:         { minBpm: number; maxBpm: number }
  vocalRange?:         { lowestNote: string; highestNote: string }
  styleTags:           SingingStylePack[]
  processingStatus:    KaraokeProcessingStatus
  instrumentalUrl?:    string      // Supabase Storage, available when status='ready'
  vocalAnalysisId?:    string      // FK to stored VocalAnalysisResult
}
```

---

### 3.23 KaraokeSnippet — Phase 2
**Owner**: `@voice/shared-types` · Supabase

```typescript
KaraokeSnippet {
  snippetId:            string
  songId:               string    // FK → KaraokeSong
  startMs:              number
  endMs:                number
  durationMs:           number    // = endMs - startMs
  difficulty:           1 | 2 | 3 | 4 | 5
  lyricsText?:          string
  referencePitchCurve:  LivePitchFrame[]  // Extracted from vocal stem
  orderInSong:          number    // For phrase map visualization (0-indexed)
}
```

---

### 3.24 KaraokeAttemptScore — Phase 2
**Owner**: `@voice/shared-types` · produced by `@voice/karaoke-engine` or `services/audio-processor`

```typescript
KaraokeAttemptScore {
  pitchSimilarity:      number   // 0–100: DTW pitch comparison
  timingAccuracy:       number   // 0–100: phrase onset + duration
  contourMatch:         number   // 0–100: gross melodic shape match
  overall:              number   // = round(pitchSimilarity*0.5 + timingAccuracy*0.3 + contourMatch*0.2)
  dominantFailureMode?: 'pitch_flat' | 'pitch_sharp' | 'rushing' | 'dragging' | 'wrong_contour' | 'pitch_instability'
}
```

---

### 3.25 UserRewardState
**Owner**: `@voice/shared-types` · Supabase (flattened on UserProfile table)

```typescript
UserRewardState {
  userId:                  string
  totalXp:                 number
  level:                   number    // derived from totalXp
  streakDays:              number
  streakShieldsRemaining:  number
  lastStreakDate?:          string
  earnedBadges:            EarnedBadge[]
  unlockedContent:         UnlockableContentId[]
}
```

---

### 3.26 XpEvent
**Owner**: `@voice/shared-types` · Supabase (xp_events table, append-only)

```typescript
XpEvent {
  source:     XpSource
  amount:     number
  timestamp:  string
  sessionId?: string
  exerciseId?: string
  metadata?:  Record<string, unknown>
}
```

All XP events are append-only. `totalXp` is the sum of all XpEvent.amount values for a user.

---

### 3.27 AudioProcessorJob (union type)
**Owner**: `services/audio-processor/src` (TypeScript contracts only)

```
VocalSeparationJob | VocalAnalysisJob | FillerDetectionJob | KaraokeCompareJob
```

Jobs are dispatched via Redis queue from `services/api`. Results are stored in Supabase and the requesting session is notified via Supabase Realtime.

---

## 4. RELATIONSHIP MAP

```
UserProfile ──1:N──> Session
UserProfile ──1:N──> XpEvent
UserProfile ──1:1──> UserRewardState
UserProfile ──1:N──> BestTake         (one per exerciseId)
UserProfile ──1:N──> EarnedBadge
UserProfile ──1:N──> KaraokeSongProgress   [Phase 2]

Session ──1:N──> Attempt
Session ──1:1──> Reflection           (optional)
Session ──contains──> ExerciseDefinition[]

Attempt ──1:1──> SingingAttemptMetrics   (if tier=singing)
Attempt ──1:1──> SpeakingAttemptMetrics  (if tier=speaking)
Attempt ──may update──> BestTake

BestTake ──references──> Attempt (best scoring)
BestTake ──references──> ExerciseDefinition

ExerciseDefinition ──tier──> Tier
ExerciseDefinition ──maybe──> SingingStylePack

KaraokeSong ──1:N──> KaraokeSnippet   [Phase 2]
KaraokeSong ──has──> KaraokeSongProgress per UserProfile

KaraokeSnippet ──1:1──> KaraokeSnippetProgress per UserProfile
KaraokeSnippet ──referencePitchCurve──> LivePitchFrame[]

Attempt (karaoke) ──1:1──> KaraokeAttemptScore
```

---

## 5. STATE MACHINES

### 5.1 SessionState machine
**Owner**: `@voice/shared-types` · managed by `@voice/exercise-engine`

```
IDLE
  → LOADING_SESSION     (user taps "Start Session")

LOADING_SESSION
  → READY              (session plan built, avatar greeting loaded)
  → SESSION_ERROR      (plan build failed)

READY
  → WARM_UP            (session begins)

WARM_UP
  → EXERCISE_INTRO     (warm-up complete)

EXERCISE_INTRO
  → AWAITING_SIGNAL    (avatar finishes intro; mic gate opens)

AWAITING_SIGNAL
  → LISTENING          (VAD detects voice onset OR user taps record)
  → EXERCISE_INTRO     (user taps "Hear again")

LISTENING
  → ANALYZING          (recording stops: either user taps stop OR max duration reached)
  → AWAITING_SIGNAL    (signal quality check fails → re-prompt)

ANALYZING
  → RESULT_REVIEW      (score + coaching payload ready)
  → SESSION_ERROR      (analysis failed)

RESULT_REVIEW
  → AWAITING_SIGNAL    (user taps "Try Again")
  → EXERCISE_INTRO     (user taps "Next Exercise" → load next)
  → REFLECTION         (all exercises complete)

REFLECTION
  → SESSION_COMPLETE   (reflection submitted or skipped)

SESSION_COMPLETE
  → IDLE               (user taps "Done")
```

**Invariant**: Transitions only flow along edges listed above. No direct jump from LISTENING to SESSION_COMPLETE.

---

### 5.2 AvatarBehaviorState machine
**Owner**: `@voice/shared-types` · `@voice/avatar-state`

```
IDLE           → INTRO         (session starts)
INTRO          → LISTENING     (exercise begins)
LISTENING      → ANALYZING     (recording stops)
ANALYZING      → COACHING      (score ready, normal result)
ANALYZING      → CELEBRATING   (score ready + personal best OR milestone)
COACHING       → LISTENING     (user tries again)
COACHING       → IDLE          (session ends)
CELEBRATING    → IDLE          (session ends)
CELEBRATING    → LISTENING     (user tries again from celebrating state)
```

**Avatar color per tier**:
- Speaking: primary `#D97706`, accent `#F59E0B`, bg `#FEF3C7`
- Singing: primary `#6D28D9`, accent `#8B5CF6`, bg `#EDE9FE`

**Animation asset map** (Lottie files):
```
IDLE        → avatar_idle.json
INTRO       → avatar_intro.json
LISTENING   → avatar_listening.json
ANALYZING   → avatar_analyzing.json
COACHING    → avatar_coaching.json
CELEBRATING → avatar_celebrating.json
```

---

### 5.3 KaraokeProcessingStatus machine — Phase 2
```
queued → separating → analyzing → ready
queued → error
separating → error
analyzing → error
```

Transition triggers:
- `queued`: API receives song selection, pushes VocalSeparationJob to Redis
- `separating`: Python worker picks up job, runs Demucs (~30s)
- `analyzing`: Demucs completes, VocalAnalysisJob dispatched (pYIN on vocal stem)
- `ready`: VocalAnalysisResult stored; snippets created; instrumentalUrl available
- `error`: Any Python exception; surfaced as user-visible retry

---

### 5.4 KaraokeSnippetStatus — Phase 2
```
locked → active → in_progress → completed
```
- `locked`: snippet not yet accessible (previous snippet not completed)
- `active`: snippet is available to attempt
- `in_progress`: user has attempted but not yet reached match threshold
- `completed`: overall ≥ threshold (70 for levels 1–2, 80 for levels 3–4)

Snippet 0 is always `active` from the moment the song is `ready`. Each subsequent snippet unlocks when the prior one reaches `completed`.

---

## 6. DATA FLOW GRAPHS

### 6.1 Speaking Session — Real-time

```
Mobile mic
  │
  ▼
PCM audio frames (16kHz mono, 20ms chunks)
  │
  ├──► Silero VAD              → voiced/unvoiced flag per frame
  │
  ├──► pYIN (JS/WASM)          → F0 in Hz per voiced frame
  │
  └──► RMS computation         → dBFS per frame
          │
          ▼
     LiveSpeakingFrame stream
          │
          ▼
     @voice/exercise-engine    → SessionState transitions
          │
          ▼
     Post-recording analysis (blocking, <500ms):
          ├── WPM computation (word count / elapsed time)
          ├── F0 range = max(F0) - min(F0)
          ├── Uptalk ratio (clause-final F0 direction)
          ├── Pause detection (gaps > 250ms in VAD)
          └── Filler detection:
               ├── Phase 1: On-device Whisper.cpp (tiny model) → approximate
               └── Phase 2: Server-side FillerDetectionJob (Whisper full) → precise
                         dispatched async; result updates metrics when ready
          │
          ▼
     SpeakingAnalysisResult
          │
          ▼
     @voice/speaking-metrics   → SpeakingExerciseScoreBreakdown
          │
          ▼
     @voice/coaching-rules     → CoachingPayload
          │
          ▼
     @voice/avatar-state       → AvatarDialogueLine[]
          │
          ▼
     POST /v1/sessions/{id}/attempts  → services/api → Supabase
```

---

### 6.2 Singing Session — Real-time

```
Mobile mic
  │
  ▼
PCM audio frames (16kHz mono, 20ms chunks)
  │
  ├──► Silero VAD              → voiced flag
  │
  └──► pYIN (JS/WASM)          → frequencyHz per voiced frame
          │
          ▼
     Hz → cents conversion:
          centsFromTarget = 1200 * log2(measuredHz / targetHz)
          │
          ▼
     LivePitchFrame stream
          │
          ▼
     @voice/exercise-engine    → SessionState transitions
          │
          ▼
     Post-recording scoring:
          ├── pitchAccuracy = f(time-in-tolerance, median cents error)
          ├── stability     = f(1 / stdDev of cents error)
          └── onsetAccuracy = f(time-to-first-lock)
          │
          ▼
     @voice/audio-metrics      → SingingExerciseScoreBreakdown
          │
          ▼
     @voice/coaching-rules     → CoachingPayload
          │
          ▼
     @voice/avatar-state       → AvatarDialogueLine[]
          │
          ▼
     POST /v1/sessions/{id}/attempts  → services/api → Supabase
```

---

### 6.3 Karaoke Session — Phase 2

```
User selects song
  │
  ▼
POST /v1/karaoke/songs/{songId}/process  → services/api
  │
  ▼
Redis job queue ← VocalSeparationJob
  │
  ▼
Python audio-processor:
  1. Demucs (htdemucs model) → vocal stem + instrumental stem
  2. Store stems → Supabase Storage
  3. Emit VocalAnalysisJob
  │
  ▼
  4. pYIN on vocal stem → pitch frames + phrase segments
  5. Store VocalAnalysisResult → Supabase
  6. Generate KaraokeSnippet records
  7. Update KaraokeSong.processingStatus = 'ready'
  │
  ▼
Mobile receives Supabase Realtime event → song ready
  │
  ▼
User sees Song Phrase Map
  │
  ▼
User selects snippet → SnippetIntro screen
  │
  ▼
Listen screen: streams instrumental from Supabase Storage
  │
  ▼
Record screen: user records attempt over instrumental
  │
  ▼
POST /v1/karaoke/attempts  → services/api
  │
  ▼
Redis job queue ← KaraokeCompareJob
  │
  ▼
Python audio-processor:
  1. Align user audio to snippet time window
  2. pYIN on user audio → user pitch frames
  3. DTW comparison: user curve vs. referencePitchCurve
  4. Compute KaraokeAttemptScore
  5. Store result → Supabase
  │
  ▼
Mobile receives result via Supabase Realtime
  │
  ▼
@voice/karaoke-engine → isSnippetComplete? → update KaraokeSnippetStatus
  │
  ▼
@voice/avatar-state → dialogue based on dominantFailureMode
  │
  ▼
Karaoke Result Screen
```

---

## 7. AUDIO PIPELINE SPECIFICATIONS

### 7.1 On-device audio capture
- Sample rate: **16,000 Hz** (mono)
- Frame size: **20ms** (320 samples at 16kHz)
- Format: PCM Int16 → Float32 for processing
- Library: `expo-av` (recording) + `react-native-audio-api` (real-time frames)

### 7.2 Voice Activity Detection (VAD)
- Model: **Silero VAD** (ONNX, ~1MB) run via ONNX Runtime JS
- Output: voiced/unvoiced boolean per frame, confidence float
- Pause threshold: consecutive unvoiced frames ≥ 250ms = pause event

### 7.3 Pitch Detection — pYIN
- Algorithm: **pYIN** (probabilistic YIN), JS/WASM port
- Input: PCM Float32, 16kHz
- Output: `frequencyHz` (Hz) per 20ms frame, `confidence` [0,1]
- Frequency range: 60Hz (C2) – 1048Hz (C6)
- Latency target: **≤ 80ms** from voice onset to visual feedback
- Cents conversion: `1200 * Math.log2(measured / target)`
- Pitch tolerance window: **±25 cents** for singing (within-tolerance scoring)

### 7.4 Speaking analysis — post-recording
| Metric | Method | Formula |
|---|---|---|
| WPM | Word count / elapsed seconds × 60 | Whisper transcript word count |
| Articulation rate | WPM excluding pause frames | `words / (totalTime - pauseTime) × 60` |
| F0 range | max(F0) - min(F0) across voiced frames | pYIN output |
| Uptalk ratio | Proportion of clause-final frames with rising F0 | sliding window on voiced F0 |
| Pause count | Gaps > 250ms in Silero VAD output | count of pause events |
| RMS dB | `20 * log10(RMS of PCM samples)` | per-frame, then mean |
| Filler rate | Whisper transcript → filler word count / minutes | |
| HNR | Harmonics-to-Noise Ratio (Phase 2) | Phase 2 only |

### 7.5 Vocal separation — Demucs
- Model: **htdemucs** (Meta, 4-stem)
- Outputs used: `vocals` stem + `other` (instrumental) stem
- Expected duration: ~30s for a 3-minute song (GPU) / ~2 min (CPU)
- Quality target: MOS ≥ 3.5 on separated stems
- Infrastructure: Python/FastAPI service, GPU-capable container (Phase 2)

### 7.6 Filler word detection — Whisper
- Phase 1: `whisper.cpp` tiny model, on-device, approximate detection
- Phase 2: OpenAI Whisper medium/large via audio-processor service, precise
- Filler vocabulary: `["um", "uh", "like", "you know", "I mean", "basically", "literally", "right?", "so yeah"]`

### 7.7 DTW comparison — Karaoke
- Algorithm: **Dynamic Time Warping** on pitch frame sequences
- User frame alignment: trim silence from start/end; align to snippet start time
- Distance metric: absolute cents difference per frame pair
- Normalization: divide raw DTW cost by path length → per-frame average cents error
- Score mapping:
  - pitchSimilarity = `max(0, 100 - (avgCentsError / 0.5))` (0.5 cents = 1 point)
  - timingAccuracy = `max(0, 100 - abs(durationDiff/referenceDuration) * 100 * 2)`
  - contourMatch = correlation of pitch contour slopes, mapped 0–100

---

## 8. SCORING FORMULAS AND INVARIANTS

### 8.1 Singing — overall score
```
overallScore = round(
  pitchAccuracy * exerciseScoringWeights.pitchAccuracy +
  stability     * exerciseScoringWeights.stability     +
  onsetAccuracy * exerciseScoringWeights.onsetAccuracy
)
```

**Pitch accuracy formula**:
```
timeInTolerance = frames where abs(centsFromTarget) ≤ 25 AND voiced=true
timeInTolerancePct = timeInTolerance / totalVoicedFrames

medianCentsError = median(abs(centsFromTarget) for voiced frames)
centsErrorNorm = max(0, 100 - medianCentsError * 2)  // 50 cents = -100 pts

pitchAccuracy = round(timeInTolerancePct * 60 + centsErrorNorm * 0.4)
pitchAccuracy = clamp(pitchAccuracy, 0, 100)
```

**Stability formula**:
```
centsStdDev = stdDev(centsFromTarget for voiced frames)
stability = max(0, 100 - centsStdDev * 3)
```

**Onset accuracy formula**:
```
timeToLockMs = first frame where voiced=true AND abs(centsFromTarget) ≤ 25
onsetAccuracy = max(0, 100 - (timeToLockMs / durationTargetSeconds / 1000) * 100)
```

---

### 8.2 Speaking — overall score (goal-weighted)

Goal → scoring weights:
```
pace:             { pace:0.60, prosody:0.15, projection:0.15, fillerRate:0.10 }
prosody:          { pace:0.20, prosody:0.60, projection:0.10, fillerRate:0.10 }
projection:       { pace:0.10, prosody:0.20, projection:0.60, fillerRate:0.10 }
filler_reduction: { pace:0.10, prosody:0.10, projection:0.10, fillerRate:0.70 }
authority:        { pace:0.20, prosody:0.50, projection:0.20, fillerRate:0.10 }
resonance:        { pace:0.10, prosody:0.30, projection:0.50, fillerRate:0.10 }
articulation:     { pace:0.20, prosody:0.20, projection:0.40, fillerRate:0.20 }
breath_support:   { pace:0.20, prosody:0.20, projection:0.50, fillerRate:0.10 }
```

**Pace score**:
```
if wpm in [min, max]:
  distanceFromTarget = abs(wpm - target)
  rangeWidth = (max - min) / 2
  paceScore = round(100 - (distanceFromTarget / rangeWidth) * 15)
else:
  distanceFromRange = min(abs(wpm - min), abs(wpm - max))
  paceScore = max(0, round(70 - distanceFromRange * 2))
```

WPM targets by context:
```
presentation:   { min:120, target:145, max:165 }
conversational: { min:130, target:155, max:180 }
short_form:     { min:140, target:165, max:195 }
technical:      { min:100, target:125, max:145 }
interview:      { min:120, target:140, max:160 }
```

**Prosody score**:
```
F0 range scoring:
  < 10Hz  → 20
  10–20Hz → 40
  20–40Hz → 65
  40–80Hz → 90 + min(10, (f0RangeHz - 40) / 4)
  > 80Hz  → 85

uptalkPenalty = round(uptalkRatio * 40)
prosodyScore = max(0, min(100, rangeScore - uptalkPenalty))
```

**Projection score**:
```
meanRmsDb > -10:    levelScore = 70   (risk of clipping)
-18 to -10:         levelScore = 100  (target zone)
-25 to -18:         levelScore = 80
-35 to -25:         levelScore = 55
< -35:              levelScore = 30
varianceBonus = min(10, rmsVarianceDb * 2)
projectionScore = min(100, levelScore + varianceBonus)
```

**Filler score**:
```
fillerRate ≤ 1/min  → 100
1–2/min             → 90
2–4/min             → 75
4–6/min             → 55
6–10/min            → 35
> 10/min            → 15
```

---

### 8.3 SuccessBand mapping (shared)
```
score ≥ 85 → 'excellent'
score ≥ 70 → 'good'
score ≥ 50 → 'developing'
score < 50 → 'retry'
```

---

### 8.4 Karaoke composite score — Phase 2
```
overall = round(
  pitchSimilarity * 0.50 +
  timingAccuracy  * 0.30 +
  contourMatch    * 0.20
)
```

**Match threshold to complete snippet**:
```
userLevel 1–2: overall ≥ 70
userLevel 3–4: overall ≥ 80
```

---

## 9. REWARD SYSTEM RULES

### 9.1 XP table
```
session_complete:          10 XP   (always, even if score is low)
score_good:                 5 XP   (band = 'good')
score_excellent:           10 XP   (band = 'excellent'; replaces score_good)
personal_best:             15 XP   (new high score for exerciseId)
karaoke_snippet_complete:  10 XP   (snippet reaches completed status)
reflection_complete:        5 XP   (reflection submitted, not skipped)
new_exercise_type:          5 XP   (first time attempting a new exerciseId)
level_complete:            50 XP   (crossing a level threshold)
style_pack_unlocked:       25 XP   (first style pack exercise completed)
streak_milestone:       30–200 XP  (see streak milestones below)
```

**XP event ordering at session end**:
1. Show XP breakdown (before updating level display)
2. Update totalXp
3. Check for level-up → show LevelUp modal
4. Check for new badges → show BadgeUnlock modal
5. Update streak → show streak count

---

### 9.2 Level thresholds
```
Level 1  (Finding My Voice):     0 XP
Level 2  (First Breath):       100 XP
Level 3  (Warming Up):         250 XP
Level 4  (On Pitch):           500 XP
Level 5  (In the Room):        900 XP
Level 6  (Carrying It):       1400 XP
Level 7  (Finding the Resonance): 2100 XP
Level 8  (Full Voice):        3000 XP
Level 9  (Consistent):        4200 XP
Level 10 (Stage Ready):       6000 XP
Level 11+: +2000 XP per level beyond 10
```

---

### 9.3 Streak rules
```
daysDiff = today - lastSessionDate (in calendar days)

daysDiff = 0:   Already practiced today. No change.
daysDiff = 1:   Streak extends. newStreakDays = currentStreakDays + 1
daysDiff = 2    AND streakShieldsRemaining > 0:
                Shield consumed. Streak extends. newStreakDays = currentStreakDays + 1
daysDiff > 2    OR (daysDiff = 2 AND shields = 0):
                Streak broken. newStreakDays = 1
```

**Streak milestones** (XP awarded when newStreakDays hits milestone):
```
7 days:   30 XP
14 days:  30 XP
30 days:  75 XP
60 days:  75 XP
100 days: 200 XP
```

**Shield earning**: 1 shield earned per 7 consecutive practice days.
`shieldsEarned = Math.floor(streakDays / 7)`

**UX rule**: No guilt-trip language on streak break. "Streak Broken Modal" uses neutral, forward-looking copy.

---

### 9.4 Badge catalog

**Speaking Tier (7 badges)**:
| Badge ID | Earn condition |
|---|---|
| `first_word` | Complete 1 speaking session |
| `under_control` | Pace score ≥ 80 on any exercise |
| `no_filler` | Filler rate < 1/min in any exercise |
| `pause_master` | Complete ≥ 10 pause-related exercises |
| `authority_voice` | Sentence-final downturn ratio ≥ 0.9 |
| `the_hook` | Score ≥ 85 on any hook/intro exercise |
| `streak_30_speaking` | 30-day streak while on Speaking tier |

**Singing Tier (8 badges)**:
| Badge ID | Earn condition |
|---|---|
| `first_note` | Complete 1 singing session |
| `in_tune` | Any exercise score ≥ 80 |
| `steady` | Stability score ≥ 80 on any exercise |
| `found_the_note` | Onset score ≥ 80 on any exercise |
| `one_octave` | Vocal range ≥ 12 semitones documented |
| `range_expanded` | Vocal range expanded ≥ 1 semitone from baseline |
| `first_song` | Complete ≥ 1 full karaoke song (all snippets) |
| `style_pioneer` | Complete ≥ 1 style pack exercise |
| `streak_30_singing` | 30-day streak while on Singing tier |

**Cross-tier (5 badges)**:
| Badge ID | Earn condition |
|---|---|
| `both_voices` | Used both Speaking and Singing tiers |
| `sessions_100` | Complete ≥ 100 total sessions |
| `best_take` | (implicit) First personal best saved |
| `reflector` | Submit ≥ 20 reflections |

---

### 9.5 Unlockable content

| Content ID | Unlock condition |
|---|---|
| `karaoke_mode` | Level ≥ 4 |
| `style_pack_{n}` | Level ≥ 3 AND style pack prerequisites met |
| `speaking_track_{n}` | Level ≥ 3 (Phase 2) |
| `long_form_exercises` | sessionCount ≥ 30 |
| `avatar_color_variant_1` | Level ≥ 4 |
| `avatar_color_variant_2` | Level ≥ 6 |
| `avatar_accessory_headphones` | streakDays ≥ 30 |
| `avatar_accessory_microphone` | streakDays ≥ 60 |
| `app_theme_dark` | Level ≥ 5 |
| `app_theme_warm` | Level ≥ 5 |

---

## 10. API SURFACE

### Base URL
`https://api.voice.app/v1`

### Auth
All endpoints require `Authorization: Bearer {supabase_jwt}`. The JWT is issued by Supabase Auth on sign-in.

### Endpoints

```
POST   /v1/auth/register
POST   /v1/auth/login

GET    /v1/users/me
PATCH  /v1/users/me

GET    /v1/sessions
POST   /v1/sessions
GET    /v1/sessions/{sessionId}
POST   /v1/sessions/{sessionId}/complete

GET    /v1/sessions/{sessionId}/attempts
POST   /v1/sessions/{sessionId}/attempts
GET    /v1/sessions/{sessionId}/attempts/{attemptId}
PATCH  /v1/sessions/{sessionId}/attempts/{attemptId}

POST   /v1/sessions/{sessionId}/reflection

GET    /v1/exercises
GET    /v1/exercises/{exerciseId}

GET    /v1/users/me/best-takes
GET    /v1/users/me/best-takes/{exerciseId}

GET    /v1/users/me/rewards
GET    /v1/users/me/xp-events
GET    /v1/users/me/badges

# Phase 2 — Karaoke
GET    /v1/karaoke/songs
GET    /v1/karaoke/songs/{songId}
POST   /v1/karaoke/songs/{songId}/process
GET    /v1/karaoke/songs/{songId}/snippets
GET    /v1/karaoke/songs/{songId}/progress
POST   /v1/karaoke/attempts
GET    /v1/karaoke/attempts/{attemptId}
```

### Key request/response contracts

**POST /v1/sessions/{sessionId}/attempts** — submit a completed attempt
```json
Request body:
{
  "exerciseId": "sing_pitch_001_v1",
  "tier": "singing",
  "durationMs": 12400,
  "audioFileUrl": "https://storage.supabase.co/...",
  "metrics": {
    "pitchScore": 82,
    "stabilityScore": 76,
    "onsetScore": 79,
    "overallScore": 80,
    "successBand": "good",
    "medianCentsError": 14.2,
    "timeInToleranceMs": 8200
  }
}

Response body:
{
  "attemptId": "uuid",
  "isPersonalBest": true,
  "xpEvents": [
    { "source": "score_good",    "amount": 5 },
    { "source": "personal_best", "amount": 15 }
  ],
  "totalXpEarned": 20,
  "coachingPayload": {
    "praiseMessage": "...",
    "correctionMessage": "...",
    "actionTip": "...",
    "successBand": "good"
  }
}
```

**POST /v1/sessions/{sessionId}/complete**
```json
Request: {}

Response:
{
  "sessionId": "uuid",
  "xpTotal": 45,
  "newLevel": null,        // or number if leveled up
  "newBadges": ["in_tune"],
  "newUnlocks": [],
  "streakUpdate": {
    "newStreakDays": 5,
    "streakExtended": true,
    "milestoneReached": false
  }
}
```

---

## 11. NAVIGATION GRAPH

### Onboarding Stack (unauthenticated)
```
Welcome
  ↓
TierSelect          [state: activeTier]
  ↓
GoalSelect          [state: primaryGoal, filtered by activeTier]
  ↓
MicPermission       [system prompt; if denied → inform + allow skip]
  ↓
MicCheck            [signal quality gate; skip available]
  ↓
BaselineAssess      [1 exercise, no score pressure; establishes starting point]
  ↓
FirstWin            [avatar celebrates first result; sets first focus]
  ↓
SchedulePrompt      [reminder time picker]
  ↓
[Main Tab Navigator]
```

### Main Tab Navigator
```
HomeTab       → Home Dashboard
PracticeTab   → Practice Home
ProgressTab   → Progress Home
SettingsTab   → Settings Home
```

### Session Stack (both tiers)
```
SessionLoader
  ↓
WarmUpExercise (1–2 breathing exercises)
  ↓
ExerciseIntro           ← avatar greeting, exercise explanation
  ↓
[Optional] MicCheckGate ← if >10min since last signal check
  ↓
LiveExercise            ← real-time feedback
  ↓
ExerciseResult          ← score + coaching + Try Again / Next
  ↓ (loop 2–4 times)
BestTakePlayback
  ↓
SessionReflection
  ↓
SessionComplete
```

### Karaoke Mode Stack — Phase 2
```
KaraokeHome             ← songs in progress + search entry
  ↓
SongSearch              ← title/artist search
  ↓
SongDetail              ← difficulty, range, snippet preview
  ↓
SongProcessing          ← while Demucs runs (~30s); avatar explains
  ↓
SongPhraseMap           ← visual snippet progress map
  ↓
SnippetIntro
  ↓
SnippetListen           ← play original (with vocal)
  ↓
SnippetRecord           ← countdown + record over instrumental
  ↓
SnippetResult           ← match score + coaching + Try Again / Next Snippet
  ↓
SnippetComplete         ← celebrates; unlocks next snippet
  ↓ [return to SongPhraseMap]
```

### Screen name convention (React Navigation route names)
```
Auth:       Welcome, TierSelect, GoalSelect, MicPermission, MicCheck,
            BaselineAssess, FirstWin, SchedulePrompt

Main tabs:  HomeTab, PracticeTab, ProgressTab, SettingsTab

Session:    SessionLoader, WarmUpExercise, ExerciseIntro, LiveExercise,
            ExerciseResult, BestTakePlayback, SessionReflection, SessionComplete

Karaoke:    KaraokeHome, SongSearch, SongDetail, SongProcessing,
            SongPhraseMap, SnippetIntro, SnippetListen, SnippetRecord,
            SnippetResult, SnippetComplete

Progress:   ProgressHome, SkillTree, SessionHistory, BestTakesArchive,
            BadgeCollection, SongProgress

Settings:   SettingsHome, AccountSettings, AppSettings, AudioSettings,
            AvatarCustomization, PrivacySettings

Modals:     VocalSafetyModal, MicCheckModal, BadgeUnlockModal,
            LevelUpModal, StreakBrokenModal
```

### Modal triggers
| Modal | Trigger condition |
|---|---|
| VocalSafetyModal | High SPL + high F0 + unstable phonation detected simultaneously |
| MicCheckModal | >10 min since last signal quality check at session start |
| BadgeUnlockModal | evaluateBadges() returns ≥ 1 new badge |
| LevelUpModal | getLevelForXp(newTotal) > getLevelForXp(prevTotal) |
| StreakBrokenModal | computeStreakUpdate().streakBroken === true |

---

## 12. BUSINESS RULES AND CONSTRAINTS

### 12.1 Coaching rules (invariants for all dialogue copy)
1. **One correction per attempt** — CoachingPayload.correctionMessage is exactly one sentence, addressing exactly one issue.
2. **Specificity** — Praise references a specific measurable event ("You held within ±20 cents for 4.2 seconds"), never generic ("Good job!").
3. **No shame** — Never use "wrong", "bad", "failed". Use "developing", "getting there", "let's try", "work on".
4. **Agency language** — Always offer a choice: "Try again / Save and move on".
5. **Safety gate** — If the signal is noisy (RMS too low, clipping, high noise floor), route to mic check rather than giving misleading coaching feedback.
6. **Vocal safety override** — When strain-risk proxy triggers (high SPL + high F0 + instability), show VocalSafetyModal. The copy uses "ease-first" language.
7. **No "push harder"** — Never tell users to push their range. Always suggest ease-first progressions.
8. **Reflection before reward** — In session-complete flow, reflection prompt appears BEFORE XP display. This is non-negotiable for the SRL design.

### 12.2 Exercise versioning
- Never mutate a published exercise definition.
- Behavior changes require a new `exerciseId` with incremented version suffix: `speak_pace_001_v2`.
- Old exercise IDs remain valid in historical sessions and BestTake records.

### 12.3 BestTake
- Exactly one active BestTake per (userId, exerciseId) at any time.
- Audio is stored only with explicit user consent (audio storage opt-in during onboarding).
- BestTake audio is replayed immediately at session end (BestTakePlayback screen), and is accessible in Progress → BestTakesArchive.

### 12.4 Mic check gate
- Mic check is mandatory on first session per device.
- Subsequent sessions: re-check if >10 minutes since last passing check.
- If signal quality fails (noise floor too high, or consistent clipping), block exercise start and show MicCheckModal.

### 12.5 Session minimum
- A session must contain at least 1 completed attempt to count as a completed session for streak and XP purposes.
- Abandoned sessions (no `completedAt`) are stored but excluded from all aggregate computations.

### 12.6 Audio data
- Raw audio frames are never stored on the backend unless the user explicitly opts in.
- Opt-in happens during onboarding. Default is off.
- Audio stored in Supabase Storage under: `user-audio/{userId}/{sessionId}/{attemptId}.wav`
- Audio for best takes only is stored when opt-in is on.

### 12.7 Karaoke — legal
- Karaoke Mode is a licensed educational feature, not a copyright circumvention tool.
- Instrumental stems are not downloadable by users.
- Stems are stored per-user-session and not shared between users.
- Song search only surfaces songs with available licenses (internal allowlist). Phase 2.

### 12.8 Vocal safety — grindcore / extreme styles
- `grindcore` style pack requires mandatory VocalSafetyModal on first entry (not dismissable until user confirms).
- All extreme-style exercises are prefixed with a technique note: "This technique requires proper breath support and a warmed-up instrument."
- High-strain proxy = (meanRmsDb > -10 dBFS) AND (frequencyHz > 880 Hz) AND (stability < 40) for ≥ 3 consecutive seconds.

---

## 13. TECHNOLOGY BINDINGS

### Mobile (apps/mobile)
| Concern | Technology |
|---|---|
| Framework | Expo SDK 51+ (React Native) |
| Language | TypeScript |
| State | Zustand |
| Navigation | React Navigation v6 |
| Audio capture | expo-av + react-native-audio-api |
| Pitch detection | pYIN (JS/WASM), bundled |
| VAD | Silero VAD (ONNX Runtime JS) |
| Filler detection Phase 1 | whisper.cpp (tiny model, ONNX) |
| Avatar animation | lottie-react-native |
| Design tokens | @voice/ui-tokens |
| HTTP client | Axios or native fetch |
| Realtime | @supabase/supabase-js (Realtime channels) |

### Backend API (services/api)
| Concern | Technology |
|---|---|
| Runtime | Node.js 20 LTS |
| Framework | Fastify |
| Language | TypeScript |
| Database | Supabase (PostgreSQL 15) |
| Auth | Supabase Auth (JWT) |
| Storage | Supabase Storage (S3-compatible) |
| Job queue | Redis (BullMQ) |
| ORM | Prisma or raw Supabase client |

### Audio Processor (services/audio-processor)
| Concern | Technology |
|---|---|
| Runtime | Python 3.11 |
| Framework | FastAPI |
| Vocal separation | Demucs (htdemucs model) |
| Pitch analysis | pYIN (librosa) |
| ASR | OpenAI Whisper |
| DTW | dtw-python or custom NumPy impl |
| Job queue consumer | Redis (rq or celery) |
| GPU | CUDA if available; CPU fallback |

### Shared tooling
| Concern | Technology |
|---|---|
| Monorepo | pnpm workspaces |
| Type checking | TypeScript 5.x, strict mode |
| Build | tsc (packages), Expo EAS (mobile) |
| Testing | Jest |
| Linting | ESLint + Prettier |

---

## 14. PHASED FEATURE FLAGS

Features gated by release phase. Implement as feature flags keyed on user level and server-side phase config.

| Feature | Phase | Gate condition |
|---|---|---|
| Speaking Tier (full) | Build 0.1 | Always on |
| Singing Tier (full) | Build 0.2 / MVP | Always on |
| Both tiers simultaneously | MVP | Always on |
| Onboarding (full 8 steps) | MVP | Always on |
| Avatar + all states | MVP | Always on |
| Reward system (XP/streak/badges) | MVP | Always on |
| Best-take save and replay | MVP | Always on |
| Session reflection | MVP | Always on |
| Push notifications | Phase 2 | Server config flag |
| Karaoke Mode | Phase 2 | userLevel ≥ 4 |
| Specialization Tracks (Speaking) | Phase 2 | userLevel ≥ 3 |
| Adaptive difficulty | Phase 2 | Server config flag |
| Real-time filler detection | Phase 2 | Server config flag |
| SOVT exercises | Phase 2 | Server config flag |
| Style Packs (Singing) | Phase 3 | userLevel ≥ 3, pack unlocked |
| HNR metric | Phase 2 | Server config flag |
| CPP metric | Phase 2 | Server config flag |
| Vibrato analysis | Phase 2 | Server config flag |
| ElevenLabs TTS (avatar voice) | Phase 2 | Server config flag |
| Avatar cosmetic customization | Phase 3 | unlockedContent includes variant |
| Community features | Phase 3 | Server config flag |

---

*End of knowledge graph. Last updated: 2026-04-19. If any detail conflicts with a source file in this monorepo, update this document to reflect the resolution — this file is the authority.*
