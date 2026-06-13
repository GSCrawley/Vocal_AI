# VOICE App — Cross-Spec Integration Risk Brief

**Date:** June 2, 2026
**Repo:** `GSCrawley/Vocal_AI`
**Scope:** Python audio processor spec · Adaptive coaching engine spec · Baseline assessment spec
**Purpose:** Identify every assumption about shared contracts, data shapes, and timing across all three specs that could cause silent failures when Jules implements them in separate sessions.

---

## Executive Summary

Eleven integration risks were identified by cross-referencing the three Jules handoff specs against the live TypeScript contracts in `packages/shared-types/src/index.ts`, `services/audio-processor/src/index.ts`, `packages/coaching-rules/src/index.ts`, and `packages/audio-metrics/src/index.ts`. Two are **Critical** (will produce wrong behavior with no error thrown), five are **High** (silent data loss or broken control flow), and four are **Medium** (fragile assumptions that break under realistic conditions). None of the eleven have mitigation logic currently defined in any spec.

The root cause pattern is consistent: the Python audio processor outputs a flat, analysis-oriented shape; the coaching and baseline specs consume a normalized, domain-oriented shape; and no spec defines the transformation layer between them.

| Risk                                                   | ID   | Severity     | Boundary                                     |
| ------------------------------------------------------ | ---- | ------------ | -------------------------------------------- |
| `SingingMetricsResult` shape mismatch                  | R-01 | **Critical** | Audio processor → Coaching engine            |
| `qualityFlag` enum incompatibility                     | R-02 | **Critical** | Audio processor → Coaching engine            |
| `onsetAccuracy` vs `onsetScore` rename                 | R-03 | **High**     | Audio processor → Shared types               |
| `breathControl` nullability conflict                   | R-04 | **High**     | Audio processor → Coaching engine + Baseline |
| `noteSchedule` absent from live job contract           | R-05 | **High**     | Baseline spec → Audio processor contract     |
| `freeVocalAudioUrl` proxy undocumented                 | R-06 | **High**     | Baseline spec → Mobile → Audio processor     |
| `BaselineSnapshot` vs `UserBaselineSnapshot` collision | R-07 | **High**     | Baseline spec → Shared types                 |
| `consecutiveGoodOrExcellent` SQL vs streak logic       | R-08 | **Medium**   | Coaching engine → Database view              |
| `currentDifficulty` has no persistent storage          | R-09 | **Medium**   | Coaching engine → Database schema            |
| `exerciseId` / `userId` absent from job payload        | R-10 | **Medium**   | Audio processor → Job contract               |
| `'vibrato'` goal metric key mismatch                   | R-11 | **Medium**   | Coaching engine → Shared metric keys         |

---

## Integration Boundary Map

Before detailing each risk, this diagram shows the five integration boundaries where assumptions are made:

```
Mobile App
   │
   ├─── [B1] ──→ POST /v1/sessions/{id}/attempts
   │                   │
   │                   ├─── enqueues ──→ SingingMetricsJob
   │                   │                       │
   │                   │               Python audio-processor
   │                   │                       │
   │                   │               SingingMetricsResult (flat)
   │                   │                       │
   │              [B2] API handler (UNSPECIFIED TRANSFORM)
   │                   │
   │                   └─── findWeakestMetric() ──→ Coaching engine
   │                                                     │
   │                                              [B3] session_performance_view
   │                                                     │
   │                                              Difficulty adaptor
   │
   └─── [B4] ──→ POST /v1/baseline/start
                       │
               BaselineAssessmentJob (missing noteSchedule)
                       │
               Python baseline processor
                       │
               [B5] UserBaselineSnapshot ──→ shared-types (collision)
```

**B2** (the transform between Python flat output and the TypeScript domain shape) is the most dangerous boundary — it is entirely unspecified across all three specs.

---

## Critical Risks

### R-01 — `SingingMetricsResult` Shape Mismatch

**Boundary:** Audio processor → Coaching engine (B2)
**Severity:** Critical — silent wrong coaching focus

**The conflict:** The Python audio processor spec and the live `services/audio-processor/src/index.ts` contract both produce a **flat output shape**:

