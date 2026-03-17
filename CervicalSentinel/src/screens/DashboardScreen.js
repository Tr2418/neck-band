import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
} from 'react-native';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { useSensor } from '../context/SensorContext';
import { getStrainColor, getPostureColor } from '../utils/sensorSimulator';

const { width } = Dimensions.get('window');

function GaugeBar({ value, max, color, label }) {
  const pct = Math.min(100, Math.round((value / max) * 100));
  return (
    <View style={styles.gaugeContainer}>
      <View style={styles.gaugeHeader}>
        <Text style={styles.gaugeLabel}>{label}</Text>
        <Text style={[styles.gaugeValue, { color }]}>{value}</Text>
      </View>
      <View style={styles.gaugeTrack}>
        <View style={[styles.gaugeFill, { width: `${pct}%`, backgroundColor: color }]} />
      </View>
    </View>
  );
}

function SparkLine({ data, color }) {
  const maxVal = Math.max(...data, 1);
  const h = 50;
  const w = width - 64;
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - (v / maxVal) * h;
    return `${x},${y}`;
  });
  // Simple SVG approximation using View bars
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', height: h, width: w }}>
      {data.map((v, i) => {
        const barH = maxVal === 0 ? 2 : Math.max(2, (v / maxVal) * h);
        return (
          <View
            key={i}
            style={{
              flex: 1,
              height: barH,
              backgroundColor: color,
              marginHorizontal: 1,
              borderRadius: 2,
              opacity: 0.8,
            }}
          />
        );
      })}
    </View>
  );
}

export default function DashboardScreen() {
  const {
    isConnected,
    isMonitoring,
    emgValue,
    neckTilt,
    shoulderAngle,
    strainLabel,
    postureLabel,
    emgHistory,
    neckHistory,
    sessionStats,
    connectDevice,
    disconnectDevice,
  } = useSensor();

  const strainColor = getStrainColor(strainLabel);
  const postureColor = getPostureColor(postureLabel);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header status */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>CervicalSentinel</Text>
          <Text style={styles.subtitle}>AI Neck & Posture Monitor</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: isConnected ? '#4CAF5022' : '#F4433622' }]}>
          <View style={[styles.statusDot, { backgroundColor: isConnected ? '#4CAF50' : '#F44336' }]} />
          <Text style={[styles.statusText, { color: isConnected ? '#4CAF50' : '#F44336' }]}>
            {isConnected ? 'Connected' : 'Disconnected'}
          </Text>
        </View>
      </View>

      {/* Connect / Disconnect button */}
      <TouchableOpacity
        style={[styles.connectBtn, { backgroundColor: isConnected ? '#F44336' : '#1565C0' }]}
        onPress={isConnected ? disconnectDevice : connectDevice}
      >
        <MaterialCommunityIcons
          name={isConnected ? 'bluetooth-off' : 'bluetooth'}
          size={20}
          color="#fff"
        />
        <Text style={styles.connectBtnText}>
          {isConnected ? 'Disconnect Device' : 'Connect to CervicalSentinel'}
        </Text>
      </TouchableOpacity>

      {!isConnected && (
        <View style={styles.disconnectedCard}>
          <MaterialCommunityIcons name="bluetooth-connect" size={48} color="#BDBDBD" />
          <Text style={styles.disconnectedText}>
            Connect your CervicalSentinel wearable{'\n'}via Bluetooth to begin monitoring.
          </Text>
        </View>
      )}

      {isConnected && (
        <>
          {/* AI Classification row */}
          <View style={styles.classRow}>
            <View style={[styles.classCard, { borderColor: strainColor }]}>
              <Text style={styles.classTitle}>Muscle Strain</Text>
              <Text style={[styles.classLabel, { color: strainColor }]}>{strainLabel}</Text>
            </View>
            <View style={[styles.classCard, { borderColor: postureColor }]}>
              <Text style={styles.classTitle}>Posture</Text>
              <Text style={[styles.classLabel, { color: postureColor }]} numberOfLines={2}>
                {postureLabel}
              </Text>
            </View>
          </View>

          {/* EMG card */}
          <View style={styles.sensorCard}>
            <View style={styles.sensorCardHeader}>
              <MaterialCommunityIcons name="pulse" size={22} color="#1565C0" />
              <Text style={styles.sensorCardTitle}>EMG Muscle Activity</Text>
              <Text style={styles.sensorCardUnit}>(Upper Trapezius / SCM)</Text>
            </View>
            <GaugeBar value={emgValue} max={1023} color={strainColor} label="Signal (AU)" />
            <Text style={styles.chartLabel}>Last 20 seconds</Text>
            <SparkLine data={emgHistory} color={strainColor} />
          </View>

          {/* Posture card */}
          <View style={styles.sensorCard}>
            <View style={styles.sensorCardHeader}>
              <MaterialCommunityIcons name="human" size={22} color="#1565C0" />
              <Text style={styles.sensorCardTitle}>MPU6050 Posture Sensor</Text>
            </View>
            <GaugeBar value={Math.abs(neckTilt)} max={60} color={postureColor} label={`Neck Tilt: ${neckTilt}°`} />
            <GaugeBar
              value={Math.abs(shoulderAngle)}
              max={40}
              color={postureColor}
              label={`Shoulder Angle: ${shoulderAngle}°`}
            />
            <Text style={styles.chartLabel}>Neck tilt (last 20 s)</Text>
            <SparkLine
              data={neckHistory.map((v) => Math.abs(v))}
              color={postureColor}
            />
          </View>

          {/* Session stats */}
          <View style={styles.statsRow}>
            <StatBox icon="alert-circle-outline" label="Alerts Today" value={sessionStats.alertsToday} color="#FF9800" />
            <StatBox icon="chart-line" label="Avg EMG" value={sessionStats.avgEmg} color="#1565C0" />
            <StatBox icon="speedometer" label="Posture Score" value={`${sessionStats.postureScore}%`} color="#4CAF50" />
          </View>
        </>
      )}
    </ScrollView>
  );
}

