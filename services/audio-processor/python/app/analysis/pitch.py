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