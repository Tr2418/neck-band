# CervicalSentinel

**AI-Powered Real-Time Neck Muscle & Posture Monitoring System**

CervicalSentinel is a wearable IoT + mobile app system that monitors neck muscle activity and posture in real-time using AI. It combines EMG muscle sensors (primary) and posture sensors (MPU6050) (secondary) to detect strain and poor posture, then sends real-time alerts to the user's mobile device.

🌐 **Website:** [tr2418.github.io/neck-band/website](https://tr2418.github.io/neck-band/website/) &nbsp;|&nbsp; 📦 **Repo:** [github.com/Tr2418/neck-band](https://github.com/Tr2418/neck-band)

---

## Project Structure

```
neck-band/
├── website/                       # 🌐 Landing website (HTML + CSS + JS)
│   ├── index.html
│   ├── styles.css
│   └── app.js
├── CervicalSentinel/              # 📱 React Native / Expo mobile app
│   ├── App.js
│   ├── src/
│   │   ├── context/SensorContext.js
│   │   ├── screens/
│   │   │   ├── DashboardScreen.js
│   │   │   ├── AlertsScreen.js
│   │   │   ├── AnalyticsScreen.js
│   │   │   ├── SettingsScreen.js
│   │   │   └── OnboardingScreen.js
│   │   └── utils/
│   │       ├── sensorSimulator.js
│   │       ├── bleProtocol.js
│   │       └── storage.js
│   └── package.json
└── firmware/                      # 🔧 ESP32 Arduino firmware
    ├── CervicalSentinel.ino
    ├── EMGProcessor.h
    ├── MPU6050Reader.h
    ├── PostureClassifier.h
    ├── BLEService.h
    └── README.md
```

---

## 🖥️ Step-by-Step Setup Guide for Windows 11 + VS Code

> **You are new to programming?** No problem — follow these steps one by one.  
> Every command should be typed exactly as shown and then press **Enter**.

---

### Part 1 — Install the Tools You Need (do this once)

#### Step 1 — Install VS Code
1. Go to [code.visualstudio.com](https://code.visualstudio.com/)
2. Click the big blue **Download for Windows** button
3. Run the installer — click **Next** on every screen, then **Finish**
4. Open VS Code from the Start menu

#### Step 2 — Install Git
1. Go to [git-scm.com/download/win](https://git-scm.com/download/win)
2. The download starts automatically — run the installer
3. Click **Next** through all screens (all defaults are fine) → **Install** → **Finish**

#### Step 3 — Install Node.js (needed for the mobile app)
1. Go to [nodejs.org](https://nodejs.org)
2. Click the big button labelled **LTS** (recommended)
3. Run the installer → click **Next** through all screens → **Install** → **Finish**
4. **Verify it worked:** In VS Code press **Ctrl + \`** (backtick) to open the terminal, type `node -v` and press Enter — it should print something like `v20.15.0`

---

### Part 2 — Download the Project

#### Step 4 — Clone the Repository
1. Open VS Code
2. Press **Ctrl + \`** to open the terminal at the bottom
3. Type or paste this command and press **Enter**:

```bash
git clone https://github.com/Tr2418/neck-band.git
```

4. A folder called `neck-band` will be created. Wait until you see a new `$` prompt (means it finished).

#### Step 5 — Open the Folder in VS Code
1. In VS Code go to **File → Open Folder**
2. Find and select the `neck-band` folder that was just created (usually in `C:\Users\YourName\neck-band`)
3. Click **Select Folder**
4. You should now see the project files in the left panel

---

### Part 3 — Open the Website Locally

#### Option A — Quick Open (double-click)
1. In the VS Code file explorer (left side), expand the `website` folder
2. Double-click **index.html**
3. Press **Ctrl+Shift+P** → type **Open in Browser** → press Enter  
   *(or right-click the file → "Reveal in File Explorer" → double-click index.html)*

#### Option B — Live Server (recommended — shows changes as you edit)
1. In VS Code press **Ctrl+Shift+X** to open Extensions
2. Search for **Live Server** (by Ritwick Dey)
3. Click **Install**
4. Right-click `website/index.html` in the file explorer → **Open with Live Server**
5. Your browser opens automatically at `http://127.0.0.1:5500/website/index.html` 🎉

---

### Part 4 — Run the Mobile App

#### Step 6 — Install Expo CLI
In the VS Code terminal:
```bash
npm install -g expo-cli
```
*(This downloads the tool that runs React Native apps. Wait until it finishes.)*

#### Step 7 — Go into the App Folder
```bash
cd neck-band/CervicalSentinel
```
*(If you already opened the folder in VS Code, just type `cd CervicalSentinel`)*

#### Step 8 — Install App Dependencies
```bash
npm install
```
*(Downloads all the libraries. May take 1–2 minutes. You'll see a progress bar.)*

#### Step 9 — Start the App
```bash
npx expo start
```
A QR code will appear in the terminal.

#### Step 10 — Open on Your Phone
1. On your phone, go to the **App Store** (iPhone) or **Play Store** (Android)
2. Search for and install **Expo Go**
3. Open **Expo Go** → tap **Scan QR Code**
4. Point your camera at the QR code in the terminal
5. The CervicalSentinel app loads on your phone! 📱

> **Tip:** Your phone and computer must be on the **same Wi-Fi network**.

---

### Part 5 — Flash the ESP32 Firmware (for real hardware)

#### Step 11 — Install Arduino IDE 2
1. Go to [arduino.cc/en/software](https://www.arduino.cc/en/software)
2. Download **Arduino IDE 2.x** for Windows → run the installer

#### Step 12 — Add ESP32 Support
1. Open Arduino IDE → **File → Preferences**
2. In the **Additional Board Manager URLs** box paste:
   ```
   https://raw.githubusercontent.com/espressif/arduino-esp32/gh-pages/package_esp32_index.json
   ```
3. Click **OK**
4. Go to **Tools → Board → Boards Manager** → search **esp32** → click **Install** next to *esp32 by Espressif Systems*

#### Step 13 — Open and Upload the Firmware
1. In Arduino IDE: **File → Open** → navigate to `neck-band/firmware/CervicalSentinel.ino`
2. Plug your ESP32 into your computer with a USB cable
3. **Tools → Board → ESP32 Arduino → ESP32 Dev Module**
4. **Tools → Port** → select the COM port that appeared (e.g. `COM3`)
5. Click the **→ Upload** button (or press **Ctrl+U**)
6. Wait for **"Done uploading"**
7. **Tools → Serial Monitor** at 115200 baud to see live readings

---

### Part 6 — Publish the Website on GitHub Pages (share with the world)

1. Go to [github.com/Tr2418/neck-band](https://github.com/Tr2418/neck-band) in your browser
2. Click the **Settings** tab (top of the repo page)
3. In the left sidebar click **Pages**
4. Under **Source** choose **Deploy from a branch** → Branch: **main** → Folder: **/(root)** → click **Save**
5. Wait about 1 minute, refresh the page — you'll see:

   ```
   Your site is live at https://tr2418.github.io/neck-band/website/
   ```

6. Share that link with anyone — it works on any device, no installation needed! 🎉

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
                                  └──> [AI Model (Decision Tree)]
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

## BLE Packet Format

The ESP32 sends one JSON packet per second over BLE GATT (Notify):

```json
{"e":350,"n":12.5,"s":8.2,"sc":0,"pc":0,"al":0,"b":85}
```

| Key | Meaning | Range |
|-----|---------|-------|
| `e` | EMG normalized (AU) | 0–1023 |
| `n` | Neck tilt angle (°) | 0–90 |
| `s` | Shoulder angle (°) | 0–45 |
| `sc` | Strain class | 0–3 |
| `pc` | Posture class | 0–3 |
| `al` | Alert level | 0–2 |
| `b` | Battery % | 0–100 |

---

## References

1. MyoWare Muscle Sensor Datasheet, Advancer Technologies, 2021
2. MPU6050 Datasheet, InvenSense, 2020
3. "Posture Monitoring Using Wearable Sensors: A Review," IEEE Sensors Journal, 2021
4. "AI-Based Detection of Neck Muscle Strain," International Journal of Biomedical Engineering, 2022
5. "Hybrid EMG and Motion Sensor Systems for Posture Analysis," IEEE Transactions on Neural Systems and Rehabilitation Engineering, 2021
