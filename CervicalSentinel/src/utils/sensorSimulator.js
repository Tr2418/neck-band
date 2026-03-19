/**
 * Sensor data simulator for CervicalSentinel
 * Simulates EMG muscle activity and MPU6050 posture sensor data
 * in the absence of physical hardware.
 */

// EMG signal thresholds (arbitrary units 0-1023)
export const EMG_THRESHOLDS = {
  NORMAL: 300,
  MODERATE: 600,
  HIGH: 850,
};

// Posture angle thresholds (degrees)
export const POSTURE_THRESHOLDS = {
  NECK_TILT_NORMAL: 15,     // <=15° forward tilt is acceptable
  NECK_TILT_WARNING: 30,    // >30° is poor posture
  SHOULDER_NORMAL: 10,      // <=10° rounded shoulder
  SHOULDER_WARNING: 20,     // >20° rounded shoulder
};

// AI classification labels
export const STRAIN_LABELS = {
  NORMAL: 'Normal',
  MILD: 'Mild Strain',
  MODERATE: 'Moderate Strain',
  HIGH: 'High Strain',
};

export const POSTURE_LABELS = {
  GOOD: 'Good Posture',
  FORWARD_HEAD: 'Forward Head',
  ROUNDED_SHOULDERS: 'Rounded Shoulders',
  COMBINED: 'Forward Head + Rounded Shoulders',
};

/**
 * Simulate a single EMG reading with realistic noise
 * Returns value 0–1023
 */
export function simulateEMGReading(baseValue = 250, noiseLevel = 50) {
  const noise = (Math.random() - 0.5) * 2 * noiseLevel;
  return Math.max(0, Math.min(1023, Math.round(baseValue + noise)));
}

/**
 * Simulate posture angle (degrees) with drift
 */
export function simulatePostureAngle(baseAngle = 10, drift = 5) {
  const noise = (Math.random() - 0.5) * 2 * drift;
  return Math.max(-30, Math.min(60, Math.round((baseAngle + noise) * 10) / 10));
}

/**
 * AI Classification: Classifies muscle strain based on EMG value
 */
export function classifyMuscleStrain(emgValue) {
  if (emgValue <= EMG_THRESHOLDS.NORMAL) return STRAIN_LABELS.NORMAL;
  if (emgValue <= EMG_THRESHOLDS.MODERATE) return STRAIN_LABELS.MILD;
  if (emgValue <= EMG_THRESHOLDS.HIGH) return STRAIN_LABELS.MODERATE;
  return STRAIN_LABELS.HIGH;
}

/**
 * AI Classification: Classifies posture based on angles
 */
export function classifyPosture(neckTilt, shoulderAngle) {
  const neckBad = neckTilt > POSTURE_THRESHOLDS.NECK_TILT_WARNING;
  const shoulderBad = shoulderAngle > POSTURE_THRESHOLDS.SHOULDER_WARNING;
  if (neckBad && shoulderBad) return POSTURE_LABELS.COMBINED;
  if (neckBad) return POSTURE_LABELS.FORWARD_HEAD;
  if (shoulderBad) return POSTURE_LABELS.ROUNDED_SHOULDERS;
  return POSTURE_LABELS.GOOD;
}

/**
 * Get colour for strain classification
 */
export function getStrainColor(strainLabel) {
  switch (strainLabel) {
    case STRAIN_LABELS.NORMAL: return '#4CAF50';
    case STRAIN_LABELS.MILD: return '#FFC107';
    case STRAIN_LABELS.MODERATE: return '#FF9800';
    case STRAIN_LABELS.HIGH: return '#F44336';
    default: return '#9E9E9E';
  }
}

/**
 * Get colour for posture classification
 */
export function getPostureColor(postureLabel) {
  switch (postureLabel) {
    case POSTURE_LABELS.GOOD: return '#4CAF50';
    case POSTURE_LABELS.FORWARD_HEAD: return '#FF9800';
    case POSTURE_LABELS.ROUNDED_SHOULDERS: return '#FF9800';
    case POSTURE_LABELS.COMBINED: return '#F44336';
    default: return '#9E9E9E';
  }
}

/**
 * Determines whether an alert should be sent based on current data
 */
export function shouldSendAlert(strainLabel, postureLabel) {
  return (
    strainLabel === STRAIN_LABELS.MODERATE ||
    strainLabel === STRAIN_LABELS.HIGH ||
    postureLabel === POSTURE_LABELS.FORWARD_HEAD ||
    postureLabel === POSTURE_LABELS.ROUNDED_SHOULDERS ||
    postureLabel === POSTURE_LABELS.COMBINED
  );
}

/**
 * Generate simulated session profile for a day
 * Returns an array of hourly snapshots
 */
export function generateDailyData() {
  const hours = [];
  for (let h = 8; h <= 17; h++) {
    const isBadHour = h >= 13 && h <= 15; // post-lunch slump
    const base = isBadHour ? 500 : 220;
    const emg = simulateEMGReading(base, 80);
    const neck = simulatePostureAngle(isBadHour ? 28 : 12, 6);
    const shoulder = simulatePostureAngle(isBadHour ? 22 : 8, 5);
    hours.push({
      hour: h,
      emg,
      neckTilt: neck,
      shoulderAngle: shoulder,
      strainLabel: classifyMuscleStrain(emg),
      postureLabel: classifyPosture(neck, shoulder),
    });
  }
  return hours;
}

/**
 * Generate 7-day weekly summary
 */
export function generateWeeklyData() {
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  return days.map((day) => {
    const badDay = Math.random() > 0.6;
    const avgEmg = badDay
      ? simulateEMGReading(550, 100)
      : simulateEMGReading(220, 60);
    const alertCount = badDay
      ? Math.floor(Math.random() * 8) + 3
      : Math.floor(Math.random() * 3);
    const postureScore = Math.max(
      20,
      Math.min(100, Math.round(100 - avgEmg / 12 - alertCount * 3))
    );
    return { day, avgEmg, alertCount, postureScore };
  });
}
