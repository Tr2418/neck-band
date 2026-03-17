# threshold/alert.py
# -----------------------------------------------------------
# CervicalSentinel – Threshold-Based Alert System
#
# This module evaluates every sensor reading against the
# configured thresholds and returns a human-readable status
# and a list of triggered alerts.
#
# Two layers of detection:
#  1. Rule-based threshold checks (fast, deterministic)
#  2. ML model prediction (for nuanced pattern recognition)
#
# The combined result is returned as a dict so the API can
# store it in the database and send notifications.
# -----------------------------------------------------------

import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
from config import (
    EMG_WARNING_THRESHOLD, EMG_ALERT_THRESHOLD,
    PITCH_WARNING_THRESHOLD, PITCH_ALERT_THRESHOLD,
    ROLL_WARNING_THRESHOLD, ROLL_ALERT_THRESHOLD,
    POOR_POSTURE_DURATION_WARNING, POOR_POSTURE_DURATION_ALERT,
)


def check_thresholds(emg_upper_trap, emg_scm, emg_levator,
                     pitch, roll, duration_poor_posture=0):
    """
    Evaluate sensor values against the configured thresholds.

    Parameters
    ----------
    emg_upper_trap        : float  0.0–1.0  (upper trapezius EMG)
    emg_scm               : float  0.0–1.0  (SCM muscle EMG)
    emg_levator           : float  0.0–1.0  (levator scapulae EMG)
    pitch                 : float  degrees  (+ = forward head tilt)
    roll                  : float  degrees  (+ = side tilt)
    duration_poor_posture : int    seconds  (consecutive poor posture)

    Returns
    -------
    dict
        {
          "status"   : str           "Normal" | "Warning" | "Alert",
          "triggers" : list[dict]    each dict has "type", "severity", "message"
        }

    Example
    -------
    >>> result = check_thresholds(0.85, 0.4, 0.3, 40, 5, 1300)
    >>> result["status"]
    'Alert'
    >>> len(result["triggers"]) >= 1
    True
    """
    triggers  = []
    max_level = 0  # 0=Normal, 1=Warning, 2=Alert

    emg_max = max(emg_upper_trap, emg_scm, emg_levator)

    # ── EMG checks ───────────────────────────────────────────
    if emg_max >= EMG_ALERT_THRESHOLD:
        triggers.append({
            "type":     "EMG",
            "severity": "Alert",
            "message":  (
                f"High muscle strain detected! "
                f"Peak EMG = {emg_max:.2f} "
                f"(threshold = {EMG_ALERT_THRESHOLD})"
            ),
        })
        max_level = max(max_level, 2)
    elif emg_max >= EMG_WARNING_THRESHOLD:
        triggers.append({
            "type":     "EMG",
            "severity": "Warning",
            "message":  (
                f"Elevated muscle activity. "
                f"Peak EMG = {emg_max:.2f} "
                f"(threshold = {EMG_WARNING_THRESHOLD})"
            ),
        })
        max_level = max(max_level, 1)

    # ── Posture (pitch) checks ───────────────────────────────
    abs_pitch = abs(pitch)
    if abs_pitch >= PITCH_ALERT_THRESHOLD:
        triggers.append({
            "type":     "POSTURE",
            "severity": "Alert",
            "message":  (
                f"Severe forward head posture! "
                f"Pitch = {pitch:.1f}° "
                f"(threshold = {PITCH_ALERT_THRESHOLD}°)"
            ),
        })
        max_level = max(max_level, 2)
    elif abs_pitch >= PITCH_WARNING_THRESHOLD:
        triggers.append({
            "type":     "POSTURE",
            "severity": "Warning",
            "message":  (
                f"Mild forward head posture. "
                f"Pitch = {pitch:.1f}° "
                f"(threshold = {PITCH_WARNING_THRESHOLD}°)"
            ),
        })
        max_level = max(max_level, 1)

    # ── Posture (roll) checks ────────────────────────────────
    abs_roll = abs(roll)
    if abs_roll >= ROLL_ALERT_THRESHOLD:
        triggers.append({
            "type":     "POSTURE",
            "severity": "Alert",
            "message":  (
                f"Severe side tilt detected! "
                f"Roll = {roll:.1f}° "
                f"(threshold = {ROLL_ALERT_THRESHOLD}°)"
            ),
        })
        max_level = max(max_level, 2)
    elif abs_roll >= ROLL_WARNING_THRESHOLD:
        triggers.append({
            "type":     "POSTURE",
            "severity": "Warning",
            "message":  (
                f"Lateral neck tilt. "
                f"Roll = {roll:.1f}° "
                f"(threshold = {ROLL_WARNING_THRESHOLD}°)"
            ),
        })
        max_level = max(max_level, 1)

    # ── Duration checks ──────────────────────────────────────
    if duration_poor_posture >= POOR_POSTURE_DURATION_ALERT:
        minutes = duration_poor_posture // 60
        triggers.append({
            "type":     "DURATION",
            "severity": "Alert",
            "message":  (
                f"You have been in poor posture for {minutes} minutes! "
                "Please correct your position immediately."
            ),
        })
        max_level = max(max_level, 2)
    elif duration_poor_posture >= POOR_POSTURE_DURATION_WARNING:
        minutes = duration_poor_posture // 60
        triggers.append({
            "type":     "DURATION",
            "severity": "Warning",
            "message":  (
                f"You have been in poor posture for {minutes} minute(s). "
                "Consider adjusting your position."
            ),
        })
        max_level = max(max_level, 1)

    status_map = {0: "Normal", 1: "Warning", 2: "Alert"}
    return {
        "status":   status_map[max_level],
        "triggers": triggers,
    }


def evaluate_reading(reading):
    """
    Convenience wrapper that accepts a dict (as returned by the
    database layer or the sensor simulator) and returns the
    full threshold evaluation result.

    Parameters
    ----------
    reading : dict
        Must contain: emg_upper_trap, emg_scm, emg_levator,
                      pitch, roll, duration_poor_posture

    Returns
    -------
    dict  (same structure as check_thresholds)
    """
    return check_thresholds(
        emg_upper_trap        = reading["emg_upper_trap"],
        emg_scm               = reading["emg_scm"],
        emg_levator           = reading["emg_levator"],
        pitch                 = reading["pitch"],
        roll                  = reading["roll"],
        duration_poor_posture = reading.get("duration_poor_posture", 0),
    )
