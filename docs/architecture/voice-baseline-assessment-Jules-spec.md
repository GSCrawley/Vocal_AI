# VOICE — Baseline Assessment Flow: Technical Spec

**Handoff document for Jules**  
**Primary agents:** Mobile App Agent (§10) · Backend API and Supabase Agent (§11) · Audio Processor Agent (§12) · Domain Contracts Agent (§3)  
**Repo:** `GSCrawley/Vocal_AI`  
**Target paths:**

- `apps/mobile/` — onboarding screens and assessment UI
- `services/api/src/routes/` — assessment API endpoints
- `services/audio-processor/python/app/jobs/baseline_assessment.py` — Python job (already specced in `voice-audio-processor-spec.pplx.md`)
- `packages/shared-types/src/index.ts` — new type additions
- Supabase migrations — `user_baseline_snapshot` table and related columns

**Status of existing onboarding:** The knowledge graph documents the `BaselineAssess` and `FirstWin` screens as named route targets. Neither screen exists yet — `apps/mobile/App.tsx` is a Sentry-wrapped placeholder with no navigation or screens implemented. The `BaselineAssessmentJob` and `BaselineAssessmentResult` TypeScript contracts were specced in `voice-audio-processor-spec.pplx.md` §17.4 but not yet added to `services/audio-processor/src/index.ts`.

---

## 1. What the Baseline Assessment Is

The baseline assessment is a one-time, pressure-free onboarding experience that runs immediately after the user passes mic check for the first time. It captures three things:

1. **Vocal range** — the lowest and highest notes the user can sustain, and a comfortable singing range within that
2. **Starting metric grades** — per-metric 0–100 scores for every metric the adaptive coaching engine's Tier 1 weakness finder will use: pitch accuracy, pitch stability, breath control, tone quality
3. **Voice type estimate** — soprano / mezzo / alto / tenor / baritone / bass, used to select appropriate starting note targets for all subsequent exercises

The result is persisted as a `user_baseline_snapshot` row in Supabase. On every subsequent session, the adaptive coaching engine's `findWeakestMetric()` function reads the baseline to compute **delta scores** — how much a metric has improved or regressed since onboarding. This gives Tier 1 a signal that is much stronger than raw score alone: a pitchAccuracy of 55 means something very different for a user whose baseline was 30 versus a user whose baseline was 70.

### What It Is Not

- Not a scored session. The user sees no numbers during the baseline assessment. The avatar frames it entirely as "finding out where your voice is today" with no performance pressure.
- Not the first full session. The baseline assessment is part of onboarding, sits between `MicCheck` and `FirstWin`, and does not count toward streak, XP, or session history.
- Not optional. The mic check is the only gate the user can skip (and regret later). The baseline assessment cannot be skipped — but it must be framed so the user never wants to.
- Not a replacement for per-session metric tracking. Baseline is a snapshot at time zero; subsequent sessions build a rolling history on top of it.

---

## 2. Full User Journey

```
[Onboarding stack — unauthenticated]

Welcome
  ↓
TierSelect
  ↓
GoalSelect
  ↓
MicPermission     ← system OS prompt; denied → show explanation + allow skip
  ↓
MicCheck          ← signal quality gate (clipping, noise floor, voiced frames)
  ↓
─────────────────────────────────────────────────────
BaselineAssess    ← THIS SPEC (3 sub-screens below)
─────────────────────────────────────────────────────
  ↓
FirstWin          ← avatar reveals first focus metric; celebrates
  ↓
SchedulePrompt
  ↓
[Main Tab Navigator]
```

### Sub-screen sequence inside `BaselineAssess`

```
BaselineAssessIntro
  ↓
BaselineRangeWalk       ← systematic note-by-note recording (range walker)
  ↓
BaselineSustainedHold   ← 8-second comfortable note (pitch + stability + breath)
  ↓
BaselineProcessing      ← avatar talks while Python job runs async (~15s)
  ↓
[navigate to FirstWin]
```

---

## 3. New Shared Types

**File: `packages/shared-types/src/index.ts`**  
**Coordinate with Agent #3 (Domain Contracts Agent) before adding.**

Add to the bottom of the file, after the `SessionEvent` union and after any types added by the adaptive coaching engine spec:

```typescript
// ------------------------------------------------------------
// BASELINE ASSESSMENT — per-user snapshot at onboarding
// ------------------------------------------------------------

export type VoiceType = 'soprano' | 'mezzo' | 'alto' | 'tenor' | 'baritone' | 'bass';

export interface VocalRangeSnapshot {
  lowestNoteMidi: number; // Lowest note user can sustain, MIDI number
  highestNoteMidi: number; // Highest note user can sustain, MIDI number
  lowestNoteName: string; // e.g. "E2"
  highestNoteName: string; // e.g. "A4"
  lowestHz: number; // Hz equivalent
  highestHz: number;
  comfortableLowMidi: number; // Bottom of comfortable range (confidence > 0.75)
  comfortableHighMidi: number; // Top of comfortable range
  semitoneSpan: number; // highestNoteMidi - lowestNoteMidi
  comfortableSemitoneSpan: number; // comfortableHighMidi - comfortableLowMidi
  voiceType: VoiceType;
}

export interface BaselineMetricGrades {
  pitchAccuracy: number | null; // 0–100; null if audio quality insufficient
  pitchStability: number | null;
  breathControl: number | null;
  toneQuality: number | null;
  // Raw parselmouth readings (stored for reference, not displayed to user)
  hnrDb: number | null; // Harmonics-to-Noise Ratio in dB
  cppDb: number | null; // Cepstral Peak Prominence in dB
  jitterLocal: number | null; // Local jitter %
  shimmerLocal: number | null; // Local shimmer %
}

export interface UserBaselineSnapshot {
  snapshotId: string; // UUID
  userId: string; // FK → auth.users
  capturedAt: string; // ISO 8601 — onboarding completion timestamp
  tier: Tier; // Which tier was active at onboarding
  vocalRange: VocalRangeSnapshot;
  metrics: BaselineMetricGrades;
  recommendedStartingKeyMidi: number; // First exercise target note
  recommendedStartingKeyName: string; // e.g. "A3"
  audioProcessorJobId: string; // FK → the BaselineAssessmentJob that produced this
  qualityFlag: 'ok' | 'degraded'; // 'degraded' = some metrics null due to audio issues
}

// Returned by GET /v1/users/me/baseline — includes delta from current session metrics
export interface BaselineWithDeltas {
  snapshot: UserBaselineSnapshot;
  deltas: Partial<Record<keyof BaselineMetricGrades, number | null>>;
  // delta = currentSessionScore - baseline score
  // positive = improved since baseline; negative = regressed
  // null = metric not available in current session
  sessionsSinceBaseline: number;
  rangeExpandedSemitones: number | null; // null until range reassessment run
}

// Lightweight version sent inside every attempt response for Tier 1 context
export interface BaselineContext {
  snapshotId: string;
  metrics: BaselineMetricGrades;
  recommendedStartingKeyMidi: number;
  voiceType: VoiceType;
  capturedAt: string;
}
```

---

## 4. New Exercise Definitions

**File: `packages/content-schema/src/index.ts` (additions)**  
**Coordinate with Agent #7 (Curriculum and Content Agent).**

The baseline assessment uses three purpose-built exercise definitions. They must be seeded into the exercise catalog — these are not created dynamically.

### 4.1 Range Walk Exercise

```typescript
export const baselineRangeWalkExercise: ExerciseDefinition = {
  exerciseId: 'baseline-range-walk-v1',
  version: 1,
  tier: 'singing',
  category: 'pitch_matching',
  subcategory: 'range_assessment',
  title: 'Finding Your Range',
  description:
    "Sing each note the app plays for you. Start in the middle — we'll explore up and down from there.",
  userInstructionText:
    "Sing the note you hear, then hold it for a moment. There's no target to hit — just make sound.",
  durationTargetSeconds: 90, // ~1.5 minutes for a systematic walk
  repetitionsDefault: 1,
  targetPatternType: 'sustained_hold',
  targetPatternPayload: {
    startMidi: 57, // A3 — middle of typical comfortable range for mixed users
    stepSemitones: 1, // Increment one semitone at a time
    holdDurationMs: 1500, // 1.5 seconds per note
    pauseBetweenNotesMs: 500, // Brief gap for breath
    rangeMin: 36, // C2 — absolute floor (below this = not expected)
    rangeMax: 84, // C6 — absolute ceiling
    confidenceThreshold: 0.6,
    minVoicedRatioToCount: 0.5,
    sustainFramesRequired: 8,
    exitOnConsecutiveMisses: 3, // Stop going that direction after 3 consecutive failures
  },
  evaluationConfig: {
    // Evaluation is done by the Python range_walker, not on-device
    // This config communicates parameters to the audio-processor job
    isBaselineExercise: true,
    requiresServerSideAnalysis: true,
  },
  scoringWeights: {
    // Not scored in the conventional sense; these weights satisfy the sum-to-1 constraint
    // The range walker output is not a 0–100 score
    rangeSpan: 1.0,
  },
  feedbackRuleSetId: 'rules-baseline-range-v1',
  activeFlag: true,
};
```

