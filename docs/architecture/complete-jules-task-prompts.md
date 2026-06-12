# VOICE — Jules Task Prompts

## Ordered by Build Milestone

**Source specs:**

- `voice-audio-processor-spec.pplx.md` — Python audio processor service (Agent #12)
- `voice-adaptive-coaching-engine-spec.pplx.md` — Adaptive coaching engine (Agent #8)
- `voice-baseline-assessment-spec.pplx.md` — Baseline assessment flow (Agents #3, #7, #10, #11, #12)

**Integration risk mitigations:** Three new tasks (Task 0, Task 7A, Task 17A) and five amended tasks (Tasks 6, 7, 9, 10, 17) were added based on the cross-spec integration risk brief (`voice-integration-risk-brief.pplx.md`). Risk IDs are noted inline so you can trace each change back to its source.

**How to use this file:** Each numbered block is a single Jules task session. Paste the entire block as your Jules prompt. Tasks within a build must run in numbered order unless explicitly marked as parallelizable. Do not start a later build's tasks until all acceptance criteria for the current build are confirmed green.

---

## PRE-BUILD — Schema Alignment

_These tasks must merge before any build begins. They are schema-first fixes that unblock multiple downstream Jules sessions._

---

### Task 0 — Schema Alignment PR

**Agent:** Domain Contracts (#3)

**Why this task exists:** The integration risk brief identified several mismatches between the live TypeScript contracts and the spec assumptions that will cause silent failures if not corrected before implementation begins. This task fixes all of them at the type level. No runtime logic is written here — only interface definitions, deprecation steps, and `pnpm typecheck`.

---

**Step 1 — Fix `SingingMetricsResult` in `packages/shared-types/src/index.ts`** _(Risk R-01, R-03, R-04)_

The existing `SingingMetricsResult` shape is incorrect. Replace it entirely with the following. If it does not already exist, add it. If it does exist, deprecate the old version with a JSDoc `@deprecated` comment and add the new one.

The correct shape is:

```typescript
/**
 * The normalized result produced by the Python singing_metrics job and
 * consumed by findWeakestMetric(). The API handler is responsible for
 * remapping Python flat output into this shape — see normalizePythonOutput()
 * in services/api/src/routes/attempts.ts.
 *
 * Field names intentionally match the Python flat output after normalization:
 *   pitchStability (Python) → metrics.stability (here)
 *   onsetAccuracy (Python)  → metrics.onset (here)  [R-03]
 *   breathControl: number   → breathControl: number | null [R-04]
 */
export interface SingingMetricsResult {
  jobId: string;
  userId: string;
  exerciseId: string;
  capturedAt: string;
  /** Five-value enum matching Python quality_gates.py output exactly [R-02] */
  qualityFlag: 'ok' | 'clipping' | 'too_quiet' | 'too_short' | 'low_voiced_ratio';
  qualityNote?: string;
  /** Nested metrics dict keyed by SingingMetricKey — used by findWeakestMetric() [R-01] */
  metrics: Partial<Record<SingingMetricKey, number | null>>;
  overallScore: number | null;
  /** Individual score aliases for convenience — same values as metrics dict */
  pitchScore: number | null;
  stabilityScore: number | null;
  onsetScore: number | null;
  breathControlScore: number | null;
  toneQualityScore: number | null;
  /** Raw Praat outputs — may be null if voice quality analysis failed */
  hnrDb?: number | null;
  cppDb?: number | null;
  jitterLocal?: number | null;
  shimmerLocal?: number | null;
}
```

Note: `breathControlScore` is typed `number | null` — NOT `number` — because the Python job must return `null` (not `0`) when breath control cannot be measured due to insufficient audio. See R-04. If existing code reads `breathControl: number` from `SingingMetricsResult`, update those call sites now.

---

**Step 2 — Fix `qualityFlag` in `BaselineAssessmentResult`** _(Risk R-02)_

In `services/audio-processor/src/index.ts`, the `BaselineAssessmentResult` interface has `qualityFlag: 'ok' | 'degraded'`. This is correct for the baseline output (the two-value enum is intentional — baseline quality is already normalized by the Python job). Do not change it. Add a JSDoc comment:

```typescript
/**
 * Baseline quality is pre-normalized by the Python baseline_assessment job.
 * Unlike SingingMetricsResult.qualityFlag (5-value enum from quality_gates.py),
 * this is always one of two values: 'ok' or 'degraded'.
 * 'degraded' means the assessment completed but one or more quality warnings
 * were present. The snapshot is still stored and usable.
 */
qualityFlag: 'ok' | 'degraded';
```

---

**Step 3 — Deprecate legacy `BaselineSnapshot` in `packages/shared-types/src/index.ts`** _(Risk R-07)_

The live shared-types already exports a `BaselineSnapshot` type (older, simpler shape with non-nullable fields). The baseline assessment spec introduces `UserBaselineSnapshot` as its replacement. In this step:

1. Find the existing `BaselineSnapshot` interface.
2. Add this JSDoc above it:

```typescript
/**
 * @deprecated Use UserBaselineSnapshot instead.
 * This type will be removed when Task 10 is merged.
 * Consumers: search the codebase for 'BaselineSnapshot' and update to UserBaselineSnapshot.
 */
```

3. Do NOT remove it yet — that happens in Task 10.
4. Run `grep -r "BaselineSnapshot" --include="*.ts" .` and record every file that imports `BaselineSnapshot`. Add this list as a code comment in `packages/shared-types/src/index.ts` directly above the `@deprecated` marker:

```typescript
// Consumers to migrate in Task 10:
// (list output of grep here)
```

---

**Step 4 — Add `noteSchedule` to live `BaselineAssessmentJob`** _(Risk R-05)_

In `services/audio-processor/src/index.ts`, find the `BaselineAssessmentJob` interface. It currently has only three audio URL fields. Add `noteSchedule`:

```typescript
export interface BaselineAssessmentJob {
  jobType: 'baseline_assessment';
  jobId: string;
  userId: string;
  rangeTestAudioUrl: string;
  sustainedHoldAudioUrl: string;
  /**
   * freeVocalAudioUrl is set to sustainedHoldAudioUrl by the API handler as a proxy.
   * No distinct free-vocal recording is made in the current mobile baseline flow.
   * If a free-vocal screen is added in future, update POST /v1/assessments/baseline
   * and remove this comment. [R-06]
   */
  freeVocalAudioUrl: string;
  /**
   * REQUIRED — without this the Python baseline job cannot segment the range walk
   * recording into per-note windows. segment_range_walk() returns an empty dict
   * if noteSchedule is absent or empty. [R-05]
   */
  noteSchedule: Array<{
    midiNote: number;
    noteName: string;
    timestampMs: number;
    holdDurationMs: number;
  }>;
}
```

---

**Step 5 — Verify `pnpm typecheck`**

Run `pnpm typecheck` across all 18 workspace projects. Fix any type errors introduced by the `breathControlScore: number | null` change. Do not proceed to any other task until typecheck passes.

**Acceptance criteria:**

- `pnpm typecheck` passes across all 18 workspace projects
- `SingingMetricsResult` uses the nested `metrics` dict shape and five-value `qualityFlag`
- `BaselineSnapshot` is marked `@deprecated` with a consumer list comment
- `BaselineAssessmentJob` includes `noteSchedule`
- No `SingingMetricsResult.breathControl: number` (non-nullable) anywhere in the codebase

---

## BUILD 0.2 — Audio Analysis Depth

_(MILESTONES.md: "Layer 2 (Stage 1): librosa on the Python audio-processor")_

These tasks produce the Python audio processor service from zero. They are the prerequisite for every downstream coaching and assessment feature.

---

### Task 1 — Python Service Scaffold

**Agent:** Audio Processor (#12)

Read `services/audio-processor/src/index.ts` (the TypeScript job contracts) and `render.yaml` to understand the service topology. Then create the Python service scaffold at `services/audio-processor/python/` with the following, using the exact directory layout and dependency versions from the spec:

**Create these files in full:**

`services/audio-processor/python/requirements.txt` — include exactly:

```
fastapi==0.115.6
uvicorn[standard]==0.32.1
rq==2.3.3
redis==5.2.1
librosa==0.10.2.post1
soundfile==0.12.1
numpy==1.26.4
scipy==1.14.1
crepe==0.0.16
torch==2.5.1
praat-parselmouth==0.4.5
demucs==4.0.1
openai-whisper==20240930
fastdtw==0.3.4
supabase==2.11.0
pydantic-settings==2.6.1
python-dotenv==1.0.1
```

`services/audio-processor/python/app/__init__.py` — empty
`services/audio-processor/python/app/config.py` — pydantic-settings config class reading `REDIS_URL`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `AUDIO_STORAGE_OPT_IN_DEFAULT=false`, `WORKER_CONCURRENCY=1`, `LOG_LEVEL=info`
`services/audio-processor/python/app/main.py` — FastAPI app factory with `GET /healthz` returning `{"ok": true, "service": "voice-audio-processor"}` and `GET /jobs/{job_id}/status` (stub returning `{"jobId": job_id, "status": "unknown"}` for now)
`services/audio-processor/python/app/worker.py` — RQ Worker that connects to Redis using `config.REDIS_URL`, registers six queues: `vocal_separation`, `vocal_analysis`, `singing_metrics`, `filler_detection`, `karaoke_compare`, `baseline_assessment`. Loads all job modules at startup (do not import lazily — model singletons must initialize on worker start, not per-job).
`services/audio-processor/python/app/utils/__init__.py` — empty
`services/audio-processor/python/app/utils/audio_io.py` — implement `load_audio(url_or_path: str, sr: int = 22050) -> tuple[np.ndarray, int]` and `audio_to_wav_bytes(audio: np.ndarray, sr: int) -> bytes`
`services/audio-processor/python/app/storage/__init__.py` — empty
`services/audio-processor/python/app/storage/supabase_client.py` — implement `download_file(storage_url: str) -> bytes` and `upload_file(bucket: str, path: str, data: bytes, content_type: str = "audio/wav") -> str`
`services/audio-processor/python/app/jobs/__init__.py` — empty
`services/audio-processor/python/app/jobs/placeholder.py` — a single function `run_placeholder(job_payload: dict) -> dict` that logs the job type and returns `{"status": "stub", "jobId": job_payload.get("jobId")}`

**Also create placeholder `__init__.py` files for:** `app/analysis/`, `app/separation/`

**Tests to add:**
`services/audio-processor/python/tests/__init__.py`
`services/audio-processor/python/tests/test_audio_io.py` — generate a 1-second 440Hz sine wave at 22050Hz in-memory, write it to a temp WAV, call `load_audio()`, assert shape `(22050,)` and sample rate `22050`
`services/audio-processor/python/tests/test_config.py` — set `REDIS_URL=redis://localhost:6379` in env, call `get_config()`, assert `config.REDIS_URL == "redis://localhost:6379"`

**Acceptance criteria:**

- `uvicorn app.main:app --port 8001` starts without error
- `GET /healthz` returns `{"ok": true, "service": "voice-audio-processor"}`
- `python -m app.worker` starts, connects to Redis (or logs a clean connection error if Redis is not available), and does not crash on startup
- Both tests pass: `pytest services/audio-processor/python/tests/`
- No files are created in `services/audio-processor/src/` — that directory is TypeScript only

**Do not implement:** Any analysis functions, model loading, or real job logic. Stubs only.

---

### Task 2 — Quality Gate and Audio I/O Hardening

**Agent:** Audio Processor (#12)

Building on Task 1, implement the quality gate module. This gate must run before every score — it is not optional.

**File to create:** `services/audio-processor/python/app/utils/quality_gates.py`

Implement `check_quality(audio: np.ndarray, sr: int, voiced_flag: np.ndarray | None = None) -> QualityReport` where `QualityReport` is a dataclass with:

- `is_usable: bool`
- `quality_flag: Literal["ok", "clipping", "too_quiet", "too_short", "low_voiced_ratio"]`
- `note: str` — human-readable reason
- `rms_db: float`
- `peak_db: float`
- `duration_seconds: float`
- `voiced_ratio: float | None`

Rules:

- `peak_db > -1.0 dBFS` → `quality_flag = "clipping"`, `is_usable = False`
- `rms_db < -45.0 dBFS` → `quality_flag = "too_quiet"`, `is_usable = False`
- `duration_seconds < 0.5` → `quality_flag = "too_short"`, `is_usable = False`
- `voiced_flag` provided AND voiced ratio < 0.3 → `quality_flag = "low_voiced_ratio"`, `is_usable = False`
- All pass → `quality_flag = "ok"`, `is_usable = True`

**Tests to add:** `services/audio-processor/python/tests/test_quality_gates.py`

- A clipping sine wave (amplitude > 0.99) → `quality_flag = "clipping"`
- A very quiet signal (amplitude 0.001) → `quality_flag = "too_quiet"`
- 0.1 seconds of audio → `quality_flag = "too_short"`
- A clean 1-second sine wave at 440Hz → `quality_flag = "ok"`, `is_usable = True`

**Acceptance criteria:**

- `check_quality()` never raises on valid numpy input
- All four test cases pass
- `is_usable = False` means no scoring can proceed — enforce this in all downstream callers (add an assertion or guard in `audio_io.py`)

---

### Task 3 — Pitch Extraction (pYIN)

**Agent:** Audio Processor (#12)

Implement pYIN-based pitch extraction. pYIN is available inside `librosa` as `librosa.pyin` — no separate install required.

**File to create:** `services/audio-processor/python/app/analysis/pitch.py`

Implement:

- `extract_pitch_pyin(audio: np.ndarray, sr: int, fmin: float = 65.0, fmax: float = 2093.0) -> dict` — calls `librosa.pyin`, returns `{"frequencies": list[float | None], "voiced_flags": list[bool], "voiced_probs": list[float], "times": list[float]}`
- `pitch_to_frames(pyin_result: dict) -> list[dict]` — converts to frame list of `{"timestampMs": float, "frequencyHz": float | None, "voiced": bool, "confidence": float}`
- `hz_to_cents(hz: float, reference_hz: float) -> float` — standard formula: `1200 * log2(hz / reference_hz)`

**Tests to add:** `services/audio-processor/python/tests/test_pitch.py`

- Generate a 2-second 440Hz (A4) pure sine wave. `extract_pitch_pyin` should return voiced frames with median frequency within ±5Hz of 440Hz.
- Generate a 2-second 329.63Hz (E4) pure sine wave. Median frequency within ±5Hz of 329.63Hz.
- `hz_to_cents(440.0, 440.0)` → `0.0`
- `hz_to_cents(466.16, 440.0)` → approximately `100.0` (one semitone)
- Silence (zeros array) → all `voiced=False`

**Acceptance criteria:**

- A4 sine → median voiced frequency within ±5Hz of 440Hz
- All tests pass
- No calls to external APIs or file I/O in the test module — all fixtures generated in-memory

---

### Task 4 — RMS Envelope and Breath Control Scoring

**Agent:** Audio Processor (#12)

**File to create:** `services/audio-processor/python/app/analysis/rms.py`

Implement:

- `extract_rms_envelope(audio: np.ndarray, sr: int, frame_length: int = 2048, hop_length: int = 512) -> dict` — returns `{"rms_frames": list[float], "rms_db_frames": list[float], "times": list[float], "mean_rms_db": float, "std_rms_db": float}`
- `score_breath_control(rms_result: dict) -> float` — returns 0–100. Score is based on inverse of `std_rms_db` normalized to [0, 100]. A perfectly steady signal (std = 0) → 100. High variance (std > 12 dB) → 0. Use linear interpolation between these bounds.
- `score_dynamics_control(rms_result: dict, target_range_db: float = 6.0) -> float` — returns 0–100. Rewards intentional dynamic range close to `target_range_db`. |actual_range_db - target_range_db| < 2 → 100; difference > 15 → 0.

**Tests to add:** `services/audio-processor/python/tests/test_rms.py`

- A constant-amplitude 440Hz sine → `std_rms_db` near 0, `score_breath_control` ≥ 90
- A sine that linearly increases in amplitude from 0.1 to 0.9 → `std_rms_db` > 3, `score_breath_control` < 70
- Silence → does not raise; `mean_rms_db` is a large negative number

**Acceptance criteria:** All tests pass. `score_breath_control` always returns a value in [0.0, 100.0].

---

### Task 5 — Voice Quality Analysis (parselmouth/Praat)

**Agent:** Audio Processor (#12)

Implement HNR, CPP, jitter, and shimmer extraction via parselmouth (Python bindings for Praat).

**File to create:** `services/audio-processor/python/app/analysis/voice_quality.py`

Implement:

- `analyze_voice_quality(audio: np.ndarray, sr: int) -> dict` — using `parselmouth.Sound`, extract:
  - `hnr_db: float | None` — Harmonics-to-Noise Ratio. Use `parselmouth.praat.call` with `"To Harmonicity (cc)"` then `"Get mean"`. Returns None on error.
  - `jitter_local: float | None` — local jitter %. Use `PointProcess` from `Sound` then `"Get jitter (local)"`.
  - `shimmer_local: float | None` — local shimmer %. Use `PointProcess` then `"Get shimmer (local)"`.
  - `cpp_db: float | None` — Cepstral Peak Prominence. Compute via a manual cepstrum approach using `numpy.fft`. If CPP computation raises, return None.
- `score_tone_quality(voice_quality_result: dict) -> float | None` — returns 0–100 composite of HNR and CPP. If both are None, return None. Formula: weight HNR at 60%, CPP at 40%. Normalize HNR: 20+ dB → 100, 0 dB → 0. Normalize CPP: 15+ dB → 100, 0 dB → 0.

**Tests to add:** `services/audio-processor/python/tests/test_voice_quality.py`

- A 2-second pure A4 sine wave → `hnr_db` > 20 (very clean signal)
- Silence (zeros) → no crash; all values None or a graceful low value
- `score_tone_quality({"hnr_db": 20.0, "cpp_db": 15.0})` → 100.0
- `score_tone_quality({"hnr_db": None, "cpp_db": None})` → None

**Acceptance criteria:** All tests pass. No crash on silence or very short clips. parselmouth errors are caught and return None, never propagate.

---

### Task 6 — Multi-Metric Singing Score Aggregator _(amended: R-04)_

**Agent:** Audio Processor (#12)

Wire all individual analysis functions into the master `compute_singing_metrics()` function.

**File to create:** `services/audio-processor/python/app/analysis/singing_metrics.py`

Implement `compute_singing_metrics(audio: np.ndarray, sr: int, target_hz: float, tolerance_cents: float = 25.0) -> dict` that:

1. Calls `check_quality()` — if `is_usable = False`, return immediately with `{"quality_flag": result.quality_flag, "quality_note": result.note, "pitch_accuracy": None, "pitch_stability": None, ...}` (all scores null)
2. Calls `extract_pitch_pyin()`
3. Calls `extract_rms_envelope()`
4. Calls `analyze_voice_quality()` (wrap in try/except — parselmouth must not crash the whole job)
5. Computes `pitch_accuracy` (0–100): percentage of voiced frames where `abs(hz_to_cents(frame_hz, target_hz)) <= tolerance_cents`
6. Computes `pitch_stability` (0–100): `max(0, 100 - std_dev_of_cents_errors_on_voiced_frames)` where std is measured in cents. Cap std at 100 cents → score 0.
7. Computes `breath_control` from `score_breath_control()`
8. Computes `tone_quality` from `score_tone_quality()`
9. Computes `overall_score`: weighted average — `pitch_accuracy * 0.40 + pitch_stability * 0.35 + breath_control * 0.15 + tone_quality * 0.10` (skip null metrics, renormalize weights)
10. Returns the full result dict including `quality_flag`, all individual scores, and `overall_score`

**IMPORTANT — breath control null sentinel [R-04]:**
`breath_control` in the returned dict must be `None` (Python `None`, serializes to JSON `null`) when `score_breath_control()` cannot produce a meaningful score due to insufficient audio length (< 1 second of non-silent frames). Do NOT return `0` to mean "unmeasurable" — `0` means "measured and very poor". The TypeScript `SingingMetricsResult.breathControlScore` is typed `number | null` specifically to distinguish these two cases. Add this check:

```python
if rms_result["duration_seconds"] < 1.0 or rms_result["mean_rms_db"] < -40.0:
    breath_control = None  # insufficient data — not the same as a bad score
else:
    breath_control = score_breath_control(rms_result)
```

**Tests to add:** `services/audio-processor/python/tests/test_singing_metrics.py`

- A 5-second pure A4 sine wave with `target_hz=440.0` → `pitch_accuracy >= 95`, `quality_flag = "ok"`
- A sine wave drifting ±60 cents around A4 → `pitch_stability < 50`
- A clipping signal → `quality_flag = "clipping"`, all scores None
- `overall_score` is always None when `quality_flag != "ok"` and all component scores are None
- A 0.3-second A4 clip → `breath_control` is `None` (not `0`) [R-04]

**Acceptance criteria:** All tests pass. `check_quality()` is always the first call — add an assertion. `breath_control` is `None` (not `0`) when audio is too short to assess. `pnpm typecheck` still passes (no TypeScript touched in this task).

---

### Task 7 — `singing_metrics` Job and TypeScript Contract _(amended: R-02, R-03, R-10)_

**Agent:** Audio Processor (#12) + Domain Contracts (#3)

Wire the analysis module into the RQ job system and add the matching TypeScript contract.

**Step A — TypeScript contract (Agent #3 must do this first):**

In `services/audio-processor/src/index.ts`, add to the `AudioProcessorJobType` union and add these interfaces:

```typescript
export interface SingingMetricsJob {
  jobType: 'singing_metrics';
  jobId: string;
  userId: string; // [R-10] required for audio storage path construction
  exerciseId: string; // [R-10] required to tag result for coaching engine
  audioUrl: string;
  targetHz: number;
  toleranceCents?: number; // default 25
  storeAudio?: boolean; // default false
}

export interface SingingMetricsResult {
  jobId: string;
  userId: string;
  exerciseId: string;
  capturedAt: string;
  /**
   * Five-value enum matching Python quality_gates.py exactly. [R-02]
   * The coaching engine's checkSafetyOverrides() receives this value AFTER
   * normalization in the API handler — see Task 7A. Never pass this raw value
   * directly to checkSafetyOverrides() without normalizing first.
   */
  qualityFlag: 'ok' | 'clipping' | 'too_quiet' | 'too_short' | 'low_voiced_ratio';
  qualityNote?: string;
  pitchAccuracy: number | null;
  pitchStability: number | null;
  breathControl: number | null; // null means unmeasurable, not zero [R-04]
  toneQuality: number | null;
  overallScore: number | null;
  /**
   * onsetScore — NOT onsetAccuracy. [R-03]
   * The Python job returns this field as 'onset_score' (snake_case).
   * The camelCase output must use 'onsetScore'. findWeakestMetric() reads
   * result.metrics.onset which is populated from onsetScore in Task 7A.
   */
  onsetScore: number | null;
  pitchScore: number | null;
  stabilityScore: number | null;
}
```

Run `pnpm typecheck` — must pass before Step B begins.

**Step B — Python job (Agent #12):**

Create `services/audio-processor/python/app/jobs/singing_metrics.py` implementing `run(job_payload: dict) -> dict`:

1. Download audio from `job_payload["audioUrl"]` via `supabase_client.download_file()`
2. Load audio via `audio_io.load_audio()`
3. Call `compute_singing_metrics(audio, sr, target_hz=job_payload["targetHz"], tolerance_cents=job_payload.get("toleranceCents", 25.0))`
4. Return result dict with field names matching `SingingMetricsResult` (camelCase to match TypeScript contract exactly)
   - Python `pitch_stability` → camelCase `pitchStability`
   - Python `onset_score` (if present) → camelCase `onsetScore` [R-03]
   - Python `breath_control` → camelCase `breathControl` (preserves null/None) [R-04]
5. If `job_payload.get("storeAudio") == True`, upload the audio to Supabase Storage under `user-audio/{userId}/attempts/{jobId}.wav`

Register the job in `app/worker.py` queue dispatcher.

**Tests to add:** `services/audio-processor/python/tests/jobs/test_singing_metrics_job.py`

- Mock `supabase_client.download_file()` to return a generated A4 sine WAV
- Call `run({"jobId": "j1", "userId": "u1", "exerciseId": "e1", "audioUrl": "mock://a4", "targetHz": 440.0})`
- Assert `result["pitchAccuracy"] >= 95` and `result["qualityFlag"] == "ok"`
- Assert result contains `"onsetScore"` key (not `"onsetAccuracy"`) [R-03]
- Assert result contains `"userId"` and `"exerciseId"` [R-10]

**Acceptance criteria:**

- TypeScript contract additions in `src/index.ts` with `pnpm typecheck` passing
- Python job returns result with camelCase field names matching TypeScript exactly
- Output key is `onsetScore`, never `onsetAccuracy` [R-03]
- `breathControl` in output is `null` (not `0`) when audio is too short to assess [R-04]
- `storeAudio` defaults to False — no audio written to Supabase unless flag is True

---

### Task 7A — Python Output Normalization Layer _(new: R-01, R-02)_

**Agent:** Backend API and Supabase (#11)

**Why this task exists:** The Python singing_metrics job produces a flat output shape. The coaching engine's `findWeakestMetric()` and `checkSafetyOverrides()` consume a nested shape with a `metrics` dict and a three-value `qualityFlag`. This task implements the normalization transform in the API handler so that neither the Python job nor the coaching engine need to change their internal shapes. See the integration risk brief, Risks R-01 and R-02.

**Dependency:** Task 7 (both steps) must be merged before this task begins.

---

**Step 1 — Create the normalization module**

Create `services/api/src/lib/normalize-singing-metrics.ts`:

```typescript
import type { SingingMetricsResult } from '@voice/shared-types';

/**
 * CoachingQualityFlag — the three-value enum consumed by the coaching engine.
 * This is distinct from SingingMetricsResult.qualityFlag (5-value Python output).
 *
 * Normalization table [R-02]:
 *   'ok'                → 'ok'
 *   'clipping'          → 'unusable'  (garbage data — route to mic check)
 *   'no_voice'          → 'unusable'  (no voice detected)
 *   'too_quiet'         → 'degraded'  (low confidence, still try)
 *   'low_voiced_ratio'  → 'degraded'  (sparse voicing, still try)
 *   'too_short'         → 'unusable'  (can't score at all)
 */
export type CoachingQualityFlag = 'ok' | 'degraded' | 'unusable';

export function normalizeQualityFlag(
  raw: SingingMetricsResult['qualityFlag']
): CoachingQualityFlag {
  switch (raw) {
    case 'ok':
      return 'ok';
    case 'clipping':
      return 'unusable';
    case 'too_quiet':
      return 'degraded';
    case 'low_voiced_ratio':
      return 'degraded';
    case 'too_short':
      return 'unusable';
    default:
      return 'unusable'; // defensive: unknown flags treated as unusable
  }
}

/**
 * NormalizedSingingMetrics — the shape consumed by findWeakestMetric().
 * The metrics dict uses SingingMetricKey values as keys.
 * This is NOT stored in the database — it is a transient in-memory shape
 * produced from SingingMetricsResult for the duration of a single request.
 */
export interface NormalizedSingingMetrics {
  jobId: string;
  userId: string;
  exerciseId: string;
  capturedAt: string;
  qualityFlag: CoachingQualityFlag;
  metrics: {
    pitch: number | null;
    stability: number | null; // from pitchStability [R-01]
    onset: number | null; // from onsetScore     [R-03]
    breathControl: number | null;
    toneQuality: number | null;
  };
  overallScore: number | null;
}

/**
 * normalizePythonOutput — transforms the flat SingingMetricsResult from the
 * job queue into the nested NormalizedSingingMetrics shape for the coaching engine.
 *
 * Call this in the POST /v1/sessions/{sessionId}/attempts handler immediately
 * after retrieving the completed job result, before calling findWeakestMetric().
 */
export function normalizePythonOutput(raw: SingingMetricsResult): NormalizedSingingMetrics {
  return {
    jobId: raw.jobId,
    userId: raw.userId,
    exerciseId: raw.exerciseId,
    capturedAt: raw.capturedAt,
    qualityFlag: normalizeQualityFlag(raw.qualityFlag),
    metrics: {
      pitch: raw.pitchAccuracy,
      stability: raw.pitchStability, // R-01: pitchStability → stability
      onset: raw.onsetScore, // R-03: onsetScore → onset
      breathControl: raw.breathControl, // R-04: preserves null
      toneQuality: raw.toneQuality,
    },
    overallScore: raw.overallScore,
  };
}
```

---

**Step 2 — Wire normalization into the attempts handler**

In `services/api/src/routes/attempts.ts`, find the point where the completed `SingingMetricsResult` from the job queue is passed to the coaching engine. Add:

```typescript
import { normalizePythonOutput } from '../lib/normalize-singing-metrics';

// After retrieving completed job result:
const normalizedMetrics = normalizePythonOutput(singingMetricsResult);

// Pass normalizedMetrics (not raw singingMetricsResult) to findWeakestMetric:
const weaknessReport = findWeakestMetric(
  normalizedMetrics,
  user.singingGoal,
  recentFocusHistory,
  baselineContext ?? null
);
```

Also pass `normalizedMetrics.qualityFlag` (the `CoachingQualityFlag`) to `checkSafetyOverrides()` — not the raw five-value flag from the job result.

---

**Step 3 — Tests**

Create `services/api/src/__tests__/normalize-singing-metrics.test.ts`:

- `normalizeQualityFlag('ok')` → `'ok'`
- `normalizeQualityFlag('clipping')` → `'unusable'` [R-02]
- `normalizeQualityFlag('too_quiet')` → `'degraded'` [R-02]
- `normalizeQualityFlag('low_voiced_ratio')` → `'degraded'` [R-02]
- `normalizeQualityFlag('too_short')` → `'unusable'` [R-02]
- `normalizePythonOutput` maps `pitchStability` → `metrics.stability` [R-01]
- `normalizePythonOutput` maps `onsetScore` → `metrics.onset` [R-03]
- `normalizePythonOutput` preserves `null` for `breathControl` [R-04]
- `normalizedMetrics.metrics.stability` is defined (not `undefined`) when `pitchStability` is present [R-01]

**Acceptance criteria:**

- All normalization tests pass
- `checkSafetyOverrides()` in the attempts handler always receives a `CoachingQualityFlag` (three-value), never the raw five-value Python flag
- `findWeakestMetric()` in the attempts handler always receives `normalizedMetrics` with a populated `metrics` dict, never the raw flat result
- `pnpm typecheck` passes

---

### Task 8 — Render Blueprint Additions (audio processor services)

**Agent:** Infrastructure and Render (#15)

Update `render.yaml` to add the two audio processor Render services. Read the existing `render.yaml` carefully before editing — do not duplicate existing service definitions or env var blocks.

Add under `services:`:

```yaml
- type: web
  name: voice-audio-processor
  runtime: docker
  dockerfilePath: services/audio-processor/python/Dockerfile
  dockerContext: services/audio-processor/python
  plan: starter
  healthCheckPath: /healthz
  envVars:
    - key: REDIS_URL
      fromService:
        type: redis
        name: voice-redis
        property: connectionString
    - key: SUPABASE_URL
      sync: false
    - key: SUPABASE_SERVICE_ROLE_KEY
      sync: false
    - key: AUDIO_STORAGE_OPT_IN_DEFAULT
      value: 'false'
    - key: LOG_LEVEL
      value: 'info'

- type: worker
  name: voice-audio-worker
  runtime: docker
  dockerfilePath: services/audio-processor/python/Dockerfile
  dockerContext: services/audio-processor/python
  startCommand: python -m app.worker
  plan: starter
  envVars:
    - key: REDIS_URL
      fromService:
        type: redis
        name: voice-redis
        property: connectionString
    - key: SUPABASE_URL
      sync: false
    - key: SUPABASE_SERVICE_ROLE_KEY
      sync: false
    - key: AUDIO_STORAGE_OPT_IN_DEFAULT
      value: 'false'
    - key: WORKER_CONCURRENCY
      value: '1'
```

Also create `services/audio-processor/python/Dockerfile` with:

- `FROM python:3.11-slim` (not 3.12 — wheel availability issues)
- Install system deps: `libsndfile1`, `ffmpeg`
- Copy `requirements.txt`, run `pip install`
- Model pre-warm: add a `RUN python -c "import whisper; whisper.load_model('base')"` step (this runs at build time, not startup, keeping cold-starts fast)
- `CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8001"]`

**Acceptance criteria:**

- `render blueprint validate render.yaml` passes (or equivalent schema check)
- Dockerfile builds locally: `docker build -t voice-audio-processor services/audio-processor/python/`
- The existing Render services (`voice-api`, `voice-redis`, etc.) are unchanged
- The `--filter` flag constraint from the Render postmortem is preserved in any `pnpm install` commands used in the Node service build steps

---

## BUILD 0.2.1 — Voice Quality Extensions

_(MILESTONES.md: "Parselmouth added to services/audio-processor Python dependencies")_

Task 5 above already implements parselmouth as part of Build 0.2. Tasks 9–10 cover the additional Supabase surfacing and coaching integration.

---

### Task 9 — Surface Voice Quality Signals in Coaching Templates _(amended: R-11)_

**Agent:** Coaching Rules and Avatar Behavior (#8)

Read `packages/coaching-rules/src/index.ts` to understand the current state. The existing implementation has one function: `mapSustainedNoteScoreToCoaching()`.

**Step 1 — Refactor existing file:**
Move the body of `mapSustainedNoteScoreToCoaching()` out of `src/index.ts` and into a new file `src/map-sustained-note.ts`. Re-export it from `src/index.ts`. This is a pure refactor — no logic changes. Run existing tests to confirm non-regression.

**Step 2 — Add metric weight table [R-11]:**
Create `packages/coaching-rules/src/metric-weights.ts` with the `GOAL_METRIC_WEIGHTS` table exactly as specified in the adaptive coaching engine spec §5. This is a pure data file — no functions, no imports from other new modules.

**IMPORTANT — vibrato goal annotation [R-11]:** The `'vibrato'` goal in `GOAL_METRIC_WEIGHTS` maps to `toneQuality` and `stability` as proxy metrics. This is intentional — no `SingingMetricKey` named `'vibrato'` exists in the current Python audio processor output. Add this comment above the vibrato entry:

```typescript
// 'vibrato' goal uses proxy metrics (toneQuality, stability) because the Python
// audio processor does not yet emit a direct vibrato metric key. When Task 22
// (vibrato detection) is implemented and a 'vibrato' SingingMetricKey is added
// to SingingMetricKey, update this mapping to use it directly. [R-11]
vibrato: {
  primary: 'toneQuality',
  secondary: 'stability',
  // ...rest of entry per spec
},
```

**Step 3 — Add template fallback system:**
Create `packages/coaching-rules/src/template-fallback.ts` implementing `buildTemplateFallback(req: LLMCoachingRequest): LLMCoachingResponse`. This must cover all 11 `SingingMetricKey` values × 4 `SuccessBand` values (44 combinations total). Full template content is in the adaptive coaching engine spec §8. No LLM dependency — this file must be importable without `openai` installed.

**Step 4 — Add safety overrides:**
Create `packages/coaching-rules/src/safety-overrides.ts` implementing `checkSafetyOverrides()` as specified in the adaptive coaching engine spec §9.

The `qualityFlag` parameter of `checkSafetyOverrides()` must accept `CoachingQualityFlag` (the three-value type from `services/api/src/lib/normalize-singing-metrics.ts`), not the raw five-value `SingingMetricsResult['qualityFlag']`. Add the type import or re-export `CoachingQualityFlag` from `@voice/shared-types` so the coaching-rules package does not need a direct import from the API service. The check `qualityFlag === 'unusable'` will now fire correctly for both `'clipping'` and `'no_voice'` Python outputs (they are both normalized to `'unusable'` before reaching this function).

No LLM dependency.

**Step 5 — Update index:**
Update `packages/coaching-rules/src/index.ts` to re-export all four new modules (existing + 3 new files).

**Shared types required** (coordinate with Agent #3 before starting):
Add to `packages/shared-types/src/index.ts`:

- `SingingMetricKey` union type (11 values)
- `LLMCoachingRequest` interface
- `LLMCoachingResponse` interface
- `DifficultyLevel` type (1|2|3|4|5)
- `MetricWeaknessReport` interface (without `baselineDelta`/`baselineDrivenSelection` yet — those come in Task 20)
- `AdaptiveCoachingResult` interface
- `NextExerciseConfig` interface
- `SessionPerformanceHistory` interface
- `DifficultyConfig` interface
- `CoachingQualityFlag` type: `'ok' | 'degraded' | 'unusable'` (re-export or define here so coaching-rules can import it without depending on the API service)

Run `pnpm typecheck` after each step. All steps must pass before moving on.

**Tests to add:** `packages/coaching-rules/src/__tests__/template-fallback.test.ts`

- `buildTemplateFallback` returns a valid `LLMCoachingResponse` for every combination of the 11 metric keys × 4 success bands (44 `it()` blocks or a parameterized loop)
- No returned `correctionMessage` contains more than one sentence (count periods)
- No returned text contains prohibited terms: `failed`, `wrong`, `bad`, `incorrect`, `terrible`, `awful`, `hopeless`, `diagnose`, `injury`, `damage`, `nodule`, `polyp`, `medical`
- `checkSafetyOverrides` returns `triggered: true` when `qualityFlag === 'unusable'`
- `checkSafetyOverrides` returns `triggered: true` when `strainRiskFlagged === true`

**Acceptance criteria:**

- `pnpm test --filter @voice/coaching-rules` passes
- `pnpm typecheck` passes across all 18 workspace projects
- No `openai` import anywhere in this task's new files
- `GOAL_METRIC_WEIGHTS.vibrato` has the R-11 proxy comment
- `checkSafetyOverrides` accepts `CoachingQualityFlag`, not the raw five-value Python flag

---

## BUILD 0.3 — Singing Tier MVP

_(MILESTONES.md: "Baseline assessment", "Adaptive Coaching Engine", "Onboarding with goal selection")_

From here forward the tasks interleave all three specs. The order respects dependency: shared types first → Python jobs → API/DB → mobile screens → coaching engine wiring.

---

### Task 10 — Shared Type Additions for Baseline Assessment _(amended: R-07)_

**Agent:** Domain Contracts (#3)

This task must complete before Tasks 11, 14, and 15 can begin. Read `packages/shared-types/src/index.ts` first to avoid duplicating existing types.

**IMPORTANT — Before adding any types:** Task 0 marked `BaselineSnapshot` as `@deprecated`. In this task, you must complete the migration [R-07]:

1. Find every consumer of `BaselineSnapshot` listed in the deprecation comment added by Task 0.
2. For each consumer, update the import to use `UserBaselineSnapshot` (defined below) instead.
3. Delete the old `BaselineSnapshot` interface.
4. If the old `VocalRangeSnapshot` included `recommendedStartingKeyMidi` and `recommendedStartingKeyName` fields, remove them from `VocalRangeSnapshot` — those fields belong on `UserBaselineSnapshot` (see below).
5. Run `pnpm typecheck`. Fix all resulting type errors before proceeding.

Add to `packages/shared-types/src/index.ts` (append after all existing types):

```typescript
export type VoiceType = 'soprano' | 'mezzo' | 'alto' | 'tenor' | 'baritone' | 'bass';

export interface VocalRangeSnapshot {
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
  voiceType: VoiceType;
  // Note: recommendedStartingKeyMidi/Name are on UserBaselineSnapshot, not here [R-07]
}

export interface BaselineMetricGrades {
  pitchAccuracy: number | null;
  pitchStability: number | null;
  breathControl: number | null; // null = unmeasurable (not the same as 0 = poor) [R-04]
  toneQuality: number | null;
  hnrDb: number | null;
  cppDb: number | null;
  jitterLocal: number | null;
  shimmerLocal: number | null;
}

export interface UserBaselineSnapshot {
  snapshotId: string;
  userId: string;
  capturedAt: string;
  tier: Tier;
  vocalRange: VocalRangeSnapshot;
  metrics: BaselineMetricGrades;
  recommendedStartingKeyMidi: number;
  recommendedStartingKeyName: string;
  audioProcessorJobId: string;
  qualityFlag: 'ok' | 'degraded';
}

export interface BaselineWithDeltas {
  snapshot: UserBaselineSnapshot;
  deltas: Partial<Record<keyof BaselineMetricGrades, number | null>>;
  sessionsSinceBaseline: number;
  rangeExpandedSemitones: number | null;
}

export interface BaselineContext {
  snapshotId: string;
  metrics: BaselineMetricGrades;
  recommendedStartingKeyMidi: number;
  voiceType: VoiceType;
  capturedAt: string;
}
```

Also add to the `AudioProcessorJobType` union and `AudioProcessorJob` union in `services/audio-processor/src/index.ts`:

```typescript
export interface BaselineAssessmentJob {
  jobType: 'baseline_assessment';
  jobId: string;
  userId: string;
  rangeTestAudioUrl: string;
  sustainedHoldAudioUrl: string;
  /**
   * Set to sustainedHoldAudioUrl by the API handler — no distinct free-vocal
   * recording exists in the current mobile baseline flow. [R-06]
   */
  freeVocalAudioUrl: string;
  /**
   * Required — segment_range_walk() cannot operate without this. [R-05]
   */
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
  voiceType: string;
  baselineMetrics: BaselineMetricGrades;
  recommendedStartingKeyMidi: number;
  recommendedStartingKeyName: string;
  qualityFlag: 'ok' | 'degraded';
  completedAt: string;
}
```

Run `pnpm typecheck` — must pass before any downstream task starts.

**Acceptance criteria:**

- `pnpm typecheck` passes across all 18 workspace projects
- `BaselineSnapshot` is removed (no longer exported from shared-types)
- No remaining imports of `BaselineSnapshot` anywhere in the codebase
- `VocalRangeSnapshot` does NOT contain `recommendedStartingKeyMidi` or `recommendedStartingKeyName`
- `BaselineAssessmentJob` appears in the `AudioProcessorJob` union and includes `noteSchedule`
- `BaselineMetricGrades.breathControl` is `number | null`

---

### Task 11 — Baseline Exercise Definitions

**Agent:** Curriculum and Content (#7)

Read `packages/content-schema/src/index.ts` to understand the existing `ExerciseDefinition` schema shape. Then add two exercise definitions to the exercise catalog:

1. `baselineRangeWalkExercise` (exerciseId: `baseline-range-walk-v1`) — full definition per the baseline assessment spec §4.1
2. `baselineSustainedHoldExercise` (exerciseId: `baseline-sustain-hold-v1`) — full definition per the baseline assessment spec §4.2

Key fields to include for both:

- `isBaselineExercise: true` in `evaluationConfig`
- `requiresServerSideAnalysis: true`
- `activeFlag: true`

Export both from `packages/content-schema/src/index.ts` so they are importable by the API route handlers.

Run `pnpm typecheck`. If `ExerciseDefinition` schema validation enforces strict scoring weights summing to 1.0, confirm the baseline exercises satisfy this — the range walk uses `rangeSpan: 1.0` and the sustained hold uses `pitchAccuracy: 0.35, stability: 0.45, breathControl: 0.20`.

**Acceptance criteria:**

- `pnpm typecheck` passes
- Both exercises are exported and importable as `import { baselineRangeWalkExercise } from '@voice/content-schema'`
- Exercise IDs are versioned (`-v1` suffix) and immutable

---

### Task 12 — Vocal Range Walker (Python)

**Agent:** Audio Processor (#12)

Implement the range walker analysis module. This is the core computation for baseline assessment — it determines the user's vocal range from the systematic note-by-note recording.

**File to create:** `services/audio-processor/python/app/analysis/range_walker.py`

Implement:

- `detect_vocal_range(pitch_frames_per_note: dict) -> dict` — input is `{midi_note: [frame_dicts]}` from `segment_range_walk()`. For each MIDI note, compute the median confidence across voiced frames. A note "counts" as achievable if confidence >= 0.6 and voiced frame ratio >= 0.5 for at least `sustainFramesRequired=8` frames. Walk from center outward; stop in each direction after 3 consecutive failures (`exitOnConsecutiveMisses=3`). Return:
  - `lowest_note_midi`, `highest_note_midi`
  - `lowest_note_name`, `highest_note_name` (use standard MIDI-to-note-name conversion)
  - `lowest_hz`, `highest_hz`
  - `comfortable_low_midi`, `comfortable_high_midi` (notes with confidence > 0.75)
  - `semitone_span`, `comfortable_semitone_span`
  - `voice_type` (classified via standard voice type ranges: soprano C4–C6, mezzo A3–A5, alto F3–F5, tenor C3–C5, baritone G2–G4, bass E2–E4)

- `_estimate_voice_type(low_midi: int, high_midi: int) -> str` — returns the best matching voice type string

**File to create:** `services/audio-processor/python/app/jobs/baseline_assessment.py`

Implement `run(job_payload: dict) -> dict` and two helpers:

- `segment_range_walk(audio: np.ndarray, sr: int, note_schedule: list) -> dict` — slices the continuous range walk recording by the `noteSchedule` timestamp map, runs `extract_pitch_pyin()` on each segment, returns `{midi_note: pitch_frames_list}`
- `snap_to_exercise_key(midi: int) -> int` — snaps the comfortable range midpoint to the nearest A note (MIDI values 21, 33, 45, 57, 69, 81). Safety check: if the snapped A note falls outside `[comfortable_low_midi, comfortable_high_midi]`, return `comfortable_low_midi + (comfortable_semitone_span // 2)` instead.

The `run()` function must:

1. Download both audio files
2. Run quality check on each
3. Call `segment_range_walk()` then `detect_vocal_range()`
4. Call `compute_singing_metrics()` on the sustained hold audio
5. Call `snap_to_exercise_key()` to determine `recommendedStartingKeyMidi`
6. Write result to `user_baseline_snapshot` in Supabase (update the `pending` row to `complete`)
7. Return `BaselineAssessmentResult` dict with camelCase fields matching the TypeScript contract

**Tests to add:** `services/audio-processor/python/tests/test_range_walker.py`

- Mock pitch frames where MIDI 60–72 all have confidence > 0.75 → `voice_type = "soprano"`, `comfortable_semitone_span = 12`
- Mock pitch frames where MIDI 43–55 all have confidence > 0.75 → `voice_type = "baritone"`
- 3 consecutive misses stops the walk in the correct direction
- `snap_to_exercise_key(52)` → `45` (A2, closest A note to E3)
- `snap_to_exercise_key(100)` outside comfortable range → returns center of comfortable range instead

`services/audio-processor/python/tests/jobs/test_baseline_assessment_job.py` — 3 tests per the baseline assessment spec §12 Phase 2.

**Acceptance criteria:**

- `detect_vocal_range` returns correct voice type for soprano (C4–G5) and baritone (G2–D4) fixture data
- `snap_to_exercise_key` never returns a note outside the user's comfortable range
- All tests pass
- `run()` does not call the real Supabase API in tests — mock `supabase_client`

---

### Task 13 — Supabase Schema: Baseline Snapshot Table

**Agent:** Backend API and Supabase (#11) + Security, Privacy, and Compliance (#18)

Create and apply the Supabase migration for baseline assessment persistence.

**Migration file:** `supabase/migrations/<timestamp>_baseline_assessment.sql`

Create:

```sql
CREATE TABLE user_baseline_snapshot (
  snapshot_id                 UUID PRIMARY KEY,
  user_id                     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  audio_processor_job_id      TEXT NOT NULL,
  status                      TEXT NOT NULL DEFAULT 'pending',
  tier                        TEXT NOT NULL DEFAULT 'singing',
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
  voice_type                  TEXT,
  baseline_pitch_accuracy     REAL,
  baseline_pitch_stability    REAL,
  baseline_breath_control     REAL,   -- NULL means unmeasurable, not zero [R-04]
  baseline_tone_quality       REAL,
  baseline_hnr_db             REAL,
  baseline_cpp_db             REAL,
  baseline_jitter_local       REAL,
  baseline_shimmer_local      REAL,
  recommended_key_midi        SMALLINT,
  recommended_key_name        TEXT,
  quality_flag                TEXT DEFAULT 'ok',
  quality_note                TEXT,
  result_json                 JSONB,
  vocal_range_json            JSONB,
  metrics_json                JSONB,
  audio_deleted_at            TIMESTAMPTZ,
  captured_at                 TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at                TIMESTAMPTZ,
  CONSTRAINT user_baseline_snapshot_unique_user_tier UNIQUE (user_id, tier)
);

CREATE INDEX user_baseline_snapshot_user_tier
  ON user_baseline_snapshot (user_id, tier, completed_at DESC);

ALTER TABLE user_baseline_snapshot ENABLE ROW LEVEL SECURITY;

CREATE POLICY "baseline_select_own"
  ON user_baseline_snapshot FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "baseline_insert_service"
  ON user_baseline_snapshot FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "baseline_update_service_role"
  ON user_baseline_snapshot FOR UPDATE USING (true) WITH CHECK (true);

CREATE VIEW baseline_context_view AS
SELECT
  s.user_id, s.snapshot_id, s.tier,
  s.baseline_pitch_accuracy, s.baseline_pitch_stability,
  s.baseline_breath_control, s.baseline_tone_quality,
  s.recommended_key_midi, s.recommended_key_name,
  s.voice_type, s.comfortable_low_midi, s.comfortable_high_midi,
  s.semitone_span, s.captured_at
FROM user_baseline_snapshot s
WHERE s.status = 'complete'
ORDER BY s.completed_at DESC;
```

Also add to the existing user_profiles table (or users table):

```sql
ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS baseline_snapshot_id UUID REFERENCES user_baseline_snapshot(snapshot_id),
  ADD COLUMN IF NOT EXISTS baseline_completed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS recommended_starting_key_midi SMALLINT,
  ADD COLUMN IF NOT EXISTS voice_type TEXT;
```

**Acceptance criteria:**

- Migration applies cleanly on a fresh Supabase instance
- RLS: authenticated user can insert their own row but cannot SELECT or UPDATE another user's row
- Service role key can UPDATE (for Python worker write-back)
- `baseline_context_view` returns rows only where `status = 'complete'`

---

### Task 14 — API Routes: Baseline Assessment Endpoints

**Agent:** Backend API and Supabase (#11)

Add four route handlers to `services/api/src/`. Read `services/api/src/index.ts` to understand the existing Fastify setup before adding routes.

Create `services/api/src/routes/assessments.ts` with:

**`POST /v1/assessments/baseline`**

- Requires auth (JWT)
- Validates request body: `rangeTestAudioUrl: string`, `sustainedHoldAudioUrl: string`, `noteSchedule: Array<{midiNote, noteName, timestampMs, holdDurationMs}>`
- Checks for existing `pending` or `complete` snapshot for this user+tier — if `complete` exists, still allows re-assessment (insert new row)
- Generates `jobId = crypto.randomUUID()`
- Pushes `BaselineAssessmentJob` payload to Redis queue `baseline_assessment`
  - Set `freeVocalAudioUrl: body.sustainedHoldAudioUrl` (proxy — see R-06 comment in `BaselineAssessmentJob`)
- Inserts `pending` row into `user_baseline_snapshot` with `snapshot_id = jobId`
- Returns `{ jobId, estimatedCompletionMs: 15000 }`

**`GET /v1/assessments/baseline/:jobId`**

- Requires auth
- Fetches `user_baseline_snapshot WHERE snapshot_id = :jobId AND user_id = auth.uid()`
- Returns `{ status: 'pending' }` if row status is pending/processing
- Returns `{ status: 'complete', snapshot: UserBaselineSnapshot }` if complete
- Returns `{ status: 'failed', reason: string }` if failed
- Returns 404 if jobId not found for this user

**`POST /v1/assessments/baseline/complete`**

- Requires auth
- Validates: `{ snapshotId: string }`
- Confirms snapshot exists and belongs to user
- Calls `buildXpEvents` from `@voice/reward-engine` with `source: 'assessment_complete'`
- Returns `{ xpAwarded: 5, badgesUnlocked: ['first_note'], userProfile: UpdatedProfile }`

**`GET /v1/users/me/baseline/context`**

- Requires auth
- Queries `baseline_context_view WHERE user_id = auth.uid() LIMIT 1`
- Returns `{ context: BaselineContext | null }`

Register all four routes in the main Fastify app.

**Acceptance criteria:**

- `POST /v1/assessments/baseline` returns `jobId` and creates a `pending` DB row
- `GET /v1/assessments/baseline/:jobId` returns 404 when jobId belongs to a different user (RLS check)
- `GET /v1/users/me/baseline/context` returns `{ context: null }` before assessment is complete, not an error

---

### Task 15 — Mobile: Baseline Assessment Screens

**Agent:** Mobile App (#10)

Read `apps/mobile/App.tsx` to understand the existing navigation shell. Then add the five baseline assessment screens, a Zustand store slice, and wire them into the navigation stack.

**Create Zustand store slice:** `apps/mobile/src/store/baselineAssessmentStore.ts`
Fields: `phase`, `rangeWalkAudioUri`, `sustainedHoldAudioUri`, `jobId`, `result`, `error`; setters for each; `reset()`

**Create screens (each as a separate file):**

`apps/mobile/src/screens/baseline/BaselineAssessIntro.tsx`

- Avatar in INTRO state
- Three dialogue lines cycling (per spec §5.1) then "Ready — Let's Go" CTA
- Use `navigation.replace('BaselineAssessIntro')` — not push — so back gesture cannot return to MicCheck

`apps/mobile/src/screens/baseline/BaselineRangeWalk.tsx`

- Start continuous audio recording via `expo-av` `Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY)`
- Build the note schedule using `buildNoteSchedule(centerMidi=57)` (see spec §5.2 for full implementation)
- Drive note playback via `playReferenceTone(hz, durationMs)` — pre-generate or load short sine WAVs for C2–C6 (48 notes); do not attempt runtime synthesis
- Show current note name (small, secondary) and a progress dot track
- Show a live pitch bar that confirms microphone is active (not a cents-error meter)
- Record as one continuous file; pass both the URI and the `noteSchedule` array to the next screen
- Add a "Done Early" button that stops recording and proceeds with collected data

`apps/mobile/src/screens/baseline/BaselineSustainedHold.tsx`

- Play reference tone at A3 (220Hz) for 1.5 seconds before recording starts
- Record 8 seconds with a countdown progress bar
- Avatar in LISTENING state; no dialogue during recording
- On completion navigate to `BaselineProcessing` with both audio URIs and the note schedule

`apps/mobile/src/screens/baseline/BaselineProcessing.tsx`

- Upload both audio files to Supabase Storage (signed upload URL from API or direct client SDK upload)
- `POST /v1/assessments/baseline` with the note schedule
- Poll `GET /v1/assessments/baseline/:jobId` every 2 seconds, max 30 attempts (60s)
- While waiting: avatar in ANALYZING state, cycling subtitle lines: "Getting a feel for your voice...", "Looking at your range...", "Noting how you hold a note...", "Almost there."
- On success: `navigation.replace('FirstWin', { snapshot })`
- On timeout or error: `navigation.replace('FirstWin', { snapshot: null, error: true })`

`apps/mobile/src/screens/baseline/FirstWin.tsx`

- If `snapshot` is null: show fallback copy "We'll calibrate your starting point as you practice — let's jump in." and use `pitchAccuracy` as default first focus metric
- If `snapshot` exists: show voice type label (`VoiceType`), comfortable range (note names), and initial focus metric (lowest-scoring non-null metric from `snapshot.metrics`)
- Show `BadgeUnlockModal` for `first_note` badge
- Show +5 XP animation
- Call `POST /v1/assessments/baseline/complete` with `snapshotId`
- CTA: "Let's Practice" → navigate to main session flow

Wire all five screens into the onboarding navigation stack in `App.tsx` after `MicCheck` and before the main tab navigator.

**Acceptance criteria:**

- Completing `BaselineRangeWalk` produces a non-empty note schedule array and a non-null audio URI
- `BaselineProcessing` navigates to `FirstWin` within 60 seconds or shows error fallback — never a blank screen
- Back gesture from `BaselineAssessIntro` returns to `MicCheck`, not a dead stack
- `FirstWin` renders without crash when `snapshot` is null
- `first_note` badge modal fires on `FirstWin`

---

### Task 16 — Coaching Engine: Tier 1 and Tier 2 (No LLM)

**Agent:** Coaching Rules and Avatar Behavior (#8)

This task builds the metric weakness finder and difficulty adaptor. No LLM dependency anywhere in this task.

**Create `packages/coaching-rules/src/metric-weakness-finder.ts`** implementing:

- `rankMetricsByWeakness(result, goal, recentFocusHistory, baseline?)` — full implementation per spec §5
- `findWeakestMetric(result, goal, recentFocusHistory, baseline?)` — returns `MetricWeaknessReport`; throws on `qualityFlag: 'unusable'`

Note: the `result` parameter is typed as `NormalizedSingingMetrics` (from Task 7A), not `SingingMetricsResult`. Import `NormalizedSingingMetrics` from `@voice/shared-types` (or re-export it there). The `qualityFlag` check `=== 'unusable'` is now guaranteed to fire correctly because the normalization layer in Task 7A maps all Python quality values to the three-value enum before reaching this function.

**Create `packages/coaching-rules/src/difficulty-adaptor.ts`** implementing:

- `SUSTAINED_HOLD_DIFFICULTY_PARAMS` table (5 difficulty levels → exercise parameters)
- `adaptDifficulty(currentDifficulty, history, weaknessReport, exerciseCategory)` → `DifficultyConfig`
- Returns sentinel `nextExerciseId: '__resolve_from_curriculum__'` for non-sustained-hold categories

**Update `packages/coaching-rules/src/index.ts`** to re-export both new modules.

**Tests to add:**
`packages/coaching-rules/src/__tests__/metric-weakness-finder.test.ts` — all 6 test cases from spec §5 plus 3 baseline-null-safety tests from baseline spec §12 Phase 4
`packages/coaching-rules/src/__tests__/difficulty-adaptor.test.ts` — all 9 test cases from spec §6

**Acceptance criteria:**

- `pnpm test --filter @voice/coaching-rules` passes
- `findWeakestMetric` throws when `qualityFlag === 'unusable'`
- Difficulty advances after 2 consecutive good attempts
- Difficulty regresses after any retry; regresses by 2 after 3+ consecutive retries
- Difficulty is always clamped to [1, 5]
- No `openai` import anywhere in this task

---

### Task 17 — Coaching Engine: Supabase Schema and API Wiring _(amended: R-08, R-09)_

**Agent:** Backend API and Supabase (#11)

Add the coaching history table and wire the coaching engine output into the attempt submission response.

**Migration:** `supabase/migrations/<timestamp>_coaching_history.sql`

```sql
CREATE TABLE coaching_history (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id           UUID NOT NULL REFERENCES attempts(attempt_id) ON DELETE CASCADE,
  user_id              UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  exercise_id          TEXT NOT NULL,
  session_id           UUID NOT NULL,
  focus_metric         TEXT NOT NULL,
  focus_score          SMALLINT NOT NULL,
  overall_score        SMALLINT NOT NULL,
  success_band         TEXT NOT NULL,
  difficulty_level     SMALLINT NOT NULL,
  next_difficulty      SMALLINT NOT NULL,
  adaptation_signal    TEXT NOT NULL,
  coaching_generated_by TEXT NOT NULL,
  praise_message       TEXT,
  correction_message   TEXT,
  action_tip           TEXT,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX coaching_history_user_exercise ON coaching_history (user_id, exercise_id, created_at DESC);
CREATE INDEX coaching_history_user_session  ON coaching_history (user_id, session_id);

ALTER TABLE coaching_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "coaching_history_select_own" ON coaching_history FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "coaching_history_insert_service" ON coaching_history FOR INSERT WITH CHECK (auth.uid() = user_id);
```

Also add columns to `attempts`:

```sql
ALTER TABLE attempts
  ADD COLUMN IF NOT EXISTS focus_metric TEXT,
  ADD COLUMN IF NOT EXISTS difficulty_level SMALLINT,
  ADD COLUMN IF NOT EXISTS strain_risk_flagged BOOLEAN DEFAULT FALSE;
```

**Add `user_exercise_state` table [R-09]:**

```sql
-- Persists the current active difficulty level per user per exercise.
-- Without this table, difficulty resets to 1 on every session (R-09).
CREATE TABLE user_exercise_state (
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  exercise_id   TEXT NOT NULL,
  current_difficulty SMALLINT NOT NULL DEFAULT 1 CHECK (current_difficulty BETWEEN 1 AND 5),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, exercise_id)
);

ALTER TABLE user_exercise_state ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_exercise_state_own" ON user_exercise_state
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
```

**Add `session_performance_view` [R-08]:**

The view must be implemented as follows. Note the column naming carefully:

```sql
CREATE VIEW session_performance_view AS
SELECT
  ch.user_id,
  ch.exercise_id,
  ch.session_id,
  -- total_good_or_excellent counts ALL good/excellent attempts across the session (not a streak)
  -- The API handler computes the true consecutive streak from recent_attempts_json [R-08]
  SUM(CASE WHEN ch.success_band IN ('good','excellent') THEN 1 ELSE 0 END)
    AS total_good_or_excellent,
  SUM(CASE WHEN ch.success_band = 'retry' THEN 1 ELSE 0 END)
    AS total_retry,
  COUNT(*) AS total_attempts,
  -- recent_attempts_json: ordered array for streak computation in the API handler
  JSON_AGG(
    JSON_BUILD_OBJECT(
      'successBand', ch.success_band,
      'createdAt', ch.created_at,
      'difficultyLevel', ch.difficulty_level
    ) ORDER BY ch.created_at DESC
  ) AS recent_attempts_json
FROM coaching_history ch
GROUP BY ch.user_id, ch.exercise_id, ch.session_id;
```

**Update `POST /v1/sessions/{sessionId}/attempts` handler** to:

1. Fetch `BaselineContext` from `baseline_context_view` for this user
2. Fetch `SessionPerformanceHistory` from the `session_performance_view`
3. **Read current difficulty from `user_exercise_state` [R-09]** — do NOT rely solely on `currentDifficulty` from the request body:
   ```typescript
   const { data: exerciseState } = await supabase
     .from('user_exercise_state')
     .select('current_difficulty')
     .eq('user_id', userId)
     .eq('exercise_id', exerciseId)
     .maybeSingle();
   const currentDifficulty = exerciseState?.current_difficulty ?? req.body.currentDifficulty ?? 1;
   ```
4. **Compute true consecutive streak [R-08]** from `recent_attempts_json` before calling `adaptDifficulty()`:
   ```typescript
   function computeConsecutiveGoodOrExcellent(
     recentAttempts: Array<{ successBand: string }>
   ): number {
     let streak = 0;
     for (const attempt of recentAttempts) {
       // already ordered DESC (newest first)
       if (attempt.successBand === 'good' || attempt.successBand === 'excellent') {
         streak++;
       } else {
         break; // stop at first non-good attempt
       }
     }
     return streak;
   }
   ```
   Pass `consecutiveGoodOrExcellent` (streak) to `adaptDifficulty()` — not `total_good_or_excellent` from the view.
5. Call `findWeakestMetric(normalizedMetrics, ...)` (uses output from Task 7A normalization)
6. Call `adaptDifficulty(currentDifficulty, history, weaknessReport, exercise.category)`
7. **Persist new difficulty back to `user_exercise_state` [R-09]:**
   ```typescript
   await supabase.from('user_exercise_state').upsert(
     {
       user_id: userId,
       exercise_id: exerciseId,
       current_difficulty: difficultyConfig.nextDifficulty,
       updated_at: new Date().toISOString(),
     },
     { onConflict: 'user_id,exercise_id' }
   );
   ```
8. Resolve `'__resolve_from_curriculum__'` sentinel via `selectNextExercise()` from `@voice/curriculum`
9. Call `buildTemplateFallback(llmReq)` as the coaching payload (LLM is not wired yet — template only in this task)
10. Insert row into `coaching_history`
11. Return `weaknessReport`, `nextExercise`, `coachingPayload`, `coachingGeneratedBy: 'template'` in the response body

**Add `GET /v1/users/me/coaching-history` route** returning the last 10 coaching history entries for the user.

**Acceptance criteria:**

- `POST /v1/sessions/{sessionId}/attempts` returns `weaknessReport` and `nextExercise` when `singingMetrics` is provided
- `coaching_history` row is inserted on every attempt that produces a weakness report
- `findWeakestMetric` throwing on unusable audio is caught at the route level and returns a `safetyOverride` response instead of a 500
- `current_difficulty` is read from `user_exercise_state` first; request body is a fallback only [R-09]
- After each attempt, `user_exercise_state` is upserted with the new `nextDifficulty` [R-09]
- `adaptDifficulty()` receives the true consecutive streak (from `computeConsecutiveGoodOrExcellent()`), not the SQL total count [R-08]
- RLS: user A cannot read user B's coaching history

---

### Task 17A — User Exercise State: Difficulty Persistence _(new: R-09)_

**Agent:** Backend API and Supabase (#11)

**Why this task exists:** The `user_exercise_state` table created in Task 17 needs one additional route and two integration tests to confirm difficulty is correctly persisted and retrieved across sessions. Without this, the table could be written but never read (R-09 regression risk).

**Dependency:** Task 17 must be merged.

---

**Step 1 — Add `GET /v1/users/me/exercise-state/:exerciseId` route**

```typescript
// Returns the current stored difficulty and last-updated timestamp for a given exercise.
// Used by the mobile app on session start to display the correct difficulty level.
GET /v1/users/me/exercise-state/:exerciseId
→ { exerciseId, currentDifficulty: number, updatedAt: string } | { exerciseId, currentDifficulty: 1, updatedAt: null }
```

Returns difficulty `1` (default) if no row exists for this user+exercise — never 404.

---

**Step 2 — Integration tests**

Add to `services/api/src/__tests__/exercise-state.test.ts`:

**Test A — Difficulty persists across attempts:**

1. Create test user and exercise
2. `POST /v1/sessions/{s}/attempts` with a result that produces `nextDifficulty: 2`
3. `GET /v1/users/me/exercise-state/{exerciseId}` → assert `currentDifficulty === 2`
4. `POST /v1/sessions/{s}/attempts` again with a result that produces `nextDifficulty: 3`
5. `GET /v1/users/me/exercise-state/{exerciseId}` → assert `currentDifficulty === 3`

**Test B — Missing `currentDifficulty` in request body uses persisted value:**

1. Seed `user_exercise_state` with `current_difficulty = 3` for test user+exercise
2. `POST /v1/sessions/{s}/attempts` with NO `currentDifficulty` in request body
3. Assert the coaching engine received `currentDifficulty = 3` (not `1`)
4. Assert `adaptDifficulty` was called with `3`, not `1`

**Acceptance criteria:**

- Both integration tests pass
- `GET /v1/users/me/exercise-state/:exerciseId` returns `{ currentDifficulty: 1 }` for unknown exercise (not 404)
- Difficulty value in DB matches what the adaptor returned, not what the client sent

---

### Task 18 — Coaching Engine: LLM Tier 3

**Agent:** Coaching Rules and Avatar Behavior (#8)

This task adds the LLM layer. The template fallback from Task 9 remains the safety net — the LLM is an optional enhancement that fails silently.

**Prerequisite:** `OPENAI_API_KEY` must be added to `render.yaml` with `sync: false` and to `.env.example` with a placeholder value.

**Create `packages/coaching-rules/src/prompt-builder.ts`** implementing:

- `COACHING_SYSTEM_PROMPT` — the invariant system prompt (full content in spec §7)
- `SESSION_INTRO_SYSTEM_PROMPT` — for session-opening dialogue (spec §12)
- `buildUserMessage(req: LLMCoachingRequest): string` — per-attempt data message

**Create `packages/coaching-rules/src/llm-coaching-orchestrator.ts`** implementing:

- `orchestrateCoaching(req: LLMCoachingRequest): Promise<AdaptiveCoachingResult>`
- 4-second timeout race using `Promise.race()`
- `validateLLMResponse()` — enforces all 5 rules (prohibited terms, length bounds, max one sentence in `correctionMessage`, no fabricated numbers, valid `avatarMood` value)
- Falls back to `buildTemplateFallback()` on any failure (timeout, parse error, validation failure)
- `generatedBy: 'llm'` or `generatedBy: 'template'` in all responses

Add to `packages/coaching-rules/package.json`: `"openai": "^4.52.7"`

**Update `packages/coaching-rules/src/index.ts`** to export both new modules.

**IMPORTANT — build-time guard:** Add `paths` exclusion in `apps/mobile/tsconfig.json` to prevent `llm-coaching-orchestrator` from being importable in the mobile app. The mobile app must never call the LLM directly.

**Tests:**

`packages/coaching-rules/src/__tests__/prompt-builder.test.ts`:

- `buildUserMessage` includes `focusMetric` name in output
- `buildUserMessage` includes `overallScore` in output
- `buildUserMessage` includes `adaptationReason` in output

`packages/coaching-rules/src/__tests__/llm-coaching-orchestrator.test.ts`:
Mock `openai` at module level (never call real API in CI):

```typescript
jest.mock('openai', () => ({
  default: jest.fn().mockImplementation(() => ({
    chat: { completions: { create: jest.fn() } },
  })),
}));
```

- Returns valid `LLMCoachingResponse` with `generatedBy: 'llm'` when mock returns valid JSON
- Returns `generatedBy: 'template'` when mock returns JSON containing prohibited term `"failed"`
- Returns `generatedBy: 'template'` when mock returns JSON with `praiseMessage` exceeding 100 chars
- Returns `generatedBy: 'template'` when mock resolves after 4001ms (simulate timeout)
- Returns `generatedBy: 'template'` when mock rejects (network error)

**Update `POST /v1/sessions/{sessionId}/attempts`** to call `orchestrateCoaching()` instead of `buildTemplateFallback()` directly. Add Redis rate-limiting: one LLM call per `(userId, attemptId)` tuple. Add session-level cap: max 10 LLM calls per session.

**Add `POST /v1/sessions/{sessionId}/coaching-context` route** for session-opening avatar dialogue.

**Add `COACHING_LLM_ENABLED` env var to `render.yaml`** defaulting to `"true"`. When `false`, `orchestrateCoaching` must return template fallback without making any OpenAI API calls.

**Acceptance criteria:**

- `COACHING_LLM_ENABLED=false` returns `generatedBy: 'template'` without any OpenAI call
- Validator rejects prohibited terms and falls back to template
- Validator rejects field length violations and falls back to template
- 4-second timeout returns template, not an error
- CI never incurs OpenAI costs (mock is in place)
- `apps/mobile` cannot import `llm-coaching-orchestrator`

---

### Task 19 — Coaching Engine: Baseline Delta Signal Integration

**Agent:** Coaching Rules and Avatar Behavior (#8)

Wire the baseline context into `findWeakestMetric()` so that regression from baseline boosts a metric's coaching priority.

**Update `packages/coaching-rules/src/metric-weakness-finder.ts`:**

- Add optional `baseline?: BaselineContext | null` parameter to both `findWeakestMetric` and `rankMetricsByWeakness`
- In `rankMetricsByWeakness`: add delta modifier logic — if `score - baselineScore < -10` → add +20 to `adjustedWeakness`; if `score - baselineScore > 10` → subtract 10
- Add `getBaselineScore(baseline, metric): number | null` helper mapping `SingingMetricKey` → `BaselineMetricGrades` key

**Update `MetricWeaknessReport` type in `packages/shared-types/src/index.ts`:**
Add two fields:

```typescript
baselineDelta?: number | null;      // score minus baseline; negative = regressing
baselineDrivenSelection: boolean;   // true if delta modifier was the deciding factor
```

**Update `packages/coaching-rules/src/prompt-builder.ts`:**
Add baseline delta note to the `buildUserMessage` output when `req.weaknessReport.baselineDelta` is present (per spec §10, last code block).

**Update `POST /v1/sessions/{sessionId}/attempts` handler:**
Fetch `BaselineContext` from `baseline_context_view` and pass it as the fourth argument to `findWeakestMetric()`.

**Tests to add** (`metric-weakness-finder.test.ts` additions):

- Regressing metric (score 65, baseline 70) gets higher priority than weak-but-stable metric (score 55, baseline 50) — see exact test case in baseline assessment spec §12 Phase 4
- `rankMetricsByWeakness` does not throw when `baseline` is null
- `rankMetricsByWeakness` does not throw when baseline metrics are all null

**Acceptance criteria:**

- `pnpm test --filter @voice/coaching-rules` passes including new tests
- `MetricWeaknessReport.baselineDrivenSelection` is `true` when the delta modifier changed the winner
- `pnpm typecheck` passes across all projects

---

## BUILD 1.0 — Production Hardening

_(MILESTONES.md: "Privacy, consent, and data-retention flows audited end-to-end")_

---

### Task 20 — Data Retention Cron: Baseline Audio Deletion

**Agent:** Backend API and Supabase (#11) + Security, Privacy, and Compliance (#18)

Extend the existing `voice-data-retention-cron` service to delete baseline audio files after 30 days.

The cron job must:

1. Query `user_baseline_snapshot WHERE audio_deleted_at IS NULL AND completed_at < NOW() - INTERVAL '30 days' AND status = 'complete'`
2. For each row, delete from Supabase Storage:
   - `user-audio/{userId}/baseline/range-walk-{snapshotId}.wav`
   - `user-audio/{userId}/baseline/sustained-hold-{snapshotId}.wav`
3. Set `audio_deleted_at = NOW()` on the row
4. Log: number of files deleted, number of errors

This job must be idempotent — running it twice on the same rows must not error.

The snapshot record and metric columns (`baseline_pitch_accuracy`, etc.) are retained indefinitely — only the raw audio files are deleted.

**Acceptance criteria:**

- Cron queries only `completed` rows with `audio_deleted_at IS NULL`
- After the job runs, `audio_deleted_at` is populated on processed rows
- Re-running on already-processed rows does not error (Storage 404 on already-deleted file is handled gracefully)
- Raw metric scores in `user_baseline_snapshot` are untouched

---

### Task 21 — Source Separation: HTDemucs (Phase 3 prep)

**Agent:** Audio Processor (#12)

_(MILESTONES.md Phase 3: "Karaoke Mode — Demucs")_

This task is gated behind Build 1.0 being stable. Do not start until Task 20 is merged.

Implement Demucs vocal separation as a Python module and RQ job.

**File to create:** `services/audio-processor/python/app/separation/demucs_runner.py`

Implement `separate_vocals(audio_path: str, output_dir: str) -> dict`:

- Run `demucs --two-stems vocals --out {output_dir} {audio_path}` via `subprocess.run()` with `check=True`
- Return `{"vocals_path": str, "no_vocals_path": str, "duration_seconds": float}`
- Use `--two-stems vocals` (not 4-stem) for efficiency — produces only `vocals.wav` and `no_vocals.wav`

Update `Dockerfile` to add Demucs model pre-warm during build (run at build time, not per-job startup):

```dockerfile
RUN python -c "import demucs; from demucs.pretrained import get_model; get_model('htdemucs')"
```

**File to create:** `services/audio-processor/python/app/jobs/vocal_separation.py`

- `run(job_payload)` — downloads audio, runs `separate_vocals()`, uploads stems to Supabase Storage, returns stem URLs

**Tests:**

- `test_demucs_runner.py` — mock `subprocess.run()` to return exit code 0 and create dummy output files; assert return dict has correct keys
- Integration note: a real end-to-end demucs test on CI would take too long and consume too much memory on the Starter plan. Mark the subprocess-mock test as the only required test.

**Acceptance criteria:**

- `separate_vocals()` uses `--two-stems vocals` flag
- One model instance per worker process (load at module import, not inside `run()`)
- Stems are not written to the repo — only to Supabase Storage or a temp directory
- Real demucs test is excluded from CI (`@pytest.mark.slow` skip tag)

---

### Task 22 — DTW Karaoke Comparison and Vibrato Detection (Phase 3 prep)

**Agent:** Audio Processor (#12)

_(MILESTONES.md Phase 3: "Demucs, DTW, snippet flow")_

Gate: Task 21 merged.

**File to create:** `services/audio-processor/python/app/analysis/dtw.py`

Implement `compare_pitch_curves(user_frames: list, reference_frames: list) -> dict`:

- Extract Hz values from voiced frames only
- Run DTW via `fastdtw.fastdtw()` with Euclidean distance
- Normalize distance to a 0–100 score: distance 0 → 100, distance ≥ 500 cents → 0
- Return `{"dtw_score": float, "dtw_distance": float, "voiced_overlap_ratio": float}`

**File to create:** `services/audio-processor/python/app/analysis/vibrato.py`

Implement `detect_vibrato(pitch_frames: list) -> dict`:

- Extract cents deviations from voiced frames
- Run FFT on the cents series to find dominant oscillation frequency
- Vibrato is present if dominant frequency is in [4.5, 7.5] Hz and amplitude ≥ 30 cents
- Return `{"has_vibrato": bool, "rate_hz": float | None, "extent_cents": float | None, "regularity_score": float | None}`

**IMPORTANT — update `GOAL_METRIC_WEIGHTS` after this task [R-11]:**
After this task is merged, the `'vibrato'` key in `GOAL_METRIC_WEIGHTS` (Task 9) should be updated to use a direct `'vibrato'` metric key if one is added to `SingingMetricKey`. See the proxy comment added in Task 9 for the exact location. If vibrato detection output is added to `compute_singing_metrics()` as a `SingingMetricKey`, open a follow-up task to update the weights table and remove the proxy mapping.

**Tests:**

- `test_dtw.py`: Identical pitch curves → `dtw_score ≥ 99`. Completely inverted curves → `dtw_score ≤ 20`. Empty input → returns `dtw_score: 0`, no crash.
- `test_vibrato.py`: Synthetic 6Hz oscillation at ±50 cents → `has_vibrato = True`, `rate_hz ≈ 6.0`. Straight flat pitch series → `has_vibrato = False`.

**Wire up jobs:**
`app/jobs/karaoke_compare.py` — `run()` calls `compare_pitch_curves()` and `detect_vibrato()`
`app/jobs/filler_detection.py` — Whisper-based filler detection (full implementation in audio processor spec §18)

**Acceptance criteria:**

- Identical curves → DTW score ≥ 99
- 6Hz synthetic vibrato → `has_vibrato = True`
- All tests pass, no external API calls

---

### Task 23 — CREPE and Formant Analysis (Phase 3 / Style Packs)

**Agent:** Audio Processor (#12)

_(MILESTONES.md Phase 3: "Style packs for Singing Tier")_

Gate: Task 22 merged.

**Update `services/audio-processor/python/app/analysis/pitch.py`** to add:

- `extract_pitch_crepe(audio: np.ndarray, sr: int, model: str = 'tiny') -> dict` — calls `crepe.predict()`, returns same shape as `extract_pitch_pyin()`. Note: CREPE is a PyTorch model — must be loaded as a singleton at worker startup, not per-call.

**Create `services/audio-processor/python/app/analysis/formants.py`**:

- `extract_formants(audio: np.ndarray, sr: int) -> dict` — uses parselmouth to extract F1, F2, F3 for each frame. Returns `{"f1_hz": list[float | None], "f2_hz": list[float | None], "f3_hz": list[float | None], "times": list[float]}`.

**Update `compute_singing_metrics()`** in `singing_metrics.py` to accept an optional `include_formants: bool = False` and `use_crepe: bool = False`. When enabled, call the respective modules and include results in the output dict.

**Tests:**

- `extract_pitch_crepe` on a 2-second A4 sine → median frequency within ±10Hz of 440Hz
- `extract_formants` on a vowel-like sine wave → F1 in a plausible range (> 100Hz, < 1500Hz)
- `compute_singing_metrics(audio, sr, 440.0, include_formants=True)` → result dict contains `f1_hz` key

**Acceptance criteria:**

- CREPE model is loaded once at module import (singleton), not per-call
- `use_crepe=False` and `include_formants=False` are the defaults — existing behavior is unchanged
- All tests pass

---

## Reference: Task Dependency Order

```
Task 0  → ALL other tasks (schema alignment pre-req)

Task 1  → Task 2 → Task 3 → Task 4 → Task 5 → Task 6 → Task 7
Task 7  → Task 7A
Task 7A → Task 8 (can run in parallel with Task 9)
Task 9  → Task 16

Task 10 → Task 11 (can run in parallel)
Task 10 → Task 12
Task 10 → Task 13
Task 10 → Task 14
Tasks 12 + 13 + 14 → Task 15
Tasks 15 + 16 → Task 17
Task 17 → Task 17A
Task 17A → Task 18
Task 18 → Task 19

Task 19 → Task 20 (can run in parallel with Tasks 21+)
Task 20 → [done: Build 1.0 hardening complete]

Task 7  → Task 21
Task 21 → Task 22
Task 22 → Task 23
```

## Parallelizable Pairs

The following task pairs have no dependency on each other and can run in separate Jules sessions simultaneously:

- **Task 0** must complete before all others — run it first, alone
- **Tasks 1–7** (Python service) run fully independently of **Task 9** (TypeScript coaching scaffold) until Task 17 wires them together
- **Task 7A** (normalization layer) can run in parallel with **Task 9** (coaching scaffold) since neither depends on the other
- **Task 10** (shared types) unblocks **Tasks 11, 12, 13, 14** — all four can run in parallel after Task 10 completes
- **Task 20** (data retention) can run in parallel with **Tasks 21–23** (Phase 3 prep) once Build 1.0 is stable

## Risk Mitigations: Cross-Reference

| Risk                                           | Fixed in                                                             | Type               |
| ---------------------------------------------- | -------------------------------------------------------------------- | ------------------ |
| R-01 `SingingMetricsResult` shape mismatch     | Task 0 (type), Task 7A (transform)                                   | New task           |
| R-02 `qualityFlag` enum incompatibility        | Task 0 (type), Task 7 (amended), Task 7A (normalize)                 | New task + amended |
| R-03 `onsetAccuracy` vs `onsetScore` rename    | Task 0 (type), Task 7 (amended)                                      | Amended            |
| R-04 `breathControl` null sentinel             | Task 0 (type), Task 6 (amended), Task 7 (amended), Task 10 (amended) | Amended            |
| R-05 `noteSchedule` missing from job contract  | Task 0 (type), Task 10 (confirmed)                                   | Amended            |
| R-06 `freeVocalAudioUrl` proxy undocumented    | Task 0 (comment), Task 10 (comment), Task 14 (comment)               | Documented         |
| R-07 `BaselineSnapshot` deprecation            | Task 0 (deprecate), Task 10 (remove + migrate)                       | Amended            |
| R-08 SQL count vs consecutive streak           | Task 17 (amended — view + streak function)                           | Amended            |
| R-09 `currentDifficulty` no persistent storage | Task 17 (amended — table), Task 17A (new — tests)                    | New task + amended |
| R-10 `userId`/`exerciseId` in job payload      | Task 7 (already in Step A)                                           | Confirmed          |
| R-11 `vibrato` goal proxy undocumented         | Task 9 (amended — comment), Task 22 (follow-up note)                 | Amended            |
