from fastapi.testclient import TestClient
from app.main import app
from app.config import settings

client = TestClient(app)

def test_healthz_redis_unreachable(mocker):
    # Mock redis to raise exception
    mocker.patch('app.main.redis_client.ping', side_effect=Exception("Redis down"))
    response = client.get("/healthz")
    assert response.status_code == 503
    assert response.json() == {"ok": False, "error": "redis_unreachable"}

def test_healthz_redis_ok(mocker):
    mocker.patch('app.main.redis_client.ping', return_value=True)
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

def test_job_status_valid_token_not_found(mocker):
    # Mock redis returning empty (job not found)
    mocker.patch('app.main.redis_client.hgetall', return_value={})
    response = client.get(
        "/jobs/123/status",
        headers={"x-internal-token": settings.internal_service_token}
    )
    assert response.status_code == 404
    assert response.json() == {"detail": "Not Found"}

def test_job_status_valid_token_found(mocker):
    mocker.patch('app.main.redis_client.hgetall', return_value={b"status": b"completed"})
    response = client.get(
        "/jobs/123/status",
        headers={"x-internal-token": settings.internal_service_token}
    )
    assert response.status_code == 200
    assert response.json() == {"status": "completed"}
