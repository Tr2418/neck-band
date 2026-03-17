#pragma once
#include <Arduino.h>

// ─────────────────────────────────────────────
//  PostureClassifier.h
//  Decision-tree AI classifier that mirrors the
//  mobile-app thresholds exactly.
//
//  Strain classes  (EMG, normalised 0–1023):
//    0 = Normal          (≤ 300)
//    1 = Mild Strain     (≤ 600)
//    2 = Moderate Strain (≤ 850)
//    3 = High Strain     (> 850)
//
//  Posture classes (angles in degrees):
//    0 = Good Posture
//    1 = Forward Head              (neck > 30°)
//    2 = Rounded Shoulders         (shoulder > 20°)
//    3 = Forward Head + Rounded    (both)
//
//  Alert levels:
//    0 = OK   – no action needed
//    1 = WARN – notification recommended
//    2 = CRIT – immediate correction needed
// ─────────────────────────────────────────────

// ---- Thresholds (must match mobile app constants) ----
#define EMG_THR_NORMAL    300
#define EMG_THR_MODERATE  600
#define EMG_THR_HIGH      850

#define NECK_THR_WARN     30.0f   // degrees
#define SHOULDER_THR_WARN 20.0f   // degrees

// Strain class indices
enum StrainClass : uint8_t {
  STRAIN_NORMAL   = 0,
  STRAIN_MILD     = 1,
  STRAIN_MODERATE = 2,
  STRAIN_HIGH     = 3,
};

// Posture class indices
enum PostureClass : uint8_t {
  POSTURE_GOOD       = 0,
  POSTURE_FWD_HEAD   = 1,
  POSTURE_ROUNDED    = 2,
  POSTURE_COMBINED   = 3,
};

// Alert level
enum AlertLevel : uint8_t {
  ALERT_OK   = 0,
  ALERT_WARN = 1,
  ALERT_CRIT = 2,
};

struct ClassificationResult {
  StrainClass  strain;
  PostureClass posture;
  AlertLevel   alertLevel;
};

class PostureClassifier {
public:
  // Classify muscle strain from normalised EMG (0–1023).
  static StrainClass classifyStrain(uint16_t emgNorm) {
    if (emgNorm <= EMG_THR_NORMAL)   return STRAIN_NORMAL;
    if (emgNorm <= EMG_THR_MODERATE) return STRAIN_MILD;
    if (emgNorm <= EMG_THR_HIGH)     return STRAIN_MODERATE;
    return STRAIN_HIGH;
  }

  // Classify posture from sensor angles (degrees).
  static PostureClass classifyPosture(float neckTilt, float shoulderAngle) {
    bool neckBad     = (neckTilt     > NECK_THR_WARN);
    bool shoulderBad = (shoulderAngle > SHOULDER_THR_WARN);
    if (neckBad && shoulderBad) return POSTURE_COMBINED;
    if (neckBad)                return POSTURE_FWD_HEAD;
    if (shoulderBad)            return POSTURE_ROUNDED;
    return POSTURE_GOOD;
  }

  // Combined classification + alert decision.
  static ClassificationResult classify(uint16_t emgNorm,
                                       float neckTilt,
                                       float shoulderAngle) {
    ClassificationResult res;
    res.strain  = classifyStrain(emgNorm);
    res.posture = classifyPosture(neckTilt, shoulderAngle);

    // Alert level decision tree
    if (res.strain == STRAIN_HIGH || res.posture == POSTURE_COMBINED) {
      res.alertLevel = ALERT_CRIT;
    } else if (res.strain == STRAIN_MODERATE ||
               res.posture == POSTURE_FWD_HEAD ||
               res.posture == POSTURE_ROUNDED) {
      res.alertLevel = ALERT_WARN;
    } else {
      res.alertLevel = ALERT_OK;
    }

    return res;
  }

  // Human-readable strain label (used in JSON payload)
  static const char* strainLabel(StrainClass s) {
    switch (s) {
      case STRAIN_NORMAL:   return "Normal";
      case STRAIN_MILD:     return "Mild Strain";
      case STRAIN_MODERATE: return "Moderate Strain";
      case STRAIN_HIGH:     return "High Strain";
      default:              return "Unknown";
    }
  }

  // Human-readable posture label (used in JSON payload)
  static const char* postureLabel(PostureClass p) {
    switch (p) {
      case POSTURE_GOOD:     return "Good Posture";
      case POSTURE_FWD_HEAD: return "Forward Head";
      case POSTURE_ROUNDED:  return "Rounded Shoulders";
      case POSTURE_COMBINED: return "Forward Head + Rounded Shoulders";
      default:               return "Unknown";
    }
  }
};
