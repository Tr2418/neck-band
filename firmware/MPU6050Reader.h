#pragma once
#include <Arduino.h>
#include <Wire.h>

// ─────────────────────────────────────────────
//  MPU6050Reader.h
//  Reads the InvenSense MPU-6050 IMU via I²C and
//  computes neck-tilt and shoulder angles using a
//  complementary filter (accelerometer + gyroscope).
//
//  Default I²C address: 0x68 (AD0 LOW)
//                        0x69 (AD0 HIGH)
// ─────────────────────────────────────────────

#define MPU6050_ADDR      0x68

// Register addresses
#define MPU_PWR_MGMT_1    0x6B
#define MPU_SMPLRT_DIV    0x19
#define MPU_CONFIG        0x1A
#define MPU_GYRO_CONFIG   0x1B
#define MPU_ACCEL_CONFIG  0x1C
#define MPU_ACCEL_XOUT_H  0x3B
#define MPU_GYRO_XOUT_H   0x43

// Complementary filter coefficient
#define ALPHA             0.96f   // weight on gyroscope integration

class MPU6050Reader {
public:
  explicit MPU6050Reader(uint8_t addr = MPU6050_ADDR) : _addr(addr) {}

  // Call once during setup().
  bool begin() {
    Wire.begin();
    // Wake up MPU-6050 (clear sleep bit)
    writeReg(MPU_PWR_MGMT_1, 0x00);
    // Sample rate divider: 0 → 1 kHz / (1+0) = 1 kHz
    writeReg(MPU_SMPLRT_DIV, 0x00);
    // DLPF bandwidth ~94 Hz (config reg = 2)
    writeReg(MPU_CONFIG, 0x02);
    // Gyro full-scale ±250 °/s
    writeReg(MPU_GYRO_CONFIG, 0x00);
    // Accel full-scale ±2 g
    writeReg(MPU_ACCEL_CONFIG, 0x00);

    // Brief settle time
    delay(100);

    // Verify device is responding
    Wire.beginTransmission(_addr);
    return (Wire.endTransmission() == 0);
  }

  // Call in your main loop (typically 50–100 Hz).
  // dt = elapsed seconds since last call.
  void update(float dt) {
    int16_t ax, ay, az, gx, gy, gz;
    readRaw(ax, ay, az, gx, gy, gz);

    // Convert to SI units
    float axf = ax / 16384.0f;  // ±2 g scale
    float ayf = ay / 16384.0f;
    float azf = az / 16384.0f;
    float gxf = gx / 131.0f;   // ±250 °/s scale
    float gyf = gy / 131.0f;

    // Accelerometer-based angle estimates (degrees)
    float accelPitch = atan2(ayf, sqrt(axf * axf + azf * azf)) * RAD_TO_DEG;
    float accelRoll  = atan2(-axf, azf) * RAD_TO_DEG;

    // Complementary filter
    _pitch = ALPHA * (_pitch + gxf * dt) + (1.0f - ALPHA) * accelPitch;
    _roll  = ALPHA * (_roll  + gyf * dt) + (1.0f - ALPHA) * accelRoll;
  }

  // Neck forward-tilt angle in degrees (positive = forward head posture)
  float getNeckTilt()     const { return _pitch; }

  // Shoulder rounding angle in degrees (positive = rounded shoulders)
  float getShoulderAngle() const { return _roll; }

private:
  uint8_t _addr;
  float   _pitch = 0.0f;
  float   _roll  = 0.0f;

  void readRaw(int16_t &ax, int16_t &ay, int16_t &az,
               int16_t &gx, int16_t &gy, int16_t &gz) {
    Wire.beginTransmission(_addr);
    Wire.write(MPU_ACCEL_XOUT_H);
    Wire.endTransmission(false);
    Wire.requestFrom(_addr, (uint8_t)14);

    ax = (Wire.read() << 8) | Wire.read();
    ay = (Wire.read() << 8) | Wire.read();
    az = (Wire.read() << 8) | Wire.read();
    /* skip temperature (2 bytes) */
    Wire.read(); Wire.read();
    gx = (Wire.read() << 8) | Wire.read();
    gy = (Wire.read() << 8) | Wire.read();
    gz = (Wire.read() << 8) | Wire.read();
  }

  void writeReg(uint8_t reg, uint8_t val) {
    Wire.beginTransmission(_addr);
    Wire.write(reg);
    Wire.write(val);
    Wire.endTransmission();
  }
};
