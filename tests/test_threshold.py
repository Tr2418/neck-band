# tests/test_threshold.py
# -----------------------------------------------------------
# Unit tests for the threshold / alert module
# -----------------------------------------------------------

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from threshold.alert import check_thresholds, evaluate_reading


def test_normal_posture():
    """All values well within safe limits → Normal."""
    result = check_thresholds(
        emg_upper_trap=0.30, emg_scm=0.25, emg_levator=0.28,
        pitch=10, roll=5, duration_poor_posture=0
    )
    assert result["status"] == "Normal"
    assert result["triggers"] == []


def test_emg_warning():
    """EMG between warning and alert thresholds → Warning."""
    result = check_thresholds(
        emg_upper_trap=0.65, emg_scm=0.40, emg_levator=0.35,
        pitch=5, roll=2, duration_poor_posture=0
    )
    assert result["status"] == "Warning"
    assert any(t["type"] == "EMG" for t in result["triggers"])


def test_emg_alert():
    """EMG above alert threshold → Alert."""
    result = check_thresholds(
        emg_upper_trap=0.85, emg_scm=0.50, emg_levator=0.45,
        pitch=5, roll=2, duration_poor_posture=0
    )
    assert result["status"] == "Alert"
    assert any(t["severity"] == "Alert" for t in result["triggers"])


def test_pitch_warning():
    """Forward head tilt in warning range → Warning."""
    result = check_thresholds(
        emg_upper_trap=0.20, emg_scm=0.15, emg_levator=0.18,
        pitch=25, roll=3, duration_poor_posture=0
    )
    assert result["status"] == "Warning"
    assert any(t["type"] == "POSTURE" for t in result["triggers"])


def test_pitch_alert():
    """Severe forward head tilt → Alert."""
    result = check_thresholds(
        emg_upper_trap=0.20, emg_scm=0.15, emg_levator=0.18,
        pitch=40, roll=3, duration_poor_posture=0
    )
    assert result["status"] == "Alert"


def test_roll_alert():
    """Severe side tilt → Alert."""
    result = check_thresholds(
        emg_upper_trap=0.20, emg_scm=0.15, emg_levator=0.18,
        pitch=5, roll=28, duration_poor_posture=0
    )
    assert result["status"] == "Alert"


def test_duration_warning():
    """1 minute of poor posture → Warning."""
    result = check_thresholds(
        emg_upper_trap=0.20, emg_scm=0.15, emg_levator=0.18,
        pitch=5, roll=3, duration_poor_posture=60
    )
    assert result["status"] == "Warning"
    assert any(t["type"] == "DURATION" for t in result["triggers"])


def test_duration_alert():
    """20 minutes of poor posture → Alert."""
    result = check_thresholds(
        emg_upper_trap=0.20, emg_scm=0.15, emg_levator=0.18,
        pitch=5, roll=3, duration_poor_posture=1200
    )
    assert result["status"] == "Alert"
    assert any(t["type"] == "DURATION" for t in result["triggers"])


def test_highest_severity_wins():
    """Multiple triggers present → Alert wins over Warning."""
    result = check_thresholds(
        emg_upper_trap=0.65,  # Warning
        emg_scm=0.40,
        emg_levator=0.35,
        pitch=40,             # Alert
        roll=3,
        duration_poor_posture=0
    )
    assert result["status"] == "Alert"
    assert len(result["triggers"]) >= 2


def test_evaluate_reading_dict():
    """evaluate_reading accepts a dict and returns the correct status."""
    reading = {
        "emg_upper_trap": 0.30,
        "emg_scm": 0.25,
        "emg_levator": 0.28,
        "pitch": 10,
        "roll": 5,
        "duration_poor_posture": 0,
    }
    result = evaluate_reading(reading)
    assert result["status"] == "Normal"
