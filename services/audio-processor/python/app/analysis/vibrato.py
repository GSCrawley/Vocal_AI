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