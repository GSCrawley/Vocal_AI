VOICE — Adaptive Coaching Engine: Technical Spec
Handoff document for Jules (Coaching Rules and Avatar Behavior Agent, agents.md §8)
Repo: GSCrawley/Vocal_AI
Target paths:

packages/coaching-rules/ — primary implementation home

packages/shared-types/src/index.ts — new type additions

services/api/src/ — new route handlers (coordinate with Agent #11)

Status of existing coaching-rules package: One function, mapSustainedNoteScoreToCoaching(), with four hardcoded CoachingPayload branches. This is the complete current implementation. Everything in this spec is net-new work layered on top of it.

1. What This Engine Is
   The adaptive coaching engine is a three-tier decision system that sits between the Python audio processor's raw metric scores and the avatar's dialogue output. It answers three questions per attempt:

Which metric is weakest? — identify the single focus for this attempt's feedback

How hard should the next exercise be? — configure difficulty based on rolling performance history

What should the avatar say? — call an LLM with a tightly structured prompt to produce personalized coaching dialogue, falling back to deterministic templates when the LLM is unavailable

It is not a chatbot. The LLM is invoked only at specific, bounded moments: post-attempt feedback and session-start context-setting. Every invocation uses a strict system prompt that forbids the LLM from inventing metrics, making medical claims, or generating more than one correction per response.

What It Is Not
Not a real-time path. The engine runs after an attempt completes, in ANALYZING → RESULT_REVIEW state.

Not a replacement for deterministic coaching templates. Templates are the fallback and are always the ground truth for safety-critical dialogue (mic check fail, strain warning).

Not an exercise content system. It selects exercises by ID from the existing curriculum package — it does not generate exercise definitions.

Not the avatar animation layer. It produces CoachingPayload and AvatarDialogueLine[]; the mobile app and @voice/avatar-state consume those.

2. Architecture Position
   text
   Python audio-processor
   └─ SingingMetricsResult (11 metrics, 0–100 each)
   │
   ▼
   services/api → POST /v1/sessions/{sessionId}/attempts
   │
   ▼
   @voice/coaching-rules
   ├─ Tier 1: MetricWeakestFinder → identifies focus metric
   ├─ Tier 2: DifficultyAdaptor → selects next exercise difficulty
   └─ Tier 3: LLMCoachingOrchestrator → builds prompt, calls OpenAI, parses response
   │
   ▼
   CoachingPayload + AvatarDialogueLine[] + NextExerciseConfig
   │
   ▼
   POST /v1/sessions/{sessionId}/attempts response body
   │
   ▼
   apps/mobile → ExerciseResult screen → avatar renders dialogue
   The engine lives entirely in packages/coaching-rules/ as pure TypeScript functions. The API route handler in services/api/ calls it and passes the result back to the client. No mobile device makes direct LLM calls.

3. New Shared Types
   File: packages/shared-types/src/index.ts
   Coordinate with Agent #3 (Domain Contracts Agent) before adding.

Add the following types to the bottom of the file, after the existing SessionEvent union:

typescript
// ------------------------------------------------------------
// SINGING METRICS — full 11-metric result from Python processor
// (Matches SingingMetricsResult from services/audio-processor/python)
// ------------------------------------------------------------

export type SingingMetricKey =
| 'pitchAccuracy' // pYIN time-in-tolerance + median cents error
| 'stability' // Inverse of cents std dev during sustained windows
| 'breathControl' // RMS envelope consistency; phrase duration
| 'toneQuality' // HNR + CPP composite (Phase 2; null in Phase 1)
| 'dynamics' // RMS range / intentional volume control
| 'diction' // Articulation rate; vowel clarity proxy
| 'styleExpression' // Style-specific marker presence (Phase 3; null until then)
| 'musicality' // Onset accuracy + melodic contour (Phase 2+)
| 'posture' // Breath-as-proxy; no physical sensor (null until assessment)
| 'consistency' // Rolling per-metric variance across last N sessions
| 'repertoire'; // Karaoke match score (Phase 2; null until karaoke active)

export interface SingingMetricsResult {
attemptId: string;
exerciseId: string;
userId: string;
capturedAt: string; // ISO 8601
qualityFlag: 'ok' | 'degraded' | 'unusable';
qualityNote?: string; // Human-readable reason if not 'ok'
metrics: Partial<Record<SingingMetricKey, number | null>>;
// Always present in Phase 1:
overallScore: number; // 0–100 weighted composite
pitchScore: number; // 0–100
stabilityScore: number; // 0–100
onsetScore: number | null; // 0–100 or null if onset not measurable
// Phase 2+:
breathControlScore?: number | null;
toneQualityScore?: number | null;
dynamicsScore?: number | null;
}

// ------------------------------------------------------------
// ADAPTIVE COACHING ENGINE — core contracts
// ------------------------------------------------------------

export type DifficultyLevel = 1 | 2 | 3 | 4 | 5;

export interface MetricWeaknessReport {
focusMetric: SingingMetricKey;
focusScore: number; // 0–100, the score that triggered selection
runnerUp?: SingingMetricKey; // Second-weakest for context
rationale: string; // One sentence, used in LLM prompt context
availableMetrics: SingingMetricKey[]; // Metrics with non-null scores
}

export interface SessionPerformanceHistory {
userId: string;
exerciseId: string;
recentAttempts: Array<{
attemptId: string;
overallScore: number;
successBand: SuccessBand;
focusMetric?: SingingMetricKey;
completedAt: string;
}>;
consecutiveGoodOrExcellent: number; // Current streak of good/excellent attempts
consecutiveRetry: number; // Current streak of retry attempts
totalAttemptsOnExercise: number;
}

export interface DifficultyConfig {
currentDifficulty: DifficultyLevel;
nextDifficulty: DifficultyLevel;
signal: 'advance' | 'hold' | 'regress' | 'initial';
nextExerciseId: string; // From curriculum package
nextTargetNoteHz?: number; // For pitch exercises: target frequency
nextDurationSeconds?: number; // For sustained-hold exercises: hold target
nextToleranceCents?: number; // Pitch tolerance window (default 25, tightens with skill)
nextRepetitions?: number;
adaptationReason: string; // One sentence; included in LLM prompt context
}

export interface LLMCoachingRequest {
userId: string;
attemptId: string;
exerciseId: string;
exerciseTitle: string;
tier: Tier;
overallScore: number;
successBand: SuccessBand;
isPersonalBest: boolean;
weaknessReport: MetricWeaknessReport;
difficultyConfig: DifficultyConfig;
sessionHistory: SessionPerformanceHistory;
userFirstName?: string; // Used in greeting if available
lastSessionFocus?: SingingMetricKey; // For continuity reference
}

export interface LLMCoachingResponse {
praiseMessage: string; // One sentence. References a specific metric event.
correctionMessage: string; // One sentence. Addresses focusMetric only.
actionTip: string; // One concrete action for next rep.
microExerciseCue?: string; // Optional 10-second drill; only if band = 'developing' | 'retry'
avatarMood: 'encouraging' | 'celebratory' | 'calm' | 'challenging';
generatedBy: 'llm' | 'template'; // Which path produced this payload
}

export interface AdaptiveCoachingResult {
coachingPayload: CoachingPayload; // Existing type; wire from LLMCoachingResponse
avatarDialogue: AvatarDialogueLine[]; // Wire from avatar-state package
weaknessReport: MetricWeaknessReport;
difficultyConfig: DifficultyConfig;
generatedBy: 'llm' | 'template';
}

// ------------------------------------------------------------
// NEXT EXERCISE CONFIG — returned alongside attempt result
// ------------------------------------------------------------

export interface NextExerciseConfig {
exerciseId: string;
difficulty: DifficultyLevel;
targetNoteHz?: number;
durationSeconds?: number;
toleranceCents?: number;
repetitions?: number;
focusMetric: SingingMetricKey;
focusRationale: string;
} 4. Directory Layout
Create the following structure inside the existing packages/coaching-rules/ directory. The existing src/index.ts must be expanded, not replaced.

text
packages/coaching-rules/
├── src/
│ ├── index.ts # Existing + re-exports for new modules
│ ├── metric-weakness-finder.ts # Tier 1: weakest metric identification
│ ├── difficulty-adaptor.ts # Tier 2: exercise difficulty adaptation
│ ├── llm-coaching-orchestrator.ts # Tier 3: LLM prompt + response parsing
│ ├── prompt-builder.ts # Prompt template construction
│ ├── template-fallback.ts # Deterministic coaching templates (all metrics)
│ ├── metric-weights.ts # Per-goal metric importance weights
│ ├── safety-overrides.ts # Strain, mic-check, extreme-style gate logic
│ └── **tests**/
│ ├── metric-weakness-finder.test.ts
│ ├── difficulty-adaptor.test.ts
│ ├── llm-coaching-orchestrator.test.ts
│ ├── prompt-builder.test.ts
│ └── template-fallback.test.ts
├── jest.config.js # Exists
├── package.json # Add openai dependency
├── tsconfig.json # Exists
└── tsconfig.test.json # Exists 5. Tier 1 — Metric Weakness Finder
File: packages/coaching-rules/src/metric-weakness-finder.ts

Purpose
Given a SingingMetricsResult and the user's active SingingGoal, identify the single metric to focus coaching on this attempt. This is not simply "lowest score" — it is a weighted selection that respects:

Which metrics are actually populated (nulls are excluded)

The user's stated goal (goal-alignment weight)

Whether a metric has been the focus for three consecutive attempts already (rotation pressure)

Safety overrides that always win regardless of score

Goal-to-Metric Weight Table
typescript
// packages/coaching-rules/src/metric-weights.ts

import type { SingingGoal, SingingMetricKey } from '@voice/shared-types';

// Weight multipliers: higher = this metric gets priority for coaching focus
// when the user has selected the corresponding goal.
// Weights do NOT affect the scoring formulas themselves.
export const GOAL_METRIC_WEIGHTS: Record<SingingGoal, Partial<Record<SingingMetricKey, number>>> = {
pitch: {
pitchAccuracy: 2.0,
stability: 1.5,
musicality: 1.0,
},
stability: {
stability: 2.0,
pitchAccuracy: 1.5,
breathControl: 1.0,
},
range: {
pitchAccuracy: 1.5,
breathControl: 1.5,
stability: 1.0,
},
breath_control: {
breathControl: 2.0,
stability: 1.0,
dynamics: 1.0,
},
tone: {
toneQuality: 2.0,
breathControl: 1.5,
stability: 1.0,
},
agility: {
pitchAccuracy: 1.5,
musicality: 2.0,
stability: 1.0,
},
ear_training: {
pitchAccuracy: 2.0,
musicality: 1.5,
},
dynamics: {
dynamics: 2.0,
breathControl: 1.5,
stability: 1.0,
},
vibrato: {
stability: 1.5,
toneQuality: 2.0,
breathControl: 1.0,
},
};

export const DEFAULT_METRIC_WEIGHT = 1.0;
Implementation
typescript
// packages/coaching-rules/src/metric-weakness-finder.ts

import type {
SingingMetricsResult,
SingingMetricKey,
SingingGoal,
MetricWeaknessReport,
} from '@voice/shared-types';
import { GOAL_METRIC_WEIGHTS, DEFAULT_METRIC_WEIGHT } from './metric-weights';

// Metrics available in Phase 1. Null-valued metrics are always excluded.
const PHASE_1_METRICS: SingingMetricKey[] = ['pitchAccuracy', 'stability', 'breathControl'];

// Minimum voiced-frame coverage to trust a metric score.
// If fewer than this many frames contributed to a metric, treat it as null.
const MIN_CONFIDENCE_FRAMES = 5; // enforced by audio-processor; respected here as null check

/\*\*

- Compute a "weakness score" for each available metric.
- Lower raw score + higher goal weight = higher weakness priority.
- Returns a ranked list from most to least pressing.
  \*/
  export function rankMetricsByWeakness(
  result: SingingMetricsResult,
  goal: SingingGoal,
  recentFocusHistory: SingingMetricKey[] = [] // last N focus metrics, oldest first
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
// Weakness = (100 - score) normalized by goal weight
const baseWeakness = (100 - score) \* goalWeight;

      // Rotation pressure: reduce priority of metrics focused on the last 3 attempts
      const recentFocusCount = recentFocusHistory.slice(-3).filter((m) => m === metric).length;
      const rotationPenalty = recentFocusCount * 15; // 15 pts per recent focus

      return {
        metric,
        score,
        adjustedWeakness: Math.max(0, baseWeakness - rotationPenalty),
      };
    })
    .sort((a, b) => b.adjustedWeakness - a.adjustedWeakness);

}

