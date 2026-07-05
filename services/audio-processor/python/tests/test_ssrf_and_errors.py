import pytest
from app.utils.audio_io import validate_url_safe
from app.main import app
from fastapi.testclient import TestClient
from app.config import settings

client = TestClient(app)


def test_validate_url_safe_blocks_private_ips():
    # Test localhost and loopback
    with pytest.raises(ValueError, match="forbidden IP address"):
        validate_url_safe("http://localhost:8000/audio.wav")
    with pytest.raises(ValueError, match="forbidden IP address"):
        validate_url_safe("http://127.0.0.1/audio.wav")

    # Test metadata endpoint
    with pytest.raises(ValueError, match="forbidden IP address"):
        validate_url_safe("http://169.254.169.254/latest/meta-data/")

    # Test some private IPs
    with pytest.raises(ValueError, match="forbidden IP address"):
        validate_url_safe("http://10.0.0.1/test.wav")
    with pytest.raises(ValueError, match="forbidden IP address"):
        validate_url_safe("http://192.168.1.100/test.wav")

    # Should not raise for public IP/domain (we test using example.com which resolves to a public IP)
    try:
        validate_url_safe("https://example.com/audio.wav")
    except ValueError as e:
        pytest.fail(
            f"validate_url_safe raised ValueError unexpectedly on a valid public URL: {e}"
        )


def test_analyze_endpoint_hides_internal_errors(monkeypatch):
    # Mock load_audio to raise an exception
    def mock_load_audio(*args, **kwargs):
        raise RuntimeError("Internal secret exception details")

    import app.main

    monkeypatch.setattr(app.main, "load_audio", mock_load_audio)

    response = client.post(
        "/analyze",
        headers={"x-internal-token": settings.internal_service_token},
        data={"audio_url": "https://example.com/audio.wav"},
    )

    assert response.status_code == 500
    assert response.json() == {"error": "internal_error"}
    # The actual exception message should not leak
    assert "secret exception details" not in response.text


def test_extract_pitch_hides_internal_errors(monkeypatch):
    def mock_load_audio(*args, **kwargs):
        raise RuntimeError("Internal secret exception details in pitch")

    import app.main

    monkeypatch.setattr(app.main, "load_audio", mock_load_audio)

    response = client.post(
        "/pitch/extract",
        headers={"x-internal-token": settings.internal_service_token},
        files={"file": ("test.wav", b"fake audio data", "audio/wav")},
    )

    assert response.status_code == 500
    assert response.json() == {"ok": False, "error": "internal_error"}
    assert "secret exception details" not in response.text
