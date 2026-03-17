import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import {
  simulateEMGReading,
  simulatePostureAngle,
  classifyMuscleStrain,
  classifyPosture,
  shouldSendAlert,
  generateWeeklyData,
} from '../utils/sensorSimulator';
import {
  loadAlerts,
  saveAlerts,
  saveTodaySession,
} from '../utils/storage';

const SensorContext = createContext(null);

export function SensorProvider({ children }) {
  const [isConnected, setIsConnected] = useState(false);
  const [isMonitoring, setIsMonitoring] = useState(false);

  // Live sensor readings
  const [emgValue, setEmgValue] = useState(0);
  const [neckTilt, setNeckTilt] = useState(0);
  const [shoulderAngle, setShoulderAngle] = useState(0);
  const [strainLabel, setStrainLabel] = useState('Normal');
  const [postureLabel, setPostureLabel] = useState('Good Posture');

  // Historical readings for mini chart (last 20 points)
  const [emgHistory, setEmgHistory] = useState(Array(20).fill(0));
  const [neckHistory, setNeckHistory] = useState(Array(20).fill(0));

  // Alerts list (loaded from storage on mount)
  const [alerts, setAlerts] = useState([]);

  // Weekly analytics (pre-generated)
  const [weeklyData] = useState(generateWeeklyData);

  // Session stats
  const [sessionStats, setSessionStats] = useState({
    alertsToday: 0,
    avgEmg: 0,
    avgNeck: 0,
    postureScore: 100,
  });

  const intervalRef = useRef(null);
  const emgSumRef = useRef(0);
  const neckSumRef = useRef(0);
  const readingCountRef = useRef(0);
  const alertsCountRef = useRef(0);
  const mountedRef = useRef(true);

  // Load persisted alerts on mount
  useEffect(() => {
    loadAlerts().then((saved) => {
      if (mountedRef.current && saved.length > 0) setAlerts(saved);
    });
    return () => { mountedRef.current = false; };
  }, []);

  // Persist alerts whenever they change (debounced via short timeout)
  const saveTimeoutRef = useRef(null);
  useEffect(() => {
    clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      if (mountedRef.current) saveAlerts(alerts);
    }, 2000);
    return () => clearTimeout(saveTimeoutRef.current);
  }, [alerts]);

  const stopMonitoring = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setIsMonitoring(false);
  }, []);

  const startMonitoring = useCallback(() => {
    if (intervalRef.current) return;
    setIsMonitoring(true);

    intervalRef.current = setInterval(() => {
      // Randomise "bad posture" phase probabilistically
      const isBadPhase = Math.random() < 0.25;
      const emgBase = isBadPhase ? 620 : 210;
      const neckBase = isBadPhase ? 32 : 11;
      const shoulderBase = isBadPhase ? 24 : 7;

      const newEmg = simulateEMGReading(emgBase, 60);
      const newNeck = simulatePostureAngle(neckBase, 5);
      const newShoulder = simulatePostureAngle(shoulderBase, 4);
      const newStrain = classifyMuscleStrain(newEmg);
      const newPosture = classifyPosture(newNeck, newShoulder);

      setEmgValue(newEmg);
      setNeckTilt(newNeck);
      setShoulderAngle(newShoulder);
      setStrainLabel(newStrain);
      setPostureLabel(newPosture);

      setEmgHistory((prev) => [...prev.slice(1), newEmg]);
      setNeckHistory((prev) => [...prev.slice(1), newNeck]);

      // Running averages
      emgSumRef.current += newEmg;
      neckSumRef.current += newNeck;
      readingCountRef.current += 1;

      if (shouldSendAlert(newStrain, newPosture)) {
        alertsCountRef.current += 1;
        const msg = newStrain !== 'Normal'
          ? `⚠️ ${newStrain} detected – take a break`
          : `📐 ${newPosture} – please adjust your position`;

        setAlerts((prev) => [
          {
            id: Date.now(),
            message: msg,
            time: new Date().toLocaleTimeString(),
            type: newStrain !== 'Normal' ? 'strain' : 'posture',
            strainLabel: newStrain,
            postureLabel: newPosture,
          },
          ...prev.slice(0, 49), // keep last 50 in memory
        ]);
      }

      // Update session stats every reading
      setSessionStats(() => {
        const count = readingCountRef.current;
        const avgEmg = Math.round(emgSumRef.current / count);
        const avgNeck = parseFloat((neckSumRef.current / count).toFixed(1));
        const postureScore = Math.max(
          0,
          Math.min(100, Math.round(100 - avgEmg / 14 - alertsCountRef.current * 2))
        );
        return { alertsToday: alertsCountRef.current, avgEmg, avgNeck, postureScore };
      });
    }, 1000);
  }, []);

  const connectDevice = useCallback(() => {
    // Simulate Bluetooth connection handshake
    setTimeout(() => {
      setIsConnected(true);
      startMonitoring();
    }, 1500);
  }, [startMonitoring]);

  const disconnectDevice = useCallback(() => {
    stopMonitoring();

    // Persist today's session summary before disconnecting
    if (readingCountRef.current > 0) {
      const count = readingCountRef.current;
      saveTodaySession({
        avgEmg:       Math.round(emgSumRef.current / count),
        alertCount:   alertsCountRef.current,
        postureScore: Math.max(
          0,
          Math.min(100, Math.round(100 - (emgSumRef.current / count) / 14 - alertsCountRef.current * 2))
        ),
      });
    }

    setIsConnected(false);
    setEmgValue(0);
    setNeckTilt(0);
    setShoulderAngle(0);
    setStrainLabel('Normal');
    setPostureLabel('Good Posture');
    setEmgHistory(Array(20).fill(0));
    setNeckHistory(Array(20).fill(0));
    emgSumRef.current = 0;
    neckSumRef.current = 0;
    readingCountRef.current = 0;
    alertsCountRef.current = 0;
  }, [stopMonitoring]);

  const clearAlerts = useCallback(() => {
    setAlerts([]);
    saveAlerts([]);
  }, []);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, []);

  return (
    <SensorContext.Provider
      value={{
        isConnected,
        isMonitoring,
        emgValue,
        neckTilt,
        shoulderAngle,
        strainLabel,
        postureLabel,
        emgHistory,
        neckHistory,
        alerts,
        weeklyData,
        sessionStats,
        connectDevice,
        disconnectDevice,
        clearAlerts,
      }}
    >
      {children}
    </SensorContext.Provider>
  );
}

export function useSensor() {
  const ctx = useContext(SensorContext);
  if (!ctx) throw new Error('useSensor must be used inside SensorProvider');
  return ctx;
}