/\*\*

- Produce the MetricWeaknessReport for one attempt.
- This is the Tier 1 output consumed by both Tier 2 and Tier 3.
  \*/
  export function findWeakestMetric(
  result: SingingMetricsResult,
  goal: SingingGoal,
  recentFocusHistory: SingingMetricKey[] = []
  ): MetricWeaknessReport {
  if (result.qualityFlag === 'unusable') {
  // Safety: never produce coaching from bad audio
  throw new Error(
  'Cannot identify weakest metric for an unusable audio recording. ' +
  'Route to mic check instead of coaching.'
  );
  }

const ranked = rankMetricsByWeakness(result, goal, recentFocusHistory);

if (ranked.length === 0) {
// Fallback: use overall score if no per-metric data available
return {
focusMetric: 'pitchAccuracy',
focusScore: result.overallScore,
rationale: 'No per-metric data available; defaulting to pitch accuracy.',
availableMetrics: [],
};
}

const [top, second] = ranked;

const rationale = buildWeaknessRationale(top.metric, top.score, goal);

return {
focusMetric: top.metric,
focusScore: top.score,
runnerUp: second?.metric,
rationale,
availableMetrics: ranked.map((r) => r.metric),
};
}

function buildWeaknessRationale(
metric: SingingMetricKey,
score: number,
goal: SingingGoal
): string {
const descriptions: Record<SingingMetricKey, (score: number) => string> = {
pitchAccuracy: (s) =>
`Pitch accuracy scored ${s}/100; the user's goal is ${goal}, making this the primary focus.`,
stability: (s) =>
`Pitch stability scored ${s}/100; sustained notes show drift that limits consistent tone.`,
breathControl: (s) =>
`Breath control scored ${s}/100; RMS envelope shows inconsistent airflow support.`,
toneQuality: (s) =>
`Tone quality scored ${s}/100; HNR or CPP indicates breathiness or phonation inconsistency.`,
dynamics: (s) =>
`Dynamics scored ${s}/100; volume control is insufficiently intentional.`,
diction: (s) =>
`Diction scored ${s}/100; articulation or vowel clarity needs attention.`,
styleExpression: (s) =>
`Style expression scored ${s}/100; style-specific markers are not yet consistent.`,
musicality: (s) =>
`Musicality scored ${s}/100; onset accuracy or melodic contour needs work.`,
posture: (s) =>
`Posture proxy scored ${s}/100; breath dynamics suggest technique support issues.`,
consistency: (s) =>
`Cross-session consistency scored ${s}/100; performance varies significantly between sessions.`,
repertoire: (s) =>
`Repertoire/karaoke match scored ${s}/100; melodic alignment with reference needs improvement.`,
};

return descriptions[metric]?.(score) ?? `${metric} scored ${score}/100.`;
}
Tests
typescript
// packages/coaching-rules/src/**tests**/metric-weakness-finder.test.ts

import { findWeakestMetric, rankMetricsByWeakness } from '../metric-weakness-finder';
import type { SingingMetricsResult } from '@voice/shared-types';

const baseResult: SingingMetricsResult = {
attemptId: 'test-attempt-1',
exerciseId: 'sing_sustain_001_v1',
userId: 'test-user-1',
capturedAt: '2026-05-29T20:00:00Z',
qualityFlag: 'ok',
overallScore: 65,
pitchScore: 60,
stabilityScore: 80,
onsetScore: 70,
metrics: {
pitchAccuracy: 60,
stability: 80,
breathControl: 72,
},
};

describe('rankMetricsByWeakness', () => {
it('returns pitch as weakest when pitch is lowest and goal is pitch', () => {
const ranked = rankMetricsByWeakness(baseResult, 'pitch');
expect(ranked[0].metric).toBe('pitchAccuracy');
});

it('applies goal weight: stability goal prioritizes stability over pitch despite equal scores', () => {
const equalResult = {
...baseResult,
metrics: { pitchAccuracy: 65, stability: 65, breathControl: 65 },
};
const ranked = rankMetricsByWeakness(equalResult, 'stability');
expect(ranked[0].metric).toBe('stability');
});

it('applies rotation pressure: metric focused 3x in a row loses priority', () => {
const recentHistory = ['pitchAccuracy', 'pitchAccuracy', 'pitchAccuracy'] as const;
const ranked = rankMetricsByWeakness(baseResult, 'pitch', [...recentHistory]);
// pitchAccuracy is still lowest but gets penalized; ensure stability or breathControl
// can overtake it when penalty is applied
// With score 60, baseWeakness = (100-60)*2.0 = 80, penalty = 3*15=45 → adjusted=35
// stability: (100-80)\*1.5=30, adjusted=30; so pitchAccuracy still wins
expect(ranked[0].metric).toBe('pitchAccuracy');

    // But with score 75 and 3x history, rotation should displace it
    const highPitchResult = { ...baseResult, metrics: { pitchAccuracy: 75, stability: 65, breathControl: 72 } };
    const rankedHigh = rankMetricsByWeakness(highPitchResult, 'pitch', [...recentHistory]);
    // pitchAccuracy: (100-75)*2.0=50, penalty=45 → adjusted=5
    // stability: (100-65)*1.5=52.5 → adjusted=52.5
    expect(rankedHigh[0].metric).toBe('stability');

});

it('excludes null metrics', () => {
const resultWithNulls = {
...baseResult,
metrics: { pitchAccuracy: 60, stability: null, breathControl: null },
};
const ranked = rankMetricsByWeakness(resultWithNulls, 'pitch');
expect(ranked.map((r) => r.metric)).toEqual(['pitchAccuracy']);
});
});

describe('findWeakestMetric', () => {
it('throws on unusable audio', () => {
const badResult = { ...baseResult, qualityFlag: 'unusable' as const };
expect(() => findWeakestMetric(badResult, 'pitch')).toThrow(/unusable/);
});

it('returns a well-formed MetricWeaknessReport', () => {
const report = findWeakestMetric(baseResult, 'pitch');
expect(report.focusMetric).toBe('pitchAccuracy');
expect(report.focusScore).toBe(60);
expect(report.rationale).toMatch(/pitch accuracy scored 60/i);
expect(report.availableMetrics).toContain('pitchAccuracy');
});

it('populates runnerUp when two metrics are available', () => {
const report = findWeakestMetric(baseResult, 'pitch');
expect(report.runnerUp).toBeDefined();
});
}); 6. Tier 2 — Difficulty Adaptor
File: packages/coaching-rules/src/difficulty-adaptor.ts

Purpose
Given the weakness report from Tier 1 and the user's recent performance history on the current exercise, decide whether to advance difficulty, hold, or regress — and return the fully configured DifficultyConfig for the next exercise.

Adaptation Decision Table
Condition Signal Next Difficulty
3+ consecutive excellent advance current + 1 (cap 5)
2+ consecutive good OR excellent advance current + 1 (cap 5)
current is good, previous was good advance current + 1 (cap 5)
First attempt ever on this exercise initial 1
good or excellent but not 2+ consecutive hold current
developing first occurrence hold current
2+ consecutive developing regress current - 1 (floor 1)
Any retry regress current - 1 (floor 1)
3+ consecutive retry regress max(1, current - 2)
Difficulty Mapping for Core Build 0.1 Exercise (Sustained Hold)
Each difficulty level maps to concrete exercise parameters for sustained_hold exercises:

