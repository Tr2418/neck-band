# database/db.py
# -----------------------------------------------------------
# CervicalSentinel – Database layer (SQLite)
#
# SQLite is a file-based database – no server installation
# required.  The database file is created automatically.
#
# Tables
# ──────
#  sensor_readings   – every data point received from the ESP32
#  alerts            – every alert that was triggered
#  user_devices      – registered mobile devices for notifications
# -----------------------------------------------------------

import sqlite3
import sys
import os
from datetime import datetime, timezone

# Make sure we can import from the project root
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
from config import DATABASE_PATH


def get_connection():
    """
    Open and return a connection to the SQLite database.

    Returns
    -------
    sqlite3.Connection
        A live database connection with row_factory set so
        results come back as dict-like objects.

    Example
    -------
    >>> conn = get_connection()
    >>> conn.execute("SELECT sqlite_version()").fetchone()
    """
    conn = sqlite3.connect(DATABASE_PATH)
    # row_factory lets you access columns by name: row["emg_upper_trap"]
    conn.row_factory = sqlite3.Row
    # Enable foreign-key enforcement
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def init_db():
    """
    Create all tables if they do not already exist.

    Call this once at application start-up.
    """
    conn = get_connection()
    cursor = conn.cursor()

    # ── sensor_readings ──────────────────────────────────────
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS sensor_readings (
            id                  INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp           TEXT    NOT NULL,

            -- EMG channels (normalised 0.0–1.0)
            emg_upper_trap      REAL    NOT NULL,
            emg_scm             REAL    NOT NULL,
            emg_levator         REAL    NOT NULL,

            -- Posture angles from MPU6050 (degrees)
            pitch               REAL    NOT NULL,
            roll                REAL    NOT NULL,

            -- How many consecutive seconds in poor posture
            duration_poor_posture INTEGER NOT NULL DEFAULT 0,

            -- ML prediction: 0=Normal, 1=Warning, 2=Alert
            ml_prediction       INTEGER,
            ml_label            TEXT,

            -- Threshold-based status
            threshold_status    TEXT
        )
    """)

    # ── alerts ───────────────────────────────────────────────
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS alerts (
            id              INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp       TEXT    NOT NULL,
            alert_type      TEXT    NOT NULL,   -- 'EMG', 'POSTURE', 'DURATION'
            severity        TEXT    NOT NULL,   -- 'Warning' or 'Alert'
            message         TEXT    NOT NULL,
            reading_id      INTEGER,
            FOREIGN KEY (reading_id) REFERENCES sensor_readings(id)
        )
    """)

    # ── user_devices ─────────────────────────────────────────
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS user_devices (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            device_name TEXT    NOT NULL,
            fcm_token   TEXT    NOT NULL UNIQUE,
            registered  TEXT    NOT NULL
        )
    """)

    conn.commit()
    conn.close()
    print("[DB] Database initialised at:", DATABASE_PATH)


# ── CRUD helpers ─────────────────────────────────────────────

def insert_reading(emg_upper_trap, emg_scm, emg_levator,
                   pitch, roll, duration_poor_posture=0,
                   ml_prediction=None, ml_label=None,
                   threshold_status=None):
    """
    Insert one sensor reading row and return the new row ID.

    Parameters
    ----------
    emg_upper_trap : float   (0.0 – 1.0)
    emg_scm        : float   (0.0 – 1.0)
    emg_levator    : float   (0.0 – 1.0)
    pitch          : float   degrees  (+ = forward head tilt)
    roll           : float   degrees  (+ = side tilt)
    duration_poor_posture : int  consecutive seconds in poor posture
    ml_prediction  : int or None
    ml_label       : str or None
    threshold_status : str or None

    Returns
    -------
    int – the new row ID
    """
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO sensor_readings
            (timestamp, emg_upper_trap, emg_scm, emg_levator,
             pitch, roll, duration_poor_posture,
             ml_prediction, ml_label, threshold_status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        datetime.now(timezone.utc).isoformat(),
        emg_upper_trap, emg_scm, emg_levator,
        pitch, roll, duration_poor_posture,
        ml_prediction, ml_label, threshold_status
    ))
    new_id = cursor.lastrowid
    conn.commit()
    conn.close()
    return new_id


def insert_alert(alert_type, severity, message, reading_id=None):
    """
    Log an alert to the database.

    Parameters
    ----------
    alert_type : str    e.g. 'EMG', 'POSTURE', 'DURATION'
    severity   : str    'Warning' or 'Alert'
    message    : str    Human-readable description
    reading_id : int    ID of the sensor reading that triggered the alert
    """
    conn = get_connection()
    conn.execute("""
        INSERT INTO alerts (timestamp, alert_type, severity, message, reading_id)
        VALUES (?, ?, ?, ?, ?)
    """, (datetime.now(timezone.utc).isoformat(), alert_type, severity, message, reading_id))
    conn.commit()
    conn.close()


def register_device(device_name, fcm_token):
    """
    Register a mobile device for push notifications.

    If the FCM token already exists, update the device name.
    """
    conn = get_connection()
    conn.execute("""
        INSERT INTO user_devices (device_name, fcm_token, registered)
        VALUES (?, ?, ?)
        ON CONFLICT(fcm_token) DO UPDATE SET device_name = excluded.device_name
    """, (device_name, fcm_token, datetime.now(timezone.utc).isoformat()))
    conn.commit()
    conn.close()


def get_recent_readings(limit=50):
    """Return the most recent *limit* sensor readings as a list of dicts."""
    conn = get_connection()
    rows = conn.execute("""
        SELECT * FROM sensor_readings
        ORDER BY id DESC
        LIMIT ?
    """, (limit,)).fetchall()
    conn.close()
    return [dict(row) for row in rows]


def get_recent_alerts(limit=20):
    """Return the most recent *limit* alerts as a list of dicts."""
    conn = get_connection()
    rows = conn.execute("""
        SELECT * FROM alerts
        ORDER BY id DESC
        LIMIT ?
    """, (limit,)).fetchall()
    conn.close()
    return [dict(row) for row in rows]


def get_all_fcm_tokens():
    """Return all registered FCM tokens."""
    conn = get_connection()
    rows = conn.execute("SELECT fcm_token FROM user_devices").fetchall()
    conn.close()
    return [row["fcm_token"] for row in rows]


def get_daily_summary():
    """
    Return counts of Normal / Warning / Alert readings for today.

    Returns
    -------
    dict  e.g. {"Normal": 120, "Warning": 30, "Alert": 5}
    """
    today = datetime.now(timezone.utc).date().isoformat()
    conn = get_connection()
    rows = conn.execute("""
        SELECT ml_label, COUNT(*) as cnt
        FROM sensor_readings
        WHERE timestamp LIKE ?
        GROUP BY ml_label
    """, (today + "%",)).fetchall()
    conn.close()
    summary = {"Normal": 0, "Warning": 0, "Alert": 0}
    for row in rows:
        if row["ml_label"] in summary:
            summary[row["ml_label"]] = row["cnt"]
    return summary
