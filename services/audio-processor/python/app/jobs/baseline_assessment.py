from app.analysis.range_walker import segment_range_walk
from app.analysis.pitch import note_to_hz, midi_to_name, snap_to_exercise_key
from app.utils.quality_gates import check_quality
from app.utils.audio_io import download_and_load
from app.storage.supabase_client import supabase_client
from datetime import datetime


def run(job_payload: dict) -> dict:
    job_id = job_payload["jobId"]
    user_id = job_payload["userId"]
    range_test_url = job_payload["rangeTestAudioUrl"]
    sustained_hold_url = job_payload["sustainedHoldAudioUrl"]
    note_schedule = job_payload.get("noteSchedule", [])

    # 1. Download audio files from Supabase Storage
    range_audio, sr = download_and_load(range_test_url)
    hold_audio, _ = download_and_load(sustained_hold_url)

    # 2. Quality check — both files
    from app.analysis.pitch import extract_pitch_pyin

    range_pitch = extract_pitch_pyin(range_audio, sr)
    hold_pitch = extract_pitch_pyin(hold_audio, sr)
    range_quality = check_quality(range_audio, sr, range_pitch["voiced_flag"])
    hold_quality = check_quality(hold_audio, sr, hold_pitch["voiced_flag"])

    if not range_quality.is_usable and not hold_quality.is_usable:
        return {
            "jobId": job_id,
            "status": "failed",
            "reason": "Both audio files failed quality check",
        }

    # 3. Segment range walk audio by note schedule
    # note_schedule: [{midiNote, timestampMs, holdDurationMs}, ...]
    pitch_frames_per_note = segment_range_walk(range_audio, sr, note_schedule)

    # 4. Run range walker
    from app.analysis.range_walker import detect_vocal_range

    range_result = detect_vocal_range(pitch_frames_per_note)

    # 5. Run full metric analysis on sustained hold
    from app.analysis.singing_metrics import compute_singing_metrics

    # Use recommended starting key (midpoint of comfortable range) as target_hz
    target_hz = note_to_hz(
        (range_result["comfortable_low_midi"] + range_result["comfortable_high_midi"])
        // 2
    )
    metrics_result = compute_singing_metrics(
        hold_audio,
        sr,
        target_hz=target_hz,
        tolerance_cents=50.0,  # Wide tolerance for baseline
    )

    # 6. Compute recommended starting key
    comfortable_mid = (
        range_result["comfortable_low_midi"] + range_result["comfortable_high_midi"]
    ) // 2
    # Round to nearest chromatic note that's in a common exercise-friendly key
    recommended_key = snap_to_exercise_key(comfortable_mid)

    # 7. Build result
    result = {
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

    # 8. Write result to Supabase (via supabase-py client)
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

    return result
