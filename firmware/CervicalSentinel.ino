/*
 * CervicalSentinel.ino
 * ─────────────────────────────────────────────────────────────────
 * ESP32 firmware for the CervicalSentinel wearable.
 *
 * Hardware:
 *   • MyoWare 2.0 EMG sensor → ESP32 GPIO 34 (ADC1_CH6)
 *   • MPU-6050 IMU           → SDA=GPIO 21, SCL=GPIO 22
 *   • Li-Po battery          → voltage divider → GPIO 35 (ADC1_CH7)
 *   • LED (optional status)  → GPIO 2 (built-in)
 *
 * Libraries required (install via Arduino Library Manager):
 *   • ESP32 BLE Arduino  (built-in with ESP32 board package)
 *   • Wire               (built-in)
 *
 * Board: ESP32 Dev Module (or any ESP32 variant)
 * ─────────────────────────────────────────────────────────────────
 */

#include <Arduino.h>
#include "EMGProcessor.h"
#include "MPU6050Reader.h"
#include "PostureClassifier.h"
#include "BLEService.h"

// ─── Pin Definitions ─────────────────────────────────────────────
#define EMG_PIN          34   // Analog input – MyoWare SIG output
#define BATTERY_PIN      35   // Analog input – battery voltage divider
#define STATUS_LED_PIN    2   // Built-in LED

// ─── Timing ──────────────────────────────────────────────────────
#define EMG_SAMPLE_HZ   500   // EMG sampling rate (microseconds timer)
#define REPORT_INTERVAL_MS 1000  // Send BLE packet every 1 second
#define IMU_UPDATE_MS     20     // Update IMU complementary filter at 50 Hz

// ─── Battery monitoring ───────────────────────────────────────────
// Assumes a simple voltage divider: Vbat → R1(100kΩ) → ADC → R2(100kΩ) → GND
// Full charge ≈ 4.2 V, cut-off ≈ 3.0 V
#define VBAT_FULL       4200  // mV
#define VBAT_EMPTY      3000  // mV
#define ADC_REF_MV      3300  // ESP32 ADC reference (mV)
#define ADC_MAX         4095  // 12-bit ADC

// ─── Global objects ───────────────────────────────────────────────
EMGProcessor     emg(EMG_PIN, EMG_SAMPLE_HZ);
MPU6050Reader    imu;
PostureClassifier classifier;
CSBLEService     bleService;

// Timer for EMG sampling
hw_timer_t* emgTimer = nullptr;
portMUX_TYPE timerMux = portMUX_INITIALIZER_UNLOCKED;

volatile bool sampleFlag = false;

// ISR: called at EMG_SAMPLE_HZ by hardware timer
void IRAM_ATTR onEMGTimer() {
  portENTER_CRITICAL_ISR(&timerMux);
  sampleFlag = true;
  portEXIT_CRITICAL_ISR(&timerMux);
}

// ─── Helpers ─────────────────────────────────────────────────────

// Read battery percentage (0–100)
uint8_t readBatteryPercent() {
  uint32_t raw = analogRead(BATTERY_PIN);
  // Voltage at ADC pin (voltage divider halves Vbat)
  uint32_t vADC_mV = (raw * ADC_REF_MV) / ADC_MAX;
  uint32_t vBat_mV = vADC_mV * 2;  // ×2 for 1:1 divider
  if (vBat_mV >= VBAT_FULL)  return 100;
  if (vBat_mV <= VBAT_EMPTY) return 0;
  return (uint8_t)(((vBat_mV - VBAT_EMPTY) * 100UL) / (VBAT_FULL - VBAT_EMPTY));
}

// Blink status LED to indicate a given alert level
void blinkLED(AlertLevel level) {
  switch (level) {
    case ALERT_CRIT:
      // Three rapid blinks
      for (int i = 0; i < 3; i++) {
        digitalWrite(STATUS_LED_PIN, HIGH); delay(80);
        digitalWrite(STATUS_LED_PIN, LOW);  delay(80);
      }
      break;
    case ALERT_WARN:
      // One slow blink
      digitalWrite(STATUS_LED_PIN, HIGH); delay(200);
      digitalWrite(STATUS_LED_PIN, LOW);
      break;
    default:
      // Heartbeat: brief pulse every second (handled in main loop)
      break;
  }
}

