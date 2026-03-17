# tests/test_simulator.py
# -----------------------------------------------------------
# Unit tests for the sensor data simulator
# -----------------------------------------------------------

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from sensors.simulator import generate_reading, stream_readings


def _check_reading_schema(reading):
    """Assert that a reading has all required keys and sensible ranges."""
    required = ["timestamp", "emg_upper_trap", "emg_scm", "emg_levator",
                "pitch", "roll", "duration_poor_posture"]
    for key in required:
        assert key in reading, f"Missing key: {key}"

    assert 0.0 <= reading["emg_upper_trap"] <= 1.0
    assert 0.0 <= reading["emg_scm"]        <= 1.0
    assert 0.0 <= reading["emg_levator"]    <= 1.0
    assert -90 <= reading["pitch"]          <= 90
    assert -90 <= reading["roll"]           <= 90
    assert reading["duration_poor_posture"] >= 0


def test_generate_normal():
    r = generate_reading(mode="normal")
    _check_reading_schema(r)
    assert r["mode"] == "normal"


def test_generate_warning():
    r = generate_reading(mode="warning")
    _check_reading_schema(r)
    assert r["mode"] == "warning"


def test_generate_alert():
    r = generate_reading(mode="alert")
    _check_reading_schema(r)
    assert r["mode"] == "alert"


def test_generate_random():
    for _ in range(20):
        r = generate_reading(mode="random")
        _check_reading_schema(r)
        assert r["mode"] in ("normal", "warning", "alert")


def test_stream_count():
    readings = list(stream_readings(n=5, interval=0, mode="normal"))
    assert len(readings) == 5


def test_stream_duration_accumulates():
    """Duration should grow when posture is not normal."""
    readings = list(stream_readings(n=5, interval=0, mode="alert"))
    # First reading always has duration=0; subsequent ones should increase
    durations = [r["duration_poor_posture"] for r in readings]
    assert durations[0] == 0
    assert durations[-1] > 0
