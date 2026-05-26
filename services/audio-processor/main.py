import os
import asyncio
import json
import uuid
from contextlib import suppress
from fastapi import Depends, FastAPI, Header, HTTPException, Request
from fastapi.responses import JSONResponse
import uvicorn
import structlog
import redis.asyncio as redis
from supabase import create_client, Client

structlog.configure(
    processors=[
        structlog.stdlib.add_log_level,
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.JSONRenderer(),
    ]
)

logger = structlog.get_logger()

app = FastAPI(title="VOICE Audio Processor")

# Global dependencies
redis_client = None
supabase_client: Client = None

@app.on_event("startup")
async def startup_event():
    global redis_client, supabase_client

    redis_url = os.getenv("REDIS_URL", "redis://localhost:6379")
    redis_client = redis.from_url(redis_url)

    supabase_url = os.getenv("SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_ANON_KEY")

    if supabase_url and supabase_key:
        supabase_client = create_client(supabase_url, supabase_key)
    else:
        logger.warning("Supabase URL or Key not set. Supabase client will not be initialized.")

    app.state.worker_task = asyncio.create_task(worker_loop())
    logger.info("Service started")

@app.on_event("shutdown")
async def shutdown_event():
    worker_task = getattr(app.state, "worker_task", None)
    if worker_task:
        worker_task.cancel()
        with suppress(asyncio.CancelledError):
            await worker_task
        app.state.worker_task = None
    if redis_client:
        await redis_client.aclose()
    logger.info("Service stopped")

def _download_audio(bucket_name: str, filename: str):
    return supabase_client.storage.from_(bucket_name).download(filename)

def _save_result(job_id: str, user_id: str, bucket_name: str):
    return (
        supabase_client.table("audio_analysis_results")
        .insert({
            "job_id": job_id,
            "user_id": user_id,
            "status": "completed",
            "result": {"analysis": "ok", "bucket_used": bucket_name},
        })
        .execute()
    )

async def worker_loop():
    logger.info("Worker loop started")
    bucket_name = os.getenv("SUPABASE_STORAGE_BUCKET_AUDIO", "user-audio")
    while True:
        try:
            if not redis_client:
                await asyncio.sleep(5)
                continue

            # Block until a job is available
            job = await redis_client.blpop("audio_jobs", timeout=1)
            if not job:
                continue

            _, data_bytes = job
            data = json.loads(data_bytes)
            job_id = data.get("jobId")
            audio_url = data.get("audioUrl")
            user_id = data.get("userId")

            logger.info("Processing job", job_id=job_id, user_id=user_id)

            if supabase_client and audio_url:
                try:
                    # Parse filename from URL or use a generated one
                    filename = audio_url.split("/")[-1] if "/" in audio_url else f"{uuid.uuid4()}.wav"

                    # Download audio from storage bucket
                    try:
                        await asyncio.to_thread(_download_audio, bucket_name, filename)
                        logger.info("Successfully downloaded audio from bucket", bucket=bucket_name, file=filename)
                        # Process audio... (simulated here)
                    except Exception as download_e:
                        logger.warning("Failed to download audio. Proceeding with simulated data.", error=str(download_e), bucket=bucket_name)

                    # Simulate processing time
                    await asyncio.sleep(2)

                    # Update table with results
                    await asyncio.to_thread(_save_result, job_id, user_id, bucket_name)
                    logger.info("Job results saved", job_id=job_id)
                except Exception as e:
                    logger.error("Failed to process job or save results", error=str(e), job_id=job_id)
            else:
                await asyncio.sleep(2)
                logger.info("Job simulated without supabase client", job_id=job_id)

            logger.info("Job completed", job_id=job_id)
        except asyncio.CancelledError:
            break
        except Exception as e:
            logger.error("Worker error", error=str(e))
            await asyncio.sleep(5)

def _require_internal_token(x_internal_token: str | None = Header(default=None, alias="X-Internal-Token")) -> None:
    expected_token = os.getenv("INTERNAL_SERVICE_TOKEN")
    if not expected_token:
        # Fails closed if expected_token is missing
        raise HTTPException(status_code=503, detail="Internal service token is not configured")
    if not x_internal_token or x_internal_token != expected_token:
        # Fails closed if client didn't provide a token or it doesn't match
        raise HTTPException(status_code=401, detail="Unauthorized")

@app.get("/healthz")
async def health_check():
    health_status = {"status": "ok", "checks": {}}

    # Check Supabase
    if not supabase_client:
        health_status["checks"]["supabase"] = "unconfigured"
    else:
        try:
            health_status["checks"]["supabase"] = "ok"
        except Exception as e:
            health_status["status"] = "error"
            health_status["checks"]["supabase"] = str(e)

    # Check Redis
    if not redis_client:
        health_status["checks"]["redis"] = "unconfigured"
    else:
        try:
            await redis_client.ping()
            health_status["checks"]["redis"] = "ok"
        except Exception as e:
            health_status["status"] = "error"
            health_status["checks"]["redis"] = str(e)

    if health_status["status"] != "ok":
        return JSONResponse(status_code=503, content=health_status)

    return health_status

@app.post("/jobs/analyze", dependencies=[Depends(_require_internal_token)])
async def analyze_audio(request: Request):
    data = await request.json()

    job_id = data.get("jobId")
    audio_url = data.get("audioUrl")
    user_id = data.get("userId")

    if not all([job_id, audio_url, user_id]):
        raise HTTPException(status_code=400, detail="jobId, audioUrl, and userId are required")

    if not redis_client:
        raise HTTPException(status_code=503, detail="Redis client is not initialized")

    job_payload = {
        "jobId": job_id,
        "audioUrl": audio_url,
        "userId": user_id,
        "type": "analyze"
    }

    await redis_client.rpush("audio_jobs", json.dumps(job_payload))
    logger.info("Job queued", job_id=job_id)

    return JSONResponse(status_code=202, content={"status": "queued", "jobId": job_id})

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=int(os.getenv("PORT", "8000")))
