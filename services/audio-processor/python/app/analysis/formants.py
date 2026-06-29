import parselmouth
import numpy as np
import io
import soundfile as sf

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