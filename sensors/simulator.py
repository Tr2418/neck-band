# sensors/simulator.py
# -----------------------------------------------------------
# CervicalSentinel – Sensor Data Simulator
#
# When you do not yet have the physical hardware (ESP32 +
# EMG + MPU6050) connected, this module generates realistic
# fake sensor readings so you can test the full pipeline.
#
# Three modes are available:
#   "normal"  – good posture, low muscle strain
#   "warning" – mild forward tilt, moderate strain
#   "alert"   – severe forward tilt, high strain
# -----------------------------------------------------------

import random
import math
import time
from datetime import datetime, timezone


def _clamp(value, lo, hi):
    """Restrict *value* to the range [lo, hi]."""
    return max(lo, min(hi, value))


def generate_reading(mode="random", duration_poor_posture=0):
    """
    Generate one simulated sensor reading.

    Parameters
    ----------
    mode : str
        'normal'  – healthy posture and muscle activity
        'warning' – mild posture deviation / strain
        'alert'   – severe posture deviation / high strain
        'random'  – randomly choose one of the three modes

    duration_poor_posture : int
        Seconds already spent in poor posture (carried forward
        from the previous reading by the caller).

    Returns
    -------
    dict  with keys matching the sensor_readings table columns
    """
    if mode == "random":
        # Weighted: 60 % normal, 25 % warning, 15 % alert
        mode = random.choices(
            ["normal", "warning", "alert"],
            weights=[60, 25, 15]
        )[0]

    timestamp = datetime.now(timezone.utc).isoformat()

    if mode == "normal":
        emg_upper_trap = _clamp(random.gauss(0.25, 0.08), 0.0, 0.55)
        emg_scm        = _clamp(random.gauss(0.20, 0.07), 0.0, 0.50)
        emg_levator    = _clamp(random.gauss(0.22, 0.07), 0.0, 0.52)
        pitch          = _clamp(random.gauss(8, 4),  -10, 18)
        roll           = _clamp(random.gauss(0, 4),  -12, 12)

    elif mode == "warning":
        emg_upper_trap = _clamp(random.gauss(0.65, 0.07), 0.55, 0.78)
        emg_scm        = _clamp(random.gauss(0.55, 0.07), 0.45, 0.70)
        emg_levator    = _clamp(random.gauss(0.60, 0.07), 0.48, 0.74)
        pitch          = _clamp(random.gauss(25, 4),  18, 33)
        roll           = _clamp(random.gauss(5, 5),  -15, 22)

    else:  # alert
        emg_upper_trap = _clamp(random.gauss(0.88, 0.06), 0.78, 1.0)
        emg_scm        = _clamp(random.gauss(0.82, 0.07), 0.70, 1.0)
        emg_levator    = _clamp(random.gauss(0.85, 0.06), 0.75, 1.0)
        pitch          = _clamp(random.gauss(40, 5),  33, 50)
        roll           = _clamp(random.gauss(10, 7), -25, 28)

    return {
        "timestamp":             timestamp,
        "emg_upper_trap":        round(emg_upper_trap, 4),
        "emg_scm":               round(emg_scm, 4),
        "emg_levator":           round(emg_levator, 4),
        "pitch":                 round(pitch, 2),
        "roll":                  round(roll, 2),
        "duration_poor_posture": duration_poor_posture,
        "mode":                  mode,   # informational only
    }


def stream_readings(n=10, interval=1.0, mode="random"):
    """
    Generator that yields *n* readings spaced *interval* seconds apart.

    Parameters
    ----------
    n        : int    number of readings to yield
    interval : float  seconds between readings
    mode     : str    see generate_reading()

    Yields
    ------
    dict  sensor reading

    Example
    -------
    >>> for reading in stream_readings(n=3, interval=0, mode="normal"):
    ...     print(reading["mode"])
    normal
    normal
    normal
    """
    duration = 0
    for i in range(n):
        reading = generate_reading(mode=mode,
                                   duration_poor_posture=duration)
        if reading["mode"] != "normal":
            duration += int(interval) if interval >= 1 else 1
        else:
            duration = 0
        yield reading
        if interval > 0 and i < n - 1:
            time.sleep(interval)


if __name__ == "__main__":
    # Quick demo: print 5 random readings
    print("Simulating 5 sensor readings …\n")
    for r in stream_readings(n=5, interval=0.5, mode="random"):
        print(r)
