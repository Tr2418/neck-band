import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
} from 'react-native';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { markOnboardingDone } from '../utils/storage';

const { width, height } = Dimensions.get('window');

const SLIDES = [
  {
    key: 'welcome',
    icon: 'shield-check-outline',
    iconLib: 'MaterialCommunityIcons',
    iconColor: '#1565C0',
    title: 'Welcome to CervicalSentinel',
    body:
      'Your AI-powered wearable system monitors neck muscle activity and posture in real-time, helping you prevent chronic neck and shoulder problems.',
  },
  {
    key: 'emg',
    icon: 'pulse',
    iconLib: 'MaterialCommunityIcons',
    iconColor: '#1565C0',
    title: 'EMG Muscle Monitoring',
    body:
      'The MyoWare EMG sensor detects electrical signals from your upper trapezius and SCM muscles — the earliest sign of muscle strain, before visible posture changes occur.',
  },
  {
    key: 'posture',
    icon: 'human',
    iconLib: 'MaterialCommunityIcons',
    iconColor: '#FF9800',
    title: 'Posture Tracking',
    body:
      'The MPU-6050 IMU sensor measures your neck tilt and shoulder angles in degrees to identify forward head posture and rounded shoulders.',
  },
  {
    key: 'ai',
    icon: 'brain',
    iconLib: 'MaterialCommunityIcons',
    iconColor: '#9C27B0',
    title: 'On-Device AI Classification',
    body:
      'A Decision Tree AI model runs on the ESP32 microcontroller. It classifies muscle strain (Normal → High) and posture quality in real-time and sends instant alerts to this app.',
  },
  {
    key: 'alerts',
    icon: 'notifications-outline',
    iconLib: 'Ionicons',
    iconColor: '#F44336',
    title: 'Real-Time Alerts',
    body:
      'Whenever poor posture or muscle strain is detected, CervicalSentinel sends you an immediate notification so you can correct your position before damage occurs.',
  },
  {
    key: 'analytics',
    icon: 'bar-chart-outline',
    iconLib: 'Ionicons',
    iconColor: '#4CAF50',
    title: 'Daily & Weekly Analytics',
    body:
      'Track your posture score, average EMG levels, and alert history over time. Use the Analytics tab to review daily and weekly trends.',
  },
  {
    key: 'connect',
    icon: 'bluetooth',
    iconLib: 'MaterialCommunityIcons',
    iconColor: '#1565C0',
    title: 'Connect Your Device',
    body:
      'Turn on your CervicalSentinel band, then tap "Connect to CervicalSentinel" on the Dashboard. The band appears as "CervicalSentinel" over Bluetooth Low Energy.',
  },
];

function SlideIcon({ icon, iconLib, color }) {
  if (iconLib === 'Ionicons') {
    return <Ionicons name={icon} size={72} color={color} />;
  }
  return <MaterialCommunityIcons name={icon} size={72} color={color} />;
}

export default function OnboardingScreen({ onDone }) {
  const [page, setPage] = useState(0);
  const slide = SLIDES[page];
  const isLast = page === SLIDES.length - 1;

  const handleNext = () => {
    if (isLast) {
      markOnboardingDone();
      onDone();
    } else {
      setPage((p) => p + 1);
    }
  };

  const handleBack = () => {
    if (page > 0) setPage((p) => p - 1);
  };

  const handleSkip = () => {
    markOnboardingDone();
    onDone();
  };

  return (
    <View style={styles.container}>
      {/* Skip button */}
      {!isLast && (
        <TouchableOpacity style={styles.skipBtn} onPress={handleSkip}>
          <Text style={styles.skipText}>Skip</Text>
        </TouchableOpacity>
      )}

      {/* Slide content */}
      <View style={styles.slideArea}>
        <View style={[styles.iconCircle, { backgroundColor: slide.iconColor + '18' }]}>
          <SlideIcon icon={slide.icon} iconLib={slide.iconLib} color={slide.iconColor} />
        </View>
        <Text style={styles.slideTitle}>{slide.title}</Text>
        <Text style={styles.slideBody}>{slide.body}</Text>
      </View>

      {/* Progress dots */}
      <View style={styles.dotsRow}>
        {SLIDES.map((_, i) => (
          <View
            key={i}
            style={[
              styles.dot,
              i === page
                ? { backgroundColor: '#1565C0', width: 20 }
                : { backgroundColor: '#CFD8DC' },
            ]}
          />
        ))}
      </View>

      {/* Navigation buttons */}
      <View style={styles.navRow}>
        <TouchableOpacity
          style={[styles.backBtn, page === 0 && styles.btnDisabled]}
          onPress={handleBack}
          disabled={page === 0}
        >
          <Ionicons name="arrow-back" size={20} color={page === 0 ? '#CFD8DC' : '#607D8B'} />
          <Text style={[styles.backBtnText, page === 0 && { color: '#CFD8DC' }]}>Back</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.nextBtn, { backgroundColor: slide.iconColor }]}
          onPress={handleNext}
        >
          <Text style={styles.nextBtnText}>{isLast ? "Let's Go!" : 'Next'}</Text>
          <Ionicons
            name={isLast ? 'checkmark-circle-outline' : 'arrow-forward'}
            size={20}
            color="#fff"
          />
        </TouchableOpacity>
      </View>

      {/* Page counter */}
      <Text style={styles.pageCounter}>
        {page + 1} / {SLIDES.length}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 40,
  },
  skipBtn: {
    alignSelf: 'flex-end',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#E8EAF0',
  },
  skipText: { color: '#607D8B', fontSize: 14, fontWeight: '600' },
  slideArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  iconCircle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
  },
  slideTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#0D1B2A',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 32,
  },
  slideBody: {
    fontSize: 15,
    color: '#607D8B',
    textAlign: 'center',
    lineHeight: 24,
  },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    marginBottom: 24,
  },
  dot: {
    height: 8,
    borderRadius: 4,
    width: 8,
  },
  navRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: '#E8EAF0',
  },
  backBtnText: { fontSize: 15, fontWeight: '600', color: '#607D8B' },
  btnDisabled: { opacity: 0.4 },
  nextBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 14,
  },
  nextBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  pageCounter: {
    textAlign: 'center',
    fontSize: 12,
    color: '#BDBDBD',
  },
});
