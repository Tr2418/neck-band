#pragma once
#include <Arduino.h>

// ─────────────────────────────────────────────
//  EMGProcessor.h
//  Reads the MyoWare 2.0 EMG sensor on an analog
//  pin and computes a windowed RMS value, plus a
//  simple moving-average baseline to reject slow
//  motion artefacts.
// ─────────────────────────────────────────────

#define EMG_WINDOW_SIZE   50     // samples in RMS window (~100 ms at 500 Hz)
#define EMG_BASELINE_SIZE 200    // samples for long-term baseline

class EMGProcessor {
public:
  explicit EMGProcessor(uint8_t pin, uint32_t sampleRateHz = 500)
      : _pin(pin), _sampleRateHz(sampleRateHz) {
    memset(_rmsWindow, 0, sizeof(_rmsWindow));
    memset(_baselineWindow, 0, sizeof(_baselineWindow));
  }

  // Call at _sampleRateHz to collect one raw ADC sample.
  void sample() {
    uint16_t raw = analogRead(_pin);  // 0–4095 on ESP32 (12-bit ADC)

    // Store in RMS window (circular)
    _rmsWindow[_rmsIdx] = raw;
    _rmsIdx = (_rmsIdx + 1) % EMG_WINDOW_SIZE;
    if (_rmsCount < EMG_WINDOW_SIZE) _rmsCount++;

    // Store in baseline window (circular)
    _baselineWindow[_baselineIdx] = raw;
    _baselineIdx = (_baselineIdx + 1) % EMG_BASELINE_SIZE;
    if (_baselineCount < EMG_BASELINE_SIZE) _baselineCount++;
  }

  // Compute RMS of current window. Call at your reporting rate (e.g. 1 Hz).
  // Returns value in range 0–4095 (raw ADC units).
  uint16_t getRMS() const {
    if (_rmsCount == 0) return 0;
    double sum = 0;
    for (uint16_t i = 0; i < _rmsCount; i++) {
      double v = _rmsWindow[i];
      sum += v * v;
    }
    return (uint16_t)sqrt(sum / _rmsCount);
  }

  // Long-term moving average baseline (for drift compensation).
  uint16_t getBaseline() const {
    if (_baselineCount == 0) return 0;
    uint32_t sum = 0;
    for (uint16_t i = 0; i < _baselineCount; i++) sum += _baselineWindow[i];
    return (uint16_t)(sum / _baselineCount);
  }

  // Baseline-subtracted RMS, clamped to [0, 4095].
  uint16_t getActivation() const {
    int32_t rms = getRMS();
    int32_t base = getBaseline();
    int32_t act = rms - base;
    return (uint16_t)constrain(act, 0, 4095);
  }

  // Normalise activation to 0–1023 range (matches classification thresholds).
  uint16_t getNormalized() const {
    // ESP32 ADC is 12-bit (0-4095); scale to 10-bit (0-1023)
    return getActivation() >> 2;
  }

private:
  uint8_t  _pin;
  uint32_t _sampleRateHz;

  uint16_t _rmsWindow[EMG_WINDOW_SIZE]         = {};
  uint16_t _rmsIdx = 0, _rmsCount = 0;

  uint16_t _baselineWindow[EMG_BASELINE_SIZE]  = {};
  uint16_t _baselineIdx = 0, _baselineCount = 0;
};
