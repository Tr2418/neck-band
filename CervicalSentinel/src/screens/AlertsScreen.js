import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useSensor } from '../context/SensorContext';
import { getStrainColor, getPostureColor } from '../utils/sensorSimulator';

const { width } = Dimensions.get('window');

function AlertItem({ item }) {
  const isStrain = item.type === 'strain';
  const color = isStrain
    ? getStrainColor(item.strainLabel)
    : getPostureColor(item.postureLabel);

  return (
    <View style={[styles.alertCard, { borderLeftColor: color }]}>
      <View style={[styles.alertIcon, { backgroundColor: color + '22' }]}>
        <MaterialCommunityIcons
          name={isStrain ? 'pulse' : 'human'}
          size={22}
          color={color}
        />
      </View>
      <View style={styles.alertContent}>
        <Text style={styles.alertMessage}>{item.message}</Text>
        <Text style={styles.alertTime}>{item.time}</Text>
      </View>
    </View>
  );
}

export default function AlertsScreen() {
  const { alerts, clearAlerts, isConnected } = useSensor();

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Alerts</Text>
        {alerts.length > 0 && (
          <TouchableOpacity style={styles.clearBtn} onPress={clearAlerts}>
            <Ionicons name="trash-outline" size={16} color="#F44336" />
            <Text style={styles.clearBtnText}>Clear All</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Summary row */}
      {alerts.length > 0 && (
        <View style={styles.summaryRow}>
          <SummaryChip
            color="#F44336"
            label="High Strain"
            count={alerts.filter((a) => a.strainLabel === 'High Strain').length}
          />
          <SummaryChip
            color="#FF9800"
            label="Posture"
            count={alerts.filter((a) => a.type === 'posture').length}
          />
          <SummaryChip
            color="#1565C0"
            label="Total"
            count={alerts.length}
          />
        </View>
      )}

      {/* Alert list */}
      {!isConnected ? (
        <View style={styles.emptyState}>
          <Ionicons name="bluetooth-outline" size={48} color="#BDBDBD" />
          <Text style={styles.emptyText}>Connect your device to receive alerts.</Text>
        </View>
      ) : alerts.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="checkmark-circle-outline" size={56} color="#4CAF50" />
          <Text style={styles.emptyText}>No alerts – great posture! 🎉</Text>
        </View>
      ) : (
        <FlatList
          data={alerts}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => <AlertItem item={item} />}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

function SummaryChip({ color, label, count }) {
  return (
    <View style={[styles.chip, { backgroundColor: color + '18' }]}>
      <Text style={[styles.chipCount, { color }]}>{count}</Text>
      <Text style={[styles.chipLabel, { color }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7FA' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  headerTitle: { fontSize: 22, fontWeight: '700', color: '#0D1B2A' },
  clearBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F4433618',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
  },
  clearBtnText: { color: '#F44336', fontSize: 13, fontWeight: '600' },
  summaryRow: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  chip: {
    flex: 1,
    alignItems: 'center',
    borderRadius: 10,
    padding: 10,
  },
  chipCount: { fontSize: 20, fontWeight: '700' },
  chipLabel: { fontSize: 11, marginTop: 2, fontWeight: '500' },
  listContent: { padding: 16, paddingTop: 4 },
  alertCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 10,
    borderLeftWidth: 4,
    padding: 14,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
    alignItems: 'center',
  },
  alertIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  alertContent: { flex: 1 },
  alertMessage: { fontSize: 14, fontWeight: '600', color: '#0D1B2A', marginBottom: 4 },
  alertTime: { fontSize: 12, color: '#90A4AE' },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 15,
    color: '#607D8B',
    textAlign: 'center',
    lineHeight: 22,
  },
});
