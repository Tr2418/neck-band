import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { EMG_THRESHOLDS, POSTURE_THRESHOLDS } from '../utils/sensorSimulator';
import { loadSettings, saveSettings, clearAllData } from '../utils/storage';

function SectionHeader({ title }) {
  return <Text style={styles.sectionHeader}>{title}</Text>;
}

function SettingRow({ icon, iconColor, label, description, right }) {
  return (
    <View style={styles.settingRow}>
      <View style={[styles.settingIcon, { backgroundColor: iconColor + '22' }]}>
        <MaterialCommunityIcons name={icon} size={20} color={iconColor} />
      </View>
      <View style={styles.settingText}>
        <Text style={styles.settingLabel}>{label}</Text>
        {description ? <Text style={styles.settingDesc}>{description}</Text> : null}
      </View>
      <View style={styles.settingRight}>{right}</View>
    </View>
  );
}

export default function SettingsScreen() {
  const [alertsEnabled, setAlertsEnabled] = useState(true);
  const [vibrationEnabled, setVibrationEnabled] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [dailyReportEnabled, setDailyReportEnabled] = useState(true);
  const [weeklyReportEnabled, setWeeklyReportEnabled] = useState(true);
  const [autoConnect, setAutoConnect] = useState(true);

  // Load persisted settings on mount
  useEffect(() => {
    loadSettings().then((s) => {
      setAlertsEnabled(s.alertsEnabled);
      setVibrationEnabled(s.vibrationEnabled);
      setSoundEnabled(s.soundEnabled);
      setDailyReportEnabled(s.dailyReportEnabled);
      setWeeklyReportEnabled(s.weeklyReportEnabled);
      setAutoConnect(s.autoConnect);
    });
  }, []);

  // Persist whenever any setting changes
  const persist = useCallback((patch) => {
    saveSettings({
      alertsEnabled,
      vibrationEnabled,
      soundEnabled,
      dailyReportEnabled,
      weeklyReportEnabled,
      autoConnect,
      ...patch,
    });
  }, [alertsEnabled, vibrationEnabled, soundEnabled, dailyReportEnabled, weeklyReportEnabled, autoConnect]);

  const toggle = (setter, key, current) => {
    setter(!current);
    persist({ [key]: !current });
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.pageTitle}>Settings</Text>

      {/* Device info */}
      <View style={styles.deviceCard}>
        <MaterialCommunityIcons name="bluetooth" size={28} color="#1565C0" />
        <View style={styles.deviceInfo}>
          <Text style={styles.deviceName}>CervicalSentinel Band</Text>
          <Text style={styles.deviceDetail}>ESP32 · MyoWare EMG · MPU6050</Text>
          <Text style={styles.deviceDetail}>Firmware v1.0.0</Text>
        </View>
        <View style={[styles.deviceStatus, { backgroundColor: '#4CAF5020' }]}>
          <Text style={{ color: '#4CAF50', fontSize: 11, fontWeight: '600' }}>BLE Ready</Text>
        </View>
      </View>

      {/* Notifications */}
      <SectionHeader title="Notifications" />
      <View style={styles.card}>
        <SettingRow
          icon="bell-outline"
          iconColor="#1565C0"
          label="Enable Alerts"
          description="Push notifications for posture & strain"
          right={
            <Switch
              value={alertsEnabled}
              onValueChange={() => toggle(setAlertsEnabled, 'alertsEnabled', alertsEnabled)}
              trackColor={{ true: '#1565C0' }}
            />
          }
        />
        <Divider />
        <SettingRow
          icon="vibrate"
          iconColor="#9C27B0"
          label="Vibration Alerts"
          description="Vibrate on wearable for haptic feedback"
          right={
            <Switch
              value={vibrationEnabled}
              onValueChange={() => toggle(setVibrationEnabled, 'vibrationEnabled', vibrationEnabled)}
              trackColor={{ true: '#9C27B0' }}
            />
          }
        />
        <Divider />
        <SettingRow
          icon="volume-high"
          iconColor="#FF9800"
          label="Sound Alerts"
          description="Audible alert tone"
          right={
            <Switch
              value={soundEnabled}
              onValueChange={() => toggle(setSoundEnabled, 'soundEnabled', soundEnabled)}
              trackColor={{ true: '#FF9800' }}
            />
          }
        />
      </View>

      {/* Reporting */}
      <SectionHeader title="Reports" />
      <View style={styles.card}>
        <SettingRow
          icon="chart-bar"
          iconColor="#4CAF50"
          label="Daily Report"
          description="Receive end-of-day posture summary"
          right={
            <Switch
              value={dailyReportEnabled}
              onValueChange={() => toggle(setDailyReportEnabled, 'dailyReportEnabled', dailyReportEnabled)}
              trackColor={{ true: '#4CAF50' }}
            />
          }
        />
        <Divider />
        <SettingRow
          icon="calendar-week"
          iconColor="#4CAF50"
          label="Weekly Report"
          description="Receive weekly muscle & posture analytics"
          right={
            <Switch
              value={weeklyReportEnabled}
              onValueChange={() => toggle(setWeeklyReportEnabled, 'weeklyReportEnabled', weeklyReportEnabled)}
              trackColor={{ true: '#4CAF50' }}
            />
          }
        />
      </View>

      {/* Device */}
      <SectionHeader title="Device" />
      <View style={styles.card}>
        <SettingRow
          icon="bluetooth-connect"
          iconColor="#1565C0"
          label="Auto-Connect"
          description="Connect automatically when device is nearby"
          right={
            <Switch
              value={autoConnect}
              onValueChange={() => toggle(setAutoConnect, 'autoConnect', autoConnect)}
              trackColor={{ true: '#1565C0' }}
            />
          }
        />
      </View>

      {/* Thresholds */}
      <SectionHeader title="Alert Thresholds" />
      <View style={styles.card}>
        <ThresholdRow
          icon="pulse"
          color="#1565C0"
          label="EMG Normal Limit"
          value={`≤ ${EMG_THRESHOLDS.NORMAL} AU`}
        />
        <Divider />
        <ThresholdRow
          icon="pulse"
          color="#FF9800"
          label="EMG Moderate Limit"
          value={`≤ ${EMG_THRESHOLDS.MODERATE} AU`}
        />
        <Divider />
        <ThresholdRow
          icon="pulse"
          color="#F44336"
          label="EMG High Limit"
          value={`> ${EMG_THRESHOLDS.HIGH} AU`}
        />
        <Divider />
        <ThresholdRow
          icon="human"
          color="#FF9800"
          label="Neck Tilt Warning"
          value={`> ${POSTURE_THRESHOLDS.NECK_TILT_WARNING}°`}
        />
        <Divider />
        <ThresholdRow
          icon="human"
          color="#FF9800"
          label="Shoulder Warning"
          value={`> ${POSTURE_THRESHOLDS.SHOULDER_WARNING}°`}
        />
      </View>

      {/* About */}
      <SectionHeader title="About" />
      <View style={styles.card}>
        <AboutRow label="App Version" value="1.0.0" />
        <Divider />
        <AboutRow label="AI Model" value="Decision Tree + Neural Network" />
        <Divider />
        <AboutRow label="Primary Sensor" value="MyoWare EMG" />
        <Divider />
        <AboutRow label="Secondary Sensor" value="MPU6050" />
        <Divider />
        <AboutRow label="Microcontroller" value="ESP32" />
        <Divider />
        <AboutRow label="Communication" value="Bluetooth Low Energy" />
      </View>

      <Text style={styles.footer}>
        CervicalSentinel – AI-Powered Neck Muscle & Posture Monitoring{'\n'}
        Helping prevent chronic neck pain through early detection.
      </Text>

      {/* Data Management */}
      <TouchableOpacity
        style={styles.clearDataBtn}
        onPress={() => {
          Alert.alert(
            'Clear All Saved Data',
            'This will permanently delete your alert history and session records. Settings will be preserved. This cannot be undone.',
            [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Clear',
                style: 'destructive',
                onPress: () => {
                  clearAllData()
                    .then(() => Alert.alert('Done', 'Alert history and session data have been cleared.'))
                    .catch(() => Alert.alert('Error', 'Could not clear data. Please try again.'));
                },
              },
            ]
          );
        }}
      >
        <Ionicons name="trash-outline" size={18} color="#F44336" />
        <Text style={styles.clearDataText}>Clear All Saved Data</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function ThresholdRow({ icon, color, label, value }) {
  return (
    <View style={styles.settingRow}>
      <View style={[styles.settingIcon, { backgroundColor: color + '22' }]}>
        <MaterialCommunityIcons name={icon} size={20} color={color} />
      </View>
      <Text style={[styles.settingLabel, { flex: 1 }]}>{label}</Text>
      <Text style={[styles.thresholdValue, { color }]}>{value}</Text>
    </View>
  );
}

