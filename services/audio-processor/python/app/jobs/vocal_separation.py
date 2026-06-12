# app/jobs/vocal_separation.py
import redis
import json
from datetime import datetime
from app.config import settings
from app.storage.supabase_client import download_file
from app.separation.demucs_runner import separate_vocals

redis_client = redis.from_url(settings.redis_url)

def run(job_payload: dict):
    """
    Input matches TypeScript VocalSeparationJob:
    { jobType, jobId, songId, audioFileUrl, requestedAt }

    Output matches TypeScript VocalSeparationResult.
    Writes result to Redis hash job:{jobId} and returns result dict.
    """
    job_id = job_payload["jobId"]
    song_id = job_payload["songId"]
    audio_url = job_payload["audioFileUrl"]
    ephemeral = job_payload.get("ephemeral", False)

    _set_status(job_id, "processing")

    audio_bytes = download_file(audio_url)
    result = separate_vocals(
        input_audio_bytes=audio_bytes,
        job_id=job_id,
        song_id=song_id,
        output_bucket=settings.supabase_storage_bucket_karaoke,
        ephemeral=ephemeral,
    )

    output = {
        "jobId": job_id,
        "songId": song_id,
        "instrumentalStemUrl": result["instrumental_stem_url"],
        "vocalStemUrl": result["vocal_stem_url"],
        "completedAt": datetime.utcnow().isoformat() + "Z",
    }
    _set_result(job_id, output)
    return output

def _set_status(job_id: str, status: str):
    redis_client.hset(f"job:{job_id}", "status", status)

def _set_result(job_id: str, result: dict):
    redis_client.hset(f"job:{job_id}", mapping={
        "status": "complete",
        "result": json.dumps(result),
        "completedAt": result["completedAt"],
    })
    redis_client.expire(f"job:{job_id}", 86400)  # 24-hour TTL on job result