### 4.2 Sustained Hold (Baseline)

```typescript
export const baselineSustainedHoldExercise: ExerciseDefinition = {
  exerciseId: 'baseline-sustain-hold-v1',
  version: 1,
  tier: 'singing',
  category: 'sustained_hold',
  subcategory: 'baseline_metrics',
  title: 'Hold a Comfortable Note',
  description:
    'Find a note that feels easy and natural for you. Hold it as steadily as you can for 8 seconds.',
  userInstructionText:
    'No target pitch this time — just find a note that feels comfortable and hold it.',
  durationTargetSeconds: 10, // 8s hold + 2s buffer
  repetitionsDefault: 1,
  targetPatternType: 'sustained_hold',
  targetPatternPayload: {
    // No fixed targetNote — the app uses the user's recommendedStartingKeyMidi
    // from the range walk result (set dynamically before this exercise starts)
    useDynamicTarget: true,
    holdDurationMs: 8000,
    referencePlayback: true, // Play the target note first so user knows where to aim
    referencePlayDurationMs: 1500,
  },
  evaluationConfig: {
    isBaselineExercise: true,
    requiresServerSideAnalysis: true,
    centsTolerance: 50, // Wide tolerance — this is assessment, not training
    minimumVoicedFrames: 20,
    confidenceFloor: 0.5,
    allowDegradedScoring: true,
  },
  scoringWeights: {
    pitchAccuracy: 0.35,
    stability: 0.45,
    breathControl: 0.2,
  },
  feedbackRuleSetId: 'rules-baseline-sustain-v1',
  activeFlag: true,
};
```

---

## 5. Mobile Screen Implementations

**Target: `apps/mobile/` — Agent #10 (Mobile App Agent)**

### 5.1 Screen: `BaselineAssessIntro`

**Route name:** `BaselineAssessIntro`  
**Position in stack:** Immediately after `MicCheck` passes  
**Navigation:** `navigation.replace('BaselineAssessIntro')` — use `replace` not `push` so the user cannot swipe back to mic check

**Layout:**

```
┌──────────────────────────────────────┐
│                                      │
│         [Avatar — INTRO state]       │
│                                      │
│  "Let's find out where your voice    │
│   is today."                         │
│                                      │
│  "I'm going to play some notes —     │
│   all I need you to do is match      │
│   them. This isn't a test. There     │
│   are no right answers."             │
│                                      │
│  "It takes about two minutes."       │
│                                      │
│         [Ready — Let's Go]           │
│                                      │
└──────────────────────────────────────┘
```

**Avatar dialogue sequence:**

```typescript
const BASELINE_INTRO_DIALOGUE: AvatarDialogueLine[] = [
  {
    text: "Let's find out where your voice is today.",
    state: 'INTRO',
    durationMs: 3000,
  },
  {
    text: "I'm going to play some notes — just match each one and hold it for a moment.",
    state: 'INTRO',
    durationMs: 4000,
  },
  {
    text: "This isn't a test. I'm just listening. Takes about two minutes.",
    state: 'INTRO',
    durationMs: 3500,
  },
  {
    text: 'Ready when you are.',
    state: 'INTRO',
    awaitUserAction: true,
  },
];
```

**State management:**

```typescript
// Zustand store additions (apps/mobile/src/store/ — new slice)
interface BaselineAssessmentStore {
  phase: 'intro' | 'range_walk' | 'sustained_hold' | 'processing' | 'complete';
  rangeWalkAudioUri: string | null; // Recorded audio from range walk
  sustainedHoldAudioUri: string | null; // Recorded audio from sustained hold
  jobId: string | null; // baseline_assessment job ID from API
  result: UserBaselineSnapshot | null;
  error: string | null;

  setPhase: (phase: BaselineAssessmentStore['phase']) => void;
  setRangeWalkAudio: (uri: string) => void;
  setSustainedHoldAudio: (uri: string) => void;
  setJobId: (id: string) => void;
  setResult: (snapshot: UserBaselineSnapshot) => void;
  setError: (error: string) => void;
  reset: () => void;
}
```

---

### 5.2 Screen: `BaselineRangeWalk`

**Route name:** `BaselineRangeWalk`  
**Purpose:** Guide the user through a systematic note-by-note scale walk. The app plays each note via a reference tone, the user sings it, and the app records a single continuous audio file for the full session.

> **Recording strategy:** Record the entire range walk session as one continuous audio file. The Python range walker segments it by the known note schedule (note timestamps + hold durations + pauses). Do not attempt per-note segmentation on device.

**Layout:**

```
┌──────────────────────────────────────┐
│  [Avatar — LISTENING state]          │
│                                      │
│  ─────────────────────────────────   │
│  Live pitch indicator (real-time)    │
│                                      │
│  [Note being played: A3]             │
│  [Simple waveform or pitch bar]      │
│                                      │
│  "Just follow along — no pressure."  │
│                                      │
│  Progress: ○○○●●○○○ (note dots)      │
│                                      │
└──────────────────────────────────────┘
```

**Implementation logic:**

```typescript
// apps/mobile/src/screens/baseline/BaselineRangeWalk.tsx

import { useRef, useState, useEffect } from 'react';
import { Audio } from 'expo-av';

interface NoteStep {
  midiNote: number;
  noteName: string;
  targetHz: number;
  timestampMs: number; // When in the recording this note starts
}

const MIDI_TO_HZ = (midi: number) => 440 * Math.pow(2, (midi - 69) / 12);
const MIDI_TO_NAME = (n: number) => {
  const names = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  return `${names[n % 12]}${Math.floor(n / 12) - 1}`;
};

// Build the note schedule from center outward (up first, then down)
// Exits when EXIT_ON_CONSECUTIVE_MISSES misses in a row (handled server-side)
function buildNoteSchedule(
  centerMidi: number = 57, // A3
  stepSemitones: number = 1,
  rangeMin: number = 36,
  rangeMax: number = 84,
  holdMs: number = 1500,
  pauseMs: number = 500
): NoteStep[] {
  const steps: NoteStep[] = [];
  let t = 0;

  // Start at center
  steps.push({
    midiNote: centerMidi,
    noteName: MIDI_TO_NAME(centerMidi),
    targetHz: MIDI_TO_HZ(centerMidi),
    timestampMs: t,
  });
  t += holdMs + pauseMs;

  // Walk up
  for (let n = centerMidi + stepSemitones; n <= rangeMax; n += stepSemitones) {
    steps.push({ midiNote: n, noteName: MIDI_TO_NAME(n), targetHz: MIDI_TO_HZ(n), timestampMs: t });
    t += holdMs + pauseMs;
  }
  // Walk down from center-1
  for (let n = centerMidi - stepSemitones; n >= rangeMin; n -= stepSemitones) {
    steps.push({ midiNote: n, noteName: MIDI_TO_NAME(n), targetHz: MIDI_TO_HZ(n), timestampMs: t });
    t += holdMs + pauseMs;
  }

  return steps;
}

export function BaselineRangeWalk({ navigation }: { navigation: any }) {
  const recording = useRef<Audio.Recording | null>(null);
  const [currentNoteIdx, setCurrentNoteIdx] = useState(0);
  const [noteSchedule] = useState(() => buildNoteSchedule());
  const [isRecording, setIsRecording] = useState(false);

  // Timeline-driven playback — play reference tone + advance UI
  useEffect(() => {
    startRecordingAndPlayback();
    return () => stopRecording();
  }, []);

  async function startRecordingAndPlayback() {
    // 1. Start continuous recording
    const { recording: rec } = await Audio.Recording.createAsync(
      Audio.RecordingOptionsPresets.HIGH_QUALITY
    );
    recording.current = rec;
    setIsRecording(true);

    // 2. Drive note playback on schedule
    for (let i = 0; i < noteSchedule.length; i++) {
      const step = noteSchedule[i];
      setCurrentNoteIdx(i);

      // Play reference tone (pure sine at step.targetHz, 800ms)
      await playReferenceTone(step.targetHz, 800);
      // Wait for hold duration + pause
      await sleep(
        noteSchedule[0].timestampMs === 0
          ? 1500 + 500 // first note
          : 1500 + 500
      ); // subsequent notes
    }

    // 3. Stop recording, hand URI to next screen
    const uri = await stopRecording();
    navigation.navigate('BaselineSustainedHold', {
      rangeWalkUri: uri,
      noteSchedule, // Pass schedule so server knows exact note timestamps
    });
  }

  async function stopRecording(): Promise<string> {
    if (!recording.current) return '';
    await recording.current.stopAndUnloadAsync();
    const uri = recording.current.getURI() ?? '';
    recording.current = null;
    setIsRecording(false);
    return uri;
  }

  // ... render live pitch indicator, current note name, progress dots
}

// Reference tone generation — synthesize sine wave using Audio API
// Implementation uses expo-av's Audio.Sound with a generated WAV buffer
async function playReferenceTone(hz: number, durationMs: number): Promise<void> {
  // Approach: generate a PCM buffer at 44100 Hz with a sine wave at hz
  // Load it as an in-memory Audio.Sound and play it
  // Details of PCM buffer generation left to Agent #10 (standard DSP)
  // Minimum viable: use a pre-generated note library for the 48 MIDI notes in range
  // (36–84 = C2–C6, chromatic), avoids runtime synthesis complexity on iOS
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
```