typescript
export const SUSTAINED_HOLD_DIFFICULTY_PARAMS: Record<DifficultyLevel, {
durationSeconds: number;
toleranceCents: number;
repetitions: number;
exerciseId: string;
}> = {
1: { durationSeconds: 3, toleranceCents: 50, repetitions: 3, exerciseId: 'sing_sustain_beginner_v1' },
2: { durationSeconds: 5, toleranceCents: 35, repetitions: 3, exerciseId: 'sing_sustain_001_v1' },
3: { durationSeconds: 7, toleranceCents: 25, repetitions: 3, exerciseId: 'sing_sustain_002_v1' },
4: { durationSeconds: 10, toleranceCents: 20, repetitions: 4, exerciseId: 'sing_sustain_003_v1' },
5: { durationSeconds: 12, toleranceCents: 15, repetitions: 4, exerciseId: 'sing_sustain_advanced_v1' },
};
For non-sustained-hold exercises (scale work, interval training, etc.), difficulty maps to exercise IDs only — the curriculum package's selectNextExercise() handles selection within a difficulty band. The adaptor's job is to pass the difficulty signal; the API handler resolves it to an actual exercise ID using the curriculum package.

Implementation
typescript
// packages/coaching-rules/src/difficulty-adaptor.ts

import type {
SuccessBand,
DifficultyLevel,
DifficultyConfig,
MetricWeaknessReport,
SessionPerformanceHistory,
SingingMetricKey,
} from '@voice/shared-types';

export const SUSTAINED_HOLD_DIFFICULTY_PARAMS: Record<DifficultyLevel, {
durationSeconds: number;
toleranceCents: number;
repetitions: number;
exerciseId: string;
}> = {
1: { durationSeconds: 3, toleranceCents: 50, repetitions: 3, exerciseId: 'sing_sustain_beginner_v1' },
2: { durationSeconds: 5, toleranceCents: 35, repetitions: 3, exerciseId: 'sing_sustain_001_v1' },
3: { durationSeconds: 7, toleranceCents: 25, repetitions: 3, exerciseId: 'sing_sustain_002_v1' },
4: { durationSeconds: 10, toleranceCents: 20, repetitions: 4, exerciseId: 'sing_sustain_003_v1' },
5: { durationSeconds: 12, toleranceCents: 15, repetitions: 4, exerciseId: 'sing_sustain_advanced_v1' },
};

type AdaptationSignal = 'advance' | 'hold' | 'regress' | 'initial';

function determineSignal(history: SessionPerformanceHistory): AdaptationSignal {
const { recentAttempts, consecutiveGoodOrExcellent, consecutiveRetry, totalAttemptsOnExercise } = history;

if (totalAttemptsOnExercise === 0) return 'initial';

if (consecutiveRetry >= 3) return 'regress';
if (consecutiveRetry >= 1) return 'regress';
if (consecutiveGoodOrExcellent >= 2) return 'advance';
if (
recentAttempts.length >= 2 &&
recentAttempts[recentAttempts.length - 1].successBand === 'good' &&
recentAttempts[recentAttempts.length - 2].successBand === 'good'
) return 'advance';

return 'hold';
}

function clampDifficulty(d: number): DifficultyLevel {
return Math.max(1, Math.min(5, d)) as DifficultyLevel;
}

function buildAdaptationReason(
signal: AdaptationSignal,
current: DifficultyLevel,
next: DifficultyLevel,
focusMetric: SingingMetricKey
): string {
const metricLabel = focusMetric.replace(/([A-Z])/g, ' $1').toLowerCase();
switch (signal) {
case 'advance':
return `Two or more strong attempts in a row — stepping up difficulty from level ${current} to ${next}, keeping focus on ${metricLabel}.`;
case 'regress':
return `Performance is below threshold — stepping back to difficulty level ${next} to rebuild a solid foundation on ${metricLabel}.`;
case 'hold':
return `Holding at difficulty level ${current} — one more rep to confirm readiness before advancing on ${metricLabel}.`;
case 'initial':
return `First attempt on this exercise — starting at difficulty level ${next}.`;
}
}

/\*\*

- Compute the next difficulty configuration.
- For sustained_hold exercises, returns full parameter config.
- For all others, returns exerciseId from the difficulty table and
- delegates parameter resolution to the curriculum package.
  \*/
  export function adaptDifficulty(
  currentDifficulty: DifficultyLevel,
  history: SessionPerformanceHistory,
  weaknessReport: MetricWeaknessReport,
  exerciseCategory: 'sustained_hold' | string
  ): DifficultyConfig {
  const signal = determineSignal(history);

let nextDifficulty: DifficultyLevel;
switch (signal) {
case 'advance':
nextDifficulty = clampDifficulty(currentDifficulty + 1);
break;
case 'regress':
const drop = history.consecutiveRetry >= 3 ? 2 : 1;
nextDifficulty = clampDifficulty(currentDifficulty - drop);
break;
case 'initial':
nextDifficulty = 1;
break;
case 'hold':
default:
nextDifficulty = currentDifficulty;
break;
}

const reason = buildAdaptationReason(signal, currentDifficulty, nextDifficulty, weaknessReport.focusMetric);

if (exerciseCategory === 'sustained_hold') {
const params = SUSTAINED_HOLD_DIFFICULTY_PARAMS[nextDifficulty];
return {
currentDifficulty,
nextDifficulty,
signal,
nextExerciseId: params.exerciseId,
nextDurationSeconds: params.durationSeconds,
nextToleranceCents: params.toleranceCents,
nextRepetitions: params.repetitions,
adaptationReason: reason,
};
}

// For non-sustained-hold exercises: return difficulty signal only;
// the API handler resolves exerciseId from curriculum package
return {
currentDifficulty,
nextDifficulty,
signal,
nextExerciseId: '**resolve_from_curriculum**', // sentinel; API handler replaces this
adaptationReason: reason,
};
}
Tests
typescript
// packages/coaching-rules/src/**tests**/difficulty-adaptor.test.ts

import { adaptDifficulty } from '../difficulty-adaptor';
import type { SessionPerformanceHistory, MetricWeaknessReport } from '@voice/shared-types';

const baseWeaknessReport: MetricWeaknessReport = {
focusMetric: 'pitchAccuracy',
focusScore: 60,
rationale: 'Pitch accuracy scored 60/100.',
availableMetrics: ['pitchAccuracy', 'stability'],
};

function makeHistory(overrides: Partial<SessionPerformanceHistory>): SessionPerformanceHistory {
return {
userId: 'u1',
exerciseId: 'sing_sustain_001_v1',
recentAttempts: [],
consecutiveGoodOrExcellent: 0,
consecutiveRetry: 0,
totalAttemptsOnExercise: 1,
...overrides,
};
}

describe('adaptDifficulty', () => {
it('returns initial difficulty 1 when totalAttemptsOnExercise is 0', () => {
const h = makeHistory({ totalAttemptsOnExercise: 0 });
const result = adaptDifficulty(1, h, baseWeaknessReport, 'sustained_hold');
expect(result.signal).toBe('initial');
expect(result.nextDifficulty).toBe(1);
});

it('advances on 2+ consecutive good attempts', () => {
const h = makeHistory({ consecutiveGoodOrExcellent: 2, totalAttemptsOnExercise: 3 });
const result = adaptDifficulty(2, h, baseWeaknessReport, 'sustained_hold');
expect(result.signal).toBe('advance');
expect(result.nextDifficulty).toBe(3);
});

it('advances on 2+ consecutive excellent attempts', () => {
const h = makeHistory({ consecutiveGoodOrExcellent: 3, totalAttemptsOnExercise: 4 });
const result = adaptDifficulty(3, h, baseWeaknessReport, 'sustained_hold');
expect(result.signal).toBe('advance');
expect(result.nextDifficulty).toBe(4);
});

it('caps difficulty at 5', () => {
const h = makeHistory({ consecutiveGoodOrExcellent: 3, totalAttemptsOnExercise: 6 });
const result = adaptDifficulty(5, h, baseWeaknessReport, 'sustained_hold');
expect(result.nextDifficulty).toBe(5);
});

it('regresses on any retry attempt', () => {
const h = makeHistory({ consecutiveRetry: 1, totalAttemptsOnExercise: 2 });
const result = adaptDifficulty(3, h, baseWeaknessReport, 'sustained_hold');
expect(result.signal).toBe('regress');
expect(result.nextDifficulty).toBe(2);
});

it('regresses by 2 on 3+ consecutive retries', () => {
const h = makeHistory({ consecutiveRetry: 3, totalAttemptsOnExercise: 4 });
const result = adaptDifficulty(4, h, baseWeaknessReport, 'sustained_hold');
expect(result.signal).toBe('regress');
expect(result.nextDifficulty).toBe(2);
});

it('floors difficulty at 1 even with heavy regression', () => {
const h = makeHistory({ consecutiveRetry: 3, totalAttemptsOnExercise: 4 });
const result = adaptDifficulty(1, h, baseWeaknessReport, 'sustained_hold');
expect(result.nextDifficulty).toBe(1);
});

it('returns sentinel exerciseId for non-sustained-hold categories', () => {
const h = makeHistory({ totalAttemptsOnExercise: 0 });
const result = adaptDifficulty(1, h, baseWeaknessReport, 'scale_work');
expect(result.nextExerciseId).toBe('**resolve_from_curriculum**');
});

it('returns full parameter config for sustained_hold', () => {
const h = makeHistory({ totalAttemptsOnExercise: 0 });
const result = adaptDifficulty(1, h, baseWeaknessReport, 'sustained_hold');
expect(result.nextDurationSeconds).toBeDefined();
expect(result.nextToleranceCents).toBeDefined();
expect(result.nextRepetitions).toBeDefined();
});
}); 7. Tier 3 — LLM Coaching Orchestrator
File: packages/coaching-rules/src/llm-coaching-orchestrator.ts

Purpose
Build a structured system prompt + user message, call the OpenAI Chat API, parse the structured response, and return an LLMCoachingResponse. If the LLM call fails (timeout, quota, parse error), fall back transparently to the deterministic template system with generatedBy: 'template'.

