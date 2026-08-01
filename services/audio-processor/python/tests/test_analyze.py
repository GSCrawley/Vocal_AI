import io
import os

import numpy as np
import soundfile as sf
from fastapi.testclient import TestClient

# Set safe defaults before importing the app so Settings() doesn't require a real .env
os.environ.setdefault("REDIS_URL", "redis://localhost:6379")
os.environ.setdefault("SUPABASE_URL", "https://test.supabase.co")
os.environ.setdefault("SUPABASE_SERVICE_ROLE_KEY", "test-service-role-key")
os.environ.setdefault("INTERNAL_SERVICE_TOKEN", "test-internal-token")

from app.config import settings
from app.main import app

client = TestClient(app)


def create_synthesized_audio(freq=440.0, duration=1.0, sr=44100):
    t = np.linspace(0, duration, int(sr * duration), False)
    # Generate a sine wave
    y = 0.5 * np.sin(2 * np.pi * freq * t)

    # Apply a simple envelope to prevent clicks and give it an onset
    attack = int(0.05 * sr)
    decay = int(0.05 * sr)
    envelope = np.ones_like(y)
    envelope[:attack] = np.linspace(0, 1, attack)
    envelope[-decay:] = np.linspace(1, 0, decay)
    y = y * envelope

    # Write to an in-memory file
    buf = io.BytesIO()
    sf.write(buf, y, sr, format="WAV", subtype="PCM_16")
    buf.seek(0)
    return buf.read()


def test_analyze_endpoint_with_synthesized_tone():
    # 1. Generate an A4 tone
    freq = 440.0
    wav_bytes = create_synthesized_audio(freq=freq, duration=1.0)

    # 2. Send to /analyze endpoint
    response = client.post(
        "/analyze",
        headers={"x-internal-token": settings.internal_service_token},
        files={"file": ("test.wav", wav_bytes, "audio/wav")},
        data={"targetHz": freq, "toleranceCents": 25.0},
    )

    assert response.status_code == 200, response.text
    result = response.json()

    # 3. Assert on the DeepAnalysisResult contract
    assert "refinedPitchContour" in result
    assert "onsetTimestampsMs" in result
    assert "rmsEnvelope" in result
    assert "vibrato" in result
    assert "overallConfidence" in result

    # Check pitch contour
    pitch_frames = result["refinedPitchContour"]
    assert len(pitch_frames) > 0

    # Find a voiced frame and check its frequency
    voiced_frames = [
        f for f in pitch_frames if f["voiced"] and f["frequencyHz"] is not None
    ]
    assert len(voiced_frames) > 0

    # A4 is 440 Hz. Check that median pitch is close to 440Hz
    median_hz = np.median([f["frequencyHz"] for f in voiced_frames])
    assert abs(median_hz - 440.0) < 5.0  # allow 5 Hz tolerance

    # Check onset
    assert len(result["onsetTimestampsMs"]) > 0
    # Onset should be near the beginning
    assert result["onsetTimestampsMs"][0] < 100.0  # onset within first 100ms

    # Check RMS envelope
    rms = result["rmsEnvelope"]
    assert rms["meanDb"] < 0
    assert rms["peakDb"] > rms["meanDb"]

    # Check vibrato (should not have vibrato for a pure sine wave)
    vibrato = result["vibrato"]
    assert isinstance(vibrato["hasVibrato"], bool)
    assert (
        isinstance(vibrato["rateHz"], (int, float))
        and vibrato["rateHz"] >= 0.0
        and vibrato["rateHz"] <= 20.0
    )
    assert (
        isinstance(vibrato["depthCents"], (int, float)) and vibrato["depthCents"] >= 0.0
    )

    # Overall confidence (most of the 1-second file should be voiced)
    assert result["overallConfidence"] > 0.8