```typescript
// Live contract output (audio-processor/src/index.ts)
{
  pitchAccuracy: number,
  pitchStability: number,
  onsetAccuracy: number,
  breathControl: number,
  toneQuality: number,
  qualityFlag: string | null,
  pitchFrames: PitchFrame[],
  completedAt: string
}
```

The coaching engine spec defines `SingingMetricsResult` in its own shared-types block as a **nested, domain-oriented shape**:

```typescript
// Coaching engine spec expectation
{
  metrics: Partial<Record<SingingMetricKey, number | null>>,
  overallScore: number,
  pitchScore: number,
  stabilityScore: number,
  onsetScore: number,
  qualityFlag: 'ok' | 'degraded' | 'unusable'
}
```

**Silent failure mode:** `findWeakestMetric()` reads `result.metrics.stability`. When given the Python flat output, `result.metrics` is `undefined`. The function falls back to a default metric selection without throwing — producing incorrect coaching focus silently on every single session.

Additionally, `overallScore` does not exist in the Python output at all. No spec defines how to compute it.

**What must be specified:** The API handler at `POST /v1/sessions/{id}/attempts` must:

1. Receive the flat Python output from the job queue
2. Remap field names (`pitchStability` → `metrics.stability`, `onsetAccuracy` → `metrics.onset`, etc.)
3. Compute `overallScore` from component scores using a defined formula
4. Normalize `qualityFlag` to the three-value enum (see R-02)
5. Pass the normalized shape to `findWeakestMetric()`

**None of these steps are specified anywhere across the three specs.**

---

### R-02 — `qualityFlag` Enum Incompatibility

**Boundary:** Audio processor → Coaching engine (B2)
**Severity:** Critical — clipped/silent audio bypasses safety routing

**The conflict:**

| Source                                           | Values                                                                  |
| ------------------------------------------------ | ----------------------------------------------------------------------- |
| Python `quality_gates.py` (audio processor spec) | `None`, `"clipping"`, `"too_quiet"`, `"no_voice"`, `"low_voiced_ratio"` |
| Live `SingingMetricsResult` in shared-types      | `'ok' \| 'degraded' \| 'unusable'`                                      |
| Coaching engine `checkSafetyOverrides()`         | routes to mic check modal on `=== 'unusable'`                           |

**Silent failure mode:** Python returns `"clipping"`. This string is not in `'ok' | 'degraded' | 'unusable'`. The TypeScript type guard `qualityFlag === 'unusable'` never fires. Clipped audio — which can produce garbage pitch analysis — is passed to `findWeakestMetric()` and generates a coaching recommendation as if the audio were valid.

**What must be specified:** A normalization table, implemented in the API handler:

```
Python output      →  Normalized enum
─────────────────────────────────────
null               →  'ok'
"clipping"         →  'unusable'
"no_voice"         →  'unusable'
"too_quiet"        →  'degraded'
"low_voiced_ratio" →  'degraded'
```

This mapping is a product decision (not just an engineering detail) — the choice of `'degraded'` vs `'unusable'` for `"low_voiced_ratio"` determines whether the user is shown a mic check modal or simply receives a lower-confidence coaching result.

---

## High Risks

### R-03 — `onsetAccuracy` vs `onsetScore` Field Rename

**Boundary:** Audio processor → Shared types (B2)
**Severity:** High — `onsetScore` always `undefined`

The Python job and the live `audio-processor/src/index.ts` contract both output `onsetAccuracy`. The coaching engine spec's `SingingMetricsResult` definition uses `onsetScore`. No transform is specified. When the coaching engine reads `result.onsetScore`, it receives `undefined`. Onset timing will never register as a weakness even in users who struggle significantly with it.

**Fix:** Add `onsetAccuracy → onsetScore` to the normalization mapping in the API handler (see R-01).

---

### R-04 — `breathControl` Nullability Conflict

**Boundary:** Audio processor → Coaching engine + Baseline (B2, B5)
**Severity:** High — null-check logic silently dead

Three different nullability contracts exist for the same field:

| Location                                          | Type                                               |
| ------------------------------------------------- | -------------------------------------------------- |
| Python job (audio processor spec & live contract) | `breathControl: number` (0 when insufficient data) |
| Coaching engine `SingingMetricsResult`            | `breathControlScore?: number \| null`              |
| Baseline `BaselineMetricGrades`                   | `breathControl: number \| null`                    |
| Live `BaselineSnapshot` in shared-types           | `breathControl: number` (non-nullable)             |