Invariants (must be enforced by the system prompt — never trust the model to self-enforce)
One correction only. correctionMessage must address exactly one issue — the focusMetric. If the response contains multiple corrections, discard all but the one that mentions the focus metric keyword.

No medical claims. The validator rejects responses containing terms: diagnose, vocal cord damage, polyp, nodule, medical, doctor, injury. If matched, fall back to template.

No metric fabrication. The validator rejects response fields that contain numbers not present in the source data passed to the prompt.

No shame language. The validator rejects responses containing: failed, wrong, bad, incorrect, terrible, awful, hopeless.

Length bounds. praiseMessage ≤ 100 chars. correctionMessage ≤ 150 chars. actionTip ≤ 120 chars. microExerciseCue ≤ 80 chars if present.

Prompt Architecture
The system prompt is invariant and enforces the behavioral contract. The user message carries the per-attempt data. This separation means the system prompt can be cached at the OpenAI layer.

typescript
// packages/coaching-rules/src/prompt-builder.ts

import type { LLMCoachingRequest, SingingMetricKey } from '@voice/shared-types';

const METRIC_DISPLAY_NAMES: Record<SingingMetricKey, string> = {
pitchAccuracy: 'pitch accuracy',
stability: 'pitch stability',
breathControl: 'breath control',
toneQuality: 'tone quality',
dynamics: 'dynamics',
diction: 'diction',
styleExpression: 'style expression',
musicality: 'musicality',
posture: 'posture and technique',
consistency: 'consistency across sessions',
repertoire: 'song matching',
};

export const COACHING_SYSTEM_PROMPT = `You are the coach for VOICE, a vocal training app. Your name is Coach. You speak directly but warmly to the user. You follow strict rules.

RULES:

1. Your response must be valid JSON matching this schema:
   {
   "praiseMessage": string, // 1 sentence, max 100 characters. Praise one specific metric event.
   "correctionMessage": string, // 1 sentence, max 150 characters. Address the FOCUS METRIC only.
   "actionTip": string, // 1 sentence, max 120 characters. One concrete action for next rep.
   "microExerciseCue": string | null, // Only include for developing/retry bands. Max 80 characters. A 10-second drill.
   "avatarMood": "encouraging" | "celebratory" | "calm" | "challenging"
   }
2. Never mention more than one issue in the correctionMessage.
3. Never use these words: failed, wrong, bad, incorrect, terrible, awful, hopeless, diagnose, injury, damage, nodule, polyp, medical.
4. Never invent metric scores. Only reference numbers given to you in the data.
5. PraiseMessage must reference a specific measured event (e.g. a score, a duration, a named metric). Not: "Great job!" Yes: "You held within the target zone for 4.2 seconds."
6. If the band is excellent or a personal best, avatarMood must be "celebratory".
7. If the band is retry, avatarMood must be "encouraging".
8. Do not mention other metrics beyond the focus metric in your correctionMessage.
9. Respond with only the JSON object. No markdown, no explanation outside the JSON.`;

export function buildUserMessage(req: LLMCoachingRequest): string {
const focusName = METRIC_DISPLAY_NAMES[req.weaknessReport.focusMetric] ?? req.weaknessReport.focusMetric;
const pb = req.isPersonalBest ? ' This is a personal best.' : '';
const nameGreet = req.userFirstName ? `User's first name: ${req.userFirstName}.` : '';
const lastFocus = req.lastSessionFocus
? `Last session, we focused on ${METRIC_DISPLAY_NAMES[req.lastSessionFocus] ?? req.lastSessionFocus}.`
: '';

const historyLine = req.sessionHistory.totalAttemptsOnExercise > 0
? `They have attempted this exercise ${req.sessionHistory.totalAttemptsOnExercise} time(s).` +
(req.sessionHistory.consecutiveGoodOrExcellent > 0
? ` They are on a ${req.sessionHistory.consecutiveGoodOrExcellent}-attempt good streak.`
: '') +
(req.sessionHistory.consecutiveRetry > 0
? ` They have retried ${req.sessionHistory.consecutiveRetry} time(s) in a row.`
: '')
: 'This is their first attempt on this exercise.';

const nextStep = `Next difficulty: ${req.difficultyConfig.signal} to level ${req.difficultyConfig.nextDifficulty}. ${req.difficultyConfig.adaptationReason}`;

return `ATTEMPT DATA:
Exercise: "${req.exerciseTitle}"
Overall score: ${req.overallScore}/100
Band: ${req.successBand}${pb}
Focus metric this rep: ${focusName} (scored ${req.weaknessReport.focusScore}/100)
Why this metric: ${req.weaknessReport.rationale}
${historyLine}
${nextStep}
${nameGreet}
${lastFocus}

Produce coaching for this attempt.`;
}
Orchestrator Implementation
typescript
// packages/coaching-rules/src/llm-coaching-orchestrator.ts

import OpenAI from 'openai';
import type {
LLMCoachingRequest,
LLMCoachingResponse,
AdaptiveCoachingResult,
CoachingPayload,
AvatarDialogueLine,
} from '@voice/shared-types';
import { COACHING_SYSTEM_PROMPT, buildUserMessage } from './prompt-builder';
import { buildTemplateFallback } from './template-fallback';
import { buildCoachingDialogue, resolveAvatarState } from '@voice/avatar-state';

// Singleton — one client per process.
// API key is injected from environment; never hardcoded.
let \_openai: OpenAI | null = null;

function getOpenAIClient(): OpenAI {
if (!\_openai) {
const apiKey = process.env.OPENAI_API_KEY;
if (!apiKey) throw new Error('OPENAI_API_KEY is not set');
\_openai = new OpenAI({ apiKey });
}
return \_openai;
}

const PROHIBITED_TERMS = [
'failed', 'wrong', 'bad', 'incorrect', 'terrible', 'awful', 'hopeless',
'diagnose', 'injury', 'damage', 'nodule', 'polyp', 'medical',
];

const MAX_LENGTHS = {
praiseMessage: 100,
correctionMessage: 150,
actionTip: 120,
microExerciseCue: 80,
};

function validateLLMResponse(
raw: unknown,
req: LLMCoachingRequest
): LLMCoachingResponse | null {
if (!raw || typeof raw !== 'object') return null;
const r = raw as Record<string, unknown>;

if (typeof r.praiseMessage !== 'string') return null;
if (typeof r.correctionMessage !== 'string') return null;
if (typeof r.actionTip !== 'string') return null;
if (!['encouraging', 'celebratory', 'calm', 'challenging'].includes(r.avatarMood as string)) return null;

// Length bounds
if (r.praiseMessage.length > MAX_LENGTHS.praiseMessage) return null;
if (r.correctionMessage.length > MAX_LENGTHS.correctionMessage) return null;
if (r.actionTip.length > MAX_LENGTHS.actionTip) return null;
if (r.microExerciseCue && typeof r.microExerciseCue === 'string' &&
r.microExerciseCue.length > MAX_LENGTHS.microExerciseCue) return null;

// Prohibited terms check
const allText = [r.praiseMessage, r.correctionMessage, r.actionTip, r.microExerciseCue ?? '']
.join(' ')
.toLowerCase();
for (const term of PROHIBITED_TERMS) {
if (allText.includes(term)) return null;
}

return {
praiseMessage: r.praiseMessage as string,
correctionMessage: r.correctionMessage as string,
actionTip: r.actionTip as string,
microExerciseCue: typeof r.microExerciseCue === 'string' ? r.microExerciseCue : undefined,
avatarMood: r.avatarMood as LLMCoachingResponse['avatarMood'],
generatedBy: 'llm',
};
}

async function callLLM(req: LLMCoachingRequest): Promise<LLMCoachingResponse | null> {
const client = getOpenAIClient();

try {
const completion = await client.chat.completions.create({
model: 'gpt-4o-mini', // Cost-effective for per-attempt cadence
temperature: 0.4, // Low randomness for consistent coaching tone
max_tokens: 300,
response_format: { type: 'json_object' },
messages: [
{ role: 'system', content: COACHING_SYSTEM_PROMPT },
{ role: 'user', content: buildUserMessage(req) },
],
});

    const content = completion.choices[0]?.message?.content;
    if (!content) return null;

    let parsed: unknown;
    try {
      parsed = JSON.parse(content);
    } catch {
      return null;
    }

    return validateLLMResponse(parsed, req);

} catch (err) {
// Log but do not rethrow — fall through to template fallback
console.error('[llm-coaching-orchestrator] LLM call failed:', err);
return null;
}
}

/\*\*

- Orchestrate the full Tier 3 pipeline:
- 1.  Build prompt from structured request
- 2.  Call LLM with 2-second timeout budget (Render Starter plan constraint)
- 3.  Validate response
- 4.  Fall back to deterministic template on any failure
- 5.  Wire result to CoachingPayload + AvatarDialogueLine[]
      \*/
      export async function orchestrateCoaching(
      req: LLMCoachingRequest
      ): Promise<AdaptiveCoachingResult> {
      // Safety guard: never LLM-coach from bad audio
      // This should have been caught in Tier 1, but double-check here
      if (!req.overallScore && req.overallScore !== 0) {
      throw new Error('overallScore is required for coaching orchestration');
      }

const timeoutMs = 4000; // 4 second budget; Render Starter cold-start safe
let llmResponse: LLMCoachingResponse | null = null;

// Race the LLM call against a timeout
try {
llmResponse = await Promise.race([
callLLM(req),
new Promise<null>((resolve) => setTimeout(() => resolve(null), timeoutMs)),
]);
} catch {
llmResponse = null;
}

const finalResponse: LLMCoachingResponse = llmResponse
?? buildTemplateFallback(req);

// Wire to the existing CoachingPayload shape
const coachingPayload: CoachingPayload = {
praiseMessage: finalResponse.praiseMessage,
correctionMessage: finalResponse.correctionMessage,
actionTip: finalResponse.actionTip,
successBand: req.successBand,
microExerciseCue: finalResponse.microExerciseCue,
};

// Wire to avatar dialogue using existing avatar-state package
const avatarState = resolveAvatarState(
'RESULT_REVIEW',
req.isPersonalBest,
false, // isMilestone — passed in separately by the API handler if applicable
req.successBand,
);

const avatarDialogue = buildCoachingDialogue(coachingPayload, req.isPersonalBest);

return {
coachingPayload,
avatarDialogue,
weaknessReport: req.weaknessReport,
difficultyConfig: req.difficultyConfig,
generatedBy: finalResponse.generatedBy,
};
} 8. Template Fallback System
File: packages/coaching-rules/src/template-fallback.ts