// ─────────────────────────────────────────────────────────────────
void setup() {
  Serial.begin(115200);
  Serial.println("[BOOT] CervicalSentinel v1.0.0");

  pinMode(STATUS_LED_PIN, OUTPUT);
  digitalWrite(STATUS_LED_PIN, LOW);

  // Configure ADC
  analogReadResolution(12);   // 12-bit (0–4095)
  analogSetAttenuation(ADC_11db); // 0–3.3 V range

  // Initialise IMU
  if (!imu.begin()) {
    Serial.println("[ERROR] MPU-6050 not found – check wiring!");
    // Flash SOS and continue (app will show stale angles)
    for (int i = 0; i < 10; i++) {
      digitalWrite(STATUS_LED_PIN, HIGH); delay(50);
      digitalWrite(STATUS_LED_PIN, LOW);  delay(50);
    }
  } else {
    Serial.println("[OK] MPU-6050 initialised");
  }

  // Start BLE
  bleService.begin();

  // Configure hardware timer for EMG sampling at EMG_SAMPLE_HZ
  // Timer 0, divider 80 → 1 µs tick
  emgTimer = timerBegin(0, 80, true);
  timerAttachInterrupt(emgTimer, &onEMGTimer, true);
  // Fire every (1_000_000 / EMG_SAMPLE_HZ) µs
  timerAlarmWrite(emgTimer, 1000000UL / EMG_SAMPLE_HZ, true);
  timerAlarmEnable(emgTimer);

  Serial.println("[OK] EMG timer started at " + String(EMG_SAMPLE_HZ) + " Hz");
  Serial.println("[BOOT] Setup complete");
}

// ─────────────────────────────────────────────────────────────────
void loop() {
  static uint32_t lastReportMs = 0;
  static uint32_t lastIMUMs    = 0;
  static uint32_t lastHeartbeatMs = 0;

  uint32_t now = millis();

  // ── EMG sampling (driven by hardware timer ISR) ────────────────
  bool doSample = false;
  portENTER_CRITICAL(&timerMux);
  doSample = sampleFlag;
  sampleFlag = false;
  portEXIT_CRITICAL(&timerMux);

  if (doSample) {
    emg.sample();
  }

  // ── IMU update at 50 Hz ────────────────────────────────────────
  if (now - lastIMUMs >= IMU_UPDATE_MS) {
    float dt = (now - lastIMUMs) / 1000.0f;
    imu.update(dt);
    lastIMUMs = now;
  }

  // ── Handle calibration request from mobile app ─────────────────
  if (bleService.shouldCalibrate()) {
    Serial.println("[INFO] Calibrating EMG baseline...");
    // Reset EMG baseline by simply allowing it to refill naturally
    // (the moving-average window will re-settle over BASELINE_SIZE samples)
    bleService.clearCalibrateFlag();
    digitalWrite(STATUS_LED_PIN, HIGH); delay(500);
    digitalWrite(STATUS_LED_PIN, LOW);
  }

  // ── Report: classify and send BLE packet every 1 second ────────
  if (now - lastReportMs >= REPORT_INTERVAL_MS) {
    lastReportMs = now;

    uint16_t emgNorm      = emg.getNormalized();
    float    neckTilt     = imu.getNeckTilt();
    float    shoulderAngle = imu.getShoulderAngle();

    ClassificationResult res = PostureClassifier::classify(emgNorm, neckTilt, shoulderAngle);

    uint8_t battery = readBatteryPercent();

    // Print to Serial (useful for USB debugging)
    Serial.printf(
      "[DATA] EMG=%u  Neck=%.1f°  Shoulder=%.1f°  Strain=%s  Posture=%s  Alert=%u  Bat=%u%%\n",
      emgNorm, neckTilt, shoulderAngle,
      PostureClassifier::strainLabel(res.strain),
      PostureClassifier::postureLabel(res.posture),
      res.alertLevel, battery
    );

    // Send over BLE
    bleService.sendSensorData(
      emgNorm, neckTilt, shoulderAngle,
      (uint8_t)res.strain, (uint8_t)res.posture,
      (uint8_t)res.alertLevel, battery
    );

    // Visual alert on wearable LED
    blinkLED(res.alertLevel);
  }

  // ── Heartbeat LED when no alerts ──────────────────────────────
  if (now - lastHeartbeatMs >= 2000) {
    lastHeartbeatMs = now;
    if (bleService.isConnected()) {
      // Tiny pulse to show we're alive
      digitalWrite(STATUS_LED_PIN, HIGH); delay(20);
      digitalWrite(STATUS_LED_PIN, LOW);
    }
  }
}
