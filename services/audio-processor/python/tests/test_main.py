import os

# Set safe defaults before importing the app so Settings() doesn't require a real .env
os.environ.setdefault("REDIS_URL", "redis://localhost:6379")
os.environ.setdefault("SUPABASE_URL", "https://test.supabase.co")
os.environ.setdefault("SUPABASE_SERVICE_ROLE_KEY", "test-service-role-key")
os.environ.setdefault("INTERNAL_SERVICE_TOKEN", "test-internal-token")

from unittest.mock import patch
from fastapi.testclient import TestClient
from app.main import app
from app.config import settings

client = TestClient(app)

def test_healthz_redis_unreachable():
    with patch("app.main.redis_client.ping", side_effect=Exception("Redis down")):
        response = client.get("/healthz")
    assert response.status_code == 503
    assert response.json() == {"ok": False, "error": "redis_unreachable"}

def test_healthz_redis_ok():
    with patch("app.main.redis_client.ping", return_value=True):
        response = client.get("/healthz")
    assert response.status_code == 200
    assert response.json() == {"ok": True}

def test_job_status_missing_token():
    response = client.get("/jobs/123/status")
    assert response.status_code == 403
    assert response.json() == {"detail": "Forbidden"}

def test_job_status_invalid_token():
    response = client.get("/jobs/123/status", headers={"x-internal-token": "invalid_token"})
    assert response.status_code == 403
    assert response.json() == {"detail": "Forbidden"}

def test_job_status_valid_token_not_found():
    with patch("app.main.redis_client.hgetall", return_value={}):
        response = client.get(
            "/jobs/123/status",
            headers={"x-internal-token": settings.internal_service_token},
        )
    assert response.status_code == 404
    assert response.json() == {"detail": "Not Found"}

def test_job_status_valid_token_found():
    with patch("app.main.redis_client.hgetall", return_value={b"status": b"completed"}):
        response = client.get(
            "/jobs/123/status",
            headers={"x-internal-token": settings.internal_service_token},
        )
    assert response.status_code == 200
    assert response.json() == {"status": "completed"}