The template fallback must cover every metric × band combination. It is the ground truth for all safety-critical coaching and for all cases where the LLM is unavailable.

typescript
// packages/coaching-rules/src/template-fallback.ts

import type {
LLMCoachingRequest,
LLMCoachingResponse,
SingingMetricKey,
SuccessBand,
} from '@voice/shared-types';

type TemplateEntry = {
praiseMessage: string;
correctionMessage: string;
actionTip: string;
microExerciseCue?: string;
avatarMood: LLMCoachingResponse['avatarMood'];
};

// Metric × Band → template entry
// Each praiseMessage references something specific (the metric name + a measurable anchor).
// correctionMessage is exactly one issue.
const TEMPLATES: Record<SingingMetricKey, Record<SuccessBand, TemplateEntry>> = {
pitchAccuracy: {
excellent: {
praiseMessage: 'Your pitch accuracy was outstanding — you stayed inside the target zone for most of the hold.',
correctionMessage: 'Keep that same approach: find the note before you fully open your voice.',
actionTip: 'Repeat once and listen for the moment you lock in.',
avatarMood: 'celebratory',
},
good: {
praiseMessage: 'Solid pitch control on that rep.',
correctionMessage: 'You drifted slightly in the middle of the hold — focus on your breath staying even.',
actionTip: 'On the next rep, think about supporting the note from below, not from the throat.',
microExerciseCue: 'Hum the target pitch softly for 5 seconds before you sing it.',
avatarMood: 'calm',
},
developing: {
praiseMessage: 'You got through the exercise — that\'s the starting point.',
correctionMessage: 'Pitch accuracy needs more work — your cents error was high across the hold.',
actionTip: 'Before the next rep, match the reference tone quietly on an "mmm" — then open to the vowel.',
microExerciseCue: 'Hum the reference pitch for 8 seconds with mouth closed.',
avatarMood: 'encouraging',
},
retry: {
praiseMessage: 'You stayed in the exercise — that takes persistence.',
correctionMessage: 'The pitch was not landing in the target zone this rep.',
actionTip: 'Take a breath, listen to the reference tone once more, then try again without any strain.',
microExerciseCue: 'Slide up to the target note slowly from a note you know is comfortable.',
avatarMood: 'encouraging',
},
},
stability: {
excellent: {
praiseMessage: 'Very steady hold — your pitch stability score reflects strong breath support.',
correctionMessage: 'Keep monitoring the end of the hold, where drift usually creeps in.',
actionTip: 'Try extending the next hold by one second and maintaining that same evenness.',
avatarMood: 'celebratory',
},
good: {
praiseMessage: 'Good stability across most of the hold.',
correctionMessage: 'The note wobbled near the end — that\'s usually a breath support issue.',
actionTip: 'On the next rep, imagine pushing the note forward from your belly as you approach the end.',
microExerciseCue: 'Sustain an "sss" sound for 8 seconds at steady volume before singing.',
avatarMood: 'calm',
},
developing: {
praiseMessage: 'You held the note — now we work on keeping it steady.',
correctionMessage: 'Pitch stability was low — the note moved sharp and flat through the hold.',
actionTip: 'Try a shorter hold duration first and focus on keeping the note as still as possible.',
microExerciseCue: 'Hold a comfortable pitch for 3 seconds, aiming for zero movement.',
avatarMood: 'encouraging',
},
retry: {
praiseMessage: 'You gave it a full attempt — let\'s reset and try again.',
correctionMessage: 'The note was not stable this time — the signal was moving too much to score.',
actionTip: 'Relax your jaw and tongue fully before starting. Tension fights stability.',
microExerciseCue: 'Roll your lips on "brr" for 5 seconds to release jaw tension.',
avatarMood: 'encouraging',
},
},
breathControl: {
excellent: {
praiseMessage: 'Strong breath support — your RMS envelope was consistent through the hold.',
correctionMessage: 'Continue pacing your inhale before each rep — that consistency is what produced this result.',
actionTip: 'Now try adding a small crescendo at the end of the next hold to test your breath reserve.',
avatarMood: 'celebratory',
},
good: {
praiseMessage: 'Good breath management this rep.',
correctionMessage: 'Your support faded slightly in the second half — that\'s a breath depth issue.',
actionTip: 'Before you sing, expand the belly on the inhale. Think "fill from the bottom up."',
microExerciseCue: 'Take one slow belly breath (4 counts in, 6 counts out) before the next rep.',
avatarMood: 'calm',
},
developing: {
praiseMessage: 'You completed the rep — breath work takes time to build.',
correctionMessage: 'Breath control was inconsistent — volume dropped off before the hold ended.',
actionTip: 'Shorten the hold target for now and focus on keeping the volume steady the whole way through.',
microExerciseCue: 'Exhale on a quiet "fff" for 6 seconds at steady pressure.',
avatarMood: 'encouraging',
},
retry: {
praiseMessage: 'You got through it — that\'s a starting point.',
correctionMessage: 'Breath support was insufficient to sustain the note.',
actionTip: 'Rest for 30 seconds, take two slow deep breaths, and try a shorter version of the exercise.',
microExerciseCue: 'Breathe in for 4, hold for 2, breathe out for 6. Do this twice.',
avatarMood: 'encouraging',
},
},
toneQuality: {
excellent: {
praiseMessage: 'Your tone was clear and resonant this rep.',
correctionMessage: 'Keep the same throat and jaw relaxation — that\'s what produced the cleaner phonation.',
actionTip: 'Try the same exercise on a different vowel ("ah" → "oh") to see if the tone carries.',
avatarMood: 'celebratory',
},
good: {
praiseMessage: 'Good tone overall.',
correctionMessage: 'There was some breathiness in the tone — a slightly firmer onset would help.',
actionTip: 'Start the next rep with a gentle "h" sound before the note to set the onset cleanly.',
microExerciseCue: 'Hum with mouth closed for 5 seconds and feel the resonance in your face.',
avatarMood: 'calm',
},
developing: {
praiseMessage: 'You\'re working on your tone — this takes patience.',
correctionMessage: 'Tone quality was inconsistent, indicating phonation effort that varies through the hold.',
actionTip: 'Sing this note on a "hmm" rather than a full vowel — it reduces strain and clarifies the tone.',
microExerciseCue: 'Hum a comfortable note for 8 seconds; then open to "ahh" for 3 seconds.',
avatarMood: 'encouraging',
},
retry: {
praiseMessage: 'You tried the rep — let\'s figure out what\'s happening with the tone.',
correctionMessage: 'Tone was not consistent enough to measure reliably.',
actionTip: 'Warm up with 2 minutes of gentle humming before trying this rep again.',
microExerciseCue: 'Gentle hum on a comfortable pitch. No pressure. Just buzz.',
avatarMood: 'encouraging',
},
},
dynamics: {
excellent: {
praiseMessage: 'Excellent volume control — intentional dynamics through the whole rep.',
correctionMessage: 'Keep the same awareness of your volume at phrase endings.',
actionTip: 'Try a deliberate decrescendo on the next rep to test your upper range of control.',
avatarMood: 'celebratory',
},
good: {
praiseMessage: 'Good dynamics this rep.',
correctionMessage: 'Volume was slightly inconsistent in the middle of the hold.',
actionTip: 'Imagine a horizontal line at your target volume level and try to stay on it.',
microExerciseCue: 'Sustain "vvv" for 6 seconds at the same volume from start to finish.',
avatarMood: 'calm',
},
developing: {
praiseMessage: 'You\'re building volume awareness — that\'s the first step.',
correctionMessage: 'Dynamic control was low — volume changed unintentionally through the hold.',
actionTip: 'Focus only on keeping the volume steady, not on the pitch. One thing at a time.',
microExerciseCue: 'Sustain "sss" for 5 seconds at steady pressure to calibrate your breath output.',
avatarMood: 'encouraging',
},
retry: {
praiseMessage: 'You completed the rep.',
correctionMessage: 'Volume control was not measurable this rep.',
actionTip: 'Reset with a breath, then try at a softer starting volume and stay there.',
microExerciseCue: 'Breathe out for 8 counts at steady pressure before singing.',
avatarMood: 'encouraging',
},
},
diction: {
excellent: {
praiseMessage: 'Clear diction throughout.',
correctionMessage: 'Keep your lips and tongue active at the same level on the next rep.',
actionTip: 'Try the same exercise on a different consonant start to confirm the clarity holds.',
avatarMood: 'celebratory',
},
good: {
praiseMessage: 'Good articulation this rep.',
correctionMessage: 'Consonants softened a little toward the end — tongue fatigue is common.',
actionTip: 'Tongue twisters for 30 seconds before practice can sharpen up the articulation muscles.',
microExerciseCue: 'Say "ta-ta-ta-ta" quickly for 5 seconds, clearly and rhythmically.',
avatarMood: 'calm',
},
developing: {
praiseMessage: 'You\'re working on articulation — it takes repetition.',
correctionMessage: 'Diction was unclear in this rep — consonants were swallowed or soft.',
actionTip: 'Slow down by 20% and overdo each consonant. It feels odd but resets the muscle patterns.',
microExerciseCue: 'Say "pa-ta-ka" slowly, feeling each sound land before moving to the next.',
avatarMood: 'encouraging',
},
retry: {
praiseMessage: 'You got through the rep.',
correctionMessage: 'Diction was too unclear to measure this time.',
actionTip: 'Try speaking the phrase clearly before singing it, so your mouth knows the shape.',
microExerciseCue: 'Speak the lyric or vowel slowly twice before singing.',
avatarMood: 'encouraging',
},
},
// Placeholders for Phase 2+ metrics — returns a safe generic message
styleExpression: {
excellent: { praiseMessage: 'Style expression was strong this rep.', correctionMessage: 'Keep that stylistic intent consistent throughout.', actionTip: 'Try adding more of that character to the next rep.', avatarMood: 'celebratory' },
good: { praiseMessage: 'Good style presence.', correctionMessage: 'Style markers faded slightly in the middle.', actionTip: 'Think about the feeling of the style from the first note, not just the peak.', avatarMood: 'calm' },
developing: { praiseMessage: 'You\'re exploring the style — keep experimenting.', correctionMessage: 'Style markers were not consistent through the rep.', actionTip: 'Listen to one bar of the reference track and carry that sound into the exercise.', avatarMood: 'encouraging' },
retry: { praiseMessage: 'You\'re getting started with this style.', correctionMessage: 'Style expression needs more work before we can measure it reliably.', actionTip: 'Focus on pitch and stability first; style will follow once the foundation is solid.', avatarMood: 'encouraging' },
},
musicality: {
excellent: { praiseMessage: 'Musical phrasing was expressive and well-timed.', correctionMessage: 'Keep that onset precision on every phrase going forward.', actionTip: 'Try the same phrase at a slightly faster tempo.', avatarMood: 'celebratory' },
good: { praiseMessage: 'Good musical sense this rep.', correctionMessage: 'Onset timing lagged slightly on the first note.', actionTip: 'Think of starting just ahead of the beat rather than on it.', avatarMood: 'calm' },
developing: { praiseMessage: 'You\'re developing your musical ear.', correctionMessage: 'Musicality was low — phrase shape and timing need more attention.', actionTip: 'Clap the rhythm of the phrase before singing it.', microExerciseCue: 'Clap the target rhythm twice before the next rep.', avatarMood: 'encouraging' },
retry: { praiseMessage: 'You attempted the phrase.', correctionMessage: 'Musicality was not measurable this rep.', actionTip: 'Return to the simpler sustained-note exercise to rebuild precision.', avatarMood: 'encouraging' },
},
posture: {
excellent: { praiseMessage: 'Breath dynamics suggest strong posture support.', correctionMessage: 'Keep that alignment — it\'s supporting everything else.', actionTip: 'Notice how the voice feels when you\'re positioned well.', avatarMood: 'celebratory' },
good: { praiseMessage: 'Good support through the rep.', correctionMessage: 'Breath dynamics suggest posture may have shifted mid-rep.', actionTip: 'Check that your shoulders are relaxed and your chest is open before each rep.', avatarMood: 'calm' },
developing: { praiseMessage: 'You\'re building the foundation.', correctionMessage: 'Posture proxy score is low — breath support may be restricted by positioning.', actionTip: 'Stand if you\'re sitting. Drop your shoulders and lift the crown of your head slightly.', avatarMood: 'encouraging' },
retry: { praiseMessage: 'You kept going.', correctionMessage: 'Posture and technique need attention before the score will improve.', actionTip: 'Shake out your shoulders, take a slow breath, and reset your body before trying again.', avatarMood: 'encouraging' },
},
consistency: {
excellent: { praiseMessage: 'You\'re showing up and improving — your consistency score reflects that.', correctionMessage: 'Keep the same practice cadence.', actionTip: 'Try this exercise at a slightly harder difficulty to keep the challenge alive.', avatarMood: 'celebratory' },
good: { praiseMessage: 'Good session-to-session consistency.', correctionMessage: 'Performance varies a little between sessions — warming up the same way each time can reduce that.', actionTip: 'Use the same warm-up order every session to set a consistent baseline.', avatarMood: 'calm' },
developing: { praiseMessage: 'You\'re showing up — that\'s the most important thing.', correctionMessage: 'Your scores vary quite a bit between sessions, which points to warm-up or environmental factors.', actionTip: 'Try practicing at the same time each day — consistency of timing improves consistency of performance.', avatarMood: 'encouraging' },
retry: { praiseMessage: 'Every session is a starting point.', correctionMessage: 'Consistency across sessions is low right now.', actionTip: 'Focus on completing short sessions regularly rather than long sessions occasionally.', avatarMood: 'encouraging' },
},
repertoire: {
excellent: { praiseMessage: 'Your match with the reference melody was very close.', correctionMessage: 'Keep that same precision on the next snippet.', actionTip: 'Unlock the next snippet and apply the same approach.', avatarMood: 'celebratory' },
good: { praiseMessage: 'Good match with the song.', correctionMessage: 'There was some drift from the reference melody in the middle section.', actionTip: 'Listen to the reference one more time focusing on the phrase where you drifted.', microExerciseCue: 'Hum the melody of the drifted phrase twice.', avatarMood: 'calm' },
developing: { praiseMessage: 'You\'re learning this song — keep going.', correctionMessage: 'The pitch match with the reference was developing.', actionTip: 'Sing along with the original recording (with vocals) once before practicing over the instrumental.', avatarMood: 'encouraging' },
retry: { praiseMessage: 'You attempted the snippet.', correctionMessage: 'The match with the reference song wasn\'t close enough to register this time.', actionTip: 'Work on the sustained-note exercises for pitch accuracy first, then return to this snippet.', avatarMood: 'encouraging' },
},
};