**UI constraints:**

- The progress bar / dot track shows how far through the scale the user is, but does NOT show note names in a way that would create test anxiety. "Note 14 of 48" is acceptable. The current note name ("A3") should appear small and secondary.
- The live pitch indicator is the primary visual. It shows a simple colored bar or wave that responds to voice, confirming the mic is picking up sound — not a cents-error meter. This is assessment mode, not practice mode.
- The avatar stays in `LISTENING` state throughout. No dialogue during recording. A small subtitle: "Just follow along — no pressure."
- If the user taps a "Done" button early (added for long sessions), recording stops and the collected audio is used as-is. The range walker will work with whatever notes were captured.

---

### 5.3 Screen: `BaselineSustainedHold`

**Route name:** `BaselineSustainedHold`  
**Purpose:** Record an 8-second sustained note at the user's comfortable pitch. This audio file is analyzed for pitch accuracy, stability, breath control, and tone quality — the four core baseline metrics.

**The target note is set dynamically** using either:

1. The midpoint of the comfortable range detected in the range walk (if already known), OR
2. `A3` (MIDI 57) as a universal fallback — the most commonly comfortable note across voice types

Because the range walk result is not yet processed at this point (it's queued server-side), the mobile app uses A3 as the target for the sustained hold. The server reconciles both when it processes the full baseline job.

**Layout:**

```
┌──────────────────────────────────────┐
│  [Avatar — LISTENING state]          │
│                                      │
│  ─────────────────────────────────   │
│  Live pitch bar (real-time)          │
│  [no target indicator — free pitch]  │
│                                      │
│  "Find a note that feels             │
│   comfortable. Hold it for           │
│   as long as it feels right."        │
│                                      │
│  [8-second countdown bar]            │
│                                      │
└──────────────────────────────────────┘
```

**Implementation logic:**

```typescript
// apps/mobile/src/screens/baseline/BaselineSustainedHold.tsx

const HOLD_DURATION_MS = 8000;

export function BaselineSustainedHold({ navigation, route }: { navigation: any; route: any }) {
  const { rangeWalkUri, noteSchedule } = route.params;
  const [phase, setPhase] = useState<'intro' | 'recording' | 'done'>('intro');
  const [progress, setProgress] = useState(0); // 0–1 for countdown bar
  const recordingRef = useRef<Audio.Recording | null>(null);

  // 1. Play reference tone (A3 = 220Hz × 2 = 440Hz × 0.5; A3 = 220Hz)
  async function startExercise() {
    // Play reference tone for 1.5s so user hears the target pitch
    await playReferenceTone(220.0, 1500); // A3 = 220Hz

    // 2. Start recording
    const { recording } = await Audio.Recording.createAsync(
      Audio.RecordingOptionsPresets.HIGH_QUALITY
    );
    recordingRef.current = recording;
    setPhase('recording');

    // 3. Countdown
    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      setProgress(Math.min(elapsed / HOLD_DURATION_MS, 1));
      if (elapsed >= HOLD_DURATION_MS) {
        clearInterval(interval);
        finishRecording();
      }
    }, 50);
  }

  async function finishRecording() {
    if (!recordingRef.current) return;
    await recordingRef.current.stopAndUnloadAsync();
    const uri = recordingRef.current.getURI() ?? '';
    recordingRef.current = null;
    setPhase('done');

    // Navigate to processing screen — pass both audio URIs
    navigation.navigate('BaselineProcessing', {
      rangeWalkUri,
      sustainedHoldUri: uri,
      noteSchedule,
    });
  }

  // ... render countdown bar, avatar, dialogue
}
```

---

### 5.4 Screen: `BaselineProcessing`

**Route name:** `BaselineProcessing`  
**Purpose:** Upload both audio recordings, submit the baseline job, poll for completion, then navigate to `FirstWin`.

**Expected processing time:** 10–25 seconds (pYIN on ~90s range walk + 8s hold, parselmouth analysis, range walker).

**Layout:**

```
┌──────────────────────────────────────┐
│                                      │
│     [Avatar — ANALYZING state]       │
│                                      │
│  "I'm getting a feel for             │
│   your voice..."                     │
│                                      │
│  [Subtle animated progress pulse]    │
│                                      │
│  (No percentage, no spinner that     │
│   makes it feel like a loading bar)  │
│                                      │
└──────────────────────────────────────┘
```

**Avatar dialogue during processing (cycling, non-intrusive subtitles):**

```typescript
const PROCESSING_DIALOGUE_LINES = [
  "I'm getting a feel for your voice...",
  'Looking at where your range starts and ends...',
  'Noting how you support a held note...',
  'Almost there.',
];
// Cycle through these lines every 5 seconds during processing
```

**Implementation logic:**

```typescript
// apps/mobile/src/screens/baseline/BaselineProcessing.tsx

export function BaselineProcessing({ navigation, route }: { navigation: any; route: any }) {
  const { rangeWalkUri, sustainedHoldUri, noteSchedule } = route.params;

  useEffect(() => {
    runBaselineAssessment();
  }, []);

  async function runBaselineAssessment() {
    try {
      // 1. Upload both audio files to Supabase Storage (signed upload URL)
      const [rangeWalkUrl, sustainedHoldUrl] = await Promise.all([
        uploadAudio(rangeWalkUri, 'baseline/range-walk'),
        uploadAudio(sustainedHoldUri, 'baseline/sustained-hold'),
      ]);

      // 2. Submit baseline assessment job to API
      const { jobId } = await api.post('/v1/assessments/baseline', {
        rangeTestAudioUrl: rangeWalkUrl,
        sustainedHoldAudioUrl: sustainedHoldUrl,
        noteSchedule, // Array of { midiNote, timestampMs } so server can segment
      });

      // 3. Poll for result (max 60s, 2s interval)
      const snapshot = await pollForBaseline(jobId);

      // 4. Navigate to FirstWin with the snapshot
      navigation.replace('FirstWin', { snapshot });
    } catch (err) {
      // If baseline fails, continue to FirstWin with null snapshot
      // (system falls back to default starting state)
      console.error('[BaselineProcessing]', err);
      navigation.replace('FirstWin', { snapshot: null, error: true });
    }
  }

  async function pollForBaseline(
    jobId: string,
    maxAttempts = 30,
    intervalMs = 2000
  ): Promise<UserBaselineSnapshot> {
    for (let i = 0; i < maxAttempts; i++) {
      await sleep(intervalMs);
      const response = await api.get(`/v1/assessments/baseline/${jobId}`);
      if (response.status === 'complete') return response.snapshot;
      if (response.status === 'failed') throw new Error('Baseline job failed');
    }
    throw new Error('Baseline job timed out');
  }
}
```

**Failure handling:**

- If the upload fails or times out: navigate to `FirstWin` with `snapshot: null`. The system marks the baseline as pending and retries on next app launch.
- If the Python job fails (bad audio, etc.): same — navigate forward with `snapshot: null, qualityFlag: 'degraded'`.
- In both failure cases, `FirstWin` shows a graceful message: "We'll calibrate your starting point as you practice — let's jump in."
- Do not block the user in the onboarding flow. A missing baseline is recoverable.

---

### 5.5 Screen: `FirstWin`

**Route name:** `FirstWin`  
**Purpose:** Avatar reveals what the system learned and sets the first coaching focus. This is a celebration screen, not a report card.

**Layout:**

```
┌──────────────────────────────────────┐
│                                      │
│    [Avatar — CELEBRATING state]      │
│                                      │
│  "Your voice is a [VoiceType]."      │
│                                      │
│  "Your comfortable range right now   │
│   is [X] to [Y]."                    │
│                                      │
│  "We're going to start with          │
│   [focusMetric] — it's where you'll  │
│   make the fastest progress."        │
│                                      │
│  [Badge unlock: first_note ★]        │
│  [+5 XP for completing assessment]   │
│                                      │
│         [Let's Practice]             │
│                                      │
└──────────────────────────────────────┘
```

**Avatar dialogue (generated from template, not LLM):**

```typescript
function buildFirstWinDialogue(snapshot: UserBaselineSnapshot | null): AvatarDialogueLine[] {
  if (!snapshot) {
    return [
      {
        text: "Your voice is ready to train — let's find out exactly what it can do as we go.",
        state: 'CELEBRATING',
        durationMs: 4000,
      },
      {
        text: "We'll start with pitch accuracy — the foundation of everything else.",
        state: 'INTRO',
        awaitUserAction: true,
      },
    ];
  }

  const voiceTypeLabels: Record<VoiceType, string> = {
    soprano: 'a soprano',
    mezzo: 'a mezzo-soprano',
    alto: 'an alto',
    tenor: 'a tenor',
    baritone: 'a baritone',
    bass: 'a bass',
  };

  const focusMetricDescriptions: Partial<Record<SingingMetricKey, string>> = {
    pitchAccuracy: 'pitch accuracy — landing notes cleanly',
    stability: 'pitch stability — holding notes steady',
    breathControl: 'breath control — keeping the voice supported',
    toneQuality: 'tone quality — the fullness and consistency of your sound',
  };

  // Choose initial focus: whichest baseline metric is lowest
  const focusMetric = identifyInitialFocus(snapshot.metrics);

  return [
    {
      text: `Your voice is ${voiceTypeLabels[snapshot.vocalRange.voiceType]}.`,
      state: 'CELEBRATING',
      durationMs: 3000,
    },
    {
      text: `Your comfortable range right now is ${snapshot.vocalRange.lowestNoteName} to ${snapshot.vocalRange.highestNoteName} — ${snapshot.vocalRange.comfortableSemitoneSpan} semitones.`,
      state: 'INTRO',
      durationMs: 4000,
    },
    {
      text: `We're going to start by working on ${focusMetricDescriptions[focusMetric] ?? 'pitch accuracy'}.`,
      state: 'INTRO',
      durationMs: 3500,
    },
    {
      text: 'Ready to take your first rep?',
      state: 'INTRO',
      awaitUserAction: true,
    },
  ];
}

