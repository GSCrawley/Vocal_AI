# VOICE — Python Audio Processor Service: Technical Spec

**Handoff document for Jules (Audio Processor Agent, `agents.md` §12)**  
**Repo:** `GSCrawley/Vocal_AI`  
**Target path:** `services/audio-processor/python/`  
**Status of existing TypeScript contract:** Complete and authoritative — do not modify `services/audio-processor/src/index.ts` without coordinating with the Domain Contracts Agent.

---

## 1. Context and Constraints

### What this service is

The audio processor is a private Python/FastAPI service that performs all heavy server-side audio computation for VOICE. It is separate from the Node.js/Fastify API (`services/api`), communicates over Redis job queues, and is never exposed directly to mobile clients. The Node API enqueues jobs; this service dequeues, processes, and writes results back to Supabase Storage and/or responds via result callbacks.

### What it is not

- Not a real-time service. All jobs are async. The mobile client polls for results via the Node API.
- Not a public API. The service is `internal`-type on Render (see `render.yaml`), accessible only within the Render private network.
- Not a catalog server. It does not store or cache copyrighted audio. Every separated stem is either ephemeral (user-upload sessions) or stored in the authenticated Supabase bucket with per-user RLS, never publicly accessible.

### Architectural rules from `agents.md` and `docs/architecture/`

1. **TypeScript job contracts are the authority.** All job input/output shapes are defined in `services/audio-processor/src/index.ts`. The Python service must match them exactly. Any shape change requires updating both files together.
2. **Audio is stored only with consent.** `AUDIO_STORAGE_OPT_IN_DEFAULT=false` in `render.yaml`. The service must never persist user audio without a confirmed opt-in flag on the job.
3. **Truthful, bounded feedback.** If signal quality is poor (clipping, extreme noise floor, insufficient voiced frames), return a degraded result with a `quality_flag` rather than fabricating a score.
4. **No stem distribution.** Separated stems go to Supabase Storage with signed URLs scoped to the requesting user. Do not return raw audio bytes in job results.

---

## 2. Directory Layout

Create the following structure inside the existing `services/audio-processor/` directory. The TypeScript files already present must not be moved.

```
services/audio-processor/
├── src/                          # Existing TypeScript job contracts — DO NOT MODIFY
│   └── index.ts
├── python/                       # New — everything below is net-new work
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py               # FastAPI app factory + /healthz
│   │   ├── config.py             # Environment variable loading (pydantic-settings)
│   │   ├── worker.py             # Redis Queue worker entrypoint
│   │   ├── jobs/
│   │   │   ├── __init__.py
│   │   │   ├── vocal_separation.py
│   │   │   ├── vocal_analysis.py
│   │   │   ├── singing_metrics.py      # Full 11-metric analysis
│   │   │   ├── filler_detection.py
│   │   │   ├── karaoke_compare.py
│   │   │   └── baseline_assessment.py  # New: onboarding vocal profile
│   │   ├── analysis/
│   │   │   ├── __init__.py
│   │   │   ├── pitch.py          # pYIN + CREPE wrappers
│   │   │   ├── voice_quality.py  # HNR, CPP, jitter, shimmer via parselmouth
│   │   │   ├── formants.py       # F1/F2/F3 via parselmouth
│   │   │   ├── rms.py            # RMS envelope + dynamics scoring
│   │   │   ├── vibrato.py        # FFT on pitch curve
│   │   │   ├── dtw.py            # DTW comparison for karaoke
│   │   │   └── range_walker.py   # Systematic vocal range detection
│   │   ├── separation/
│   │   │   ├── __init__.py
│   │   │   └── demucs_runner.py  # HTDemucs wrapper
│   │   ├── storage/
│   │   │   ├── __init__.py
│   │   │   └── supabase_client.py # Upload/download helpers
│   │   └── utils/
│   │       ├── __init__.py
│   │       ├── audio_io.py       # Load/resample/validate audio
│   │       └── quality_gates.py  # SNR, clipping, voiced-frame checks
│   ├── tests/
│   │   ├── fixtures/             # Reference WAV files for deterministic tests
│   │   ├── test_pitch.py
│   │   ├── test_voice_quality.py
│   │   ├── test_dtw.py
│   │   ├── test_separation.py
│   │   └── test_baseline.py
│   ├── Dockerfile
│   ├── requirements.txt
│   ├── requirements-dev.txt
│   └── README.md
└── package.json                  # Existing — DO NOT MODIFY
```

---

## 3. Environment and Dependencies

### Python version

**Python 3.11.** Do not use 3.12+ — PyTorch wheel availability for 3.12 on `linux/amd64` is inconsistent across the Render build environment.

### `requirements.txt` — production

```
# Web framework
fastapi==0.115.6
uvicorn[standard]==0.32.1
pydantic==2.10.4
pydantic-settings==2.7.0

# Job queue
rq==2.3.3
redis==5.2.1

# Audio I/O
soundfile==0.12.1
librosa==0.10.2.post1
numpy==1.26.4
scipy==1.14.1

# Pitch extraction
# pYIN is implemented in librosa.pyin — no separate install needed
# CREPE requires tensorflow or torch backend:
crepe==0.0.16
torch==2.5.1           # CPU-only build for Render Starter; swap for cu121 on GPU plan
torchaudio==2.5.1

# Voice quality analysis
praat-parselmouth==0.4.5

# Source separation
demucs==4.0.1          # Pulls torch as dependency — pin version to match above

# Speech recognition (filler detection)
openai-whisper==20240930

# DTW
fastdtw==0.3.4         # Faster than librosa's native dtw for long sequences

# Supabase
supabase==2.11.0
httpx==0.28.1

# Observability
sentry-sdk[fastapi]==2.19.2
```

### `requirements-dev.txt`

```
pytest==8.3.4
pytest-asyncio==0.25.0
pytest-cov==6.0.0
httpx==0.28.1   # for TestClient
```

### Render service plan

- **Build 0.1 / Phase 1:** `starter` plan (512 MB RAM, CPU only). Sufficient for pYIN, parselmouth, Whisper-tiny. HTDemucs on CPU at this tier takes ~4–8 minutes for a 3.5-minute song — acceptable for async processing.
- **Phase 2 (karaoke launch):** Upgrade to `standard-plus` or GPU-enabled plan. HTDemucs `htdemucs_ft` on a single T4 GPU reduces that to ~30 seconds.
- The `render.yaml` already defines `voice-audio-processor` and `voice-audio-worker` as separate Render services. The worker process is separate from the FastAPI process (see §5).

---

## 4. Configuration (`app/config.py`)

```python
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # Infrastructure
    redis_url: str                          # from render.yaml REDIS_URL
    supabase_url: str
    supabase_service_role_key: str          # Service role — never the anon key
    supabase_storage_bucket_audio: str = "user-audio"
    supabase_storage_bucket_karaoke: str = "karaoke-assets"
    internal_service_token: str             # Shared secret with voice-api

    # Feature flags (mirror render.yaml)
    feature_karaoke_mode: bool = False

    # Model config
    demucs_model: str = "htdemucs"         # "htdemucs_ft" for higher quality on GPU
    whisper_model: str = "tiny"             # tiny=39MB; "base" for better accuracy
    crepe_model: str = "tiny"               # tiny=6MB; "full" for higher accuracy
    use_crepe: bool = False                 # pYIN by default; CREPE opt-in per job

    # Quality gates
    min_voiced_frame_ratio: float = 0.3    # Abort scoring if < 30% frames are voiced
    max_rms_db_clipping: float = -0.5      # Above this = clipping
    min_rms_db_signal: float = -50.0       # Below this = too quiet

    # Processing
    sample_rate: int = 44100
    hop_length: int = 512                   # ~11.6ms at 44100Hz
    frame_length: int = 2048
    pyin_fmin: float = 65.0                # C2 — below comfortable bass range
    pyin_fmax: float = 1047.0             # C6 — above comfortable soprano range

settings = Settings()
```

---

## 5. Service Architecture: FastAPI + RQ Worker

The service runs as **two separate Render processes** — matching the `render.yaml` blueprint which defines `voice-audio-processor` (web) and `voice-audio-worker` (worker):

```
[voice-api (Node/Fastify)]
       │  enqueue job via Redis LPUSH
       ▼
[voice-redis (Redis)]
       │  BRPOP
       ▼
[voice-audio-worker (RQ worker)]
       │  executes job function
       │  writes results → Supabase Storage
       │  writes job result → Redis hash
       ▼
[voice-api (polling)] ← GET /v1/jobs/{jobId}/status
```

### FastAPI process (`voice-audio-processor`)

Minimal HTTP surface — only used for health checks and internal status queries.

