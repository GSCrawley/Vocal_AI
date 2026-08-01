import pytest
from app.storage.supabase_client import validate_url_safe
from app.main import app
from fastapi.testclient import TestClient
from app.config import settings

client = TestClient(app)


def test_validate_url_safe_blocks_private_ips(monkeypatch):

    def mock_getaddrinfo(host, port, *args, **kwargs):
        import socket
        if host == "localhost":
            ip = "127.0.0.1"
        elif host == "example.com" or host == "otherdomain.com":
            ip = "93.184.216.34"
        else:
            ip = host
        return [(socket.AF_INET, socket.SOCK_STREAM, 6, '', (ip, 0))]

    import socket
    monkeypatch.setattr(socket, "getaddrinfo", mock_getaddrinfo)
    # Set supabase_url so hostname match logic succeeds
    monkeypatch.setattr(settings, "supabase_url", "https://localhost:8000")
    # Test localhost and loopback
    with pytest.raises(ValueError, match="forbidden IP address"):
        validate_url_safe("https://localhost:8000/audio.wav")

    monkeypatch.setattr(settings, "supabase_url", "https://127.0.0.1")
    with pytest.raises(ValueError, match="forbidden IP address"):
        validate_url_safe("https://127.0.0.1/audio.wav")

    monkeypatch.setattr(settings, "supabase_url", "https://169.254.169.254")
    # Test metadata endpoint
    with pytest.raises(ValueError, match="forbidden IP address"):
        validate_url_safe("https://169.254.169.254/latest/meta-data/")

    # Test some private IPs
    monkeypatch.setattr(settings, "supabase_url", "http://10.0.0.1")
    with pytest.raises(ValueError, match="forbidden IP address"):
        validate_url_safe("http://10.0.0.1/test.wav")

    monkeypatch.setattr(settings, "supabase_url", "http://192.168.1.100")
    with pytest.raises(ValueError, match="forbidden IP address"):
        validate_url_safe("http://192.168.1.100/test.wav")

    # Should not raise for public IP/domain (we test using example.com which resolves to a public IP)
    monkeypatch.setattr(settings, "supabase_url", "https://example.com")
    try:
        validate_url_safe("https://example.com/audio.wav")
    except ValueError as e:
        pytest.fail(
            f"validate_url_safe raised ValueError unexpectedly on a valid public URL: {e}"
        )

    # Should raise if hostname does not match supabase host
    with pytest.raises(ValueError, match="is not allowed"):
        validate_url_safe("https://otherdomain.com/audio.wav")


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


def test_extract_pitch_handles_tempfile_write_errors(monkeypatch):
    class BrokenTempFile:
        name = "/tmp/broken-temp.wav"

        def __enter__(self):
            return self

        def __exit__(self, exc_type, exc, tb):
            return False

        def write(self, _content):
            raise OSError("disk full")

    import app.main

    monkeypatch.setattr(
        app.main.tempfile,
        "NamedTemporaryFile",
        lambda *args, **kwargs: BrokenTempFile(),
    )

    response = client.post(
        "/pitch/extract",
        headers={"x-internal-token": settings.internal_service_token},
        files={"file": ("test.wav", b"fake audio data", "audio/wav")},
    )

    assert response.status_code == 500
    assert response.json() == {"ok": False, "error": "internal_error"}