// Identify the lowest-scoring non-null metric as the initial coaching focus
function identifyInitialFocus(metrics: BaselineMetricGrades): SingingMetricKey {
  const ranked: Array<[SingingMetricKey, number]> = [
    ['pitchAccuracy', metrics.pitchAccuracy ?? 50],
    ['pitchStability', metrics.pitchStability ?? 50],
    ['breathControl', metrics.breathControl ?? 50],
    ['toneQuality', metrics.toneQuality ?? 50],
  ].sort((a, b) => a[1] - b[1]);

  return ranked[0][0] as SingingMetricKey;
}
```

**XP and badge award:**

- Award `first_note` badge on `FirstWin` display (singing tier)
- Award +5 XP for assessment completion (use `session_complete` source)
- These are awarded via `POST /v1/assessments/baseline/complete` — a lightweight route that triggers the reward events without needing a full session

---

## 6. API Endpoint Contracts

**Coordinate with Agent #11 (Backend API and Supabase Agent).**

All endpoints require `Authorization: Bearer {supabase_jwt}`.

### `POST /v1/assessments/baseline`

Submit a baseline assessment job. Uploads have already been completed by the mobile client; this endpoint queues the Python job.

```typescript
// Request body:
{
  "rangeTestAudioUrl": string,        // Supabase Storage URL (already uploaded)
  "sustainedHoldAudioUrl": string,    // Supabase Storage URL (already uploaded)
  "noteSchedule": Array<{             // Timing map for the range walk segmentation
    midiNote: number;
    noteName: string;
    timestampMs: number;
    holdDurationMs: number;
  }>
}

// Response:
{
  "jobId": string,                    // Baseline assessment job ID
  "estimatedCompletionMs": 15000      // Rough estimate for client polling budget
}
```

**Handler logic:**

```typescript
// services/api/src/routes/assessments.ts

async function handleBaselineSubmit(req, reply) {
  const { rangeTestAudioUrl, sustainedHoldAudioUrl, noteSchedule } = req.body;
  const userId = req.userId; // from JWT

  // 1. Check if user already has a baseline snapshot
  const existing = await supabase
    .from('user_baseline_snapshot')
    .select('snapshot_id')
    .eq('user_id', userId)
    .single();

  if (existing.data) {
    // Re-assessment: allowed, but rare. Create a new snapshot (do not overwrite old).
    // Old snapshot remains as historical record.
  }

  // 2. Generate job ID
  const jobId = crypto.randomUUID();

  // 3. Enqueue baseline_assessment job via Redis
  await redis.lpush(
    'voice-audio-processor',
    JSON.stringify({
      jobType: 'baseline_assessment',
      jobId,
      userId,
      rangeTestAudioUrl,
      sustainedHoldAudioUrl: sustainedHoldAudioUrl,
      freeVocalAudioUrl: sustainedHoldAudioUrl, // Phase 1: use sustained hold as free vocal proxy
      noteSchedule, // Extra payload for range walker segmentation
    })
  );

  // 4. Create a pending snapshot record
  await supabase.from('user_baseline_snapshot').insert({
    snapshot_id: jobId, // Use jobId as snapshot_id for traceability
    user_id: userId,
    audio_processor_job_id: jobId,
    status: 'pending',
    captured_at: new Date().toISOString(),
    tier: req.body.tier ?? 'singing',
  });

  return reply.send({ jobId, estimatedCompletionMs: 15000 });
}
```

---

### `GET /v1/assessments/baseline/:jobId`

Poll for baseline job completion.

```typescript
// Response when pending:
{ "status": "pending" | "processing" }

// Response when complete:
{
  "status": "complete",
  "snapshot": UserBaselineSnapshot
}

// Response when failed:
{
  "status": "failed",
  "qualityFlag": "unusable",
  "reason": "Insufficient voiced frames in range walk recording"
}
```

---

### `POST /v1/assessments/baseline/complete`

Called by `FirstWin` screen once the user taps "Let's Practice". Awards the `first_note` badge and assessment XP.

```typescript
// Request:
{ "snapshotId": string }

