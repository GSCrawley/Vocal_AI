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
            "dynamics_score": None,
            "vibrato": {},
            "hnr_db": None,
            "cpp_db": None,
            "jitter_local": None,
            "shimmer_local": None,
            "rms_variance_db": None,
            "voiced_frame_ratio": round(quality.voiced_frame_ratio, 3),
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