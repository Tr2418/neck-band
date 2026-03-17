# CervicalSentinel 🩺

**AI-Powered Real-Time Neck Muscle & Posture Monitoring**

CervicalSentinel is a wearable system that monitors neck muscle activity and posture in real-time using machine learning. It combines EMG muscle sensors and a posture sensor (MPU6050) to detect strain and poor posture, sending alerts to the user's mobile device.

---

## 🗂 Project Structure

```
cervical_sentinel/
├── app.py                  # Flask REST API (main entry point)
├── config.py               # All thresholds, paths, and settings
├── requirements.txt        # Python dependencies
│
├── database/
│   └── db.py               # SQLite database setup and CRUD helpers
│
├── ml/
│   ├── train.py            # Train the Decision Tree ML model
│   └── predict.py          # Load model and classify sensor readings
│
├── threshold/
│   └── alert.py            # Threshold-based rule evaluation
│
├── sensors/
│   └── simulator.py        # Simulate EMG + MPU6050 sensor data
│
├── notifications/
│   └── notify.py           # Console + Firebase push notifications
│
├── static/
│   └── dashboard.html      # Web dashboard (auto-refreshes every 5 s)
│
└── tests/                  # Unit tests
    ├── test_threshold.py
    ├── test_database.py
    ├── test_simulator.py
    └── test_ml.py
```

---

## 🚀 Quick Start (Step-by-Step for Beginners)

### Step 1 – Install Python

Make sure you have **Python 3.9 or newer** installed.

```bash
python --version   # should show 3.9+
```

### Step 2 – Create a virtual environment (recommended)

```bash
python -m venv venv
source venv/bin/activate      # Linux / macOS
# OR
venv\Scripts\activate         # Windows
```

### Step 3 – Install dependencies

```bash
pip install -r requirements.txt
```

### Step 4 – Train the ML model

This generates a synthetic training dataset and trains a **Decision Tree classifier**. It only needs to be done once (or when you change the thresholds).

```bash
python ml/train.py
```

You should see training output ending with:
```
[✓] Model  saved to: ml/model.pkl
[✓] Scaler saved to: ml/scaler.pkl
Training complete. You can now start the Flask API.
```

### Step 5 – Start the API server

```bash
python app.py
```

The server starts at **http://localhost:5000**

### Step 6 – Open the dashboard

Open **http://localhost:5000** in your browser to see the live monitoring dashboard.

---

## 🔌 API Endpoints

| Method | Endpoint              | Description |
|--------|-----------------------|-------------|
| `GET`  | `/`                   | Web dashboard |
| `POST` | `/reading`            | Submit one sensor reading |
| `GET`  | `/readings?limit=50`  | Get recent readings |
| `GET`  | `/alerts?limit=20`    | Get recent alerts |
| `GET`  | `/summary`            | Today's posture summary |
| `POST` | `/device/register`    | Register device for push notifications |
| `POST` | `/simulate`           | Generate simulated readings for testing |

### Example: Submit a reading from the ESP32

```bash
curl -X POST http://localhost:5000/reading \
  -H "Content-Type: application/json" \
  -d '{
    "emg_upper_trap": 0.35,
    "emg_scm": 0.28,
    "emg_levator": 0.30,
    "pitch": 12.5,
    "roll": 3.2,
    "duration_poor_posture": 0
  }'
```

Response:
```json
{
  "reading_id": 1,
  "threshold_status": "Normal",
  "threshold_triggers": [],
  "ml_prediction": 0,
  "ml_label": "Normal",
  "ml_confidence": 1.0
}
```

### Example: Run a simulation

```bash
curl -X POST http://localhost:5000/simulate \
  -H "Content-Type: application/json" \
  -d '{"n": 10, "mode": "random"}'
```

---

## 🤖 Machine Learning

The ML model is a **Decision Tree classifier** trained on a synthetic dataset that reflects the physiological rules defined in the thresholds.