// Response:
{
  "xpAwarded": 5,
  "badgesUnlocked": ["first_note"],
  "userProfile": UserProfile  // Updated profile with new XP
}
```

---

### `GET /v1/users/me/baseline`

Returns the current baseline snapshot for the authenticated user, enriched with delta scores from the last session.

```typescript
// Response:
{
  "snapshot": UserBaselineSnapshot | null,   // null if assessment not yet complete
  "deltas": BaselineWithDeltas | null,
  "isAssessmentComplete": boolean,
  "assessmentPending": boolean               // true if job submitted but not yet processed
}
```

---

### `GET /v1/users/me/baseline/context`

Lightweight endpoint called at the start of every coaching session by the API handler (not by mobile directly). Returns the `BaselineContext` needed by `findWeakestMetric()`.

```typescript
// Response:
{
  "context": BaselineContext | null
}
```

This endpoint is called internally by `POST /v1/sessions/{sessionId}/attempts` so the API handler can pass baseline context to the coaching engine without the mobile app needing to manage it.

---

## 7. Python Audio Processor — Baseline Assessment Job

**File: `services/audio-processor/python/app/jobs/baseline_assessment.py`**  
**Already specced in `voice-audio-processor-spec.pplx.md` §17.4 and §13.**

The following summarizes what must be built and adds the note-schedule segmentation detail that was not covered in the prior spec.

### Job flow

```python
def run(job_payload: dict) -> dict:
    job_id = job_payload["jobId"]
    user_id = job_payload["userId"]
    range_test_url = job_payload["rangeTestAudioUrl"]
    sustained_hold_url = job_payload["sustainedHoldAudioUrl"]
    note_schedule = job_payload.get("noteSchedule", [])

    # 1. Download audio files from Supabase Storage
    range_audio, sr = download_and_load(range_test_url)
    hold_audio, _ = download_and_load(sustained_hold_url)

    # 2. Quality check — both files
    range_quality = check_quality(range_audio, sr, voiced_flag=None)
    hold_quality = check_quality(hold_audio, sr, voiced_flag=None)

    if not range_quality.is_usable and not hold_quality.is_usable:
        return { "jobId": job_id, "status": "failed",
                 "reason": "Both audio files failed quality check" }

    # 3. Segment range walk audio by note schedule
    # note_schedule: [{midiNote, timestampMs, holdDurationMs}, ...]
    pitch_frames_per_note = segment_range_walk(range_audio, sr, note_schedule)

    # 4. Run range walker
    from app.analysis.range_walker import detect_vocal_range
    range_result = detect_vocal_range(pitch_frames_per_note)

    # 5. Run full metric analysis on sustained hold
    from app.analysis.singing_metrics import compute_singing_metrics
    # Use recommended starting key (midpoint of comfortable range) as target_hz
    target_hz = note_to_hz(
        (range_result["comfortable_low_midi"] + range_result["comfortable_high_midi"]) // 2
    )
    metrics_result = compute_singing_metrics(
        hold_audio, sr,
        target_hz=target_hz,
        tolerance_cents=50.0,   # Wide tolerance for baseline
    )

    # 6. Compute recommended starting key
    comfortable_mid = (range_result["comfortable_low_midi"] + range_result["comfortable_high_midi"]) // 2
    # Round to nearest chromatic note that's in a common exercise-friendly key
    recommended_key = snap_to_exercise_key(comfortable_mid)

    # 7. Build result
    result = {
        "jobId": job_id,
        "userId": user_id,
        "lowestNoteMidi": range_result["lowest_note_midi"],
        "highestNoteMidi": range_result["highest_note_midi"],
        "lowestNoteName": range_result["lowest_note_name"],
        "highestNoteName": range_result["highest_note_name"],
        "lowestHz": range_result["lowest_hz"],
        "highestHz": range_result["highest_hz"],
        "comfortableLowMidi": range_result["comfortable_low_midi"],
        "comfortableHighMidi": range_result["comfortable_high_midi"],
        "semitoneSpan": range_result["highest_note_midi"] - range_result["lowest_note_midi"],
        "comfortableSemitoneSpan": range_result["comfortable_high_midi"] - range_result["comfortable_low_midi"],
        "voiceType": range_result["voice_type"],
        "baselineMetrics": {
            "pitchAccuracy": metrics_result.get("pitch_accuracy"),
            "pitchStability": metrics_result.get("pitch_stability"),
            "breathControl": metrics_result.get("breath_control"),
            "toneQuality": metrics_result.get("tone_quality"),
            "hnrDb": metrics_result.get("hnr_db"),
            "cppDb": metrics_result.get("cpp_db"),
            "jitterLocal": metrics_result.get("jitter_local"),
            "shimmerLocal": metrics_result.get("shimmer_local"),
        },
        "recommendedStartingKeyMidi": recommended_key,
        "recommendedStartingKeyName": midi_to_name(recommended_key),
        "qualityFlag": "degraded" if metrics_result.get("quality_flag") else "ok",
        "completedAt": datetime.utcnow().isoformat() + "Z",
    }

    # 8. Write result to Supabase (via supabase-py client)
    supabase_client.table("user_baseline_snapshot").update({
        "status": "complete",
        "result_json": result,
        "vocal_range_json": range_result,
        "metrics_json": result["baselineMetrics"],
        "voice_type": range_result["voice_type"],
        "lowest_note_midi": range_result["lowest_note_midi"],
        "highest_note_midi": range_result["highest_note_midi"],
        "comfortable_low_midi": range_result["comfortable_low_midi"],
        "comfortable_high_midi": range_result["comfortable_high_midi"],
        "recommended_key_midi": recommended_key,
        "quality_flag": result["qualityFlag"],
        "completed_at": result["completedAt"],
    }).eq("snapshot_id", job_id).execute()

    return result
```

### Note-schedule segmentation helper

```python
def segment_range_walk(
    audio: np.ndarray,
    sr: int,
    note_schedule: list,
) -> dict:
    """
    Slice the continuous range walk recording into per-note audio segments,
    run pYIN on each, and return a dict of {midi_note: pitch_frames}.

    note_schedule items: {midiNote, timestampMs, holdDurationMs}
    """
    from app.analysis.pitch import extract_pitch_pyin, pitch_to_frames

    pitch_frames_per_note = {}

    for note in note_schedule:
        midi = note["midiNote"]
        start_sample = int((note["timestampMs"] / 1000.0) * sr)
        end_sample = int(((note["timestampMs"] + note["holdDurationMs"]) / 1000.0) * sr)

        # Clamp to audio length
        end_sample = min(end_sample, len(audio))
        if start_sample >= end_sample:
            continue

        segment = audio[start_sample:end_sample]
        if len(segment) < sr * 0.3:  # Skip segments shorter than 300ms
            continue

        pitch_result = extract_pitch_pyin(segment, sr)
        frames = pitch_to_frames(pitch_result)
        pitch_frames_per_note[midi] = [
            {
                "timestampMs": f["timestampMs"],
                "frequencyHz": f["frequencyHz"],
                "voiced": f["voiced"],
                "confidence": f["confidence"],
            }
            for f in frames
        ]

    return pitch_frames_per_note


def snap_to_exercise_key(midi: int) -> int:
    """
    Snap the comfortable midpoint to the nearest 'exercise-friendly' note.
    For Phase 1, prefer A natural notes (A2=45, A3=57, A4=69) as they are
    the most commonly used reference tones in vocal pedagogy.
    """
    a_notes = [21, 33, 45, 57, 69, 81]  # A0–A5 in MIDI
    return min(a_notes, key=lambda a: abs(a - midi))
```

---

## 8. TypeScript Contract Additions to Audio Processor

**File: `services/audio-processor/src/index.ts`**  
**Add per `voice-audio-processor-spec.pplx.md` §17.4 — reproduced here for completeness.**

```typescript
// ADD to services/audio-processor/src/index.ts

// Extend the AudioProcessorJobType union:
export type AudioProcessorJobType =
  | 'vocal_separation'
  | 'vocal_analysis'
  | 'filler_detection'
  | 'karaoke_compare'
  | 'singing_metrics' // From audio-processor spec §17.3
  | 'baseline_assessment'; // This spec

// New job interfaces:
export interface BaselineAssessmentJob {
  jobType: 'baseline_assessment';
  jobId: string;
  userId: string;
  rangeTestAudioUrl: string;
  sustainedHoldAudioUrl: string;
  freeVocalAudioUrl: string;
  noteSchedule: Array<{
    midiNote: number;
    noteName: string;
    timestampMs: number;
    holdDurationMs: number;
  }>;
}

export interface BaselineAssessmentResult {
  jobId: string;
  userId: string;
  lowestNoteMidi: number;
  highestNoteMidi: number;
  lowestNoteName: string;
  highestNoteName: string;
  lowestHz: number;
  highestHz: number;
  comfortableLowMidi: number;
  comfortableHighMidi: number;
  semitoneSpan: number;
  comfortableSemitoneSpan: number;
  voiceType: string; // VoiceType string value
  baselineMetrics: {
    pitchAccuracy: number | null;
    pitchStability: number | null;
    breathControl: number | null;
    toneQuality: number | null;
    hnrDb: number | null;
    cppDb: number | null;
    jitterLocal: number | null;
    shimmerLocal: number | null;
  };
  recommendedStartingKeyMidi: number;
  recommendedStartingKeyName: string;
  qualityFlag: 'ok' | 'degraded';
  completedAt: string;
}

