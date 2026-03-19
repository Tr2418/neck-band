# CervicalSentinel – ESP32 Firmware

This directory contains the Arduino firmware for the **CervicalSentinel** wearable band (ESP32 + MyoWare EMG + MPU-6050).

---

## Hardware Wiring

```
┌──────────────────────────────────────────────────────────┐
│                    ESP32 Dev Module                      │
│                                                          │
│  3V3 ──────────── MyoWare VCC                            │
│  GND ──────────── MyoWare GND                            │
│  GPIO 34 (ADC) ── MyoWare SIG (ENV output)               │
│                                                          │
│  3V3 ──────────── MPU-6050 VCC                           │
│  GND ──────────── MPU-6050 GND                           │
│  GPIO 21 (SDA) ── MPU-6050 SDA                           │
│  GPIO 22 (SCL) ── MPU-6050 SCL                           │
│                                                          │
│  Battery (+) ─── 100 kΩ ─── GPIO 35 ─── 100 kΩ ─── GND  │
│  (voltage divider for battery monitoring)                │
│                                                          │
│  GPIO 2 ────────── Built-in LED (status indicator)       │
└──────────────────────────────────────────────────────────┘
```

### EMG Electrode Placement
Place MyoWare electrodes on the **upper trapezius** muscle:
1. Proximal electrode ~2 cm above the shoulder blade ridge
2. Distal electrode ~4 cm further along the muscle belly
3. Reference electrode on a bony landmark (spine, clavicle, or elbow)

---

## Files

| File | Purpose |
|---|---|
| `CervicalSentinel.ino` | Main Arduino sketch – setup/loop, timers, BLE reporting |
| `EMGProcessor.h` | Windowed RMS + baseline subtraction for EMG signal |
| `MPU6050Reader.h` | I²C driver + complementary filter for neck/shoulder angles |
| `PostureClassifier.h` | Decision-tree AI classifier (mirrors mobile-app thresholds) |
| `BLEService.h` | GATT BLE service (sensor notifications + config writes) |

---

## Software Requirements

1. **Arduino IDE 2.x** (or PlatformIO)
2. **ESP32 Arduino Core** v3.x  
   _Tools → Board Manager → search "esp32" by Espressif → Install_
3. **No extra libraries needed** – uses built-in BLE and Wire libraries

---

## Flashing the Firmware

```bash
# Using Arduino IDE:
# 1. Open CervicalSentinel.ino
# 2. Select Board: "ESP32 Dev Module"  (or your specific ESP32 board)
# 3. Select Port: /dev/ttyUSB0 (Linux) or COM3 (Windows)
# 4. Click Upload (→)

# Using arduino-cli:
arduino-cli compile --fqbn esp32:esp32:esp32 .
arduino-cli upload  --fqbn esp32:esp32:esp32 --port /dev/ttyUSB0 .
```

---

## BLE Protocol

The firmware exposes a **custom GATT service** over Bluetooth Low Energy.

### Service UUID
```
12345678-1234-5678-1234-56789abcdef0
```

### Sensor Data Characteristic (Notify)
UUID: `12345678-1234-5678-1234-56789abcdef1`

Sends one JSON notification per second:
```json
{"e":350,"n":12.5,"s":8.2,"sc":0,"pc":0,"al":0,"b":85}
```

| Key | Meaning | Range |
|-----|---------|-------|
| `e` | EMG normalized (AU) | 0–1023 |
| `n` | Neck tilt angle (°) | -30–60 |
| `s` | Shoulder rounding angle (°) | -30–60 |
| `sc` | Strain class | 0=Normal 1=Mild 2=Moderate 3=High |
| `pc` | Posture class | 0=Good 1=ForwardHead 2=Rounded 3=Combined |
| `al` | Alert level | 0=OK 1=Warn 2=Critical |
| `b` | Battery percent | 0–100 |

### Config Characteristic (Write)
UUID: `12345678-1234-5678-1234-56789abcdef2`

Send JSON commands to the device:

| Command | JSON |
|---|---|
| Recalibrate EMG baseline | `{"cmd":"calibrate"}` |

---

## LED Status Codes

| Pattern | Meaning |
|---|---|
| Tiny 20 ms pulse every 2 s | Connected, no alert |
| 1 slow blink (200 ms) | Warning (moderate strain or forward head) |
| 3 rapid blinks | Critical alert (high strain or combined posture) |
| 10 rapid flashes at startup | MPU-6050 not detected |

---

## Serial Monitor Output

Open Serial Monitor at **115200 baud** to see live readings:

```
[BOOT] CervicalSentinel v1.0.0
[OK] MPU-6050 initialised
[BLE] Advertising as 'CervicalSentinel'
[OK] EMG timer started at 500 Hz
[BOOT] Setup complete
[DATA] EMG=245  Neck=11.2°  Shoulder=7.8°  Strain=Normal  Posture=Good Posture  Alert=0  Bat=82%
[DATA] EMG=612  Neck=33.1°  Shoulder=9.4°  Strain=Moderate Strain  Posture=Forward Head  Alert=1  Bat=82%
```

---

## Power Consumption

| State | Approx. current |
|---|---|
| Active monitoring + BLE connected | ~80 mA |
| BLE advertising, no client | ~60 mA |
| Deep sleep (future) | ~0.01 mA |

With a 500 mAh LiPo battery: **~6 hours continuous use**.
