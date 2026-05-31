import librosa
import numpy as np
import soundfile as sf
import io
from app.config import settings
from app.storage.supabase_client import download_file

MAX_DURATION_SECONDS = 600  # 10 minutes hard cap

def load_audio(
    url: str,
    sr: int = None,
    mono: bool = True,
    max_duration: float = MAX_DURATION_SECONDS,
) -> tuple[np.ndarray, int]:
    """
    Download audio from a Supabase signed URL and return (samples, sample_rate).
    Resamples to `sr` if provided. Forces mono if mono=True.
    Raises ValueError if duration exceeds max_duration.
    """
    sr = sr or settings.sample_rate
    audio_bytes = download_file(url)
    y, original_sr = sf.read(io.BytesIO(audio_bytes), always_2d=False)

    if len(y) / original_sr > max_duration:
        raise ValueError(f"Audio exceeds maximum duration of {max_duration}s")

    if mono and y.ndim > 1:
        y = y.mean(axis=1)

    if original_sr != sr:
        y = librosa.resample(y, orig_sr=original_sr, target_sr=sr)

    return y.astype(np.float32), sr

def audio_to_wav_bytes(y: np.ndarray, sr: int) -> bytes:
    buf = io.BytesIO()
    sf.write(buf, y, sr, format="WAV", subtype="PCM_16")
    buf.seek(0)
    return buf.read()