// Extend AudioProcessorJob union:
export type AudioProcessorJob =
  | VocalSeparationJob
  | VocalAnalysisJob
  | FillerDetectionJob
  | KaraokeCompareJob
  | SingingMetricsJob // From audio-processor spec
  | BaselineAssessmentJob; // This spec
```

---

## 9. Supabase Schema

**Coordinate with Agent #11 (Backend API) and Agent #18 (Security, Privacy, and Compliance).**

### 9.1 New table: `user_baseline_snapshot`

```sql
CREATE TABLE user_baseline_snapshot (
  snapshot_id                 UUID PRIMARY KEY,
  user_id                     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  audio_processor_job_id      TEXT NOT NULL,
  status                      TEXT NOT NULL DEFAULT 'pending',
                              -- 'pending' | 'processing' | 'complete' | 'failed'
  tier                        TEXT NOT NULL DEFAULT 'singing',  -- 'speaking' | 'singing'

  -- Vocal range (populated when status = 'complete')
  lowest_note_midi            SMALLINT,
  highest_note_midi           SMALLINT,
  lowest_note_name            TEXT,
  highest_note_name           TEXT,
  lowest_hz                   REAL,
  highest_hz                  REAL,
  comfortable_low_midi        SMALLINT,
  comfortable_high_midi       SMALLINT,
  semitone_span               SMALLINT,
  comfortable_semitone_span   SMALLINT,
  voice_type                  TEXT,  -- VoiceType enum value

  -- Baseline metric grades (all 0–100; nullable if quality insufficient)
  baseline_pitch_accuracy     REAL,
  baseline_pitch_stability    REAL,
  baseline_breath_control     REAL,
  baseline_tone_quality       REAL,
  baseline_hnr_db             REAL,
  baseline_cpp_db             REAL,
  baseline_jitter_local       REAL,
  baseline_shimmer_local      REAL,

  -- Starting point
  recommended_key_midi        SMALLINT,
  recommended_key_name        TEXT,   -- e.g. "A3"

  -- Metadata
  quality_flag                TEXT DEFAULT 'ok',  -- 'ok' | 'degraded'
  quality_note                TEXT,

  -- Full JSON blobs for forward-compatibility (avoids schema migration when adding metrics)
  result_json                 JSONB,              -- Full BaselineAssessmentResult
  vocal_range_json            JSONB,              -- VocalRangeSnapshot
  metrics_json                JSONB,              -- BaselineMetricGrades

  -- Timestamps
  captured_at                 TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at                TIMESTAMPTZ,

  -- One active snapshot per user per tier.
  -- Historical re-assessments are kept; only one is current (most recent completed).
  CONSTRAINT user_baseline_snapshot_unique_user_tier
    UNIQUE (user_id, tier)  -- NOTE: use INSERT OR IGNORE for re-assessments
                            -- (or upgrade to a separate re-assessment table in Phase 2)
);

-- Index: fast lookup by user + tier (most common query pattern)
CREATE INDEX user_baseline_snapshot_user_tier
  ON user_baseline_snapshot (user_id, tier, completed_at DESC);

-- RLS: users can only read their own baseline
ALTER TABLE user_baseline_snapshot ENABLE ROW LEVEL SECURITY;

CREATE POLICY "baseline_select_own"
  ON user_baseline_snapshot FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "baseline_insert_service"
  ON user_baseline_snapshot FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Service role can update (for Python worker writing back results)
CREATE POLICY "baseline_update_service_role"
  ON user_baseline_snapshot FOR UPDATE
  USING (true)  -- service role only; enforced at app level via service role key
  WITH CHECK (true);
```

> **Note on the UNIQUE constraint:** The `UNIQUE (user_id, tier)` constraint enforces one baseline per user per tier in Phase 1. If the user runs a re-assessment (Phase 2 feature), do one of:
>
> 1. Use `ON CONFLICT (user_id, tier) DO UPDATE` to overwrite
> 2. Drop the constraint and add a `is_current BOOLEAN` flag
>
> For Phase 1, option 1 is simplest.

### 9.2 New column on `user_profiles` table

Add a denormalized column for fast per-session access without a join:

```sql
-- Add to the user_profiles table (or users table depending on schema implementation):
ALTER TABLE user_profiles
  ADD COLUMN baseline_snapshot_id UUID REFERENCES user_baseline_snapshot(snapshot_id),
  ADD COLUMN baseline_completed_at TIMESTAMPTZ,
  ADD COLUMN recommended_starting_key_midi SMALLINT,
  ADD COLUMN voice_type TEXT;

-- Populated by the API when baseline job completes:
UPDATE user_profiles SET
  baseline_snapshot_id = snapshot_id,
  baseline_completed_at = completed_at,
  recommended_starting_key_midi = recommended_key_midi,
  voice_type = voice_type
WHERE user_id = <userId>;
```

### 9.3 View: `baseline_context_view`

Used by the API's internal `GET /v1/users/me/baseline/context` call:

```sql
CREATE VIEW baseline_context_view AS
SELECT
  s.user_id,
  s.snapshot_id,
  s.tier,
  s.baseline_pitch_accuracy,
  s.baseline_pitch_stability,
  s.baseline_breath_control,
  s.baseline_tone_quality,
  s.recommended_key_midi,
  s.recommended_key_name,
  s.voice_type,
  s.comfortable_low_midi,
  s.comfortable_high_midi,
  s.semitone_span,
  s.captured_at
FROM user_baseline_snapshot s
WHERE s.status = 'complete'
ORDER BY s.completed_at DESC;
-- API handler applies LIMIT 1 per user_id to get the most recent snapshot
```

### 9.4 Audio storage paths

Baseline audio is stored under a separate prefix from session audio to make data retention policies independent:

```
user-audio/{userId}/baseline/range-walk-{jobId}.wav
user-audio/{userId}/baseline/sustained-hold-{jobId}.wav
```

These files are deleted by the `voice-data-retention-cron` service 30 days after the baseline is `complete`. The snapshot record and metrics are retained indefinitely (they are not audio — no BIPA concerns).

```sql
-- Track audio file deletion separately
ALTER TABLE user_baseline_snapshot
  ADD COLUMN audio_deleted_at TIMESTAMPTZ;
```

---

## 10. Integration with Adaptive Coaching Engine Tier 1

**How the baseline feeds `findWeakestMetric()`**

The adaptive coaching engine's `findWeakestMetric()` function (specced in `voice-adaptive-coaching-engine-spec.pplx.md`) currently receives a `SingingMetricsResult` and a `SingingGoal` and identifies the weakest metric.

The baseline integration adds a **delta signal** to that decision. When the API handler calls `findWeakestMetric()`, it now passes a `BaselineContext` as a third argument, and the function uses it to compute delta-weighted weakness scores.

### Changes to `packages/coaching-rules/src/metric-weakness-finder.ts`

**Add to the function signature:**

```typescript
export function findWeakestMetric(
  result: SingingMetricsResult,
  goal: SingingGoal,
  recentFocusHistory: SingingMetricKey[] = [],
  baseline?: BaselineContext | null // NEW — optional backward-compatible
): MetricWeaknessReport {
  // ... existing safety guard ...

  const ranked = rankMetricsByWeakness(result, goal, recentFocusHistory, baseline);
  // ...
}
```

**Add baseline delta signal to `rankMetricsByWeakness()`:**

```typescript
export function rankMetricsByWeakness(
  result: SingingMetricsResult,
  goal: SingingGoal,
  recentFocusHistory: SingingMetricKey[] = [],
  baseline?: BaselineContext | null
): Array<{ metric: SingingMetricKey; score: number; adjustedWeakness: number }> {
  const weights = GOAL_METRIC_WEIGHTS[goal] ?? {};

  const available = Object.entries(result.metrics)
    .filter(([, value]) => value !== null && value !== undefined)
    .map(([key, value]) => ({
      metric: key as SingingMetricKey,
      score: value as number,
    }));

  if (available.length === 0) return [];

  return available
    .map(({ metric, score }) => {
      const goalWeight = weights[metric] ?? DEFAULT_METRIC_WEIGHT;
      const baseWeakness = (100 - score) * goalWeight;

      // Baseline delta signal:
      // If user is regressing from baseline (score < baseline), boost weakness priority
      // If user is improving from baseline (score > baseline), reduce weakness priority
      let deltaModifier = 0;
      if (baseline) {
        const baselineScore = getBaselineScore(baseline, metric);
        if (baselineScore !== null) {
          const delta = score - baselineScore;
          // Regressing by >10 points: +20 weakness priority
          // Improving by >10 points: -10 weakness priority (but still focus if very weak)
          if (delta < -10) deltaModifier = 20;
          else if (delta > 10) deltaModifier = -10;
        }
      }

      // Rotation pressure
      const recentFocusCount = recentFocusHistory.slice(-3).filter((m) => m === metric).length;
      const rotationPenalty = recentFocusCount * 15;

      return {
        metric,
        score,
        adjustedWeakness: Math.max(0, baseWeakness + deltaModifier - rotationPenalty),
      };
    })
    .sort((a, b) => b.adjustedWeakness - a.adjustedWeakness);
}

