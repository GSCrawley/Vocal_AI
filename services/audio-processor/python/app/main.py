# app/main.py
from fastapi import FastAPI, Header, HTTPException
from app.config import settings
import redis

app = FastAPI(title="voice-audio-processor", version="0.1.0")
redis_client = redis.from_url(settings.redis_url)

@app.get("/healthz")
def health():
    try:
        redis_client.ping()
        return {"ok": True}
    except Exception:
        return {"ok": False, "error": "redis_unreachable"}, 503

@app.get("/jobs/{job_id}/status")
def job_status(job_id: str, x_internal_token: str = Header(None)):
    if x_internal_token != settings.internal_service_token:
        raise HTTPException(status_code=403)
    result = redis_client.hgetall(f"job:{job_id}")
    if not result:
        raise HTTPException(status_code=404)
    return {k.decode(): v.decode() for k, v in result.items()}