```python
# app/main.py
from fastapi import FastAPI, Header, HTTPException
from app.config import settings
import redis

app = FastAPI(title="voice-audio-processor", version="0.1.0")
redis_client = redis.from_url(settings.redis_url)

@app.get("/healthz")
def health():
    try:
        redis_client.ping()
        return {"ok": True}
    except Exception:
        return {"ok": False, "error": "redis_unreachable"}, 503

@app.get("/jobs/{job_id}/status")
def job_status(job_id: str, x_internal_token: str = Header(None)):
    if x_internal_token != settings.internal_service_token:
        raise HTTPException(status_code=403)
    result = redis_client.hgetall(f"job:{job_id}")
    if not result:
        raise HTTPException(status_code=404)
    return {k.decode(): v.decode() for k, v in result.items()}
```

### RQ Worker process (`voice-audio-worker`)

```python
# app/worker.py
import redis
from rq import Worker, Queue
from app.config import settings

redis_conn = redis.from_url(settings.redis_url)
queues = [
    Queue("vocal_separation", connection=redis_conn),
    Queue("vocal_analysis",   connection=redis_conn),
    Queue("singing_metrics",  connection=redis_conn),
    Queue("filler_detection", connection=redis_conn),
    Queue("karaoke_compare",  connection=redis_conn),
    Queue("baseline_assessment", connection=redis_conn),
]

if __name__ == "__main__":
    worker = Worker(queues, connection=redis_conn)
    worker.work()
```

**Render start commands:**

- `voice-audio-processor`: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
- `voice-audio-worker`: `python -m app.worker`

---

## 6. Audio I/O Utilities (`app/utils/audio_io.py`)

All job functions call `load_audio()` first. It handles format normalization, resampling, duration limits, and Supabase download.

```python
import librosa
import numpy as np
import soundfile as sf
import io
from app.config import settings
from app.storage.supabase_client import download_file

MAX_DURATION_SECONDS = 600  # 10 minutes hard cap

def load_audio(
    url: str,
    sr: int = None,
    mono: bool = True,
    max_duration: float = MAX_DURATION_SECONDS,
) -> tuple[np.ndarray, int]:
    """
    Download audio from a Supabase signed URL and return (samples, sample_rate).
    Resamples to `sr` if provided. Forces mono if mono=True.
    Raises ValueError if duration exceeds max_duration.
    """
    sr = sr or settings.sample_rate
    audio_bytes = download_file(url)
    y, original_sr = sf.read(io.BytesIO(audio_bytes), always_2d=False)

    if len(y) / original_sr > max_duration:
        raise ValueError(f"Audio exceeds maximum duration of {max_duration}s")

    if mono and y.ndim > 1:
        y = y.mean(axis=1)

    if original_sr != sr:
        y = librosa.resample(y, orig_sr=original_sr, target_sr=sr)

    return y.astype(np.float32), sr

def audio_to_wav_bytes(y: np.ndarray, sr: int) -> bytes:
    buf = io.BytesIO()
    sf.write(buf, y, sr, format="WAV", subtype="PCM_16")
    buf.seek(0)
    return buf.read()
```

---

## 7. Quality Gates (`app/utils/quality_gates.py`)

Every scoring job must pass through quality gates before computing metrics. Return a `QualityReport`; callers check `is_usable` before proceeding.

```python
import numpy as np
import librosa
from dataclasses import dataclass
from typing import Optional
from app.config import settings

@dataclass
class QualityReport:
    is_usable: bool
    rms_db: float
    voiced_frame_ratio: float
    clipping_detected: bool
    failure_reason: Optional[str] = None  # matches TypeScript MicCheckResult reason

def check_quality(y: np.ndarray, sr: int, pitch_voiced: np.ndarray) -> QualityReport:
    """
    y: audio samples
    pitch_voiced: boolean array of voiced frames from pYIN
    Returns QualityReport. is_usable=False means do not score.
    """
    rms = librosa.feature.rms(y=y, frame_length=settings.frame_length,
                               hop_length=settings.hop_length)[0]
    rms_db = float(librosa.amplitude_to_db(rms).mean())
    peak = float(np.abs(y).max())
    clipping = peak >= 0.99

    voiced_ratio = float(pitch_voiced.mean()) if len(pitch_voiced) > 0 else 0.0

    if clipping:
        return QualityReport(False, rms_db, voiced_ratio, True, "clipping")
    if rms_db < settings.min_rms_db_signal:
        return QualityReport(False, rms_db, voiced_ratio, False, "too_quiet")
    if voiced_ratio < settings.min_voiced_frame_ratio:
        return QualityReport(False, rms_db, voiced_ratio, False, "no_voice")

    return QualityReport(True, rms_db, voiced_ratio, False)
```

---

## 8. Pitch Extraction (`app/analysis/pitch.py`)

### pYIN (primary)

pYIN is the default algorithm. It is implemented in `librosa.pyin` and produces probabilistic voiced/unvoiced decisions alongside F0 estimates. Use this for all exercise scoring in Phase 1.

```python
import librosa
import numpy as np
from app.config import settings

def extract_pitch_pyin(
    y: np.ndarray,
    sr: int,
    fmin: float = None,
    fmax: float = None,
) -> dict:
    """
    Returns:
        f0: np.ndarray of shape (n_frames,) — Hz, NaN where unvoiced
        voiced_flag: np.ndarray of shape (n_frames,) — bool
        voiced_prob: np.ndarray of shape (n_frames,) — 0.0–1.0
        times_ms: np.ndarray — timestamp of each frame in milliseconds
    """
    fmin = fmin or settings.pyin_fmin
    fmax = fmax or settings.pyin_fmax

    f0, voiced_flag, voiced_prob = librosa.pyin(
        y,
        fmin=fmin,
        fmax=fmax,
        sr=sr,
        hop_length=settings.hop_length,
        frame_length=settings.frame_length,
        fill_na=np.nan,
    )

    times_ms = (librosa.frames_to_time(
        np.arange(len(f0)), sr=sr, hop_length=settings.hop_length
    ) * 1000).astype(np.float32)

    return {
        "f0": f0,
        "voiced_flag": voiced_flag,
        "voiced_prob": voiced_prob,
        "times_ms": times_ms,
    }
```

### CREPE (opt-in, higher accuracy)

CREPE uses a CNN trained on 6,000+ hours of audio and outperforms pYIN in noisy conditions and at the passaggio. It is slower (~3–5× on CPU) and should be opt-in per job via `use_crepe: true` in the job payload.

```python
import crepe
import numpy as np

def extract_pitch_crepe(
    y: np.ndarray,
    sr: int,
    model_capacity: str = "tiny",  # "tiny" | "small" | "medium" | "large" | "full"
    viterbi: bool = True,          # Viterbi smoothing recommended
) -> dict:
    """
    Returns same shape as extract_pitch_pyin.
    CREPE confidence maps to voiced_prob directly.
    voiced_flag = confidence > 0.5
    """
    times_s, f0, confidence, activation = crepe.predict(
        y, sr,
        model_capacity=model_capacity,
        viterbi=viterbi,
        center=True,
        step_size=int(settings.hop_length / sr * 1000),  # ms
    )

    voiced_flag = confidence > 0.5
    times_ms = (times_s * 1000).astype(np.float32)
    f0 = np.where(voiced_flag, f0, np.nan).astype(np.float32)

    return {
        "f0": f0,
        "voiced_flag": voiced_flag,
        "voiced_prob": confidence,
        "times_ms": times_ms,
    }
```

### Pitch result serialization (to match TypeScript `LivePitchFrame[]`)

```python
def pitch_to_frames(pitch_result: dict) -> list[dict]:
    """
    Convert raw pitch arrays to the LivePitchFrame[] contract shape
    expected by the TypeScript coaching packages.
    """
    frames = []
    for i, (hz, voiced, prob, ts) in enumerate(zip(
        pitch_result["f0"],
        pitch_result["voiced_flag"],
        pitch_result["voiced_prob"],
        pitch_result["times_ms"],
    )):
        frames.append({
            "timestampMs": float(ts),
            "frequencyHz": float(hz) if voiced and not np.isnan(hz) else None,
            "voiced": bool(voiced),
            "confidence": float(prob),
        })
    return frames
```

### Key conversion (for cents math — mirrors TypeScript `audio-metrics`)

```python
def hz_to_cents(frequency_hz: float, reference_hz: float) -> float:
    if frequency_hz <= 0 or reference_hz <= 0:
        return 0.0
    return 1200.0 * np.log2(frequency_hz / reference_hz)

def hz_to_note_name(frequency_hz: float) -> str:
    """Return e.g. 'A4', 'C#3', 'Bb5'."""
    note_num = round(69 + 12 * np.log2(frequency_hz / 440.0))
    notes = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"]
    octave = (note_num // 12) - 1
    return f"{notes[note_num % 12]}{octave}"
```