**Silent failure mode:** Any code that uses `if (breathControl === null)` to detect missing data will never fire when the Python job returns `0` instead of `null`. If `0` and "no breath data" are semantically different — and they are, since a score of 0 means "measured, poor" while `null` means "unmeasurable" — then coaching logic treating them the same will produce wrong exercise selection for users whose breath control simply couldn't be measured.

**Fix:** The Python job spec must define an explicit sentinel. The recommended approach is for the job to return `null` when breath data is insufficient, and `0–100` when measured. The live contract's `breathControl: number` must be updated to `breathControl: number | null`.

---

### R-05 — `noteSchedule` Missing from Live `BaselineAssessmentJob` Contract

**Boundary:** Baseline spec → Audio processor contract (B4)
**Severity:** High — range walk returns empty, vocal range detection silently fails

**The conflict:** The live `services/audio-processor/src/index.ts` defines:

```typescript
interface BaselineAssessmentJob {
  rangeTestAudioUrl: string;
  sustainedHoldAudioUrl: string;
  freeVocalAudioUrl: string;
}
```

The baseline spec's Python `segment_range_walk()` function requires `noteSchedule` to segment the range walk recording into per-note windows. The spec states explicitly: _"The Python job cannot reconstruct which audio segment corresponds to which MIDI note without the `noteSchedule`."_

**Silent failure mode:** If a Jules session implements the Python job per the spec without noticing `noteSchedule` is absent from the live TypeScript interface, `segment_range_walk()` receives no schedule, returns an empty dict, and `detect_vocal_range()` produces a fallback range. The user's vocal range will be wrong, affecting all subsequent key recommendations — with no error thrown.

**Fix required before Python implementation begins:** Add `noteSchedule` to `BaselineAssessmentJob` in `services/audio-processor/src/index.ts`:

```typescript
interface BaselineAssessmentJob {
  rangeTestAudioUrl: string;
  sustainedHoldAudioUrl: string;
  freeVocalAudioUrl: string;
  noteSchedule: Array<{ midiNote: number; startMs: number; endMs: number }>;
}
```

This is a **schema-first fix** — the TypeScript interface must be updated before any Jules session implements the Python baseline processor.

---

### R-06 — `freeVocalAudioUrl` Proxy Undocumented

**Boundary:** Baseline spec → Mobile → Audio processor (B4)
**Severity:** High — proxy assumption fragile across Jules sessions

**The conflict:** The live `BaselineAssessmentJob` contract requires `freeVocalAudioUrl` as a distinct field. The baseline spec's API handler sets:

```typescript
freeVocalAudioUrl: sustainedHoldAudioUrl; // proxy — no distinct free vocal recording
```

This is documented only as an inline comment in the spec. The mobile baseline flow records exactly two audio files — a range walk and a sustained hold. There is no "free vocal" recording screen.

**Risk:** If a future Jules session implements the Python job expecting a distinct 30-second free vocal recording (e.g., for timbre analysis over a phrase), it will receive an 8-second sustained hold note instead. The proxy is not wrong today, but it is fragile because:

1. The comment-only documentation will not survive code churn
2. The Python job cannot distinguish between the two input sources — it will silently analyze sustain instead of phrase timbre

**Fix:** Either (a) formally deprecate `freeVocalAudioUrl` from `BaselineAssessmentJob` and remove it from the Python job inputs, or (b) add the free vocal recording screen to the mobile baseline flow. The current proxy should be elevated from an inline comment to a spec-level decision with a recorded rationale in `docs/ARCHITECTURE.md` or equivalent.

---

### R-07 — `BaselineSnapshot` vs `UserBaselineSnapshot` Naming Collision

**Boundary:** Baseline spec → Shared types (B5)
**Severity:** High — Jules may build against wrong type or create duplicate

**The conflict:** The live `packages/shared-types/src/index.ts` already exports `BaselineSnapshot` — an older, simpler shape with non-nullable fields (`breathControl: number`, `toneQuality: number`) and `VocalRangeSnapshot` that includes `recommendedStartingKeyMidi` and `recommendedStartingKeyName`.

