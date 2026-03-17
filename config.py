# config.py
# -----------------------------------------------------------
# CervicalSentinel – Central configuration
# Edit these values to match your hardware and preferences.
# -----------------------------------------------------------

import os

# ── Database ────────────────────────────────────────────────
# SQLite database file. The file is created automatically the
# first time you run the app. No installation needed.
DATABASE_PATH = os.path.join(os.path.dirname(__file__), "cervical_sentinel.db")

# ── Thresholds ──────────────────────────────────────────────
# EMG values range from 0 to 1023 (raw 10-bit ADC from ESP32).
# Values are normalised to 0–1 inside the code.
#
# EMG thresholds
EMG_WARNING_THRESHOLD  = 0.60   # 60 % of max → mild strain
EMG_ALERT_THRESHOLD    = 0.80   # 80 % of max → high strain

# Posture thresholds (degrees)
PITCH_WARNING_THRESHOLD = 20    # forward head tilt – mild
PITCH_ALERT_THRESHOLD   = 35    # forward head tilt – severe
ROLL_WARNING_THRESHOLD  = 15    # side tilt – mild
ROLL_ALERT_THRESHOLD    = 25    # side tilt – severe

# How many consecutive seconds of poor posture before an alert
POOR_POSTURE_DURATION_WARNING = 60    # 1 minute
POOR_POSTURE_DURATION_ALERT   = 1200  # 20 minutes

# ── Machine-Learning Model ──────────────────────────────────
MODEL_DIR   = os.path.join(os.path.dirname(__file__), "ml")
MODEL_PATH  = os.path.join(MODEL_DIR, "model.pkl")
SCALER_PATH = os.path.join(MODEL_DIR, "scaler.pkl")

# Labels used by the ML model
LABEL_NORMAL  = 0
LABEL_WARNING = 1
LABEL_ALERT   = 2
LABEL_NAMES   = {0: "Normal", 1: "Warning", 2: "Alert"}

# ── Flask API ────────────────────────────────────────────────
FLASK_HOST = "0.0.0.0"
FLASK_PORT = 5000
# Debug mode is OFF by default. Set to True only for local development.
# Never enable debug mode in production – it exposes an interactive debugger.
FLASK_DEBUG = os.environ.get("FLASK_DEBUG", "false").lower() == "true"

# ── Mobile Notifications ────────────────────────────────────
# Replace with your Firebase Cloud Messaging (FCM) Server Key
# to send real push notifications to the mobile app.
# Leave empty to use the built-in console notification only.
FCM_SERVER_KEY = os.environ.get("FCM_SERVER_KEY", "")
FCM_API_URL    = "https://fcm.googleapis.com/fcm/send"
