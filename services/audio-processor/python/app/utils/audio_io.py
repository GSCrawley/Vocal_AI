import librosa
import numpy as np
import soundfile as sf
import io
import urllib.parse
import ipaddress
import socket
from app.config import settings
from app.storage.supabase_client import download_file

MAX_DURATION_SECONDS = 600  # 10 minutes hard cap


def validate_url_safe(url: str) -> None:
    """
    Validates that a URL is safe to download from.
    Prevents SSRF by checking against private, loopback, and link-local IP addresses.
    Expects audio_url to be a Supabase Storage URL.
    """
    parsed = urllib.parse.urlparse(url)
    if parsed.scheme not in ("http", "https"):
        raise ValueError("URL must use http or https scheme")

    hostname = parsed.hostname
    if not hostname:
        raise ValueError("URL must contain a hostname")

    # Resolve hostname to IP
    try:
        ip_addr = socket.gethostbyname(hostname)
        ip = ipaddress.ip_address(ip_addr)
    except socket.gaierror:
        raise ValueError(f"Could not resolve hostname: {hostname}")
    except ValueError:
        raise ValueError(f"Invalid IP address resolved from hostname: {hostname}")

    # Check for private, loopback, link-local, multicast, reserved
    if (
        ip.is_private
        or ip.is_loopback
        or ip.is_link_local
        or ip.is_multicast
        or ip.is_reserved
        or str(ip) == "0.0.0.0"
        or str(ip) == "255.255.255.255"
        # Explicit check for AWS metadata endpoint just in case
        or str(ip) == "169.254.169.254"
    ):
        raise ValueError(f"URL resolves to a forbidden IP address: {ip}")


def load_audio(
    url_or_path: str,
    sr: int | None = None,
    mono: bool = True,
    max_duration: float = MAX_DURATION_SECONDS,
    allow_local_path: bool = False,
) -> tuple[np.ndarray, int]:
    """
    Download audio from a Supabase signed URL or load from local path and return (samples, sample_rate).
    Resamples to `sr` if provided. Forces mono if mono=True.
    Raises ValueError if duration exceeds max_duration.
    Local filesystem paths are only permitted when allow_local_path=True; this must only be
    set for internally-generated temp files, never for user-controlled strings.
    """
    sr = sr or settings.sample_rate

    if url_or_path.startswith("http://") or url_or_path.startswith("https://"):
        validate_url_safe(url_or_path)
        audio_bytes = download_file(url_or_path)
        y, original_sr = sf.read(io.BytesIO(audio_bytes), always_2d=False)
    else:
        if not allow_local_path:
            raise ValueError(
                "Local filesystem paths are not permitted. "
                "Pass allow_local_path=True only for internally-generated temp files."
            )
        y, original_sr = sf.read(url_or_path, always_2d=False)

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
