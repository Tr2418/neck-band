# tests/test_database.py
# -----------------------------------------------------------
# Unit tests for the database layer (using an in-memory copy)
# -----------------------------------------------------------

import sys
import os
import tempfile
import sqlite3

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

# Override database path before importing db module
import config
_tmp = tempfile.NamedTemporaryFile(suffix=".db", delete=False)
_tmp.close()
config.DATABASE_PATH = _tmp.name

from database.db import (
    init_db, insert_reading, insert_alert, register_device,
    get_recent_readings, get_recent_alerts, get_all_fcm_tokens,
    get_daily_summary
)


def setup_module():
    """Initialise the database tables."""
    init_db()


def teardown_module():
    """Remove the temporary database file."""
    try:
        os.unlink(config.DATABASE_PATH)
    except Exception:
        pass


def test_insert_and_retrieve_reading():
    """Inserted reading should appear in get_recent_readings."""
    rid = insert_reading(
        emg_upper_trap=0.30, emg_scm=0.25, emg_levator=0.28,
        pitch=10, roll=5, duration_poor_posture=0,
        ml_prediction=0, ml_label="Normal",
        threshold_status="Normal"
    )
    assert isinstance(rid, int)
    assert rid > 0

    readings = get_recent_readings(limit=1)
    assert len(readings) == 1
    r = readings[0]
    assert r["emg_upper_trap"] == 0.30
    assert r["ml_label"] == "Normal"


def test_insert_and_retrieve_alert():
    """Inserted alert should appear in get_recent_alerts."""
    insert_alert(
        alert_type="EMG",
        severity="Warning",
        message="Test EMG warning",
        reading_id=1
    )
    alerts = get_recent_alerts(limit=1)
    assert len(alerts) >= 1
    assert alerts[0]["alert_type"] == "EMG"
    assert alerts[0]["severity"] == "Warning"


def test_register_device():
    """Registered device token should be retrievable."""
    register_device("Test Phone", "test-fcm-token-12345")
    tokens = get_all_fcm_tokens()
    assert "test-fcm-token-12345" in tokens


def test_register_device_duplicate():
    """Re-registering the same FCM token should not raise an error."""
    register_device("My Phone", "duplicate-token")
    register_device("My Phone v2", "duplicate-token")  # should not throw
    tokens = get_all_fcm_tokens()
    assert tokens.count("duplicate-token") == 1


def test_daily_summary_structure():
    """Daily summary should return a dict with Normal/Warning/Alert keys."""
    summary = get_daily_summary()
    assert "Normal"  in summary
    assert "Warning" in summary
    assert "Alert"   in summary
    assert all(isinstance(v, int) for v in summary.values())
