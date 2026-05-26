from fastapi.testclient import TestClient
import os
from unittest.mock import AsyncMock, patch

# Set env vars before importing main
os.environ["INTERNAL_SERVICE_TOKEN"] = "test-token"
os.environ["PORT"] = "8000"

from main import app


def build_redis_client_mock():
    redis_client = AsyncMock()
    redis_client.ping = AsyncMock(return_value=True)
    redis_client.rpush = AsyncMock()
    redis_client.blpop = AsyncMock(return_value=None)
    redis_client.aclose = AsyncMock()
    return redis_client

def test_healthz_error_without_redis():
    with patch("main.worker_loop", new=AsyncMock()):
        with TestClient(app) as client:
            with patch("main.redis_client", None), patch("main.supabase_client", None):
                response = client.get("/healthz")

    assert response.status_code == 200
    assert response.json() == {
        "status": "ok",
        "checks": {
            "supabase": "unconfigured",
            "redis": "unconfigured",
        },
    }


def test_analyze_audio_unauthorized():
    mock_redis = build_redis_client_mock()

    with patch("main.worker_loop", new=AsyncMock()), patch("main.redis.from_url", return_value=mock_redis):
        with TestClient(app) as client:
            response = client.post("/jobs/analyze", json={
                "jobId": "123",
                "audioUrl": "http://example.com/audio.wav",
                "userId": "user1"
            })
            assert response.status_code == 401

            response = client.post("/jobs/analyze", json={
                "jobId": "123",
                "audioUrl": "http://example.com/audio.wav",
                "userId": "user1"
            }, headers={"X-Internal-Token": "wrong-token"})
            assert response.status_code == 401


def test_analyze_audio_success():
    mock_redis = build_redis_client_mock()

    with patch("main.worker_loop", new=AsyncMock()), patch("main.redis.from_url", return_value=mock_redis):
        with TestClient(app) as client:
            response = client.post("/jobs/analyze", json={
                "jobId": "123",
                "audioUrl": "http://example.com/audio.wav",
                "userId": "user1"
            }, headers={"X-Internal-Token": "test-token"})

    assert response.status_code == 202
    assert response.json() == {"status": "queued", "jobId": "123"}
    mock_redis.rpush.assert_called_once()
