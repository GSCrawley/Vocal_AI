# VOICE — Python Audio Processor

This service handles heavy server-side audio computation for VOICE, including vocal separation (Demucs), pitch extraction (pYIN/CREPE), voice quality analysis (Praat), and speech recognition (Whisper).

It exposes a minimal FastAPI app for health checks and relies on a Redis-backed RQ worker to process jobs.

## Development

```bash
python3.11 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
pip install -r requirements-dev.txt

# Run tests
pytest
```