function getBaselineScore(baseline: BaselineContext, metric: SingingMetricKey): number | null {
  const map: Partial<Record<SingingMetricKey, keyof BaselineMetricGrades>> = {
    pitchAccuracy: 'pitchAccuracy',
    stability: 'pitchStability',
    breathControl: 'breathControl',
    toneQuality: 'toneQuality',
  };
  const key = map[metric];
  if (!key) return null;
  return baseline.metrics[key] ?? null;
}
```

**Changes to the API route handler** (`services/api/src/routes/attempts.ts`):

```typescript
// Add to handleAttemptSubmission, after fetching user profile:
const baselineContext = await supabase
  .from('baseline_context_view')
  .select('*')
  .eq('user_id', req.userId)
  .eq('tier', tier)
  .limit(1)
  .maybeSingle();

// Pass to findWeakestMetric:
weaknessReport = findWeakestMetric(
  singingMetrics,
  user.singingGoal,
  recentFocusHistory,
  baselineContext.data ?? null // <-- new arg
);
```

### What changes in the `MetricWeaknessReport`

Add one field to capture whether a baseline delta drove the selection:

```typescript
// In shared-types:
export interface MetricWeaknessReport {
  focusMetric: SingingMetricKey;
  focusScore: number;
  runnerUp?: SingingMetricKey;
  rationale: string;
  availableMetrics: SingingMetricKey[];
  baselineDelta?: number | null; // NEW — score minus baseline; negative = regressing
  baselineDrivenSelection: boolean; // NEW — true if delta modifier was the deciding factor
}
```

This field surfaces in the LLM prompt context so the model can reference regression from baseline when relevant:

```
// In prompt-builder.ts, add to buildUserMessage():
const baselineNote = req.weaknessReport.baselineDelta !== undefined && req.weaknessReport.baselineDelta !== null
  ? req.weaknessReport.baselineDelta < 0
    ? `Note: ${focusName} is currently ${Math.abs(req.weaknessReport.baselineDelta)} points below the user's baseline.`
    : `Note: ${focusName} is ${req.weaknessReport.baselineDelta} points above baseline — user is improving.`
  : '';
```

---

## 11. `render.yaml` Additions

Add to the `voice-audio-processor` service environment variables:

```yaml
envVars:
  # ... existing vars from audio-processor spec ...
  - key: BASELINE_AUDIO_RETENTION_DAYS
    value: '30' # How long baseline recording files are kept before deletion
```

Add to the `voice-data-retention-cron` service (already defined in render.yaml):

```yaml
# The existing cron job should pick up baseline audio deletion
# via a query on user_baseline_snapshot WHERE audio_deleted_at IS NULL
# AND completed_at < NOW() - INTERVAL '30 days'
# No render.yaml change needed — the cron job implementation handles this
```

---

## 12. Phased Build Order

### Phase 0 — Types and Contracts (unblocks everything else)

**Deliverable:** All new types in `shared-types`, TypeScript contract additions to `services/audio-processor/src/index.ts`, exercise definitions in `content-schema`.

1. Add `VoiceType`, `VocalRangeSnapshot`, `BaselineMetricGrades`, `UserBaselineSnapshot`, `BaselineWithDeltas`, `BaselineContext` to `packages/shared-types/src/index.ts` — coordinate with Agent #3
2. Add `BaselineAssessmentJob` and `BaselineAssessmentResult` to `services/audio-processor/src/index.ts`
3. Add `baselineRangeWalkExercise` and `baselineSustainedHoldExercise` to `packages/content-schema/src/index.ts`
4. Run `pnpm typecheck` — must pass before any Phase 1 work begins

---

### Phase 1 — Supabase Schema + API Routes (MVP enabler)

**Deliverable:** The database can store baseline snapshots; the API can submit and poll jobs.

1. Write and apply Supabase migration: `user_baseline_snapshot` table, RLS policies, `baseline_context_view`
2. Add `baseline_snapshot_id`, `recommended_starting_key_midi`, `voice_type` columns to `user_profiles` table
3. Implement `POST /v1/assessments/baseline` route handler (enqueues job, creates pending row)
4. Implement `GET /v1/assessments/baseline/:jobId` polling route
5. Implement `POST /v1/assessments/baseline/complete` route (XP + badge award)
6. Implement `GET /v1/users/me/baseline/context` route (internal; used by attempt handler)

**Acceptance criteria:**

- `POST /v1/assessments/baseline` returns a `jobId` and creates a `pending` row in `user_baseline_snapshot`
- `GET /v1/assessments/baseline/:jobId` returns `{ status: 'pending' }` while job is queued
- RLS: user A cannot read user B's baseline snapshot

---

### Phase 2 — Python Processor (baseline metrics computation)

**Deliverable:** Python `baseline_assessment` job runs, segments the range walk recording, runs pYIN and parselmouth, persists result.

1. `app/jobs/baseline_assessment.py` — full implementation per this spec §7
2. `app/analysis/range_walker.py` — already specced in audio-processor spec §13; confirm it handles the note-schedule dict input
3. `segment_range_walk()` helper — implemented per this spec §7
4. `snap_to_exercise_key()` helper
5. Write result back to Supabase `user_baseline_snapshot` table
6. Trigger `user_profiles` update via Supabase service role

**Tests:**

```python
# tests/jobs/test_baseline_assessment.py

import numpy as np
import pytest

def test_segment_range_walk_returns_correct_notes():
    # 3-second synthetic audio at 44100Hz
    sr = 44100
    # Sine waves at 440Hz (A4) and 293.66Hz (D4)
    a4 = np.sin(2 * np.pi * 440 * np.arange(int(sr * 1.5)) / sr)
    d4 = np.sin(2 * np.pi * 293.66 * np.arange(int(sr * 1.5)) / sr)
    audio = np.concatenate([a4, d4])

    note_schedule = [
        {"midiNote": 69, "noteName": "A4", "timestampMs": 0, "holdDurationMs": 1500},
        {"midiNote": 62, "noteName": "D4", "timestampMs": 1500, "holdDurationMs": 1500},
    ]

    from app.jobs.baseline_assessment import segment_range_walk
    result = segment_range_walk(audio, sr, note_schedule)

    assert 69 in result  # A4 segment present
    assert 62 in result  # D4 segment present
    assert len(result[69]) > 0
    assert len(result[62]) > 0

def test_snap_to_exercise_key_returns_a_note():
    from app.jobs.baseline_assessment import snap_to_exercise_key
    # Midpoint of typical tenor range
    midi = 52  # E3
    result = snap_to_exercise_key(midi)
    assert result in [21, 33, 45, 57, 69, 81]  # Must be an A note
    assert result == 45  # A2 = 45, closest to E3 = 52

def test_baseline_job_returns_degraded_on_silence():
    sr = 44100
    silence = np.zeros(sr * 10)
    from app.jobs.baseline_assessment import run
    result = run({
        "jobId": "test-job-1",
        "userId": "test-user-1",
        "rangeTestAudioUrl": "__fixture:silence__",
        "sustainedHoldAudioUrl": "__fixture:silence__",
        "noteSchedule": [],
    })
    # Should not raise; should return failed or degraded status
    assert result.get("qualityFlag") in ("degraded", None) or result.get("status") == "failed"
