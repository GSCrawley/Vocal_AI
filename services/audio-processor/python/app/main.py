# app/main.py
from fastapi import FastAPI, Header, HTTPException, UploadFile, File
from fastapi.responses import JSONResponse
import secrets
import tempfile
import os
from app.config import settings
import redis

# We import pitch processing directly for the fast synchronous endpoint
from app.utils.audio_io import load_audio
from app.analysis.pitch import extract_pitch_pyin, pitch_to_frames

app = FastAPI(title="voice-audio-processor", version="0.1.0")
redis_client = redis.from_url(settings.redis_url)

@app.get("/healthz")
def health():
    try:
        redis_client.ping()
        return {"ok": True}
    except Exception:
        return JSONResponse(status_code=503, content={"ok": False, "error": "redis_unreachable"})

@app.get("/jobs/{job_id}/status")
def job_status(job_id: str, x_internal_token: str = Header(None)):
    if x_internal_token is None or not secrets.compare_digest(x_internal_token, settings.internal_service_token):
        raise HTTPException(status_code=403)
    result = redis_client.hgetall(f"job:{job_id}")
    if not result:
        raise HTTPException(status_code=404)
    return {k.decode(): v.decode() for k, v in result.items()}

@app.post("/pitch/extract")
async def extract_pitch_sync(
    file: UploadFile = File(...),
    x_internal_token: str = Header(None)
):
    if x_internal_token is None or not secrets.compare_digest(x_internal_token, settings.internal_service_token):
        raise HTTPException(status_code=403)
    
    with tempfile.NamedTemporaryFile(delete=False, suffix=os.path.splitext(file.filename or "")[1] or ".m4a") as tmp:
        content = await file.read()
        tmp.write(content)
        tmp_path = tmp.name
        
    try:
        y, sr = load_audio(tmp_path, sr=settings.sample_rate)
        pitch_result = extract_pitch_pyin(y, sr)
        pitch_frames = pitch_to_frames(pitch_result)
        return {"ok": True, "frames": pitch_frames}
    except Exception as e:
        return JSONResponse(status_code=500, content={"ok": False, "error": str(e)})
    finally:
        if os.path.exists(tmp_path):
            os.remove(tmp_path)