The baseline spec defines a new, richer `UserBaselineSnapshot` with nullable `BaselineMetricGrades`, a separate `BaselineContext`, and a `VocalRangeSnapshot` that does **not** include `recommendedStartingKeyMidi`/`recommendedStartingKeyName` (those are on `UserBaselineSnapshot` instead).

**Risk:** A Jules session implementing Task 10 (baseline storage) may:

- Not realize `BaselineSnapshot` already exists and needs to be reconciled or deprecated
- Build `UserBaselineSnapshot` as an entirely new type alongside the old one, leaving orphaned code reading the old shape
- Use the old `VocalRangeSnapshot` shape (with `recommendedStartingKey*`) instead of the new one

**Fix:** The baseline spec must explicitly state: "`BaselineSnapshot` in shared-types is superseded by `UserBaselineSnapshot`. Task 10 must deprecate `BaselineSnapshot`, migrate any existing consumers, and export `UserBaselineSnapshot` in its place." This migration note is absent from the current spec text.

---

## Medium Risks

### R-08 — `consecutiveGoodOrExcellent` SQL View vs Streak Logic

**Boundary:** Coaching engine → Database view (B3)
**Severity:** Medium — difficulty advances on total count, not true streak

**The conflict:** The coaching spec's `session_performance_view` computes:

```sql
SUM(CASE WHEN success_band IN ('good','excellent') THEN 1 ELSE 0 END) AS consecutiveGoodOrExcellent
```

This is a **total count** of good/excellent attempts, not a **consecutive streak**. The difficulty adaptor reads this value and fires `advance` when `consecutiveGoodOrExcellent >= 2`.

**Silent failure mode:** A user with 5 total good attempts spread across 10 sessions — with the last 3 being `retry` — would trigger difficulty advancement even though they are currently regressing. The spec includes a footnote acknowledging this: _"The API handler must compute true consecutive streaks by iterating the ordered `recent_attempts` array"_ — but no handler code implements this in any spec.

**Fix:** Either rename the SQL column to `totalGoodOrExcellent` to accurately reflect its semantics, or replace the SQL computation with an application-layer streak walk over the `recent_attempts` array before passing to the adaptor. The current state leaves the column name contradicting its implementation.

---

### R-09 — `currentDifficulty` Has No Persistent Storage

**Boundary:** Coaching engine → Database schema (B3)
**Severity:** Medium — difficulty resets to 1 on every session

**The conflict:** The coaching engine's `POST /v1/sessions/{id}/attempts` endpoint accepts `currentDifficulty` from the request body and defaults to `1` when absent. The `coaching_history` table records `difficulty_level` per-attempt, but no table or column stores the **current active difficulty level per user per exercise**.

**Silent failure mode:** If the mobile client does not send `currentDifficulty` in every request (e.g., after a cold app launch), the difficulty defaults to `1`. All difficulty progression computed by the adaptor is lost between sessions, and the user restarts at beginner level every time they re-open the app.

**Fix:** Add a `user_exercise_state` table (or equivalent column on an existing table) that persists `current_difficulty` per `(userId, exerciseId)`. The `POST /attempts` handler should read persisted difficulty first and use the request body value only as an override, not the source of truth.

---

### R-10 — `exerciseId` / `userId` Absent from `SingingMetricsJob` Payload

**Boundary:** Audio processor → Job contract (B1)
**Severity:** Medium — Python job cannot construct storage path

**The conflict:** The live `SingingMetricsJob` contract does not include `userId` as a top-level field. The Python audio processor spec uses `userId` to construct the ephemeral audio storage path (`/tmp/voice/{userId}/{jobId}/`). `exerciseId` is present in `SingingMetricsResult` (the output) but not in `SingingMetricsJob` (the input payload) — the Python job cannot echo back what it was never given.

**Fix:** Audit the live `SingingMetricsJob` interface and add any fields the Python job needs to (a) construct storage paths and (b) tag its output. At minimum: `userId: string` and `exerciseId: string` must appear in the job payload.

---

### R-11 — `'vibrato'` Goal Metric Key Mismatch

**Boundary:** Coaching engine → Shared metric keys (B2)
**Severity:** Medium — vibrato goal selects proxy metric silently

