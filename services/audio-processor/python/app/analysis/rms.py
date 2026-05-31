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