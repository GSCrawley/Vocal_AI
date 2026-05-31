import numpy as np
from fastdtw import fastdtw
from scipy.spatial.distance import euclidean
from app.analysis.pitch import hz_to_cents

def compare_pitch_curves(
    user_frames: list[dict],    # LivePitchFrame[] from user recording
    reference_frames: list[dict],  # LivePitchFrame[] from VocalAnalysisResult
) -> dict:
    """
    DTW comparison of user pitch curve against reference.

    Both curves are converted to cents-relative space before comparison
    so absolute pitch differences (key transposition) don't dominate.

    Returns:
        pitch_similarity: float 0–100
        timing_accuracy: float 0–100
        contour_match: float 0–100
        overall: float 0–100 (60% pitch + 20% timing + 20% contour)
        signed_pitch_error_cents: float (positive = sharp)
        dominant_failure_mode: str | None
        dtw_distance: float (raw, for debugging)
    """
    # Extract voiced frames only
    user_voiced = [
        f for f in user_frames
        if f["voiced"] and f.get("frequencyHz") and f["confidence"] >= 0.5
    ]
    ref_voiced = [
        f for f in reference_frames
        if f["voiced"] and f.get("frequencyHz") and f["confidence"] >= 0.5
    ]

    if not user_voiced or not ref_voiced:
        return _empty_comparison()

    # Convert to cents relative to mean (removes key transposition)
    user_hz = np.array([f["frequencyHz"] for f in user_voiced])
    ref_hz = np.array([f["frequencyHz"] for f in ref_voiced])

    user_mean = user_hz.mean()
    ref_mean = ref_hz.mean()

    user_cents = np.array([hz_to_cents(h, user_mean) for h in user_hz])
    ref_cents = np.array([hz_to_cents(h, ref_mean) for h in ref_hz])

    # DTW distance (lower = more similar)
    distance, path = fastdtw(
        user_cents.reshape(-1, 1),
        ref_cents.reshape(-1, 1),
        dist=euclidean,
    )
    normalized_distance = distance / max(len(user_cents), len(ref_cents))

    # Pitch similarity: 0 distance = 100, 100 cents avg = ~30
    pitch_similarity = max(0.0, min(100.0, 100.0 - normalized_distance * 0.8))

    # Timing accuracy
    user_duration_ms = user_frames[-1]["timestampMs"] - user_frames[0]["timestampMs"]
    ref_duration_ms = reference_frames[-1]["timestampMs"] - reference_frames[0]["timestampMs"]
    duration_ratio = abs(user_duration_ms - ref_duration_ms) / max(ref_duration_ms, 1)
    timing_accuracy = max(50.0, 100.0 - duration_ratio * 100.0)

    # Contour match (direction agreement)
    contour_match = _compute_contour_match(user_cents, ref_cents)

    # Signed pitch error (positive = sharp)
    aligned_user = user_cents[[p[0] for p in path]]
    aligned_ref = ref_cents[[p[1] for p in path]]
    signed_error = float((aligned_user - aligned_ref).mean())

    # Composite score
    overall = pitch_similarity * 0.6 + timing_accuracy * 0.2 + contour_match * 0.2

    # Dominant failure mode
    failure = _detect_failure_mode(
        pitch_similarity, timing_accuracy, contour_match,
        signed_error, user_duration_ms, ref_duration_ms
    )

    return {
        "pitch_similarity": round(pitch_similarity, 1),
        "timing_accuracy": round(timing_accuracy, 1),
        "contour_match": round(contour_match, 1),
        "overall": round(overall, 1),
        "signed_pitch_error_cents": round(signed_error, 2),
        "dominant_failure_mode": failure,
        "dtw_distance": round(normalized_distance, 4),
    }

def _compute_contour_match(user_cents, ref_cents, n_segments=8):
    def directions(arr):
        seg = len(arr) // n_segments
        dirs = []
        for i in range(0, len(arr) - seg, seg):
            diff = arr[i + seg] - arr[i]
            dirs.append(1 if diff > 5 else (-1 if diff < -5 else 0))
        return dirs

    u_dirs = directions(user_cents)
    r_dirs = directions(ref_cents)
    matches = sum(u == r for u, r in zip(u_dirs, r_dirs))
    return round(100.0 * matches / max(len(u_dirs), 1), 1)

def _detect_failure_mode(pitch, timing, contour, signed_error, user_dur, ref_dur):
    min_score = min(pitch, timing, contour)
    if min_score >= 60:
        return None
    if pitch == min_score:
        return "pitch_flat" if signed_error < -20 else "pitch_sharp" if signed_error > 20 else "pitch_instability"
    if timing == min_score:
        return "rushing" if user_dur < ref_dur * 0.85 else "dragging"
    return "wrong_contour"

def _empty_comparison():
    return {
        "pitch_similarity": 0.0, "timing_accuracy": 0.0, "contour_match": 0.0,
        "overall": 0.0, "signed_pitch_error_cents": 0.0,
        "dominant_failure_mode": None, "dtw_distance": 999.0,
    }