**The conflict:** `SingingGoal` includes `'vibrato'` as a valid goal type. The coaching spec's `GOAL_METRIC_WEIGHTS` maps the `'vibrato'` goal to `toneQuality` and `stability` as proxy metrics — because no `SingingMetricKey` named `'vibrato'` exists (the closest is `styleExpression` in style packs, not a direct metric key from the Python job).

This is not strictly a bug, but it is an undocumented proxy mapping. A Jules session adding vibrato detection to the Python job in a future sprint would naturally add a `'vibrato'` metric key — not knowing that the coaching engine already silently maps the `'vibrato'` goal to `toneQuality` and `stability`. The two implementations would then conflict.

**Fix:** Add a comment to `GOAL_METRIC_WEIGHTS` in the coaching spec and in the source code: _"`'vibrato'` goal uses proxy metrics (toneQuality, stability) until the Python job supports direct vibrato detection. If a 'vibrato' SingingMetricKey is added, update this mapping."_

---

## Unspecified Transform Layer (Root Cause)

All critical and high risks trace back to a single missing piece: **the normalization transform between Python flat output and the TypeScript domain shape**. This transform must be implemented in the API handler at `POST /v1/sessions/{id}/attempts` before the coaching engine can consume Python job results correctly.

The full required transform is:

```typescript
function normalizePythonOutput(raw: PythonFlatOutput): SingingMetricsResult {
  return {
    metrics: {
      pitch: raw.pitchAccuracy,
      stability: raw.pitchStability, // R-01: was pitchStability
      onset: raw.onsetAccuracy, // R-03: was onsetAccuracy
      breathControl: raw.breathControl ?? null, // R-04: 0 vs null sentinel
      toneQuality: raw.toneQuality,
    },
    overallScore: computeOverallScore(raw), // R-01: must be defined
    qualityFlag: normalizeQualityFlag(raw.qualityFlag), // R-02: enum map
  };
}

function normalizeQualityFlag(flag: string | null): 'ok' | 'degraded' | 'unusable' {
  if (!flag) return 'ok';
  if (flag === 'clipping' || flag === 'no_voice') return 'unusable';
  if (flag === 'too_quiet' || flag === 'low_voiced_ratio') return 'degraded';
  return 'ok';
}
```

`computeOverallScore()` requires a product decision on weighting — a suggested default is a weighted mean: pitch (35%), stability (25%), onset (20%), breathControl (10%), toneQuality (10%). This weighting should be documented as a named constant, not hardcoded.

---

## Recommended Pre-Implementation Actions

These are schema-first fixes that must land before the relevant Jules tasks begin, to avoid requiring breaking changes mid-implementation:

| Action                                                                             | Owner           | Blocks                              |
| ---------------------------------------------------------------------------------- | --------------- | ----------------------------------- |
| Add `noteSchedule` to `BaselineAssessmentJob` interface                            | Shared-types PR | Task 10 (baseline Python job)       |
| Add `userId`, `exerciseId` to `SingingMetricsJob` interface                        | Shared-types PR | Task 3 (singing metrics Python job) |
| Update `BaselineSnapshot` → `UserBaselineSnapshot` migration note in baseline spec | Spec edit       | Task 10                             |
| Define `normalizePythonOutput()` in the audio processor API handler spec           | Spec edit       | Tasks 3, 5, 6                       |
| Define `qualityFlag` normalization table in spec                                   | Spec edit       | Task 3                              |
| Add `user_exercise_state` table to coaching engine schema                          | Schema PR       | Task 7                              |
| Rename SQL column `consecutiveGoodOrExcellent` or fix streak logic                 | SQL view PR     | Task 7                              |
| Elevate `freeVocalAudioUrl` proxy to architecture decision record                  | Doc edit        | Task 10                             |

---

## Summary

The three specs are architecturally coherent but contain a consistent gap at every Python-to-TypeScript boundary: the specs describe what goes in and what comes out, but leave the transformation between the two shapes entirely unspecified. Two of the eleven risks (R-01, R-02) will produce incorrect behavior with no runtime error, making them the highest priority to address before any Jules session begins implementing job consumers. The schema-first fixes in the table above are the minimum set of changes required to prevent silent integration failures across separately-implemented sessions.
