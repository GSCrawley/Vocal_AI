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
    sound = parselmouth.Sound(values=y.astype(np.float64), sampling_frequency=sr)

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