function AboutRow({ label, value }) {
  return (
    <View style={styles.aboutRow}>
      <Text style={styles.aboutLabel}>{label}</Text>
      <Text style={styles.aboutValue}>{value}</Text>
    </View>
  );
}

function Divider() {
  return <View style={styles.divider} />;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7FA' },
  content: { padding: 16, paddingBottom: 40 },
  pageTitle: { fontSize: 22, fontWeight: '700', color: '#0D1B2A', marginBottom: 16 },
  sectionHeader: {
    fontSize: 12,
    fontWeight: '700',
    color: '#90A4AE',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: 16,
    marginBottom: 6,
    paddingLeft: 4,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  deviceCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 4,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  deviceInfo: { flex: 1 },
  deviceName: { fontSize: 15, fontWeight: '700', color: '#0D1B2A' },
  deviceDetail: { fontSize: 12, color: '#607D8B', marginTop: 2 },
  deviceStatus: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5 },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
  },
  settingIcon: { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  settingText: { flex: 1 },
  settingLabel: { fontSize: 14, fontWeight: '600', color: '#0D1B2A' },
  settingDesc: { fontSize: 12, color: '#90A4AE', marginTop: 2 },
  settingRight: {},
  thresholdValue: { fontSize: 13, fontWeight: '700' },
  aboutRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
  },
  aboutLabel: { fontSize: 14, color: '#607D8B' },
  aboutValue: { fontSize: 13, fontWeight: '600', color: '#0D1B2A' },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: '#F0F2F5', marginLeft: 64 },
  clearDataBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 8,
    marginBottom: 24,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F44336',
    backgroundColor: '#FFF5F5',
  },
  clearDataText: {
    color: '#F44336',
    fontSize: 14,
    fontWeight: '600',
  },
  footer: {
    marginTop: 24,
    textAlign: 'center',
    fontSize: 12,
    color: '#BDBDBD',
    lineHeight: 18,
  },
});
