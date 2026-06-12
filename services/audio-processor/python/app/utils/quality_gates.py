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