---

## 9. Voice Quality Analysis (`app/analysis/voice_quality.py`)

Uses `parselmouth` — a Python wrapper around the Praat phonetics engine. This is the standard clinical tool for HNR, CPP, jitter, and shimmer. Do not use librosa for these metrics; parselmouth extracts them more accurately from the pitch period structure.

```python
import parselmouth
import numpy as np
import io
import soundfile as sf

def analyze_voice_quality(y: np.ndarray, sr: int) -> dict:
    """
    Returns:
        hnr_db: Harmonics-to-Noise Ratio (dB). Higher = cleaner phonation.
                Typical speech: 7–20 dB. Trained singers sustained: 20+ dB.
        cpp_db: Cepstral Peak Prominence (dB). Proxy for voice quality and breathiness.
                High CPP = clear phonation; low CPP = breathy or dysphonic.
        jitter_local: Cycle-to-cycle variation in F0 period (%).
                      Normal: < 1.04%. Elevated = unstable phonation.
        shimmer_local: Cycle-to-cycle variation in amplitude (%).
                       Normal: < 3.81%. Elevated = unstable amplitude control.
        jitter_ppq5: 5-point Period Perturbation Quotient (stricter jitter measure)
        shimmer_apq11: 11-point Amplitude Perturbation Quotient (stricter shimmer)
    """
    # Write to a temp WAV buffer for parselmouth
    buf = io.BytesIO()
    sf.write(buf, y, sr, format="WAV")
    buf.seek(0)
    sound = parselmouth.Sound(buf.read())

    # HNR
    harmonicity = sound.to_harmonicity_cc(
        time_step=0.01,
        minimum_pitch=65.0,
        silence_threshold=0.1,
        periods_per_window=1.0,
    )
    hnr_values = harmonicity.values[harmonicity.values != -200]  # -200 = unvoiced sentinel
    hnr_db = float(hnr_values.mean()) if len(hnr_values) > 0 else 0.0

    # Jitter and shimmer via PointProcess
    pitch = sound.to_pitch(time_step=0.0, pitch_floor=65.0, pitch_ceiling=1047.0)
    point_process = parselmouth.praat.call(
        [sound, pitch], "To PointProcess (cc)"
    )

    jitter_local = parselmouth.praat.call(
        point_process, "Get jitter (local)", 0, 0, 0.0001, 0.02, 1.3
    )
    jitter_ppq5 = parselmouth.praat.call(
        point_process, "Get jitter (ppq5)", 0, 0, 0.0001, 0.02, 1.3
    )
    shimmer_local = parselmouth.praat.call(
        [sound, point_process], "Get shimmer (local)", 0, 0, 0.0001, 0.02, 1.3, 1.6
    )
    shimmer_apq11 = parselmouth.praat.call(
        [sound, point_process], "Get shimmer (apq11)", 0, 0, 0.0001, 0.02, 1.3, 1.6
    )

    # CPP — Cepstral Peak Prominence
    # Computed via LTAS + liftering approach (approximated via parselmouth)
    cpp_db = _compute_cpp(sound)

    return {
        "hnr_db": hnr_db,
        "cpp_db": cpp_db,
        "jitter_local": jitter_local,
        "jitter_ppq5": jitter_ppq5,
        "shimmer_local": shimmer_local,
        "shimmer_apq11": shimmer_apq11,
    }

def _compute_cpp(sound: parselmouth.Sound) -> float:
    """
    Approximate CPP using Praat's cepstrum analysis.
    CPP is the amplitude of the cepstral peak relative to the regression line.
    """
    try:
        cepstrogram = parselmouth.praat.call(
            sound, "To PowerCepstrogram", 60.0, 0.002, 5000.0, 50.0
        )
        cpps = parselmouth.praat.call(
            cepstrogram, "Get CPPS", True, 0.02, 0.0005, 60.0, 330.0,
            0.05, "Parabolic", 0.001, 0.05, "Exponential decay", "Robust"
        )
        return float(cpps)
    except Exception:
        return 0.0

def score_tone_quality(vq: dict) -> float:
    """
    Map voice quality metrics to a 0–100 score.
    HNR is the primary driver (higher = better).
    Jitter and shimmer penalize the score.

    Reference ranges:
    - HNR: < 7 dB poor, 7–15 mediocre, 15–20 good, > 20 excellent
    - Jitter: > 2.0% poor, 1.0–2.0% fair, < 1.0% good
    - Shimmer: > 5.0% poor, 3.0–5.0% fair, < 3.0% good
    """
    # HNR component (0–60 points)
    hnr = vq["hnr_db"]
    if hnr >= 20:
        hnr_score = 60.0
    elif hnr >= 15:
        hnr_score = 45.0 + (hnr - 15) * 3.0
    elif hnr >= 7:
        hnr_score = 15.0 + (hnr - 7) * 3.75
    else:
        hnr_score = max(0.0, hnr * 2.14)

    # Jitter penalty (0–20 points, inverted)
    j = vq["jitter_local"] * 100  # convert to %
    jitter_score = max(0.0, 20.0 - (j / 2.0) * 20.0)

    # Shimmer penalty (0–20 points, inverted)
    sh = vq["shimmer_local"] * 100
    shimmer_score = max(0.0, 20.0 - (sh / 5.0) * 20.0)

    return min(100.0, hnr_score + jitter_score + shimmer_score)
```

---

## 10. Formant Analysis (`app/analysis/formants.py`)

Used for Phase 2+ coaching (vowel shaping, style markers). Not required for Build 0.1 — included here so Jules can scaffold it alongside the voice quality analysis without revisiting the parselmouth setup.

```python
import parselmouth
import numpy as np
import io, soundfile as sf

def extract_formants(y: np.ndarray, sr: int, max_formant: float = 5500.0) -> dict:
    """
    Extract F1, F2, F3 formant frequencies over time.
    max_formant: 5500 Hz for female voices, 5000 Hz for male.
                 Use adaptive value once gender classification exists.

    Returns:
        f1_hz: np.ndarray — F1 (Hz) per time step
        f2_hz: np.ndarray — F2 (Hz) per time step
        f3_hz: np.ndarray — F3 per time step
        times_s: np.ndarray — timestamps
        f1_mean: float, f2_mean: float, f3_mean: float — session averages
    """
    buf = io.BytesIO()
    sf.write(buf, y, sr, format="WAV")
    buf.seek(0)
    sound = parselmouth.Sound(buf.read())

    formant = sound.to_formant_burg(
        time_step=0.01,
        max_number_of_formants=5,
        maximum_formant=max_formant,
        window_length=0.025,
        pre_emphasis_from=50.0,
    )

    times = formant.xs()
    f1 = np.array([formant.get_value_at_time(1, t) for t in times])
    f2 = np.array([formant.get_value_at_time(2, t) for t in times])
    f3 = np.array([formant.get_value_at_time(3, t) for t in times])

    # Replace NaN (unvoiced frames) with 0 for storage
    f1 = np.nan_to_num(f1)
    f2 = np.nan_to_num(f2)
    f3 = np.nan_to_num(f3)

    return {
        "f1_hz": f1.tolist(),
        "f2_hz": f2.tolist(),
        "f3_hz": f3.tolist(),
        "times_s": times.tolist(),
        "f1_mean": float(f1[f1 > 0].mean()) if (f1 > 0).any() else 0.0,
        "f2_mean": float(f2[f2 > 0].mean()) if (f2 > 0).any() else 0.0,
        "f3_mean": float(f3[f3 > 0].mean()) if (f3 > 0).any() else 0.0,
    }
```

---

## 11. RMS Envelope and Dynamics (`app/analysis/rms.py`)

