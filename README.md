# CervicalSentinel

**AI-Powered Real-Time Neck Muscle & Posture Monitoring System**

CervicalSentinel is a wearable IoT + mobile app system that monitors neck muscle activity and posture in real-time using AI. It combines EMG muscle sensors (primary) and posture sensors (MPU6050) (secondary) to detect strain and poor posture, then sends real-time alerts to the user's mobile device.

---

## Features

| Screen | Description |
|---|---|
| **Dashboard** | Live EMG & posture readings, AI classification, session stats |
| **Alerts** | Real-time notifications for muscle strain and poor posture |
| **Analytics** | Daily (hourly) and weekly posture & EMG charts |
| **Settings** | Notification preferences, alert thresholds, device info |

---

## Hardware Architecture

```
[MyoWare EMG Sensor] ──┐
                        ├──> [ESP32 Microcontroller] ──(BLE)──> [Mobile App]
[MPU6050 IMU Sensor] ──┘         │
                                  └──> [AI Model (Decision Tree / Neural Network)]
```

| Component | Role |
|---|---|
| MyoWare EMG | Measures electrical signals from upper trapezius, SCM, levator scapulae |
| MPU6050 | Measures neck tilt and upper back angle |
| ESP32 | Preprocesses sensor signals and runs on-device AI inference |
| Mobile App | Displays real-time data, alerts, and posture analytics |

---

## AI Classification

### Muscle Strain (EMG)
| EMG Value (AU) | Classification |
|---|---|
| ≤ 300 | Normal |
| 301–600 | Mild Strain |
| 601–850 | Moderate Strain |
| > 850 | High Strain |

### Posture (MPU6050)
| Condition | Classification |
|---|---|
| Neck tilt ≤ 15°, Shoulder ≤ 10° | Good Posture |
| Neck tilt > 30° | Forward Head Posture |
| Shoulder > 20° | Rounded Shoulders |
| Both | Forward Head + Rounded Shoulders |

---

## Mobile App Setup

### Prerequisites
- Node.js 18+ and npm 9+
- Expo CLI (`npm install -g expo-cli`)
- Expo Go app on your mobile device

### Install & Run

```bash
cd CervicalSentinel
npm install
npx expo start
```

Scan the QR code with Expo Go to run the app on your device.

---

## Project Structure

```
CervicalSentinel/
├── App.js                         # Root navigation & providers
├── src/
│   ├── context/
│   │   └── SensorContext.js       # Global sensor state & Bluetooth simulation
│   ├── screens/
│   │   ├── DashboardScreen.js     # Real-time monitoring
│   │   ├── AlertsScreen.js        # Notification history
│   │   ├── AnalyticsScreen.js     # Daily & weekly analytics
│   │   └── SettingsScreen.js      # App & device configuration
│   └── utils/
│       └── sensorSimulator.js     # Sensor simulation, AI classification, thresholds
└── app.json
```

---

## System Workflow

1. EMG and posture sensors collect real-time data.
2. ESP32 preprocesses and filters signals.
3. AI model classifies muscle strain and posture deviations.
4. Threshold evaluation triggers real-time notifications.
5. Data is stored for daily and weekly analytics & reporting.

---

## References

1. MyoWare Muscle Sensor Datasheet, Advancer Technologies, 2021
2. MPU6050 Datasheet, InvenSense, 2020
3. "Posture Monitoring Using Wearable Sensors: A Review," IEEE Sensors Journal, 2021
4. "AI-Based Detection of Neck Muscle Strain," International Journal of Biomedical Engineering, 2022
5. "Hybrid EMG and Motion Sensor Systems for Posture Analysis," IEEE Transactions on Neural Systems and Rehabilitation Engineering, 2021
