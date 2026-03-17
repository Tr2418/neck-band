# app.py
# -----------------------------------------------------------
# CervicalSentinel – Flask REST API
#
# This is the main entry point for the server.  It ties
# together the database, ML model, threshold system, and
# notification module.
#
# Start the server:
#   python app.py
#
# API Endpoints
# ─────────────
#  POST /reading          – receive one sensor reading, classify it, store it
#  GET  /readings         – get the last N readings
#  GET  /alerts           – get the last N alerts
#  GET  /summary          – get today's posture summary
#  POST /device/register  – register a mobile device for push notifications
#  POST /simulate         – push N simulated readings (for testing)
#  GET  /                 – serve the web dashboard
# -----------------------------------------------------------

import os
import sys
from flask import Flask, request, jsonify, send_from_directory

# Allow imports from the project root
sys.path.insert(0, os.path.dirname(__file__))

from config import FLASK_HOST, FLASK_PORT, FLASK_DEBUG
from database.db     import (init_db, insert_reading, insert_alert,
                              register_device, get_recent_readings,
                              get_recent_alerts, get_all_fcm_tokens,
                              get_daily_summary)
from ml.predict       import predict
from threshold.alert  import check_thresholds
from notifications.notify import send_alert
from sensors.simulator    import generate_reading

app = Flask(__name__, static_folder="static")


# ── Initialise the database when the app starts ──────────────
with app.app_context():
    init_db()


# ────────────────────────────────────────────────────────────
# Helper
# ────────────────────────────────────────────────────────────

def _process_reading(data):
    """
    Core pipeline:
      1. Extract sensor values from *data* dict.
      2. Run threshold check.
      3. Run ML prediction.
      4. Store everything in the database.
      5. If an alert was triggered, log it and send a notification.

    Returns
    -------
    dict  full result suitable for a JSON API response
    """
    emg_upper_trap        = float(data["emg_upper_trap"])
    emg_scm               = float(data["emg_scm"])
    emg_levator           = float(data["emg_levator"])
    pitch                 = float(data["pitch"])
    roll                  = float(data["roll"])
    duration_poor_posture = int(data.get("duration_poor_posture", 0))

    # ── Threshold check ──────────────────────────────────────
    threshold_result = check_thresholds(
        emg_upper_trap, emg_scm, emg_levator,
        pitch, roll, duration_poor_posture
    )

    # ── ML prediction ────────────────────────────────────────
    try:
        ml_result = predict(
            emg_upper_trap, emg_scm, emg_levator,
            pitch, roll, duration_poor_posture
        )
        ml_prediction = ml_result["prediction"]
        ml_label      = ml_result["label"]
        ml_confidence = ml_result["confidence"]
    except FileNotFoundError:
        # Model not trained yet – use threshold result only
        ml_prediction = None
        ml_label      = threshold_result["status"]
        ml_confidence = None

    # ── Store reading ────────────────────────────────────────
    reading_id = insert_reading(
        emg_upper_trap        = emg_upper_trap,
        emg_scm               = emg_scm,
        emg_levator           = emg_levator,
        pitch                 = pitch,
        roll                  = roll,
        duration_poor_posture = duration_poor_posture,
        ml_prediction         = ml_prediction,
        ml_label              = ml_label,
        threshold_status      = threshold_result["status"],
    )

    # ── Log alerts and send notifications ────────────────────
    for trigger in threshold_result["triggers"]:
        insert_alert(
            alert_type = trigger["type"],
            severity   = trigger["severity"],
            message    = trigger["message"],
            reading_id = reading_id,
        )
        # Only send a push notification for Alert-level events
        if trigger["severity"] == "Alert":
            tokens = get_all_fcm_tokens()
            send_alert(
                severity   = trigger["severity"],
                message    = trigger["message"],
                fcm_tokens = tokens,
            )

    return {
        "reading_id":         reading_id,
        "threshold_status":   threshold_result["status"],
        "threshold_triggers": threshold_result["triggers"],
        "ml_prediction":      ml_prediction,
        "ml_label":           ml_label,
        "ml_confidence":      ml_confidence,
    }