```python
import librosa
import numpy as np
from app.config import settings

def extract_rms_envelope(y: np.ndarray, sr: int) -> dict:
    """
    Returns:
        rms_db: np.ndarray — frame-level RMS in dB
        times_ms: np.ndarray — timestamps
        mean_db: float
        variance_db: float
        min_db: float
        max_db: float
        dynamic_range_db: float — max minus min
    """
    rms = librosa.feature.rms(
        y=y,
        frame_length=settings.frame_length,
        hop_length=settings.hop_length,
    )[0]
    rms_db = librosa.amplitude_to_db(rms, ref=np.max)
    times_ms = (librosa.frames_to_time(
        np.arange(len(rms_db)), sr=sr, hop_length=settings.hop_length
    ) * 1000)

    return {
        "rms_db": rms_db.tolist(),
        "times_ms": times_ms.tolist(),
        "mean_db": float(rms_db.mean()),
        "variance_db": float(rms_db.var()),
        "min_db": float(rms_db.min()),
        "max_db": float(rms_db.max()),
        "dynamic_range_db": float(rms_db.max() - rms_db.min()),
    }

def score_breath_control(rms_result: dict, pitch_voiced: np.ndarray) -> float:
    """
    Breath control score = steadiness of RMS during voiced frames.
    Low variance during voiced phonation = stable breath support.
    Also rewards longer unbroken voiced segments.

    Score 0–100:
    - Variance < 2 dB: 80–100 (excellent support)
    - Variance 2–5 dB: 50–80 (developing)
    - Variance > 10 dB: 0–30 (poor/unstable)
    """
    variance = rms_result["variance_db"]
    if variance <= 2.0:
        base_score = 80.0 + (2.0 - variance) * 10.0
    elif variance <= 5.0:
        base_score = 50.0 + (5.0 - variance) * 10.0
    elif variance <= 10.0:
        base_score = 50.0 * (10.0 - variance) / 5.0
    else:
        base_score = max(0.0, 50.0 - (variance - 10.0) * 5.0)

    return min(100.0, base_score)

def score_dynamics_control(rms_result: dict, target_pattern: str) -> float:
    """
    For dynamic control exercises (crescendo/decrescendo).
    target_pattern: "crescendo" | "decrescendo" | "steady"
    Checks that the RMS envelope follows the expected shape.
    """
    rms_db = np.array(rms_result["rms_db"])
    if len(rms_db) < 4:
        return 0.0

    # Fit linear trend
    x = np.arange(len(rms_db))
    slope, _ = np.polyfit(x, rms_db, 1)

    if target_pattern == "crescendo":
        # Positive slope = getting louder. Normalize: +0.5 dB/frame is excellent
        score = min(100.0, max(0.0, (slope / 0.5) * 100.0))
    elif target_pattern == "decrescendo":
        score = min(100.0, max(0.0, (-slope / 0.5) * 100.0))
    else:  # steady
        score = score_breath_control(rms_result, None)

    return score
```

---

## 12. Vibrato Detection (`app/analysis/vibrato.py`)

Vibrato analysis operates on the **pitch curve** (F0 over time), not on the raw audio. This keeps it fast and independent of voice quality analysis.

```python
import numpy as np
from scipy.signal import butter, filtfilt, find_peaks

# Target vibrato parameters (classical/pop)
TARGET_RATE_HZ = 6.0      # oscillations per second
TARGET_WIDTH_CENTS = 50.0  # ± cents deviation
RATE_TOLERANCE_HZ = 1.5   # acceptable range: 4.5–7.5 Hz
WIDTH_TOLERANCE_CENTS = 25.0

def detect_vibrato(
    f0_hz: np.ndarray,
    voiced_flag: np.ndarray,
    sr_frames: float,      # frame rate = sr / hop_length
) -> dict:
    """
    Detect vibrato in a sustained pitch curve.

    Only analyzes voiced frames after an onset window (first 500ms)
    to avoid detecting onset artifacts as vibrato.

    Returns:
        detected: bool
        rate_hz: float — oscillation rate in Hz (0 if not detected)
        width_cents: float — average peak-to-trough width in cents (0 if not detected)
        onset_frame: int — first frame where vibrato begins (0 if not detected)
        rate_score: float 0–100 — how close to target rate
        width_score: float 0–100 — how close to target width
        overall_score: float 0–100
    """
    # Convert f0 to cents relative to mean (remove pitch drift component)
    voiced_f0 = f0_hz[voiced_flag & ~np.isnan(f0_hz)]
    if len(voiced_f0) < 20:
        return _no_vibrato()

    mean_f0 = np.mean(voiced_f0)
    cents_curve = np.array([
        1200 * np.log2(f / mean_f0) if (v and not np.isnan(f) and f > 0) else 0.0
        for f, v in zip(f0_hz, voiced_flag)
    ])

    # Skip first 500ms (onset period)
    onset_skip = int(0.5 * sr_frames)
    analysis_curve = cents_curve[onset_skip:]
    if len(analysis_curve) < 10:
        return _no_vibrato()

    # Bandpass filter: 3–10 Hz (vibrato frequency range)
    nyq = sr_frames / 2
    low = 3.0 / nyq
    high = min(10.0 / nyq, 0.99)
    b, a = butter(2, [low, high], btype="band")
    filtered = filtfilt(b, a, analysis_curve)

    # FFT to find dominant oscillation rate
    fft = np.abs(np.fft.rfft(filtered))
    freqs = np.fft.rfftfreq(len(filtered), d=1.0 / sr_frames)
    vibrato_band = (freqs >= 3.0) & (freqs <= 10.0)
    if not vibrato_band.any():
        return _no_vibrato()

    dominant_freq_idx = np.argmax(fft[vibrato_band])
    rate_hz = float(freqs[vibrato_band][dominant_freq_idx])

    # Peak detection for width
    peaks, _ = find_peaks(filtered, distance=int(sr_frames / 10))
    troughs, _ = find_peaks(-filtered, distance=int(sr_frames / 10))
    if len(peaks) < 2 or len(troughs) < 2:
        return _no_vibrato()

    peak_vals = filtered[peaks]
    trough_vals = filtered[troughs]
    width_cents = float((np.mean(np.abs(peak_vals)) + np.mean(np.abs(trough_vals))) / 2)

    # Scores
    rate_error = abs(rate_hz - TARGET_RATE_HZ)
    rate_score = max(0.0, 100.0 - (rate_error / RATE_TOLERANCE_HZ) * 50.0)
    width_error = abs(width_cents - TARGET_WIDTH_CENTS)
    width_score = max(0.0, 100.0 - (width_error / WIDTH_TOLERANCE_CENTS) * 50.0)
    overall_score = (rate_score + width_score) / 2

    return {
        "detected": True,
        "rate_hz": rate_hz,
        "width_cents": width_cents,
        "onset_frame": onset_skip,
        "rate_score": rate_score,
        "width_score": width_score,
        "overall_score": overall_score,
    }

def _no_vibrato() -> dict:
    return {
        "detected": False, "rate_hz": 0.0, "width_cents": 0.0,
        "onset_frame": 0, "rate_score": 0.0, "width_score": 0.0, "overall_score": 0.0,
    }
```

---

## 13. Vocal Range Detection (`app/analysis/range_walker.py`)

Used by the baseline assessment job. Steps up/down from a center note by semitones until confidence drops below threshold.

```python
import numpy as np
from app.analysis.pitch import extract_pitch_pyin

def note_to_hz(midi_note: int) -> float:
    return 440.0 * (2 ** ((midi_note - 69) / 12))

def hz_to_midi(hz: float) -> int:
    return round(69 + 12 * np.log2(hz / 440.0))

def detect_vocal_range(
    pitch_frames_per_note: dict,  # {midi_note: LivePitchFrame[]} from baseline assessment
    confidence_threshold: float = 0.6,
    min_voiced_ratio: float = 0.5,
    sustain_frames_required: int = 8,   # ~1 second of sustained voiced frames
) -> dict:
    """
    Given a dict of per-note pitch frame arrays (from systematic scale test),
    determine the user's vocal range.

    Returns:
        lowest_note_midi: int
        highest_note_midi: int
        lowest_note_name: str (e.g. "E2")
        highest_note_name: str (e.g. "A4")
        lowest_hz: float
        highest_hz: float
        comfortable_low_midi: int  (notes where confidence > 0.75)
        comfortable_high_midi: int
        voice_type: str — soprano|mezzo|alto|tenor|baritone|bass (estimated)
    """
    usable_notes = []
    comfortable_notes = []

    for midi_note, frames in sorted(pitch_frames_per_note.items()):
        voiced_frames = [f for f in frames if f["voiced"] and f["confidence"] >= confidence_threshold]
        voiced_ratio = len(voiced_frames) / max(len(frames), 1)
        has_sustained = len(voiced_frames) >= sustain_frames_required
        avg_confidence = np.mean([f["confidence"] for f in voiced_frames]) if voiced_frames else 0.0

        if voiced_ratio >= min_voiced_ratio and has_sustained:
            usable_notes.append(midi_note)
        if voiced_ratio >= min_voiced_ratio and has_sustained and avg_confidence >= 0.75:
            comfortable_notes.append(midi_note)

    if not usable_notes:
        raise ValueError("No usable notes detected — check audio quality")

    lowest = min(usable_notes)
    highest = max(usable_notes)
    comfortable_low = min(comfortable_notes) if comfortable_notes else lowest
    comfortable_high = max(comfortable_notes) if comfortable_notes else highest

    voice_type = _estimate_voice_type(comfortable_low, comfortable_high)

    def midi_to_name(n):
        notes = ["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"]
        return f"{notes[n % 12]}{(n // 12) - 1}"

    return {
        "lowest_note_midi": lowest,
        "highest_note_midi": highest,
        "lowest_note_name": midi_to_name(lowest),
        "highest_note_name": midi_to_name(highest),
        "lowest_hz": note_to_hz(lowest),
        "highest_hz": note_to_hz(highest),
        "comfortable_low_midi": comfortable_low,
        "comfortable_high_midi": comfortable_high,
        "voice_type": voice_type,
    }

def _estimate_voice_type(low_midi: int, high_midi: int) -> str:
    mid = (low_midi + high_midi) / 2
    if mid >= 62:    return "soprano"    # above D4
    if mid >= 57:    return "mezzo"      # A3–D4
    if mid >= 53:    return "alto"       # F3–A3
    if mid >= 48:    return "tenor"      # C3–F3
    if mid >= 43:    return "baritone"   # G2–C3
    return "bass"                        # below G2
```

