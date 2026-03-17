import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Dimensions,
  TouchableOpacity,
} from 'react-native';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { useSensor } from '../context/SensorContext';
import { generateDailyData } from '../utils/sensorSimulator';

const { width } = Dimensions.get('window');
const CHART_WIDTH = width - 48;

// Simple bar chart component
function BarChart({ data, valueKey, labelKey, color, max, unit }) {
  return (
    <View style={styles.chartContainer}>
      {data.map((item, i) => {
        const pct = Math.min(100, (item[valueKey] / max) * 100);
        return (
          <View key={i} style={styles.barRow}>
            <Text style={styles.barLabel}>{item[labelKey]}</Text>
            <View style={styles.barTrack}>
              <View
                style={[styles.barFill, { width: `${pct}%`, backgroundColor: color }]}
              />
            </View>
            <Text style={[styles.barValue, { color }]}>
              {item[valueKey]}
              {unit}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

// Score ring
function ScoreRing({ score, label, color }) {
  return (
    <View style={styles.scoreRing}>
      <View style={[styles.scoreCircle, { borderColor: color }]}>
        <Text style={[styles.scoreNumber, { color }]}>{score}</Text>
        <Text style={styles.scorePct}>%</Text>
      </View>
      <Text style={styles.scoreLabel}>{label}</Text>
    </View>
  );
}

export default function AnalyticsScreen() {
  const { weeklyData, sessionStats, isConnected } = useSensor();
  const [tab, setTab] = useState('weekly'); // 'daily' | 'weekly'
  const [dailyData] = useState(generateDailyData);

  const avgPostureScore = Math.round(
    weeklyData.reduce((s, d) => s + d.postureScore, 0) / weeklyData.length
  );
  const totalAlerts = weeklyData.reduce((s, d) => s + d.alertCount, 0);
  const avgEmgWeekly = Math.round(
    weeklyData.reduce((s, d) => s + d.avgEmg, 0) / weeklyData.length
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.pageTitle}>Analytics & Reports</Text>

      {/* Summary score cards */}
      <View style={styles.scoresRow}>
        <ScoreRing score={avgPostureScore} label="Weekly Posture" color="#4CAF50" />
        <ScoreRing score={sessionStats.postureScore} label="Today" color="#1565C0" />
        <ScoreRing
          score={Math.max(0, 100 - Math.round((totalAlerts / 70) * 100))}
          label="Strain Health"
          color="#FF9800"
        />
      </View>

      {/* Stat summary */}
      <View style={styles.summaryRow}>
        <MiniStat label="Total Alerts" value={totalAlerts} icon="alert-circle-outline" color="#F44336" />
        <MiniStat label="Avg EMG" value={avgEmgWeekly} icon="pulse-outline" color="#1565C0" />
        <MiniStat label="Today Alerts" value={sessionStats.alertsToday} icon="notifications-outline" color="#FF9800" />
      </View>

      {/* Tab switcher */}
      <View style={styles.tabRow}>
        <TouchableOpacity
          style={[styles.tab, tab === 'weekly' && styles.tabActive]}
          onPress={() => setTab('weekly')}
        >
          <Text style={[styles.tabText, tab === 'weekly' && styles.tabTextActive]}>Weekly</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, tab === 'daily' && styles.tabActive]}
          onPress={() => setTab('daily')}
        >
          <Text style={[styles.tabText, tab === 'daily' && styles.tabTextActive]}>Today (Hourly)</Text>
        </TouchableOpacity>
      </View>

      {tab === 'weekly' ? (
        <>
          {/* Weekly posture score */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Ionicons name="trending-up-outline" size={20} color="#4CAF50" />
              <Text style={styles.cardTitle}>Posture Score – Past 7 Days</Text>
            </View>
            <BarChart
              data={weeklyData}
              valueKey="postureScore"
              labelKey="day"
              color="#4CAF50"
              max={100}
              unit="%"
            />
          </View>

          {/* Weekly alerts */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Ionicons name="alert-circle-outline" size={20} color="#F44336" />
              <Text style={styles.cardTitle}>Daily Alerts – Past 7 Days</Text>
            </View>
            <BarChart
              data={weeklyData}
              valueKey="alertCount"
              labelKey="day"
              color="#F44336"
              max={Math.max(...weeklyData.map((d) => d.alertCount), 1)}
              unit=""
            />
          </View>

          {/* Weekly avg EMG */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <MaterialCommunityIcons name="pulse" size={20} color="#1565C0" />
              <Text style={styles.cardTitle}>Average EMG – Past 7 Days</Text>
            </View>
            <BarChart
              data={weeklyData}
              valueKey="avgEmg"
              labelKey="day"
              color="#1565C0"
              max={1023}
              unit=""
            />
          </View>
        </>
      ) : (
        <>
          {/* Daily hourly EMG */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <MaterialCommunityIcons name="pulse" size={20} color="#1565C0" />
              <Text style={styles.cardTitle}>EMG Activity – Today (Hourly)</Text>
            </View>
            <BarChart
              data={dailyData}
              valueKey="emg"
              labelKey="hour"
              color="#1565C0"
              max={1023}
              unit=""
            />
          </View>

          {/* Daily neck tilt */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <MaterialCommunityIcons name="human" size={20} color="#FF9800" />
              <Text style={styles.cardTitle}>Neck Tilt – Today (Hourly)</Text>
            </View>
            <BarChart
              data={dailyData.map((d) => ({ ...d, neckAbs: Math.abs(d.neckTilt) }))}
              valueKey="neckAbs"
              labelKey="hour"
              color="#FF9800"
              max={60}
              unit="°"
            />
          </View>

          {/* Hourly posture labels */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Ionicons name="body-outline" size={20} color="#4CAF50" />
              <Text style={styles.cardTitle}>Posture Status – Today</Text>
            </View>
            {dailyData.map((d, i) => (
              <View key={i} style={styles.postureRow}>
                <Text style={styles.postureHour}>{d.hour}:00</Text>
                <View
                  style={[
                    styles.postureBadge,
                    {
                      backgroundColor:
                        d.postureLabel === 'Good Posture' ? '#4CAF5020' : '#FF980020',
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.postureBadgeText,
                      {
                        color:
                          d.postureLabel === 'Good Posture' ? '#4CAF50' : '#FF9800',
                      },
                    ]}
                  >
                    {d.postureLabel}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </>
      )}
    </ScrollView>
  );
}

function MiniStat({ label, value, icon, color }) {
  return (
    <View style={styles.miniStat}>
      <Ionicons name={icon} size={18} color={color} />
      <Text style={[styles.miniStatValue, { color }]}>{value}</Text>
      <Text style={styles.miniStatLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7FA' },
  content: { padding: 16, paddingBottom: 32 },
  pageTitle: { fontSize: 22, fontWeight: '700', color: '#0D1B2A', marginBottom: 16 },
  scoresRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  scoreRing: { alignItems: 'center' },
  scoreCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 5,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  scoreNumber: { fontSize: 22, fontWeight: '700' },
  scorePct: { fontSize: 12, color: '#607D8B', marginTop: 6 },
  scoreLabel: { marginTop: 8, fontSize: 11, color: '#607D8B', textAlign: 'center' },
  summaryRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  miniStat: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  miniStatValue: { fontSize: 18, fontWeight: '700', marginTop: 4 },
  miniStatLabel: { fontSize: 10, color: '#607D8B', marginTop: 2, textAlign: 'center' },
  tabRow: {
    flexDirection: 'row',
    backgroundColor: '#E8EAF0',
    borderRadius: 12,
    padding: 4,
    marginBottom: 12,
  },
  tab: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 9 },
  tabActive: { backgroundColor: '#fff', shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 3, elevation: 2 },
  tabText: { fontSize: 13, color: '#607D8B', fontWeight: '500' },
  tabTextActive: { color: '#0D1B2A', fontWeight: '700' },
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  cardTitle: { fontSize: 14, fontWeight: '600', color: '#0D1B2A', flex: 1 },
  chartContainer: {},
  barRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  barLabel: { width: 36, fontSize: 11, color: '#607D8B' },
  barTrack: {
    flex: 1,
    height: 10,
    backgroundColor: '#F0F2F5',
    borderRadius: 5,
    overflow: 'hidden',
    marginHorizontal: 8,
  },
  barFill: { height: '100%', borderRadius: 5 },
  barValue: { width: 40, fontSize: 11, fontWeight: '600', textAlign: 'right' },
  postureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    gap: 10,
  },
  postureHour: { width: 40, fontSize: 12, color: '#607D8B' },
  postureBadge: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3 },
  postureBadgeText: { fontSize: 12, fontWeight: '600' },
});
