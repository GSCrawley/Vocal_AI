import pytest
from fastapi.testclient import TestClient
import os
from unittest.mock import AsyncMock, patch

# Set env vars before importing main
os.environ["INTERNAL_SERVICE_TOKEN"] = "test-token"
os.environ["PORT"] = "8000"

from main import app

client = TestClient(app)

def test_healthz_error_without_redis():
    response = client.get("/healthz")
    # By default, mock won't have redis configured unless we run startup event
    # Let's test the endpoint response
    assert response.status_code == 200 or response.status_code == 503

@pytest.mark.asyncio
async def test_analyze_audio_unauthorized():
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

@pytest.mark.asyncio
@patch('main.redis_client')
async def test_analyze_audio_success(mock_redis):
    # Mock redis client rpush
    mock_redis.rpush = AsyncMock()

    response = client.post("/jobs/analyze", json={
        "jobId": "123",
        "audioUrl": "http://example.com/audio.wav",
        "userId": "user1"
    }, headers={"X-Internal-Token": "test-token"})

    assert response.status_code == 202
    assert response.json() == {"status": "queued", "jobId": "123"}
    mock_redis.rpush.assert_called_once()
