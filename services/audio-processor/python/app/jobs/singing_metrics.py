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
        "breathControl": metrics.get("breath_control"),
        "toneQuality": metrics.get("tone_quality"),
        "dynamicsScore": metrics.get("dynamics_score"),
        "vibratoScore": (metrics.get("vibrato") or {}).get("overall_score"),
        "hnrDb": metrics.get("hnr_db"),
        "cppDb": metrics.get("cpp_db"),
        "jitterLocal": metrics.get("jitter_local"),
        "shimmerLocal": metrics.get("shimmer_local"),
        "rmsVarianceDb": metrics.get("rms_variance_db"),
        "voicedFrameRatio": metrics.get("voiced_frame_ratio"),
        "qualityFlag": metrics.get("quality_flag"),
        "pitchFrames": metrics.get("pitch_frames", []),
        "completedAt": datetime.utcnow().isoformat() + "Z",
    }
