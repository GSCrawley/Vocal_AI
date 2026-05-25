import os
from typing import Any

from fastapi import Depends, FastAPI, Header, HTTPException
from fastapi.responses import JSONResponse
import uvicorn

app = FastAPI(title="VOICE Audio Processor")


def _require_internal_token(x_internal_token: str | None = Header(default=None, alias="X-Internal-Token")) -> None:
    expected_token = os.getenv("INTERNAL_SERVICE_TOKEN")
    if not expected_token:
        raise HTTPException(status_code=503, detail="Internal service token is not configured")
    if x_internal_token != expected_token:
        raise HTTPException(status_code=401, detail="Unauthorized")


def _extract_job_id(job_data: dict[str, Any]) -> str:
    job_id = job_data.get("jobId")
    if not isinstance(job_id, str) or not job_id.strip():
        raise HTTPException(status_code=400, detail="jobId is required and must be a non-empty string")
    return job_id

@app.get("/healthz")
def health_check():
    return {"status": "ok"}

@app.post("/jobs/vocal_separation", dependencies=[Depends(_require_internal_token)])
def run_vocal_separation(job_data: dict[str, Any]):
    # TODO: Implement demucs vocal separation
    return JSONResponse(status_code=202, content={"status": "queued", "jobId": _extract_job_id(job_data)})

@app.post("/jobs/vocal_analysis", dependencies=[Depends(_require_internal_token)])
def run_vocal_analysis(job_data: dict[str, Any]):
    # TODO: Implement pYIN pitch analysis
    return JSONResponse(status_code=202, content={"status": "queued", "jobId": _extract_job_id(job_data)})

@app.post("/jobs/filler_detection", dependencies=[Depends(_require_internal_token)])
def run_filler_detection(job_data: dict[str, Any]):
    # TODO: Implement Whisper ASR
    return JSONResponse(status_code=202, content={"status": "queued", "jobId": _extract_job_id(job_data)})

@app.post("/jobs/karaoke_compare", dependencies=[Depends(_require_internal_token)])
def run_karaoke_compare(job_data: dict[str, Any]):
    # TODO: Implement DTW comparison
    return JSONResponse(status_code=202, content={"status": "queued", "jobId": _extract_job_id(job_data)})

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=int(os.getenv("PORT", "8000")))
