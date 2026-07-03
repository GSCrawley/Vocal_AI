# app/jobs/vocal_analysis.py
import json
from datetime import datetime
import librosa
import numpy as np
from app.config import settings
from app.utils.audio_io import load_audio
from app.analysis.pitch import extract_pitch_pyin, pitch_to_frames, hz_to_note_name

def run(job_payload: dict):
    """
    Matches TypeScript VocalAnalysisJob / VocalAnalysisResult.
    Analyzes the vocal stem produced by a VocalSeparationJob.
    Stores result in Supabase (vocalAnalysisId) and Redis.
    """
    job_id = job_payload["jobId"]
    vocal_stem_url = job_payload["vocalStemUrl"]

    y, sr = load_audio(vocal_stem_url, sr=settings.sample_rate)

    # Pitch extraction on the reference vocal
    pitch_result = extract_pitch_pyin(y, sr)
    pitch_frames = pitch_to_frames(pitch_result)

    # Phrase segmentation via onset detection
    onset_frames = librosa.onset.onset_detect(y=y, sr=sr, hop_length=settings.hop_length)
    onset_times_ms = (librosa.frames_to_time(onset_frames, sr=sr, hop_length=settings.hop_length) * 1000).tolist()
    phrase_segments = _build_phrase_segments(onset_times_ms, len(y) / sr * 1000)

    # Key and tempo
    tempo, _ = librosa.beat.beat_track(y=y, sr=sr)
    chroma = librosa.feature.chroma_cqt(y=y, sr=sr)
    key_index = int(np.argmax(chroma.mean(axis=1)))
    key_names = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"]
    estimated_key = key_names[key_index]

    # Vocal range from pitch data
    voiced_hz = [f["frequencyHz"] for f in pitch_frames if f["voiced"] and f.get("frequencyHz")]
    vocal_range = {
        "low": min(voiced_hz) if voiced_hz else 0,
        "high": max(voiced_hz) if voiced_hz else 0,
    }

    output = {
        "jobId": job_id,
        "songId": job_payload["songId"],
        "pitchFrames": pitch_frames,
        "phraseSegments": phrase_segments,
        "estimatedKey": estimated_key,
        "tempoEstimateBpm": float(tempo),
        "vocalRangeHz": vocal_range,
        "completedAt": datetime.utcnow().isoformat() + "Z",
    }
    return output

def _build_phrase_segments(onset_times_ms, total_duration_ms):
    segments = []
    for i, start_ms in enumerate(onset_times_ms):
        end_ms = onset_times_ms[i + 1] if i + 1 < len(onset_times_ms) else total_duration_ms
        segments.append({
            "startMs": start_ms,
            "endMs": end_ms,
            "labelledAsPhrase": True,
        })
    return segments