/\*\*

- Deterministic template fallback.
- Always returns a valid LLMCoachingResponse — this cannot fail.
  \*/
  export function buildTemplateFallback(req: LLMCoachingRequest): LLMCoachingResponse {
  const entry = TEMPLATES[req.weaknessReport.focusMetric]?.[req.successBand];

if (!entry) {
// Ultimate fallback for any unexpected metric/band combination
return {
praiseMessage: 'You completed the rep.',
correctionMessage: 'Focus on your target metric for the next attempt.',
actionTip: 'Take a breath and try again with a fresh approach.',
avatarMood: 'encouraging',
generatedBy: 'template',
};
}

return { ...entry, generatedBy: 'template' };
} 9. Safety Overrides
File: packages/coaching-rules/src/safety-overrides.ts

Safety overrides must be evaluated before any of the three tiers run. If any override fires, return its payload directly and skip the coaching engine entirely. These overrides are never LLM-generated.

typescript
// packages/coaching-rules/src/safety-overrides.ts

import type { SingingMetricsResult, CoachingPayload, SuccessBand } from '@voice/shared-types';
import { MIC_CHECK_FAIL_DIALOGUE, STRAIN_WARNING_DIALOGUE } from '@voice/avatar-state';

export interface SafetyOverrideResult {
triggered: true;
type: 'mic_check' | 'strain_warning' | 'grindcore_gate' | 'extreme_style_threshold';
coachingPayload: CoachingPayload;
routeTo: 'mic_check_modal' | 'vocal_safety_modal' | 'exercise_result';
}

export type SafetyCheckResult = SafetyOverrideResult | { triggered: false };

/\*\*

- High-strain proxy per agents.md §18 and knowledge-graph §12.8:
- (meanRmsDb > -10 dBFS) AND (frequencyHz > 880 Hz) AND (stability < 40)
- for ≥ 3 consecutive seconds.
-
- The audio processor computes this and returns it in the metrics payload.
- This function interprets the result; it does not recompute it.
  \*/
  export function checkSafetyOverrides(
  result: SingingMetricsResult,
  stylePack?: string,
  strainRiskFlagged?: boolean
  ): SafetyCheckResult {
  // 1. Unusable audio → mic check
  if (result.qualityFlag === 'unusable') {
  return {
  triggered: true,
  type: 'mic_check',
  coachingPayload: {
  praiseMessage: 'Something went wrong with the audio signal.',
  correctionMessage: MIC_CHECK_FAIL_DIALOGUE[0].text,
  actionTip: MIC_CHECK_FAIL_DIALOGUE[1].text,
  successBand: 'retry' as SuccessBand,
  },
  routeTo: 'mic_check_modal',
  };
  }

// 2. Strain-risk proxy → vocal safety modal
if (strainRiskFlagged === true) {
return {
triggered: true,
type: 'strain_warning',
coachingPayload: {
praiseMessage: 'You pushed hard that rep.',
correctionMessage: STRAIN_WARNING_DIALOGUE.text,
actionTip: 'Take a vocal rest before trying again.',
successBand: 'retry' as SuccessBand,
},
routeTo: 'vocal_safety_modal',
};
}

return { triggered: false };
} 10. Updated packages/coaching-rules/src/index.ts
The existing file exports only mapSustainedNoteScoreToCoaching. Expand it to re-export all new modules:

typescript
// packages/coaching-rules/src/index.ts
// EXISTING export — do not remove
export { mapSustainedNoteScoreToCoaching } from './map-sustained-note'; // rename existing inline code to its own file

// NEW exports
export { findWeakestMetric, rankMetricsByWeakness } from './metric-weakness-finder';
export { adaptDifficulty, SUSTAINED_HOLD_DIFFICULTY_PARAMS } from './difficulty-adaptor';
export { orchestrateCoaching } from './llm-coaching-orchestrator';
export { buildTemplateFallback } from './template-fallback';
export { buildUserMessage, COACHING_SYSTEM_PROMPT } from './prompt-builder';
export { checkSafetyOverrides } from './safety-overrides';
export type { GOAL_METRIC_WEIGHTS } from './metric-weights';
Jules note: Move the existing mapSustainedNoteScoreToCoaching function body out of index.ts into a new file src/map-sustained-note.ts and re-export it from index.ts. This keeps the file clean and avoids the file growing unmanageable. Do not change the function signature.

11. packages/coaching-rules/package.json Changes
    Add the OpenAI SDK as a dependency. Do not add it to any other package — it must only be called server-side.

json
{
"dependencies": {
"openai": "^4.52.7"
}
}
Constraint: The openai package must only be imported in llm-coaching-orchestrator.ts. No other file in packages/coaching-rules should import it directly. This keeps the dependency boundary clear and ensures tests can mock it at the module level.

12. API Endpoint Changes
    File: services/api/src/ — coordinate with Agent #11 (Backend API and Supabase Agent)

Route: POST /v1/sessions/{sessionId}/attempts
This is the primary integration point. The request body and most of the response body already exist in the knowledge graph (§10). The additions are:

