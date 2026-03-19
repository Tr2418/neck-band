/**
 * bleProtocol.js
 * BLE service & characteristic UUIDs and JSON packet parser.
 * Must stay in sync with firmware/BLEService.h
 */

// ─── GATT UUIDs ───────────────────────────────────────────────────
export const BLE_SERVICE_UUID       = '12345678-1234-5678-1234-56789abcdef0';
export const SENSOR_DATA_CHAR_UUID  = '12345678-1234-5678-1234-56789abcdef1';
export const CONFIG_CHAR_UUID       = '12345678-1234-5678-1234-56789abcdef2';

export const DEVICE_NAME = 'CervicalSentinel';

// ─── Strain class mapping (matches firmware PostureClassifier.h) ───
export const STRAIN_CLASS_LABELS = {
  0: 'Normal',
  1: 'Mild Strain',
  2: 'Moderate Strain',
  3: 'High Strain',
};

// ─── Posture class mapping ──────────────────────────────────────────
export const POSTURE_CLASS_LABELS = {
  0: 'Good Posture',
  1: 'Forward Head',
  2: 'Rounded Shoulders',
  3: 'Forward Head + Rounded Shoulders',
};

// ─── Alert level mapping ────────────────────────────────────────────
export const ALERT_LEVEL = {
  OK:   0,
  WARN: 1,
  CRIT: 2,
};

/**
 * Parse a BLE sensor data packet received from the firmware.
 *
 * Firmware sends compact JSON:
 *   {"e":350,"n":12.5,"s":8.2,"sc":0,"pc":0,"al":0,"b":85}
 *
 * Returns a normalised object, or null if parsing fails.
 */
export function parseSensorPacket(raw) {
  try {
    const data = typeof raw === 'string' ? JSON.parse(raw) : raw;
    return {
      emg:           Number(data.e   ?? 0),
      neckTilt:      Number(data.n   ?? 0),
      shoulderAngle: Number(data.s   ?? 0),
      strainClass:   Number(data.sc  ?? 0),
      postureClass:  Number(data.pc  ?? 0),
      alertLevel:    Number(data.al  ?? 0),
      battery:       Number(data.b   ?? 0),
      // Derived labels
      strainLabel:   STRAIN_CLASS_LABELS[Number(data.sc ?? 0)] ?? 'Normal',
      postureLabel:  POSTURE_CLASS_LABELS[Number(data.pc ?? 0)] ?? 'Good Posture',
    };
  } catch {
    return null;
  }
}

/**
 * Build a calibration command packet to write to the Config characteristic.
 */
export function buildCalibrateCommand() {
  return JSON.stringify({ cmd: 'calibrate' });
}