```

---

### Phase 3 — Mobile Screens (onboarding experience)

**Deliverable:** Full onboarding flow from `MicCheck` through `FirstWin` functional on device.

1. `BaselineAssessIntro` screen — avatar dialogue, "Let's Go" CTA
2. `BaselineRangeWalk` screen — continuous recording, reference tone playback, note schedule driver, live pitch bar
3. `BaselineSustainedHold` screen — 8-second hold with countdown bar
4. `BaselineProcessing` screen — upload, job submission, polling, error fallback
5. `FirstWin` screen — voice type reveal, range reveal, first focus metric, badge unlock, XP award

**Acceptance criteria (Build 0.1 test matrix additions):**

- Completing the range walk produces a non-empty note schedule and a recorded audio file
- `BaselineProcessing` navigates to `FirstWin` within 60 seconds (or shows error + fallback)
- `FirstWin` displays `VoiceType` label and comfortable range in note names
- `FirstWin` awards `first_note` badge (check `BadgeUnlockModal` fires)
- If Python job fails, `FirstWin` still renders with graceful fallback copy — no blank screen, no crash
- Navigating back from `BaselineAssessIntro` using OS back gesture returns to `MicCheck`, not to a dead stack

---

### Phase 4 — Coaching Engine Integration

**Deliverable:** `findWeakestMetric()` reads baseline context on every subsequent session.

1. Update `packages/coaching-rules/src/metric-weakness-finder.ts` per §10 of this spec
2. Update `rankMetricsByWeakness()` to accept and apply `BaselineContext`
3. Update `MetricWeaknessReport` type to include `baselineDelta` and `baselineDrivenSelection`
4. Update `POST /v1/sessions/{sessionId}/attempts` handler to fetch and pass `BaselineContext`
5. Update `prompt-builder.ts` to include baseline delta note in user message when applicable

**Tests:**

```typescript
// packages/coaching-rules/src/__tests__/metric-weakness-finder.test.ts (additions)

it('prioritizes regressing metric over weak-but-stable metric', () => {
  const result = {
    ...baseResult,
    metrics: {
      pitchAccuracy: 65, // 5 points below baseline of 70 → regressing
      stability: 55, // 5 points above baseline of 50 → improving
      breathControl: 60,
    },
  };
  const baseline: BaselineContext = {
    snapshotId: 'test-snap',
    metrics: {
      pitchAccuracy: 70,
      pitchStability: 50,
      breathControl: 60,
      toneQuality: null,
      hnrDb: null,
      cppDb: null,
      jitterLocal: null,
      shimmerLocal: null,
    },
    recommendedStartingKeyMidi: 57,
    voiceType: 'tenor',
    capturedAt: '2026-05-01T00:00:00Z',
  };
  const ranked = rankMetricsByWeakness(result, 'pitch', [], baseline);
  // pitchAccuracy: (100-65)*2.0 + 20(delta<-10 modifier) = 90
  // stability: (100-55)*1.5 - 10(delta>10) = 57.5
  expect(ranked[0].metric).toBe('pitchAccuracy');
});

it('does not crash when baseline is null', () => {
  expect(() => rankMetricsByWeakness(baseResult, 'pitch', [], null)).not.toThrow();
});

it('does not crash when baseline metric is null (phase 1 partial data)', () => {
  const baseline: BaselineContext = {
    snapshotId: 'test-snap',
    metrics: {
      pitchAccuracy: null,
      pitchStability: null,
      breathControl: null,
      toneQuality: null,
      hnrDb: null,
      cppDb: null,
      jitterLocal: null,
      shimmerLocal: null,
    },
    recommendedStartingKeyMidi: 57,
    voiceType: 'soprano',
    capturedAt: '2026-05-01T00:00:00Z',
  };
  expect(() => rankMetricsByWeakness(baseResult, 'pitch', [], baseline)).not.toThrow();
});
```

---

## 13. Files to Create or Modify (Summary)

| File                                                                      | Status | Agent           | Notes                                                                                     |
| ------------------------------------------------------------------------- | ------ | --------------- | ----------------------------------------------------------------------------------------- |
| `packages/shared-types/src/index.ts`                                      | Modify | Agent #3        | Add 6 new types; coordinate before any other agent starts                                 |
| `packages/content-schema/src/index.ts`                                    | Modify | Agent #7        | Add 2 baseline exercise definitions                                                       |
| `services/audio-processor/src/index.ts`                                   | Modify | Agent #12       | Add `BaselineAssessmentJob`, `BaselineAssessmentResult`; extend `AudioProcessorJob` union |
| `services/audio-processor/python/app/jobs/baseline_assessment.py`         | New    | Agent #12       | Full implementation per §7                                                                |
| `services/audio-processor/python/app/jobs/baseline_assessment_helpers.py` | New    | Agent #12       | `segment_range_walk()`, `snap_to_exercise_key()`                                          |
| `services/audio-processor/python/tests/jobs/test_baseline_assessment.py`  | New    | Agent #12       | 3 tests per §12 Phase 2                                                                   |
| `services/api/src/routes/assessments.ts`                                  | New    | Agent #11       | 4 route handlers                                                                          |
| `apps/mobile/src/screens/baseline/BaselineAssessIntro.tsx`                | New    | Agent #10       |                                                                                           |
| `apps/mobile/src/screens/baseline/BaselineRangeWalk.tsx`                  | New    | Agent #10       |                                                                                           |
| `apps/mobile/src/screens/baseline/BaselineSustainedHold.tsx`              | New    | Agent #10       |                                                                                           |
| `apps/mobile/src/screens/baseline/BaselineProcessing.tsx`                 | New    | Agent #10       |                                                                                           |
| `apps/mobile/src/screens/baseline/FirstWin.tsx`                           | New    | Agent #10       |                                                                                           |
| `apps/mobile/src/store/baselineAssessmentStore.ts`                        | New    | Agent #10       | Zustand slice                                                                             |
| `packages/coaching-rules/src/metric-weakness-finder.ts`                   | Modify | Agent #8        | Add `BaselineContext` param; delta signal; §10                                            |
| `packages/coaching-rules/src/prompt-builder.ts`                           | Modify | Agent #8        | Add baseline delta note to user message                                                   |
| `packages/shared-types/src/index.ts`                                      | Modify | Agent #3        | Add `baselineDelta`, `baselineDrivenSelection` to `MetricWeaknessReport`                  |
| Supabase migration                                                        | New    | Agent #11 + #18 | `user_baseline_snapshot` table, RLS, view, `user_profiles` columns                        |

---

## 14. Critical Constraints for Jules

**Baseline is read-only after creation from the coaching engine's perspective.**  
`findWeakestMetric()` reads `BaselineContext` — it never writes to it. The only writer is the Python baseline assessment job. This separation must be maintained even if it seems convenient to update baseline scores during normal sessions.

**Never display baseline metric scores to users as raw numbers.**  
The baseline is an internal coaching signal. The `FirstWin` screen shows voice type and range in human-readable form. Numbers like "your baseline pitch accuracy was 43" must not appear anywhere in the UI — this creates the wrong relationship with metrics (anxiety, not competence).

**The range walk schedule must be passed with the job.**  
The Python job cannot reconstruct which audio segment corresponds to which MIDI note without the `noteSchedule`. If the mobile app does not send it (e.g. network truncation), the job must return `status: 'failed'` rather than guessing segmentation.

**Baseline audio is ephemeral — delete it after 30 days.**  
The `voice-data-retention-cron` service must include a query that identifies `user_baseline_snapshot` rows where `completed_at < NOW() - INTERVAL '30 days'` and `audio_deleted_at IS NULL`, deletes the audio files from Supabase Storage, and sets `audio_deleted_at`. The snapshot record and metric columns are retained indefinitely — they are aggregate data, not recordings.

**Do not block onboarding on baseline failure.**  
`BaselineProcessing` has a 60-second timeout. On timeout or Python job failure, navigate forward to `FirstWin` with `snapshot: null`. The user gets a fallback experience. The system picks up baseline data through the normal session flow. A missing baseline snapshot must never produce an error state that traps the user in onboarding.

**`BaselineAssessmentJob` must be added to `AudioProcessorJob` union before the Python worker is deployed.**  
The worker's queue dispatcher uses the TypeScript union for type-safe routing. If `baseline_assessment` is not in the union, the worker will drop the job silently. Add the TypeScript contract first (Phase 0), even if the Python implementation is not yet ready.

**`snap_to_exercise_key()` must return a note within the user's comfortable range.**  
If the returned A note falls outside `[comfortable_low_midi, comfortable_high_midi]`, fall back to `comfortable_low_midi + (comfortable_semitone_span // 2)` — the center of the comfortable range — even if it is not an A note. A note outside the user's range as the first exercise target is a product failure.
