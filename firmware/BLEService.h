#pragma once
#include <Arduino.h>
#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLEUtils.h>
#include <BLE2902.h>

// ─────────────────────────────────────────────
//  BLEService.h
//  GATT BLE service for CervicalSentinel.
//
//  Service UUID:
//    12345678-1234-5678-1234-56789abcdef0
//
//  Characteristics:
//    SENSOR_DATA (Notify):
//      12345678-1234-5678-1234-56789abcdef1
//      JSON payload sent at 1 Hz
//      {"e":350,"n":12.5,"s":8.2,"sc":0,"pc":0,"al":0,"b":85}
//      Keys:  e=emg  n=neckTilt  s=shoulderAngle
//             sc=strainClass  pc=postureClass  al=alertLevel  b=battery%
//
//    CONFIG (Write):
//      12345678-1234-5678-1234-56789abcdef2
//      Accepts JSON commands from the mobile app
//      {"cmd":"calibrate"}
//      {"cmd":"setThreshold","emgHigh":850}
// ─────────────────────────────────────────────

#define CERVICAL_SERVICE_UUID   "12345678-1234-5678-1234-56789abcdef0"
#define SENSOR_DATA_CHAR_UUID   "12345678-1234-5678-1234-56789abcdef1"
#define CONFIG_CHAR_UUID        "12345678-1234-5678-1234-56789abcdef2"

#define DEVICE_NAME             "CervicalSentinel"

class CSBLEService {
public:
  bool isConnected() const { return _connected; }
  bool shouldCalibrate() const { return _calibrateFlag; }
  void clearCalibrateFlag() { _calibrateFlag = false; }

  void begin() {
    BLEDevice::init(DEVICE_NAME);
    _server = BLEDevice::createServer();
    _server->setCallbacks(new ServerCallbacks(this));

    BLEService* svc = _server->createService(CERVICAL_SERVICE_UUID);

    // Sensor data characteristic (read + notify)
    _sensorChar = svc->createCharacteristic(
      SENSOR_DATA_CHAR_UUID,
      BLECharacteristic::PROPERTY_READ | BLECharacteristic::PROPERTY_NOTIFY
    );
    _sensorChar->addDescriptor(new BLE2902());

    // Config characteristic (write)
    _configChar = svc->createCharacteristic(
      CONFIG_CHAR_UUID,
      BLECharacteristic::PROPERTY_WRITE
    );
    _configChar->setCallbacks(new ConfigCallbacks(this));

    svc->start();

    BLEAdvertising* adv = BLEDevice::getAdvertising();
    adv->addServiceUUID(CERVICAL_SERVICE_UUID);
    adv->setScanResponse(true);
    adv->setMinPreferred(0x06);
    BLEDevice::startAdvertising();

    Serial.println("[BLE] Advertising as '" DEVICE_NAME "'");
  }

  // Notify all connected clients with a JSON sensor payload.
  void sendSensorData(uint16_t emg,
                      float    neckTilt,
                      float    shoulderAngle,
                      uint8_t  strainClass,
                      uint8_t  postureClass,
                      uint8_t  alertLevel,
                      uint8_t  batteryPct) {
    if (!_connected || !_sensorChar) return;

    char buf[128];
    snprintf(buf, sizeof(buf),
      "{\"e\":%u,\"n\":%.1f,\"s\":%.1f,\"sc\":%u,\"pc\":%u,\"al\":%u,\"b\":%u}",
      emg, neckTilt, shoulderAngle,
      strainClass, postureClass, alertLevel, batteryPct);

    _sensorChar->setValue((uint8_t*)buf, strlen(buf));
    _sensorChar->notify();
  }

private:
  BLEServer*         _server     = nullptr;
  BLECharacteristic* _sensorChar = nullptr;
  BLECharacteristic* _configChar = nullptr;
  bool               _connected  = false;
  bool               _calibrateFlag = false;

  // ---- Server connection callbacks ----
  class ServerCallbacks : public BLEServerCallbacks {
  public:
    explicit ServerCallbacks(CSBLEService* parent) : _p(parent) {}
    void onConnect(BLEServer* server) override {
      _p->_connected = true;
      Serial.println("[BLE] Client connected");
    }
    void onDisconnect(BLEServer* server) override {
      _p->_connected = false;
      Serial.println("[BLE] Client disconnected – restarting advertising");
      BLEDevice::startAdvertising();
    }
  private:
    CSBLEService* _p;
  };

  // ---- Config write callbacks ----
  class ConfigCallbacks : public BLECharacteristicCallbacks {
  public:
    explicit ConfigCallbacks(CSBLEService* parent) : _p(parent) {}
    void onWrite(BLECharacteristic* chr) override {
      std::string val = chr->getValue();
      if (val.find("calibrate") != std::string::npos) {
        _p->_calibrateFlag = true;
        Serial.println("[BLE] Calibration requested");
      }
      // Additional commands can be parsed here
    }
  private:
    CSBLEService* _p;
  };
};