function StatBox({ icon, label, value, color }) {
  return (
    <View style={styles.statBox}>
      <Ionicons name={icon} size={22} color={color} />
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7FA' },
  content: { padding: 16, paddingBottom: 32 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: { fontSize: 22, fontWeight: '700', color: '#0D1B2A' },
  subtitle: { fontSize: 13, color: '#607D8B', marginTop: 2 },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  statusDot: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
  statusText: { fontSize: 12, fontWeight: '600' },
  connectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: 12,
    marginBottom: 16,
    gap: 8,
  },
  connectBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  disconnectedCard: {
    alignItems: 'center',
    padding: 40,
    backgroundColor: '#fff',
    borderRadius: 16,
    marginTop: 20,
  },
  disconnectedText: {
    marginTop: 16,
    textAlign: 'center',
    color: '#607D8B',
    fontSize: 14,
    lineHeight: 22,
  },
  classRow: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  classCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  classTitle: { fontSize: 11, color: '#607D8B', marginBottom: 4, textTransform: 'uppercase' },
  classLabel: { fontSize: 15, fontWeight: '700' },
  sensorCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  sensorCardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 6 },
  sensorCardTitle: { fontSize: 15, fontWeight: '600', color: '#0D1B2A' },
  sensorCardUnit: { fontSize: 11, color: '#607D8B', marginLeft: 2 },
  gaugeContainer: { marginBottom: 10 },
  gaugeHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  gaugeLabel: { fontSize: 12, color: '#607D8B' },
  gaugeValue: { fontSize: 12, fontWeight: '700' },
  gaugeTrack: {
    height: 8,
    backgroundColor: '#E8EAF0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  gaugeFill: { height: '100%', borderRadius: 4 },
  chartLabel: { fontSize: 11, color: '#BDBDBD', marginTop: 8, marginBottom: 4 },
  statsRow: { flexDirection: 'row', gap: 10, marginTop: 4 },
  statBox: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  statValue: { fontSize: 18, fontWeight: '700', marginTop: 4 },
  statLabel: { fontSize: 10, color: '#607D8B', marginTop: 2, textAlign: 'center' },
});
