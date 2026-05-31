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