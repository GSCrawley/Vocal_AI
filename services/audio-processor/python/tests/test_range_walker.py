import pytest
from app.analysis.range_walker import _estimate_voice_type

def test_estimate_voice_type_soprano():
    # mid = (60 + 64) / 2 = 62 -> soprano
    assert _estimate_voice_type(60, 64) == "soprano"
    # mid = (62 + 70) / 2 = 66 -> soprano
    assert _estimate_voice_type(62, 70) == "soprano"

def test_estimate_voice_type_mezzo():
    # mid = (54 + 60) / 2 = 57 -> mezzo
    assert _estimate_voice_type(54, 60) == "mezzo"
    # mid = (56 + 64) / 2 = 60 -> mezzo
    assert _estimate_voice_type(56, 64) == "mezzo"

def test_estimate_voice_type_alto():
    # mid = (50 + 56) / 2 = 53 -> alto
    assert _estimate_voice_type(50, 56) == "alto"
    # mid = (52 + 58) / 2 = 55 -> alto
    assert _estimate_voice_type(52, 58) == "alto"

def test_estimate_voice_type_tenor():
    # mid = (46 + 50) / 2 = 48 -> tenor
    assert _estimate_voice_type(46, 50) == "tenor"
    # mid = (48 + 54) / 2 = 51 -> tenor
    assert _estimate_voice_type(48, 54) == "tenor"

def test_estimate_voice_type_baritone():
    # mid = (40 + 46) / 2 = 43 -> baritone
    assert _estimate_voice_type(40, 46) == "baritone"
    # mid = (42 + 50) / 2 = 46 -> baritone
    assert _estimate_voice_type(42, 50) == "baritone"

def test_estimate_voice_type_bass():
    # mid = (36 + 40) / 2 = 38 -> bass
    assert _estimate_voice_type(36, 40) == "bass"
    # mid = (40 + 44) / 2 = 42 -> bass
    assert _estimate_voice_type(40, 44) == "bass"