# ────────────────────────────────────────────────────────────
# Routes
# ────────────────────────────────────────────────────────────

@app.route("/")
def dashboard():
    """Serve the web dashboard."""
    return send_from_directory("static", "dashboard.html")


@app.route("/reading", methods=["POST"])
def receive_reading():
    """
    Receive one sensor reading from the ESP32 (or the simulator).

    Expected JSON body
    ------------------
    {
      "emg_upper_trap":        0.35,
      "emg_scm":               0.28,
      "emg_levator":           0.30,
      "pitch":                 12.5,
      "roll":                  3.2,
      "duration_poor_posture": 0
    }

    Response
    --------
    {
      "reading_id":         1,
      "threshold_status":   "Normal",
      "threshold_triggers": [],
      "ml_prediction":      0,
      "ml_label":           "Normal",
      "ml_confidence":      0.97
    }
    """
    data = request.get_json()
    if not data:
        return jsonify({"error": "No JSON body provided"}), 400

    required = ["emg_upper_trap", "emg_scm", "emg_levator", "pitch", "roll"]
    missing  = [k for k in required if k not in data]
    if missing:
        return jsonify({"error": f"Missing fields: {missing}"}), 400

    try:
        result = _process_reading(data)
        return jsonify(result), 200
    except Exception as exc:
        return jsonify({"error": str(exc)}), 500


@app.route("/readings", methods=["GET"])
def get_readings():
    """
    Return the most recent sensor readings.

    Query params
    ------------
    limit : int  (default 50)
    """
    limit = request.args.get("limit", 50, type=int)
    readings = get_recent_readings(limit=limit)
    return jsonify(readings), 200


@app.route("/alerts", methods=["GET"])
def get_alerts():
    """
    Return the most recent alerts.

    Query params
    ------------
    limit : int  (default 20)
    """
    limit = request.args.get("limit", 20, type=int)
    alerts = get_recent_alerts(limit=limit)
    return jsonify(alerts), 200


@app.route("/summary", methods=["GET"])
def get_summary():
    """Return today's posture summary."""
    summary = get_daily_summary()
    return jsonify(summary), 200


@app.route("/device/register", methods=["POST"])
def register():
    """
    Register a mobile device for push notifications.

    Expected JSON body
    ------------------
    {
      "device_name": "My Phone",
      "fcm_token":   "xxxxxx"
    }
    """
    data = request.get_json()
    if not data or "fcm_token" not in data:
        return jsonify({"error": "fcm_token required"}), 400
    device_name = data.get("device_name", "Unknown Device")
    register_device(device_name, data["fcm_token"])
    return jsonify({"message": "Device registered successfully"}), 200


@app.route("/simulate", methods=["POST"])
def simulate():
    """
    Generate and process *n* simulated sensor readings.

    Expected JSON body (optional)
    ------------------------------
    {
      "n":    10,
      "mode": "random"   // "normal", "warning", "alert", or "random"
    }
    """
    data = request.get_json() or {}
    n    = int(data.get("n", 5))
    mode = data.get("mode", "random")

    if n > 100:
        return jsonify({"error": "Maximum 100 readings per call"}), 400

    results  = []
    duration = 0

    for _ in range(n):
        reading = generate_reading(mode=mode,
                                   duration_poor_posture=duration)
        result  = _process_reading(reading)
        results.append(result)

        # Update duration counter for the next iteration
        if result["threshold_status"] != "Normal":
            duration += 2   # assume ~2 seconds per reading
        else:
            duration = 0

    return jsonify({
        "generated": n,
        "results":   results,
    }), 200


# ────────────────────────────────────────────────────────────
# Entry point
# ────────────────────────────────────────────────────────────

if __name__ == "__main__":
    print("=" * 60)
    print("  CervicalSentinel API")
    print(f"  http://{FLASK_HOST}:{FLASK_PORT}")
    print("=" * 60)
    app.run(host=FLASK_HOST, port=FLASK_PORT, debug=FLASK_DEBUG)