---

## 14. Multi-Metric Singing Score (`app/analysis/singing_metrics.py`)

This is the central scoring function that aggregates all analysis modules into the full 11-metric result. Called by the `singing_metrics` job and the baseline assessment.

```python
import numpy as np
from typing import Optional
from app.analysis.pitch import extract_pitch_pyin, extract_pitch_crepe, pitch_to_frames, hz_to_cents
from app.analysis.voice_quality import analyze_voice_quality, score_tone_quality
from app.analysis.rms import extract_rms_envelope, score_breath_control
from app.analysis.vibrato import detect_vibrato
from app.utils.quality_gates import check_quality
from app.config import settings

def compute_singing_metrics(
    y: np.ndarray,
    sr: int,
    target_hz: Optional[float] = None,    # None for free-form analysis
    tolerance_cents: float = 25.0,
    use_crepe: bool = False,
    include_formants: bool = False,        # Phase 2+
) -> dict:
    """
    Full multi-metric analysis for a singing recording.
    Returns a SingingMetricsResult conforming to the adaptive coaching engine contract.

    Metrics returned (all 0–100 unless noted):
    - pitch_accuracy
    - pitch_stability
    - onset_accuracy
    - breath_control
    - tone_quality
    - hnr_db (raw, not normalized)
    - cpp_db (raw)
    - jitter_local (raw %)
    - shimmer_local (raw %)
    - dynamics_score (if applicable)
    - vibrato_score (if applicable)
    - quality_flag (None | "clipping" | "too_quiet" | "no_voice")
    - pitch_frames (List[LivePitchFrame])
    """
    # 1. Pitch extraction
    if use_crepe:
        pitch_result = extract_pitch_crepe(y, sr, model_capacity=settings.crepe_model)
    else:
        pitch_result = extract_pitch_pyin(y, sr)

    voiced_flag = pitch_result["voiced_flag"]
    f0 = pitch_result["f0"]
    sr_frames = sr / settings.hop_length

    # 2. Quality gates
    quality = check_quality(y, sr, voiced_flag)
    if not quality.is_usable:
        return {
            "quality_flag": quality.failure_reason,
            "pitch_accuracy": None,
            "pitch_stability": None,
            "onset_accuracy": None,
            "breath_control": None,
            "tone_quality": None,
            "hnr_db": None,
            "pitch_frames": [],
        }

    # 3. Pitch-based scores (require target_hz)
    pitch_accuracy = None
    pitch_stability = None
    onset_accuracy = None
    cents_errors = []

    if target_hz is not None:
        for hz, voiced in zip(f0, voiced_flag):
            if voiced and not np.isnan(hz) and hz > 0:
                err = hz_to_cents(hz, target_hz)
                cents_errors.append(err)

        if cents_errors:
            in_tolerance = [abs(e) <= tolerance_cents for e in cents_errors]
            time_in_tolerance = sum(in_tolerance) / len(cents_errors)
            median_error = float(np.median(np.abs(cents_errors)))

            # Mirror TypeScript scorePitchAccuracy logic
            error_score = max(0.0, 100.0 - (median_error / (tolerance_cents * 2)) * 100.0)
            pitch_accuracy = time_in_tolerance * 100.0 * 0.5 + error_score * 0.5

            # Stability = inverse std dev
            std_dev = float(np.std(cents_errors))
            pitch_stability = max(0.0, min(100.0, 100.0 - (std_dev / 50.0) * 100.0))

            # Onset: frames until first in-tolerance lock (5 consecutive frames)
            onset_accuracy = _compute_onset_score(f0, voiced_flag, target_hz, tolerance_cents)

    # 4. Voice quality
    vq = analyze_voice_quality(y, sr)
    tone_quality = score_tone_quality(vq)

    # 5. RMS / breath control
    rms_result = extract_rms_envelope(y, sr)
    breath_control = score_breath_control(rms_result, voiced_flag)

    # 6. Vibrato (always run; score is 0 if not detected)
    vibrato_result = detect_vibrato(f0, voiced_flag, sr_frames)

    # 7. Serialize pitch frames
    pitch_frames = pitch_to_frames(pitch_result)

    return {
        "quality_flag": None,
        "pitch_accuracy": round(pitch_accuracy, 1) if pitch_accuracy is not None else None,
        "pitch_stability": round(pitch_stability, 1) if pitch_stability is not None else None,
        "onset_accuracy": round(onset_accuracy, 1) if onset_accuracy is not None else None,
        "breath_control": round(breath_control, 1),
        "tone_quality": round(tone_quality, 1),
        "dynamics_score": round(rms_result["variance_db"], 2),  # Raw; normalize in adaptive engine
        "vibrato": vibrato_result,
        "hnr_db": round(vq["hnr_db"], 2),
        "cpp_db": round(vq["cpp_db"], 2),
        "jitter_local": round(vq["jitter_local"] * 100, 4),
        "shimmer_local": round(vq["shimmer_local"] * 100, 4),
        "rms_mean_db": round(rms_result["mean_db"], 2),
        "rms_variance_db": round(rms_result["variance_db"], 2),
        "voiced_frame_ratio": round(quality.voiced_frame_ratio, 3),
        "pitch_frames": pitch_frames,
    }

def _compute_onset_score(
    f0: np.ndarray,
    voiced_flag: np.ndarray,
    target_hz: float,
    tolerance_cents: float,
    required_lock_frames: int = 5,
) -> float:
    first_usable = None
    lock_idx = None
    consecutive = 0

    for i, (hz, voiced) in enumerate(zip(f0, voiced_flag)):
        if not voiced or np.isnan(hz) or hz <= 0:
            continue
        if first_usable is None:
            first_usable = i
        err = abs(hz_to_cents(hz, target_hz))
        if err <= tolerance_cents:
            consecutive += 1
            if consecutive >= required_lock_frames and lock_idx is None:
                lock_idx = i - required_lock_frames + 1
        else:
            consecutive = 0

    if first_usable is None or lock_idx is None:
        return 0.0

    frames_to_lock = lock_idx - first_usable
    return max(0.0, min(100.0, 100.0 - (frames_to_lock / 20.0) * 100.0))
```

---

## 15. HTDemucs Vocal Separation (`app/separation/demucs_runner.py`)

```python
import subprocess
import os
import tempfile
import shutil
import soundfile as sf
import numpy as np
from pathlib import Path
from app.config import settings
from app.utils.audio_io import audio_to_wav_bytes
from app.storage.supabase_client import upload_file

def separate_vocals(
    input_audio_bytes: bytes,
    job_id: str,
    song_id: str,
    output_bucket: str,
    ephemeral: bool = False,   # True for user-upload sessions; stems not cached
) -> dict:
    """
    Run HTDemucs on the input audio and return Supabase signed URLs
    for the vocal stem and instrumental stem.

    Uses subprocess + CLI for stability (avoids memory issues with
    loading Demucs model in-process alongside other heavy models).

    ephemeral=True: stems are uploaded with a 24-hour TTL metadata tag
    and scheduled for deletion by the data retention cron.

    Returns:
        vocal_stem_url: str (signed URL, 7-day expiry)
        instrumental_stem_url: str (signed URL, 7-day expiry)
        duration_seconds: float
        model_used: str
    """
    with tempfile.TemporaryDirectory() as tmpdir:
        input_path = os.path.join(tmpdir, f"{job_id}.wav")
        with open(input_path, "wb") as f:
            f.write(input_audio_bytes)

        # Run demucs CLI
        # --two-stems=vocals splits into vocals and no_vocals only
        # More efficient than full 4-stem when we only need vocal/instrumental
        cmd = [
            "python", "-m", "demucs",
            "--two-stems", "vocals",
            "-n", settings.demucs_model,     # "htdemucs" or "htdemucs_ft"
            "--out", tmpdir,
            input_path,
        ]
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=600)
        if result.returncode != 0:
            raise RuntimeError(f"Demucs failed: {result.stderr}")

        # Demucs output structure: {tmpdir}/{model}/{stem_name}/{filename}.wav
        output_dir = Path(tmpdir) / settings.demucs_model / Path(input_path).stem
        vocal_path = output_dir / "vocals.wav"
        instrumental_path = output_dir / "no_vocals.wav"

        if not vocal_path.exists() or not instrumental_path.exists():
            raise RuntimeError(f"Expected stems not found in {output_dir}")

        # Read and get duration
        vocal_y, vocal_sr = sf.read(str(vocal_path))
        duration_seconds = len(vocal_y) / vocal_sr

        # Upload stems to Supabase
        with open(str(vocal_path), "rb") as vf:
            vocal_bytes = vf.read()
        with open(str(instrumental_path), "rb") as inf_f:
            instrumental_bytes = inf_f.read()

        ttl_hours = 24 if ephemeral else None  # ephemeral sessions expire

        vocal_url = upload_file(
            data=vocal_bytes,
            bucket=output_bucket,
            path=f"stems/{song_id}/{job_id}/vocals.wav",
            content_type="audio/wav",
            ttl_hours=ttl_hours,
        )
        instrumental_url = upload_file(
            data=instrumental_bytes,
            bucket=output_bucket,
            path=f"stems/{song_id}/{job_id}/no_vocals.wav",
            content_type="audio/wav",
            ttl_hours=ttl_hours,
        )

    return {
        "vocal_stem_url": vocal_url,
        "instrumental_stem_url": instrumental_url,
        "duration_seconds": duration_seconds,
        "model_used": settings.demucs_model,
    }
```

