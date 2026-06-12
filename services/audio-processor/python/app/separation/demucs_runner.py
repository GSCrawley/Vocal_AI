import subprocess
import os
import tempfile
import shutil
import soundfile as sf
import numpy as np
from pathlib import Path
from app.config import settings
from app.utils.audio_io import audio_to_wav_bytes
from app.storage.supabase_client import upload_file

def separate_vocals(
    input_audio_bytes: bytes,
    job_id: str,
    song_id: str,
    output_bucket: str,
    ephemeral: bool = False,   # True for user-upload sessions; stems not cached
) -> dict:
    """
    Run HTDemucs on the input audio and return Supabase signed URLs
    for the vocal stem and instrumental stem.

    Uses subprocess + CLI for stability (avoids memory issues with
    loading Demucs model in-process alongside other heavy models).

    ephemeral=True: stems are uploaded with a 24-hour TTL metadata tag
    and scheduled for deletion by the data retention cron.

    Returns:
        vocal_stem_url: str (signed URL, 7-day expiry)
        instrumental_stem_url: str (signed URL, 7-day expiry)
        duration_seconds: float
        model_used: str
    """
    with tempfile.TemporaryDirectory() as tmpdir:
        input_path = os.path.join(tmpdir, f"{job_id}.wav")
        with open(input_path, "wb") as f:
            f.write(input_audio_bytes)

        # Run demucs CLI
        # --two-stems=vocals splits into vocals and no_vocals only
        # More efficient than full 4-stem when we only need vocal/instrumental
        cmd = [
            "python", "-m", "demucs",
            "--two-stems", "vocals",
            "-n", settings.demucs_model,     # "htdemucs" or "htdemucs_ft"
            "--out", tmpdir,
            input_path,
        ]
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=600)
        if result.returncode != 0:
            raise RuntimeError(f"Demucs failed: {result.stderr}")

        # Demucs output structure: {tmpdir}/{model}/{stem_name}/{filename}.wav
        output_dir = Path(tmpdir) / settings.demucs_model / Path(input_path).stem
        vocal_path = output_dir / "vocals.wav"
        instrumental_path = output_dir / "no_vocals.wav"

        if not vocal_path.exists() or not instrumental_path.exists():
            raise RuntimeError(f"Expected stems not found in {output_dir}")

        # Read and get duration
        vocal_y, vocal_sr = sf.read(str(vocal_path))
        duration_seconds = len(vocal_y) / vocal_sr

        # Upload stems to Supabase
        with open(str(vocal_path), "rb") as vf:
            vocal_bytes = vf.read()
        with open(str(instrumental_path), "rb") as inf_f:
            instrumental_bytes = inf_f.read()

        ttl_hours = 24 if ephemeral else None  # ephemeral sessions expire

        vocal_url = upload_file(
            data=vocal_bytes,
            bucket=output_bucket,
            path=f"stems/{song_id}/{job_id}/vocals.wav",
            content_type="audio/wav",
            ttl_hours=ttl_hours,
        )
        instrumental_url = upload_file(
            data=instrumental_bytes,
            bucket=output_bucket,
            path=f"stems/{song_id}/{job_id}/no_vocals.wav",
            content_type="audio/wav",
            ttl_hours=ttl_hours,
        )

    return {
        "vocal_stem_url": vocal_url,
        "instrumental_stem_url": instrumental_url,
        "duration_seconds": duration_seconds,
        "model_used": settings.demucs_model,
    }