from datetime import datetime
from typing import Any, Dict, Tuple
import numpy as np

from app.analysis.pitch import (
    extract_pitch_pyin,
    note_to_hz,
    midi_to_name,
    snap_to_exercise_key,
)
from app.analysis.range_walker import detect_vocal_range, segment_range_walk
from app.analysis.singing_metrics import compute_singing_metrics
from app.storage.supabase_client import supabase_client
from app.utils.audio_io import load_audio
from app.utils.quality_gates import check_quality


def _perform_quality_checks(
    range_audio: np.ndarray, hold_audio: np.ndarray, sr: int
) -> bool:
    """Extract pitch and check quality gates for both audio files."""
    range_pitch = extract_pitch_pyin(range_audio, sr)
    hold_pitch = extract_pitch_pyin(hold_audio, sr)

    range_quality = check_quality(range_audio, sr, range_pitch["voiced_flag"])
    hold_quality = check_quality(hold_audio, sr, hold_pitch["voiced_flag"])

    return range_quality.is_usable or hold_quality.is_usable


def _calculate_metrics(
    range_audio: np.ndarray, hold_audio: np.ndarray, sr: int, note_schedule: list
) -> Tuple[Dict[str, Any], Dict[str, Any], int]:
    """Run range walker and full metric analysis, and compute starting key."""
    pitch_frames_per_note = segment_range_walk(range_audio, sr, note_schedule)
    range_result = detect_vocal_range(pitch_frames_per_note)

    comfortable_mid = (
        range_result["comfortable_low_midi"] + range_result["comfortable_high_midi"]
    ) // 2

    target_hz = note_to_hz(comfortable_mid)

    metrics_result = compute_singing_metrics(
        hold_audio,
        sr,
        target_hz=target_hz,
        tolerance_cents=50.0,
    )

    recommended_key = snap_to_exercise_key(comfortable_mid)

    return range_result, metrics_result, recommended_key


def _build_result_payload(
    job_id: str,
    user_id: str,
    range_result: Dict[str, Any],
    metrics_result: Dict[str, Any],
    recommended_key: int,
) -> Dict[str, Any]:
    """Assemble the final result dictionary."""
    return {
        "jobId": job_id,
        "userId": user_id,
        "lowestNoteMidi": range_result["lowest_note_midi"],
        "highestNoteMidi": range_result["highest_note_midi"],
        "lowestNoteName": range_result["lowest_note_name"],
        "highestNoteName": range_result["highest_note_name"],
        "lowestHz": range_result["lowest_hz"],
        "highestHz": range_result["highest_hz"],
        "comfortableLowMidi": range_result["comfortable_low_midi"],
        "comfortableHighMidi": range_result["comfortable_high_midi"],
        "semitoneSpan": range_result["highest_note_midi"]
        - range_result["lowest_note_midi"],
        "comfortableSemitoneSpan": range_result["comfortable_high_midi"]
        - range_result["comfortable_low_midi"],
        "voiceType": range_result["voice_type"],
        "baselineMetrics": {
            "pitchAccuracy": metrics_result["pitch_accuracy"],
            "pitchStability": metrics_result["pitch_stability"],
            "breathControl": metrics_result["breath_control"],
            "toneQuality": metrics_result["tone_quality"],
            "hnrDb": metrics_result["hnr_db"],
            "cppDb": metrics_result["cpp_db"],
            "jitterLocal": metrics_result["jitter_local"],
            "shimmerLocal": metrics_result["shimmer_local"],
        },
        "recommendedStartingKeyMidi": recommended_key,
        "recommendedStartingKeyName": midi_to_name(recommended_key),
        "qualityFlag": "degraded" if metrics_result["quality_flag"] else "ok",
        "completedAt": datetime.utcnow().isoformat() + "Z",
    }


def _save_to_supabase(
    job_id: str,
    result: Dict[str, Any],
    range_result: Dict[str, Any],
    recommended_key: int,
) -> None:
    """Write result to Supabase."""
    supabase_client.table("user_baseline_snapshot").update(
        {
            "status": "complete",
            "result_json": result,
            "vocal_range_json": range_result,
            "metrics_json": result["baselineMetrics"],
            "voice_type": range_result["voice_type"],
            "lowest_note_midi": range_result["lowest_note_midi"],
            "highest_note_midi": range_result["highest_note_midi"],
            "comfortable_low_midi": range_result["comfortable_low_midi"],
            "comfortable_high_midi": range_result["comfortable_high_midi"],
            "recommended_key_midi": recommended_key,
            "quality_flag": result["qualityFlag"],
            "completed_at": result["completedAt"],
        }
    ).eq("snapshot_id", job_id).execute()


def run(job_payload: dict) -> dict:
    job_id = job_payload["jobId"]
    user_id = job_payload["userId"]
    range_test_url = job_payload["rangeTestAudioUrl"]
    sustained_hold_url = job_payload["sustainedHoldAudioUrl"]
    note_schedule = job_payload.get("noteSchedule", [])

    # 1. Download audio files from Supabase Storage
    range_audio, sr = load_audio(range_test_url)
    hold_audio, _ = load_audio(sustained_hold_url)

    # 2. Quality check
    is_usable = _perform_quality_checks(range_audio, hold_audio, sr)
    if not is_usable:
        return {
            "jobId": job_id,
            "status": "failed",
            "reason": "Both audio files failed quality check",
        }

    # 3. & 4. & 5. & 6. Analyze audio
    range_result, metrics_result, recommended_key = _calculate_metrics(
        range_audio, hold_audio, sr, note_schedule
    )

    # 7. Build result
    result = _build_result_payload(
        job_id, user_id, range_result, metrics_result, recommended_key
    )

    # 8. Write result to Supabase
    _save_to_supabase(job_id, result, range_result, recommended_key)

    return result