**Important:** Load the Demucs model weights only once at worker startup, not per-job. Add a module-level singleton:

```python
# In worker.py, before Worker is started:
import demucs.separate  # triggers model weight download/cache on first run
```

Model weights (~83 MB for `htdemucs`, ~100 MB for `htdemucs_ft`) are cached in `~/.cache/torch/hub/`. Add a Render build step to pre-warm the cache:

```dockerfile
# In Dockerfile, after pip install:
RUN python -c "import demucs; from demucs.pretrained import get_model; get_model('htdemucs')"
```

---

## 16. DTW Karaoke Comparison (`app/analysis/dtw.py`)

```python
import numpy as np
from fastdtw import fastdtw
from scipy.spatial.distance import euclidean
from app.analysis.pitch import hz_to_cents

def compare_pitch_curves(
    user_frames: list[dict],    # LivePitchFrame[] from user recording
    reference_frames: list[dict],  # LivePitchFrame[] from VocalAnalysisResult
) -> dict:
    """
    DTW comparison of user pitch curve against reference.

    Both curves are converted to cents-relative space before comparison
    so absolute pitch differences (key transposition) don't dominate.

    Returns:
        pitch_similarity: float 0–100
        timing_accuracy: float 0–100
        contour_match: float 0–100
        overall: float 0–100 (60% pitch + 20% timing + 20% contour)
        signed_pitch_error_cents: float (positive = sharp)
        dominant_failure_mode: str | None
        dtw_distance: float (raw, for debugging)
    """
    # Extract voiced frames only
    user_voiced = [
        f for f in user_frames
        if f["voiced"] and f.get("frequencyHz") and f["confidence"] >= 0.5
    ]
    ref_voiced = [
        f for f in reference_frames
        if f["voiced"] and f.get("frequencyHz") and f["confidence"] >= 0.5
    ]

    if not user_voiced or not ref_voiced:
        return _empty_comparison()

    # Convert to cents relative to mean (removes key transposition)
    user_hz = np.array([f["frequencyHz"] for f in user_voiced])
    ref_hz = np.array([f["frequencyHz"] for f in ref_voiced])

    user_mean = user_hz.mean()
    ref_mean = ref_hz.mean()

    user_cents = np.array([hz_to_cents(h, user_mean) for h in user_hz])
    ref_cents = np.array([hz_to_cents(h, ref_mean) for h in ref_hz])

    # DTW distance (lower = more similar)
    distance, path = fastdtw(
        user_cents.reshape(-1, 1),
        ref_cents.reshape(-1, 1),
        dist=euclidean,
    )
    normalized_distance = distance / max(len(user_cents), len(ref_cents))

    # Pitch similarity: 0 distance = 100, 100 cents avg = ~30
    pitch_similarity = max(0.0, min(100.0, 100.0 - normalized_distance * 0.8))

    # Timing accuracy
    user_duration_ms = user_frames[-1]["timestampMs"] - user_frames[0]["timestampMs"]
    ref_duration_ms = ref_frames[-1]["timestampMs"] - ref_frames[0]["timestampMs"]
    duration_ratio = abs(user_duration_ms - ref_duration_ms) / max(ref_duration_ms, 1)
    timing_accuracy = max(50.0, 100.0 - duration_ratio * 100.0)

    # Contour match (direction agreement)
    contour_match = _compute_contour_match(user_cents, ref_cents)

    # Signed pitch error (positive = sharp)
    aligned_user = user_cents[[p[0] for p in path]]
    aligned_ref = ref_cents[[p[1] for p in path]]
    signed_error = float((aligned_user - aligned_ref).mean())

    # Composite score
    overall = pitch_similarity * 0.6 + timing_accuracy * 0.2 + contour_match * 0.2

    # Dominant failure mode
    failure = _detect_failure_mode(
        pitch_similarity, timing_accuracy, contour_match,
        signed_error, user_duration_ms, ref_duration_ms
    )

    return {
        "pitch_similarity": round(pitch_similarity, 1),
        "timing_accuracy": round(timing_accuracy, 1),
        "contour_match": round(contour_match, 1),
        "overall": round(overall, 1),
        "signed_pitch_error_cents": round(signed_error, 2),
        "dominant_failure_mode": failure,
        "dtw_distance": round(normalized_distance, 4),
    }

def _compute_contour_match(user_cents, ref_cents, n_segments=8):
    def directions(arr):
        seg = len(arr) // n_segments
        dirs = []
        for i in range(0, len(arr) - seg, seg):
            diff = arr[i + seg] - arr[i]
            dirs.append(1 if diff > 5 else (-1 if diff < -5 else 0))
        return dirs

    u_dirs = directions(user_cents)
    r_dirs = directions(ref_cents)
    matches = sum(u == r for u, r in zip(u_dirs, r_dirs))
    return round(100.0 * matches / max(len(u_dirs), 1), 1)

def _detect_failure_mode(pitch, timing, contour, signed_error, user_dur, ref_dur):
    min_score = min(pitch, timing, contour)
    if min_score >= 60:
        return None
    if pitch == min_score:
        return "pitch_flat" if signed_error < -20 else "pitch_sharp" if signed_error > 20 else "pitch_instability"
    if timing == min_score:
        return "rushing" if user_dur < ref_dur * 0.85 else "dragging"
    return "wrong_contour"

def _empty_comparison():
    return {
        "pitch_similarity": 0.0, "timing_accuracy": 0.0, "contour_match": 0.0,
        "overall": 0.0, "signed_pitch_error_cents": 0.0,
        "dominant_failure_mode": None, "dtw_distance": 999.0,
    }
```

---

## 17. Job Implementations

### 17.1 `vocal_separation` job

```python
# app/jobs/vocal_separation.py
import redis
import json
from datetime import datetime
from app.config import settings
from app.storage.supabase_client import download_file
from app.separation.demucs_runner import separate_vocals

redis_client = redis.from_url(settings.redis_url)

def run(job_payload: dict):
    """
    Input matches TypeScript VocalSeparationJob:
    { jobType, jobId, songId, audioFileUrl, requestedAt }

    Output matches TypeScript VocalSeparationResult.
    Writes result to Redis hash job:{jobId} and returns result dict.
    """
    job_id = job_payload["jobId"]
    song_id = job_payload["songId"]
    audio_url = job_payload["audioFileUrl"]
    ephemeral = job_payload.get("ephemeral", False)

    _set_status(job_id, "processing")

    audio_bytes = download_file(audio_url)
    result = separate_vocals(
        input_audio_bytes=audio_bytes,
        job_id=job_id,
        song_id=song_id,
        output_bucket=settings.supabase_storage_bucket_karaoke,
        ephemeral=ephemeral,
    )

    output = {
        "jobId": job_id,
        "songId": song_id,
        "instrumentalStemUrl": result["instrumental_stem_url"],
        "vocalStemUrl": result["vocal_stem_url"],
        "completedAt": datetime.utcnow().isoformat() + "Z",
    }
    _set_result(job_id, output)
    return output

def _set_status(job_id: str, status: str):
    redis_client.hset(f"job:{job_id}", "status", status)

def _set_result(job_id: str, result: dict):
    redis_client.hset(f"job:{job_id}", mapping={
        "status": "complete",
        "result": json.dumps(result),
        "completedAt": result["completedAt"],
    })
    redis_client.expire(f"job:{job_id}", 86400)  # 24-hour TTL on job result
```

