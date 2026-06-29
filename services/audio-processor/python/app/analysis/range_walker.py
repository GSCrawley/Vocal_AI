import numpy as np
from app.analysis.pitch import extract_pitch_pyin, pitch_to_frames


def segment_range_walk(audio: np.ndarray, sr: int, note_schedule: list) -> dict:
    pitch_frames_per_note = {}

    for note in note_schedule:
        midi = note["midiNote"]
        start_sample = int((note["timestampMs"] / 1000.0) * sr)
        end_sample = int(((note["timestampMs"] + note["holdDurationMs"]) / 1000.0) * sr)

        end_sample = min(end_sample, len(audio))
        if start_sample >= end_sample:
            continue

        segment = audio[start_sample:end_sample]
        if len(segment) < sr * 0.3:
            continue

        pitch_result = extract_pitch_pyin(segment, sr)
        frames = pitch_to_frames(pitch_result)
        pitch_frames_per_note[midi] = [
            {
                "timestampMs": f["timestampMs"],
                "frequencyHz": f["frequencyHz"],
                "voiced": f["voiced"],
                "confidence": f["confidence"],
            }
            for f in frames
        ]

    return pitch_frames_per_note

def note_to_hz(midi_note: int) -> float:
    return 440.0 * (2 ** ((midi_note - 69) / 12))

def hz_to_midi(hz: float) -> int:
    return round(69 + 12 * np.log2(hz / 440.0))

def detect_vocal_range(
    pitch_frames_per_note: dict,  # {midi_note: LivePitchFrame[]} from baseline assessment
    confidence_threshold: float = 0.6,
    min_voiced_ratio: float = 0.5,
    sustain_frames_required: int = 8,   # ~1 second of sustained voiced frames
) -> dict:
    """
    Given a dict of per-note pitch frame arrays (from systematic scale test),
    determine the user's vocal range.

    Returns:
        lowest_note_midi: int
        highest_note_midi: int
        lowest_note_name: str (e.g. "E2")
        highest_note_name: str (e.g. "A4")
        lowest_hz: float
        highest_hz: float
        comfortable_low_midi: int  (notes where confidence > 0.75)
        comfortable_high_midi: int
        voice_type: str — soprano|mezzo|alto|tenor|baritone|bass (estimated)
    """
    usable_notes = []
    comfortable_notes = []

    for midi_note, frames in sorted(pitch_frames_per_note.items()):
        voiced_frames = [f for f in frames if f["voiced"] and f["confidence"] >= confidence_threshold]
        voiced_ratio = len(voiced_frames) / max(len(frames), 1)
        has_sustained = len(voiced_frames) >= sustain_frames_required
        avg_confidence = np.mean([f["confidence"] for f in voiced_frames]) if voiced_frames else 0.0

        if voiced_ratio >= min_voiced_ratio and has_sustained:
            usable_notes.append(midi_note)
        if voiced_ratio >= min_voiced_ratio and has_sustained and avg_confidence >= 0.75:
            comfortable_notes.append(midi_note)

    if not usable_notes:
        raise ValueError("No usable notes detected — check audio quality")

    lowest = min(usable_notes)
    highest = max(usable_notes)
    comfortable_low = min(comfortable_notes) if comfortable_notes else lowest
    comfortable_high = max(comfortable_notes) if comfortable_notes else highest

    voice_type = _estimate_voice_type(comfortable_low, comfortable_high)

    def midi_to_name(n):
        notes = ["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"]
        return f"{notes[n % 12]}{(n // 12) - 1}"

    return {
        "lowest_note_midi": lowest,
        "highest_note_midi": highest,
        "lowest_note_name": midi_to_name(lowest),
        "highest_note_name": midi_to_name(highest),
        "lowest_hz": note_to_hz(lowest),
        "highest_hz": note_to_hz(highest),
        "comfortable_low_midi": comfortable_low,
        "comfortable_high_midi": comfortable_high,
        "voice_type": voice_type,
    }

def _estimate_voice_type(low_midi: int, high_midi: int) -> str:
    mid = (low_midi + high_midi) / 2
    if mid >= 62:
        return "soprano"    # above D4
    if mid >= 57:
        return "mezzo"      # A3–D4
    if mid >= 53:
        return "alto"       # F3–A3
    if mid >= 48:
        return "tenor"      # C3–F3
    if mid >= 43:
        return "baritone"   # G2–C3
    return "bass"           # below G2