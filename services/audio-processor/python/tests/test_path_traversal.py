import pytest
from app.main import get_safe_suffix

def test_get_safe_suffix():
    assert get_safe_suffix("foo.m4a") == ".m4a"
    assert get_safe_suffix(None) == ".m4a"
    assert get_safe_suffix("") == ".m4a"

    # Path traversal attempts
    assert get_safe_suffix("../../../etc/passwd.txt") == ".txt"
    assert get_safe_suffix("..\\..\\..\\etc\\passwd.txt") == ".txt"
    assert get_safe_suffix("foo.m4a/../../../etc/passwd.txt") == ".txt"
    assert get_safe_suffix("foo.m4a\\..\\..\\..\\etc\\passwd.txt") == ".txt"

    # Invalid or dangerous extensions fallback to default
    assert get_safe_suffix("foo.") == ".m4a"
    assert get_safe_suffix("foo") == ".m4a"

    # Too long extension
    assert get_safe_suffix("foo." + "a" * 10) == ".m4a"

    # Extension character stripping
    # If the user tries `.txt*&`, it should strip special chars and return `.txt`
    assert get_safe_suffix("foo.txt*&") == ".txt"
    assert get_safe_suffix("foo.t x t") == ".txt"