### 17.2 `vocal_analysis` job

```python
# app/jobs/vocal_analysis.py
import json
from datetime import datetime
import librosa
import numpy as np
from app.config import settings
from app.utils.audio_io import load_audio
from app.analysis.pitch import extract_pitch_pyin, pitch_to_frames, hz_to_note_name

def run(job_payload: dict):
    """
    Matches TypeScript VocalAnalysisJob / VocalAnalysisResult.
    Analyzes the vocal stem produced by a VocalSeparationJob.
    Stores result in Supabase (vocalAnalysisId) and Redis.
    """
    job_id = job_payload["jobId"]
    vocal_stem_url = job_payload["vocalStemUrl"]

    y, sr = load_audio(vocal_stem_url, sr=settings.sample_rate)

    # Pitch extraction on the reference vocal
    pitch_result = extract_pitch_pyin(y, sr)
    pitch_frames = pitch_to_frames(pitch_result)

    # Phrase segmentation via onset detection
    onset_frames = librosa.onset.onset_detect(y=y, sr=sr, hop_length=settings.hop_length)
    onset_times_ms = (librosa.frames_to_time(onset_frames, sr=sr, hop_length=settings.hop_length) * 1000).tolist()
    phrase_segments = _build_phrase_segments(onset_times_ms, len(y) / sr * 1000)

    # Key and tempo
    tempo, _ = librosa.beat.beat_track(y=y, sr=sr)
    chroma = librosa.feature.chroma_cqt(y=y, sr=sr)
    key_index = int(np.argmax(chroma.mean(axis=1)))
    key_names = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"]
    estimated_key = key_names[key_index]

    # Vocal range from pitch data
    voiced_hz = [f["frequencyHz"] for f in pitch_frames if f["voiced"] and f.get("frequencyHz")]
    vocal_range = {
        "low": min(voiced_hz) if voiced_hz else 0,
        "high": max(voiced_hz) if voiced_hz else 0,
    }

    output = {
        "jobId": job_id,
        "songId": job_payload["songId"],
        "pitchFrames": pitch_frames,
        "phraseSegments": phrase_segments,
        "estimatedKey": estimated_key,
        "tempoEstimateBpm": float(tempo),
        "vocalRangeHz": vocal_range,
        "completedAt": datetime.utcnow().isoformat() + "Z",
    }
    return output

def _build_phrase_segments(onset_times_ms, total_duration_ms):
    segments = []
    for i, start_ms in enumerate(onset_times_ms):
        end_ms = onset_times_ms[i + 1] if i + 1 < len(onset_times_ms) else total_duration_ms
        segments.append({
            "startMs": start_ms,
            "endMs": end_ms,
            "labelledAsPhrase": True,
        })
    return segments
```

### 17.3 `singing_metrics` job (NEW — not in original TypeScript contract)

This job is new and must be added to `services/audio-processor/src/index.ts` by the Domain Contracts Agent before implementation.

```typescript
// ADD to services/audio-processor/src/index.ts

export interface SingingMetricsJob {
  jobType: 'singing_metrics';
  jobId: string;
  attemptId: string;
  userId: string;
  audioFileUrl: string; // User's singing attempt audio
  targetHz?: number; // Expected pitch (for exercise attempts)
  toleranceCents?: number; // Default 25
  exerciseCategory: string; // From ExerciseCategory
  useCrepe?: boolean; // Default false
  storeAudio?: boolean; // Requires user opt-in
}

export interface SingingMetricsResult {
  jobId: string;
  attemptId: string;
  pitchAccuracy: number | null; // null if no target
  pitchStability: number | null;
  onsetAccuracy: number | null;
  breathControl: number;
  toneQuality: number;
  dynamicsScore: number | null;
  vibratoScore: number | null;
  hnrDb: number;
  cppDb: number;
  jitterLocal: number;
  shimmerLocal: number;
  rmsVarianceDb: number;
  voicedFrameRatio: number;
  qualityFlag: string | null;
  pitchFrames: Array<{
    timestampMs: number;
    frequencyHz: number | null;
    voiced: boolean;
    confidence: number;
  }>;
  completedAt: string;
}
```

```python
# app/jobs/singing_metrics.py
from datetime import datetime
from app.utils.audio_io import load_audio
from app.analysis.singing_metrics import compute_singing_metrics
from app.config import settings

def run(job_payload: dict) -> dict:
    job_id = job_payload["jobId"]
    y, sr = load_audio(job_payload["audioFileUrl"], sr=settings.sample_rate)

    metrics = compute_singing_metrics(
        y=y,
        sr=sr,
        target_hz=job_payload.get("targetHz"),
        tolerance_cents=job_payload.get("toleranceCents", 25.0),
        use_crepe=job_payload.get("useCrepe", False),
    )

    return {
        "jobId": job_id,
        "attemptId": job_payload["attemptId"],
        "pitchAccuracy": metrics.get("pitch_accuracy"),
        "pitchStability": metrics.get("pitch_stability"),
        "onsetAccuracy": metrics.get("onset_accuracy"),
        "breathControl": metrics["breath_control"],
        "toneQuality": metrics["tone_quality"],
        "dynamicsScore": metrics.get("dynamics_score"),
        "vibratoScore": metrics.get("vibrato", {}).get("overall_score"),
        "hnrDb": metrics["hnr_db"],
        "cppDb": metrics["cpp_db"],
        "jitterLocal": metrics["jitter_local"],
        "shimmerLocal": metrics["shimmer_local"],
        "rmsVarianceDb": metrics["rms_variance_db"],
        "voicedFrameRatio": metrics["voiced_frame_ratio"],
        "qualityFlag": metrics["quality_flag"],
        "pitchFrames": metrics["pitch_frames"],
        "completedAt": datetime.utcnow().isoformat() + "Z",
    }
```

### 17.4 `baseline_assessment` job (NEW)

```typescript
// ADD to services/audio-processor/src/index.ts

export interface BaselineAssessmentJob {
  jobType: 'baseline_assessment';
  jobId: string;
  userId: string;
  rangeTestAudioUrl: string; // Scale walk from C2–C6
  sustainedHoldAudioUrl: string; // Single comfortable note, 8 seconds
  freeVocalAudioUrl: string; // 30 seconds of free singing
}

export interface BaselineAssessmentResult {
  jobId: string;
  userId: string;
  lowestNoteMidi: number;
  highestNoteMidi: number;
  lowestNoteName: string;
  highestNoteName: string;
  comfortableLowMidi: number;
  comfortableHighMidi: number;
  voiceType: string;
  baselineMetrics: {
    pitchAccuracy: number | null;
    pitchStability: number | null;
    breathControl: number;
    toneQuality: number;
    hnrDb: number;
  };
  recommendedStartingKeyMidi: number;
  recommendedStartingKeyName: string;
  completedAt: string;
}
```

---

## 18. Filler Detection Job (`app/jobs/filler_detection.py`)

```python
import whisper
import numpy as np
from datetime import datetime
from app.utils.audio_io import load_audio
from app.config import settings

# Module-level model cache — load once at worker startup
_whisper_model = None

def get_whisper_model():
    global _whisper_model
    if _whisper_model is None:
        _whisper_model = whisper.load_model(settings.whisper_model)
    return _whisper_model

FILLER_WORDS = {
    "um", "uh", "er", "ah", "like", "you know", "so", "basically",
    "literally", "actually", "kind of", "sort of", "i mean", "right",
}

def run(job_payload: dict) -> dict:
    job_id = job_payload["jobId"]
    y, sr = load_audio(job_payload["audioFileUrl"], sr=16000)  # Whisper uses 16kHz

    model = get_whisper_model()
    result = model.transcribe(
        y,
        word_timestamps=True,
        language="en",
        condition_on_previous_text=False,
    )

    filler_events = []
    total_words = 0

    for segment in result.get("segments", []):
        for word_info in segment.get("words", []):
            word = word_info["word"].strip().lower().rstrip(".,!?")
            total_words += 1
            if word in FILLER_WORDS:
                filler_events.append({
                    "timestampMs": round(word_info["start"] * 1000),
                    "word": word_info["word"].strip(),
                    "confidence": float(word_info.get("probability", 0.8)),
                })

    duration_minutes = len(y) / 16000 / 60
    filler_rate = len(filler_events) / max(duration_minutes, 0.01)

    return {
        "jobId": job_id,
        "attemptId": job_payload["attemptId"],
        "fillerEvents": filler_events,
        "fillerRate": round(filler_rate, 2),
        "totalWords": total_words,
        "transcriptText": result.get("text", ""),
        "completedAt": datetime.utcnow().isoformat() + "Z",
    }
```