### Features used:
| Feature | Description |
|---------|-------------|
| `emg_upper_trap` | Upper trapezius EMG signal (0.0–1.0) |
| `emg_scm` | Sternocleidomastoid EMG signal (0.0–1.0) |
| `emg_levator` | Levator scapulae EMG signal (0.0–1.0) |
| `pitch` | Neck forward/backward tilt in degrees |
| `roll` | Neck side tilt in degrees |
| `duration_poor_posture` | Consecutive seconds in poor posture |

### Output labels:
| Label | Value | Meaning |
|-------|-------|---------|
| Normal | 0 | Good posture, low muscle strain |
| Warning | 1 | Mild strain or posture deviation |
| Alert | 2 | Severe strain or poor posture |

---

## ⚡ Thresholds

Edit `config.py` to customise the thresholds:

| Setting | Default | Description |
|---------|---------|-------------|
| `EMG_WARNING_THRESHOLD` | 0.60 | 60% EMG → Warning |
| `EMG_ALERT_THRESHOLD` | 0.80 | 80% EMG → Alert |
| `PITCH_WARNING_THRESHOLD` | 20° | Forward tilt → Warning |
| `PITCH_ALERT_THRESHOLD` | 35° | Forward tilt → Alert |
| `ROLL_WARNING_THRESHOLD` | 15° | Side tilt → Warning |
| `ROLL_ALERT_THRESHOLD` | 25° | Side tilt → Alert |
| `POOR_POSTURE_DURATION_WARNING` | 60 s | 1 min poor posture → Warning |
| `POOR_POSTURE_DURATION_ALERT` | 1200 s | 20 min poor posture → Alert |

---

## 🗄 Database

The project uses **SQLite** – a simple file-based database that requires no installation or server. The database file (`cervical_sentinel.db`) is created automatically.

### Tables:
- **`sensor_readings`** – every data point from the ESP32
- **`alerts`** – every triggered alert with type and severity
- **`user_devices`** – registered mobile devices for push notifications

---

## 📱 Mobile Push Notifications

Notifications are printed to the console by default. To enable **Firebase Cloud Messaging (FCM)** push notifications to your Android/iOS app:

1. Create a project at [https://console.firebase.google.com](https://console.firebase.google.com)
2. Add your mobile app to the project
3. Copy the **Server Key** from *Project Settings → Cloud Messaging*
4. Set it in `config.py`:
   ```python
   FCM_SERVER_KEY = "your-server-key-here"
   ```
5. Register your device:
   ```bash
   curl -X POST http://localhost:5000/device/register \
     -H "Content-Type: application/json" \
     -d '{"device_name": "My Phone", "fcm_token": "your-fcm-token"}'
   ```

---

## 🧪 Running Tests

```bash
python -m pytest tests/ -v
```

---

## 🔧 Hardware Integration (ESP32)

When your ESP32 hardware is ready, send sensor readings using an HTTP POST request to `/reading` every 1–2 seconds.

Minimal Arduino/MicroPython sketch:
```python
import urequests
import ujson

data = {
    "emg_upper_trap": emg1_value / 1023.0,   # normalise 10-bit ADC
    "emg_scm":        emg2_value / 1023.0,
    "emg_levator":    emg3_value / 1023.0,
    "pitch":          mpu.pitch,
    "roll":           mpu.roll,
    "duration_poor_posture": bad_posture_seconds
}

response = urequests.post(
    "http://YOUR_SERVER_IP:5000/reading",
    headers={"Content-Type": "application/json"},
    data=ujson.dumps(data)
)
```

---

## 📚 References

1. MyoWare Muscle Sensor Datasheet, Advancer Technologies, 2021
2. MPU6050 Datasheet, InvenSense, 2020
3. "Posture Monitoring Using Wearable Sensors: A Review," IEEE Sensors Journal, 2021
4. "AI-Based Detection of Neck Muscle Strain," International Journal of Biomedical Engineering, 2022
