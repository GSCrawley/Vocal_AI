# app/main.py
from fastapi import FastAPI, Header, HTTPException, UploadFile, File
from fastapi.responses import JSONResponse
import secrets
import tempfile
import os
from app.config import settings
try:
    import redis
except ImportError:
    redis = None

# We import pitch processing directly for the fast synchronous endpoint
from app.utils.audio_io import load_audio
from app.analysis.pitch import extract_pitch_pyin, pitch_to_frames

app = FastAPI(title="voice-audio-processor", version="0.1.0")
redis_client = redis.from_url(settings.redis_url)


@app.get("/healthz")
def health():
    checks = {"redis": "ok", "supabase": "ok"}
    status = "ok"
    try:
        redis_client.ping()
    except Exception:
        checks["redis"] = "error"
        status = "error"

    try:
        from app.storage.supabase_client import get_client

        get_client()
    except Exception:
        checks["supabase"] = "error"
        status = "error"

    if status == "error":
        return JSONResponse(
            status_code=503, content={"status": "error", "checks": checks}
        )
    return {"status": "ok", "checks": checks}


@app.get("/jobs/{job_id}/status")
def job_status(job_id: str, x_internal_token: str = Header(None)):
    if x_internal_token is None or not secrets.compare_digest(
        x_internal_token, settings.internal_service_token
    ):
        raise HTTPException(status_code=403)
    result = redis_client.hgetall(f"job:{job_id}")
    if not result:
        raise HTTPException(status_code=404)
    return {k.decode(): v.decode() for k, v in result.items()}


@app.post("/pitch/extract")
async def extract_pitch_sync(
    file: UploadFile = File(...), x_internal_token: str = Header(None)
):
    if x_internal_token is None or not secrets.compare_digest(
        x_internal_token, settings.internal_service_token
    ):
        raise HTTPException(status_code=403)

    with tempfile.NamedTemporaryFile(
        delete=False, suffix=os.path.splitext(file.filename or "")[1] or ".m4a"
    ) as tmp:
        content = await file.read()
        tmp.write(content)
        tmp_path = tmp.name

    try:
        y, sr = load_audio(tmp_path, sr=settings.sample_rate, allow_local_path=True)
        pitch_result = extract_pitch_pyin(y, sr)
        pitch_frames = pitch_to_frames(pitch_result)
        return {"ok": True, "frames": pitch_frames}
    except Exception as e:
        return JSONResponse(status_code=500, content={"ok": False, "error": str(e)})
    finally:
        if os.path.exists(tmp_path):
            os.remove(tmp_path)


from typing import Optional

import librosa
from fastapi import Form

from app.analysis.singing_metrics import compute_singing_metrics


@app.post("/analyze")
async def analyze_audio(
    file: Optional[UploadFile] = File(None),
    audio_url: Optional[str] = Form(None),
    targetHz: Optional[float] = Form(None),
    toleranceCents: float = Form(25.0),
    x_internal_token: str = Header(None),
):
    if x_internal_token is None or not secrets.compare_digest(
        x_internal_token, settings.internal_service_token
    ):
        raise HTTPException(status_code=403)

    if file is None and audio_url is None:
        return JSONResponse(
            status_code=400, content={"error": "Must provide either file or audio_url"}
        )

    if file is not None and audio_url is not None:
        return JSONResponse(
            status_code=400, content={"error": "Provide only one of file or audio_url"}
        )

    if audio_url is not None and not (
        audio_url.startswith("http://") or audio_url.startswith("https://")
    ):
        return JSONResponse(
            status_code=400, content={"error": "audio_url must be an http(s) URL"}
        )

    tmp_path = None
    try:
        if file:
            with tempfile.NamedTemporaryFile(
                delete=False, suffix=os.path.splitext(file.filename or "")[1] or ".m4a"
            ) as tmp:
                content = await file.read()
                tmp.write(content)
                tmp_path = tmp.name
            y, sr = load_audio(tmp_path, sr=settings.sample_rate, allow_local_path=True)
        else:
            y, sr = load_audio(audio_url, sr=settings.sample_rate)

        # 1. Pitch & metrics
        metrics = compute_singing_metrics(
            y,
            sr,
            target_hz=targetHz,
            tolerance_cents=toleranceCents,
            use_crepe=settings.use_crepe,
        )

        # 2. Onset Timestamps
        onset_env = librosa.onset.onset_strength(
            y=y, sr=sr, hop_length=settings.hop_length
        )
        onsets = librosa.onset.onset_detect(
            onset_envelope=onset_env, sr=sr, hop_length=settings.hop_length
        )
        onset_timestamps_ms = (
            librosa.frames_to_time(onsets, sr=sr, hop_length=settings.hop_length) * 1000
        ).tolist()

        # 3. RMS Peak
        from app.analysis.rms import extract_rms_envelope

        rms_result = extract_rms_envelope(y, sr)
        peak_db = rms_result["max_db"]

        return {
            "refinedPitchContour": metrics["pitch_frames"],
            "onsetTimestampsMs": onset_timestamps_ms,
            "rmsEnvelope": {
                "meanDb": (
                    metrics["rms_mean_db"]
                    if metrics["rms_mean_db"] is not None
                    else 0.0
                ),
                "varianceDb": (
                    metrics["rms_variance_db"]
                    if metrics["rms_variance_db"] is not None
                    else 0.0
                ),
                "peakDb": peak_db,
            },
            "vibrato": {
                "rateHz": metrics["vibrato"]["rate_hz"] if metrics["vibrato"] else 0.0,
                "depthCents": (
                    metrics["vibrato"]["width_cents"] if metrics["vibrato"] else 0.0
                ),
                "hasVibrato": (
                    metrics["vibrato"]["detected"] if metrics["vibrato"] else False
                ),
            },
            "overallConfidence": metrics["voiced_frame_ratio"],
        }
    except Exception:
        return JSONResponse(status_code=500, content={"error": "internal_error"})
    finally:
        if tmp_path and os.path.exists(tmp_path):
            os.remove(tmp_path)