---

## 19. Supabase Storage Client (`app/storage/supabase_client.py`)

```python
from supabase import create_client, Client
from app.config import settings
import httpx

_client: Client = None

def get_client() -> Client:
    global _client
    if _client is None:
        _client = create_client(settings.supabase_url, settings.supabase_service_role_key)
    return _client

def download_file(url: str) -> bytes:
    """Download audio from a Supabase signed URL."""
    response = httpx.get(url, timeout=60.0)
    response.raise_for_status()
    return response.content

def upload_file(
    data: bytes,
    bucket: str,
    path: str,
    content_type: str = "audio/wav",
    ttl_hours: int = None,
) -> str:
    """
    Upload bytes to Supabase Storage.
    Returns a signed URL valid for 7 days (604800 seconds).

    ttl_hours: if set, adds x-upsert metadata for retention cron.
    """
    client = get_client()
    client.storage.from_(bucket).upload(
        path=path,
        file=data,
        file_options={
            "content-type": content_type,
            "upsert": "true",
            **({"x-metadata-ttl-hours": str(ttl_hours)} if ttl_hours else {}),
        },
    )
    # Generate a signed URL
    signed = client.storage.from_(bucket).create_signed_url(path, 604800)
    return signed["signedURL"]
```

---

## 20. Dockerfile

```dockerfile
FROM python:3.11-slim

# System deps for librosa, soundfile, parselmouth
RUN apt-get update && apt-get install -y \
    ffmpeg \
    libsndfile1 \
    libgomp1 \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python deps first (layer cache)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Pre-warm model caches during build (avoids cold-start timeout)
RUN python -c "import whisper; whisper.load_model('tiny')"
RUN python -c "from demucs.pretrained import get_model; get_model('htdemucs')"

COPY . .

# Default: FastAPI process
# Override CMD in render.yaml for worker process
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

---

## 21. Render Blueprint Additions

Add these two entries to `render.yaml`. Coordinate with the Infrastructure Agent before merging to avoid Blueprint schema conflicts.

```yaml
- type: web
  name: voice-audio-processor
  region: oregon
  runtime: docker
  plan: starter
  dockerfilePath: services/audio-processor/python/Dockerfile
  dockerContext: services/audio-processor/python
  healthCheckPath: /healthz
  envVars:
    - fromGroup: voice-shared-env
    - fromGroup: voice-secrets
    - key: PORT
      value: '8000'
    - key: REDIS_URL
      fromService:
        type: keyvalue
        name: voice-redis
        property: connectionString

- type: worker
  name: voice-audio-worker
  region: oregon
  runtime: docker
  plan: starter
  dockerfilePath: services/audio-processor/python/Dockerfile
  dockerContext: services/audio-processor/python
  startCommand: python -m app.worker
  envVars:
    - fromGroup: voice-shared-env
    - fromGroup: voice-secrets
    - key: REDIS_URL
      fromService:
        type: keyvalue
        name: voice-redis
        property: connectionString
```

---

## 22. Phased Build Order

### Phase 0 — Scaffold and infrastructure (before any analysis code)

**Deliverable:** Service runs locally, passes health check, processes a dummy job.

1. Create directory structure (`services/audio-processor/python/`)
2. Write `requirements.txt`, `Dockerfile`, `config.py`, `worker.py`, `main.py`
3. Implement `audio_io.py` (load_audio, audio_to_wav_bytes)
4. Implement `supabase_client.py` (download_file, upload_file)
5. Implement placeholder job functions that log and return stubs
6. Confirm `python -m app.worker` connects to Redis and dequeues without error
7. Confirm `/healthz` returns `{"ok": true}`
8. Add to `render.yaml`; confirm Blueprint is schema-valid

**Tests needed:** `test_audio_io.py` with a short fixture WAV; `test_config.py` checking env loading.

---

### Phase 1 — Core metric analysis (Build 0.1 enabler)

**Deliverable:** `singing_metrics` job returns real pitch_accuracy, pitch_stability, breath_control, tone_quality for a test recording.

1. `app/utils/quality_gates.py` — implement `check_quality`; test with clipping fixture and quiet fixture
2. `app/analysis/pitch.py` — implement `extract_pitch_pyin`, `pitch_to_frames`; test against reference sine wave at A4 (440Hz) and E4 (329.63Hz)
3. `app/analysis/rms.py` — implement `extract_rms_envelope`, `score_breath_control`
4. `app/analysis/voice_quality.py` — implement `analyze_voice_quality` (HNR + jitter + shimmer + CPP); test with fixture of a clean vocal vs a breathy vocal
5. `app/analysis/singing_metrics.py` — implement `compute_singing_metrics`; test end-to-end with a 5-second A4 sine wave (pitch_accuracy should be ~100) and a spoken recording (pitch_accuracy should be null or low)
6. `app/jobs/singing_metrics.py` — wire up the job; test via direct function call
7. Add `SingingMetricsJob` and `SingingMetricsResult` to TypeScript contract (coordinate with Domain Contracts Agent)

**Tests needed:** Deterministic fixture tests — A4 sine at 0 cents error → pitch_accuracy ≥ 95; A4 + 50 cents drift → pitch_stability ≤ 50; clipped audio → quality_flag = "clipping".

---

### Phase 2 — Baseline assessment (Build MVP enabler)

**Deliverable:** `baseline_assessment` job returns `VocalProfile` with real range and initial metric grades.

1. `app/analysis/range_walker.py` — implement `detect_vocal_range`; test with mock per-note frame data
2. `app/jobs/baseline_assessment.py` — wire up 3-audio baseline job
3. Add `BaselineAssessmentJob`/`Result` to TypeScript contract

**Tests needed:** Range walker returns soprano for C4–G5 comfortable range; baritone for G2–D4.

---

### Phase 3 — Source separation (Phase 2 product feature)

**Deliverable:** `vocal_separation` job produces real stems.

1. `app/separation/demucs_runner.py` — implement `separate_vocals` with subprocess CLI
2. Dockerfile model pre-warm for HTDemucs
3. `app/jobs/vocal_separation.py` — wire up job
4. `app/jobs/vocal_analysis.py` — wire up analysis of vocal stem (pYIN + key + tempo + phrase segments)

**Tests needed:** Run demucs on a 10-second public-domain recording; confirm vocal.wav and no_vocals.wav are produced with correct duration.

---

### Phase 4 — Karaoke comparison and filler detection (Phase 2 product)

**Deliverable:** Full karaoke pipeline operational.

1. `app/analysis/dtw.py` — implement `compare_pitch_curves`; test with identical curves (should score ~100) and inverted curves (should score ≤ 20)
2. `app/jobs/karaoke_compare.py` — wire up job
3. `app/analysis/vibrato.py` — implement `detect_vibrato`; test with synthetic 6Hz oscillating pitch curve
4. `app/jobs/filler_detection.py` — implement Whisper-based filler detection; test with fixture audio containing known fillers

---

### Phase 5 — CREPE and formants (Phase 3 / style packs)

**Deliverable:** CREPE opt-in path and formant analysis for style coaching.

1. `app/analysis/pitch.py` — implement `extract_pitch_crepe`
2. `app/analysis/formants.py` — implement `extract_formants`
3. Update `compute_singing_metrics` to include formant data when `include_formants=True`

---

## 23. Critical Constraints for Jules

**Do not drift from TypeScript job contracts.** `services/audio-processor/src/index.ts` is the interface between the Node API and this service. Field names, types, and casing in Python output dicts must exactly match the TypeScript interfaces. New jobs require TypeScript additions first.

**Do not store user audio by default.** The `storeAudio` field on job payloads must be checked before writing any audio to Supabase. Default is false. This maps directly to `AUDIO_STORAGE_OPT_IN_DEFAULT=false` in `render.yaml`.

**Quality gate before every score.** `check_quality()` must run before `compute_singing_metrics()`. If `is_usable=False`, return `quality_flag` and null scores. Never return a fabricated score for bad audio.

**One model instance per worker process.** Whisper and Demucs weights are large. Load them at module level (singleton pattern) so they are loaded once when the worker starts, not per job. Memory pressure on the Starter plan is real — this is not optional.

**Separate Python directory, not `src/`.** All Python files live in `services/audio-processor/python/`. The existing `services/audio-processor/src/` directory contains TypeScript only and must not be touched.

**Tests must be deterministic.** Every analysis function must have at least one test using a synthetic fixture (sine wave, silence, clipping) where the expected output is mathematically derivable. Do not write tests that call the OpenAI or Supabase APIs.