Request body — new optional fields:

typescript
// Extend the existing attempt submission body:
{
// ... existing fields (exerciseId, tier, durationMs, audioFileUrl, metrics) ...

// NEW: full singing metrics from Python audio processor (Phase 1+)
"singingMetrics": SingingMetricsResult | null,

// NEW: strain risk flag from audio processor
"strainRiskFlagged": boolean,

// NEW: current difficulty level being attempted
"currentDifficulty": DifficultyLevel
}
Response body — new fields:

typescript
// Extend the existing attempt response:
{
// ... existing fields (attemptId, isPersonalBest, xpEvents, totalXpEarned, coachingPayload) ...

// NEW: adaptive coaching engine output
"weaknessReport": MetricWeaknessReport,
"nextExercise": NextExerciseConfig,
"coachingGeneratedBy": "llm" | "template",

// NEW: avatar dialogue lines for immediate rendering
"avatarDialogue": AvatarDialogueLine[]
}
Route Handler Logic (pseudo-code for Agent #11)
typescript
// services/api/src/routes/attempts.ts (new file, created by Agent #11)

import {
checkSafetyOverrides,
findWeakestMetric,
adaptDifficulty,
orchestrateCoaching,
} from '@voice/coaching-rules';
import { selectNextExercise } from '@voice/curriculum';
import { buildXpEvents } from '@voice/reward-engine';

async function handleAttemptSubmission(req, reply) {
const {
sessionId,
exerciseId,
tier,
singingMetrics,
strainRiskFlagged,
currentDifficulty = 1,
metrics, // existing scoring breakdown
} = req.body;

// 1. Fetch user profile and session history from Supabase
const [user, session, history] = await Promise.all([
supabase.getUserProfile(req.userId),
supabase.getSession(sessionId),
supabase.getSessionPerformanceHistory(req.userId, exerciseId),
]);

// 2. Safety check — must run before anything else
if (singingMetrics) {
const safetyResult = checkSafetyOverrides(
singingMetrics,
user.singingStylePack,
strainRiskFlagged
);
if (safetyResult.triggered) {
// Store attempt as incomplete, return safety payload
await supabase.storeAttempt({ ...attemptData, safetyOverride: safetyResult.type });
return reply.send({
attemptId: newAttemptId,
safetyOverride: safetyResult,
coachingPayload: safetyResult.coachingPayload,
// No nextExercise or weaknessReport — safety modal takes priority
});
}
}

// 3. Persist the attempt
const attempt = await supabase.storeAttempt(attemptData);

// 4. Determine personal best
const isPersonalBest = await supabase.checkAndUpdatePersonalBest(req.userId, exerciseId, metrics.overallScore);

// 5. Tier 1 — identify weakest metric
let weaknessReport = null;
if (singingMetrics && user.singingGoal) {
const recentFocusHistory = history.recentAttempts
.map((a) => a.focusMetric)
.filter(Boolean);
weaknessReport = findWeakestMetric(singingMetrics, user.singingGoal, recentFocusHistory);
}

// 6. Tier 2 — compute difficulty adaptation
const exercise = await supabase.getExercise(exerciseId);
const difficultyConfig = weaknessReport
? adaptDifficulty(currentDifficulty, history, weaknessReport, exercise.category)
: null;

// 7. Resolve next exercise ID if sentinel returned
let nextExercise = null;
if (difficultyConfig) {
let nextExerciseId = difficultyConfig.nextExerciseId;
if (nextExerciseId === '**resolve_from_curriculum**') {
const availableExercises = await supabase.getActiveExercises(tier);
const completedIds = await supabase.getCompletedExerciseIds(req.userId);
const selected = selectNextExercise(
availableExercises,
completedIds,
user.level,
user.singingGoal,
history.totalAttemptsOnExercise
);
nextExerciseId = selected?.exerciseId ?? exerciseId; // hold on same if nothing found
}

    nextExercise = {
      exerciseId: nextExerciseId,
      difficulty: difficultyConfig.nextDifficulty,
      targetNoteHz: difficultyConfig.nextTargetNoteHz,
      durationSeconds: difficultyConfig.nextDurationSeconds,
      toleranceCents: difficultyConfig.nextToleranceCents,
      repetitions: difficultyConfig.nextRepetitions,
      focusMetric: weaknessReport?.focusMetric ?? 'pitchAccuracy',
      focusRationale: weaknessReport?.rationale ?? '',
    };

}

// 8. Tier 3 — LLM coaching orchestration
let adaptiveResult = null;
if (weaknessReport && difficultyConfig) {
const llmReq = {
userId: req.userId,
attemptId: attempt.attemptId,
exerciseId,
exerciseTitle: exercise.title,
tier,
overallScore: metrics.overallScore,
successBand: metrics.successBand,
isPersonalBest,
weaknessReport,
difficultyConfig,
sessionHistory: history,
userFirstName: user.displayName.split(' ')[0],
lastSessionFocus: history.recentAttempts[history.recentAttempts.length - 2]?.focusMetric,
};
adaptiveResult = await orchestrateCoaching(llmReq);
}

// 9. XP computation
const xpEvents = buildXpEvents(metrics.successBand, isPersonalBest, exerciseId, sessionId);

// 10. Build response
return reply.send({
attemptId: attempt.attemptId,
isPersonalBest,
xpEvents,
totalXpEarned: xpEvents.reduce((sum, e) => sum + e.amount, 0),
coachingPayload: adaptiveResult?.coachingPayload ?? mapSustainedNoteScoreToCoaching(metrics.overallScore),
weaknessReport: adaptiveResult?.weaknessReport ?? null,
nextExercise,
coachingGeneratedBy: adaptiveResult?.generatedBy ?? 'template',
avatarDialogue: adaptiveResult?.avatarDialogue ?? [],
});
}
New Route: GET /v1/users/me/coaching-history
Returns the user's recent weakness report history for display in Progress tab and for pre-populating the next session context.

typescript
// Request: GET /v1/users/me/coaching-history?exerciseId=...&limit=10

// Response:
{
"history": Array<{
"attemptId": string,
"exerciseId": string,
"completedAt": string,
"overallScore": number,
"successBand": SuccessBand,
"focusMetric": SingingMetricKey,
"difficultyLevel": DifficultyLevel,
"coachingGeneratedBy": "llm" | "template"
}>
}
New Route: POST /v1/sessions/{sessionId}/coaching-context
Called by the mobile app at session start to pre-fetch the LLM context message for the session-opening avatar dialogue. This is the only other LLM call point.

typescript
// Request:
{
"exerciseIds": string[], // exercises planned for this session
"lastSessionSummary": {
"focusMetric": SingingMetricKey,
"overallTrend": "improving" | "stable" | "regressing"
}
}

// Response:
{
"sessionIntroDialogue": AvatarDialogueLine[],
"sessionFocusMetric": SingingMetricKey,
"sessionFocusRationale": string
}
Session-opening LLM prompt contract (separate from attempt prompt):

typescript
export const SESSION_INTRO_SYSTEM_PROMPT = `You are the coach for VOICE, a vocal training app. You open the user's practice session with a brief, warm greeting. Your response must be valid JSON:
{
"openingLine": string, // 1 sentence, max 80 characters. Welcome the user back.
"focusStatement": string, // 1 sentence, max 100 characters. Name today's focus metric and why.
"encouragement": string // 1 sentence, max 80 characters. Forward-looking encouragement.
}

Rules:

1. Do not use shame language: failed, wrong, bad, weak, worse.
2. Reference the lastSessionFocus if provided — show continuity.
3. If overallTrend is improving, acknowledge it briefly.
4. Do not invent metric scores not given to you.
5. Respond with only the JSON. No markdown outside the JSON.`;
6. Supabase Schema Additions
   Coordinate with Agent #11 (Backend API) and Agent #18 (Security/Privacy).

New table: coaching_history
sql
CREATE TABLE coaching_history (
id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
attempt_id UUID NOT NULL REFERENCES attempts(attempt_id) ON DELETE CASCADE,
user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
exercise_id TEXT NOT NULL,
session_id UUID NOT NULL,
focus_metric TEXT NOT NULL, -- SingingMetricKey
focus_score SMALLINT NOT NULL, -- 0–100
overall_score SMALLINT NOT NULL,
success_band TEXT NOT NULL, -- SuccessBand
difficulty_level SMALLINT NOT NULL, -- 1–5
next_difficulty SMALLINT NOT NULL,
adaptation_signal TEXT NOT NULL, -- 'advance' | 'hold' | 'regress' | 'initial'
coaching_generated_by TEXT NOT NULL, -- 'llm' | 'template'
praise_message TEXT,
correction_message TEXT,
action_tip TEXT,
created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for session history lookups
CREATE INDEX coaching_history_user_exercise ON coaching_history (user_id, exercise_id, created_at DESC);
CREATE INDEX coaching_history_user_session ON coaching_history (user_id, session_id);

-- RLS: users can only read their own coaching history
ALTER TABLE coaching_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "coaching_history_select_own"
ON coaching_history FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "coaching_history_insert_service"
ON coaching_history FOR INSERT
WITH CHECK (auth.uid() = user_id);
New column on attempts table
sql
-- Add to existing attempts table:
ALTER TABLE attempts
ADD COLUMN focus_metric TEXT, -- SingingMetricKey; nullable for speaking tier
ADD COLUMN difficulty_level SMALLINT, -- 1–5; nullable for early sessions
ADD COLUMN strain_risk_flagged BOOLEAN DEFAULT FALSE;
session_performance_view
Materializes the SessionPerformanceHistory shape to avoid N+1 queries in the API handler:

sql
CREATE VIEW session_performance_view AS
SELECT
a.user_id,
a.exercise_id,
COUNT(\*) AS total_attempts,
ARRAY_AGG(
JSON_BUILD_OBJECT(
'attemptId', a.attempt_id,
'overallScore', m.overall_score,
'successBand', m.success_band,
'focusMetric', a.focus_metric,
'completedAt', a.completed_at
)
ORDER BY a.completed_at DESC
) FILTER (WHERE a.completed_at IS NOT NULL) AS recent_attempts,
SUM(CASE WHEN m.success_band IN ('good', 'excellent') THEN 1 ELSE 0 END)
FILTER (WHERE a.completed_at IS NOT NULL) AS consecutive_good_excellent,
SUM(CASE WHEN m.success_band = 'retry' THEN 1 ELSE 0 END)
FILTER (WHERE a.completed_at IS NOT NULL) AS consecutive_retry
FROM attempts a
JOIN singing_attempt_metrics m ON m.attempt_id = a.attempt_id
WHERE a.completed_at IS NOT NULL
GROUP BY a.user_id, a.exercise_id;
Note on consecutiveGoodOrExcellent / consecutiveRetry: The view above approximates consecutive counts as totals for simplicity. The API handler must compute true consecutive streaks by iterating the ordered recent_attempts array. Do not rely on the aggregate SUM for consecutive logic — only use it for the total count.

14. render.yaml Environment Variable Additions
    Add to the voice-api service in render.yaml:

text
envVars:

# ... existing vars ...

- key: OPENAI_API_KEY
  sync: false # Must be set manually in Render dashboard; never committed to repo

# Coaching engine feature flags

- key: COACHING_LLM_ENABLED
  value: "true" # Set to "false" to force template-only mode

- key: COACHING_LLM_TIMEOUT_MS
  value: "4000" # LLM timeout budget in milliseconds

- key: COACHING_LLM_MODEL
  value: "gpt-4o-mini" # Override without code deploy

15. LLM Cost Model and Safeguards
    Per-attempt cost (gpt-4o-mini, 2026 pricing)
    Component Tokens Cost estimate
    System prompt ~270 tokens Input
    User message ~180 tokens Input
    Response ~120 tokens Output
    Total per attempt ~570 tokens ~$0.0002
    At 1,000 active daily users × 10 attempts/session = 10,000 calls/day → ~$2/day. Acceptable at MVP scale; set a hard limit via OpenAI usage cap before Phase 2 scale.

Rate limiting
The API handler must not call the LLM more than once per attempt. Enforce at the route level:

typescript
// Rate limit: one LLM call per unique (userId, attemptId) tuple
// Check in Redis before calling orchestrateCoaching:
const cacheKey = `llm-coaching:${userId}:${attemptId}`;
const alreadyCalled = await redis.get(cacheKey);
if (alreadyCalled) {
// Return cached result or template fallback
}
await redis.set(cacheKey, '1', 'EX', 3600); // 1 hour TTL
Session-level cap
typescript
const SESSION_LLM_MAX_CALLS = 10; // per session
// Track in Redis: llm-session-calls:{sessionId} → count
// If count >= SESSION_LLM_MAX_CALLS, route directly to template fallback 16. Phased Build Order
Phase 0 — Scaffold (Build 0.1 blocker)
Deliverable: Existing coaching-rules package builds with new structure; all tests pass.

Move mapSustainedNoteScoreToCoaching to src/map-sustained-note.ts

Add src/metric-weights.ts (no logic, just the weight table)

Add src/template-fallback.ts (all templates, no LLM dependency)

Add src/safety-overrides.ts (safety check only, no LLM dependency)

Update src/index.ts to re-export all new modules

Add new shared types to packages/shared-types/src/index.ts (coordinate with Agent #3)

Add **tests**/template-fallback.test.ts — verify every metric × band returns valid output

Tests that must pass before Phase 1:

buildTemplateFallback returns valid LLMCoachingResponse for every metric × band (44 combinations: 11 metrics × 4 bands)

checkSafetyOverrides fires correctly on qualityFlag: 'unusable' and strainRiskFlagged: true

mapSustainedNoteScoreToCoaching still passes its existing tests (non-regression)

Phase 1 — Tiers 1 and 2 (Build 0.1 enabler)
Deliverable: Metric weakness finding and difficulty adaptation work end-to-end with deterministic templates. No LLM dependency.

Add src/metric-weakness-finder.ts + tests

Add src/difficulty-adaptor.ts + tests

Wire into POST /v1/sessions/{sessionId}/attempts response (Agent #11)

Add coaching_history table and migration (Agent #11 + Agent #18 for RLS)

Add coaching-history column additions to attempts table

Add GET /v1/users/me/coaching-history route

Acceptance criteria:

Attempt submission returns weaknessReport, nextExercise, and coachingPayload from template

coaching_history table populates on each attempt

findWeakestMetric throws on qualityFlag: 'unusable' (safety gate confirmed)

Difficulty advances after 2 consecutive good attempts in integration test

Difficulty regresses after any retry attempt in integration test

Phase 2 — Tier 3 LLM Integration (MVP feature)
Deliverable: LLM-personalized coaching in production with template fallback.

Add src/prompt-builder.ts + tests (mock the LLM in tests — never call real API in CI)

Add src/llm-coaching-orchestrator.ts + tests

Add openai dependency to package.json

Add OPENAI_API_KEY to render.yaml (sync: false)

Add Redis rate-limiting logic in the API route handler

Add POST /v1/sessions/{sessionId}/coaching-context route for session-opening dialogue

Add COACHING_LLM_ENABLED feature flag check in orchestrator

Acceptance criteria:

LLM call succeeds and returns valid LLMCoachingResponse in integration test (use a seeded fixture, not a live call)

Validator rejects response containing prohibited terms; falls back to template

Validator rejects response with field exceeding max length; falls back to template

Timeout after COACHING_LLM_TIMEOUT_MS ms returns template fallback, not an error

generatedBy: 'llm' appears in response body when LLM succeeds

generatedBy: 'template' appears in response body when LLM fails or is disabled

COACHING_LLM_ENABLED=false forces template-only mode without code change

Phase 3 — Multi-Metric Expansion (Phase 2 product)
Deliverable: All 11 metrics scored and routable. Tone quality, dynamics, and diction fully wired.

Ensure Python audio processor's SingingMetricsResult populates toneQuality, dynamics, diction (coordinate with Agent #12)

Update GOAL_METRIC_WEIGHTS to include Phase 2 metrics

Update metric-weakness-finder to route to new metrics when available

Add Phase 3 metrics (styleExpression, repertoire) behind feature flags

17. Critical Constraints for Jules
    One correction per attempt — enforced at multiple layers:

COACHING_SYSTEM_PROMPT instructs the LLM explicitly

validateLLMResponse rejects multi-correction responses (parse and check for multiple sentences in correctionMessage — if more than one, discard and fall back to template)

template-fallback.ts has exactly one sentence per correctionMessage entry — do not modify these to be multi-sentence

Never call the LLM from mobile:
The openai package is a dependency of packages/coaching-rules. This package is currently listed as a dependency of apps/mobile in the knowledge graph package dependency section. This must not be the path for LLM calls. The mobile app must call POST /v1/sessions/{sessionId}/attempts and receive the coaching payload in the response — it must never import llm-coaching-orchestrator directly. If the monorepo wiring makes this technically possible, add a build-time guard in tsconfig.json for the mobile app to exclude llm-coaching-orchestrator from its resolution path.

Template fallback is the safety net, not a second-class citizen:
Template messages were written with the same care as LLM prompts. Never treat a template response as an error condition in logging or monitoring — log generatedBy: 'template' at INFO level, not WARN.

findWeakestMetric must throw on qualityFlag: 'unusable':
The error must propagate to checkSafetyOverrides, which then routes the mobile app to MicCheckModal. Never produce coaching scores from unusable audio.

Do not add new SingingMetricKey values without:

Adding a corresponding entry in TEMPLATES in template-fallback.ts

Adding a corresponding entry in GOAL_METRIC_WEIGHTS in metric-weights.ts

Adding a corresponding display name in METRIC_DISPLAY_NAMES in prompt-builder.ts
If all three are not updated, the system will silently fall back to the generic template entry.

Difficulty levels 1–5 are user-visible in Phase 2:
The Progress tab will show difficulty level in the session history. Do not change the 1–5 scale without coordinating with Agent #10 (Mobile App).

Tests must not call the real OpenAI API:
Mock openai at the module level in all tests:

typescript
jest.mock('openai', () => ({
default: jest.fn().mockImplementation(() => ({
chat: {
completions: {
create: jest.fn().mockResolvedValue({
choices: [{ message: { content: JSON.stringify(mockLLMResponse) } }],
}),
},
},
})),
}));
CI must never incur OpenAI costs.

18. Files to Create (Summary)
    File Status Notes
    packages/shared-types/src/index.ts Modify Add new types at bottom; coordinate Agent #3
    packages/coaching-rules/src/map-sustained-note.ts New Move existing function here
    packages/coaching-rules/src/metric-weights.ts New Goal→metric weight table
    packages/coaching-rules/src/metric-weakness-finder.ts New Tier 1
    packages/coaching-rules/src/difficulty-adaptor.ts New Tier 2
    packages/coaching-rules/src/prompt-builder.ts New LLM prompt templates
    packages/coaching-rules/src/llm-coaching-orchestrator.ts New Tier 3
    packages/coaching-rules/src/template-fallback.ts New Deterministic fallback
    packages/coaching-rules/src/safety-overrides.ts New Safety gate
    packages/coaching-rules/src/index.ts Modify Re-export all modules
    packages/coaching-rules/package.json Modify Add openai dependency
    packages/coaching-rules/src/**tests**/metric-weakness-finder.test.ts New
    packages/coaching-rules/src/**tests**/difficulty-adaptor.test.ts New
    packages/coaching-rules/src/**tests**/llm-coaching-orchestrator.test.ts New Mock OpenAI
    packages/coaching-rules/src/**tests**/prompt-builder.test.ts New
    packages/coaching-rules/src/**tests**/template-fallback.test.ts New All 44 combinations
    services/api/src/routes/attempts.ts New Coordinate Agent #11
    services/api/src/routes/coaching-history.ts New Coordinate Agent #11
    services/api/src/routes/coaching-context.ts New Coordinate Agent #11
    render.yaml Modify Add OPENAI*API_KEY, COACHING_LLM*\* vars
    Supabase migration New coaching_history table + attempts columns
