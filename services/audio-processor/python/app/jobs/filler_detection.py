import whisper
import numpy as np
from datetime import datetime
from app.utils.audio_io import load_audio
from app.config import settings

# Module-level model cache — load once at worker startup
_whisper_model = None

def get_whisper_model():
    global _whisper_model
    if _whisper_model is None:
        _whisper_model = whisper.load_model(settings.whisper_model)
    return _whisper_model

FILLER_WORDS = {
    "um", "uh", "er", "ah", "like", "you know", "so", "basically",
    "literally", "actually", "kind of", "sort of", "i mean", "right",
}

def run(job_payload: dict) -> dict:
    job_id = job_payload["jobId"]
    y, sr = load_audio(job_payload["audioFileUrl"], sr=16000)  # Whisper uses 16kHz

    model = get_whisper_model()
    result = model.transcribe(
        y,
        word_timestamps=True,
        language="en",
        condition_on_previous_text=False,
    )

    filler_events = []
    total_words = 0

    for segment in result.get("segments", []):
        for word_info in segment.get("words", []):
            word = word_info["word"].strip().lower().rstrip(".,!?")
            total_words += 1
            if word in FILLER_WORDS:
                filler_events.append({
                    "timestampMs": round(word_info["start"] * 1000),
                    "word": word_info["word"].strip(),
                    "confidence": float(word_info.get("probability", 0.8)),
                })

    duration_minutes = len(y) / 16000 / 60
    filler_rate = len(filler_events) / max(duration_minutes, 0.01)

    return {
        "jobId": job_id,
        "attemptId": job_payload["attemptId"],
        "fillerEvents": filler_events,
        "fillerRate": round(filler_rate, 2),
        "totalWords": total_words,
        "transcriptText": result.get("text", ""),
        "completedAt": datetime.utcnow().isoformat() + "Z",
    }