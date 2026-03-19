/**
 * storage.js
 * AsyncStorage helpers for persisting CervicalSentinel data
 * across app restarts.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEYS = {
  ALERTS:          '@cs_alerts',
  SESSION_HISTORY: '@cs_session_history',
  ONBOARDING_DONE: '@cs_onboarding_done',
  SETTINGS:        '@cs_settings',
};

// ─── Onboarding ────────────────────────────────────────────────────

export async function isOnboardingDone() {
  try {
    const val = await AsyncStorage.getItem(KEYS.ONBOARDING_DONE);
    return val === 'true';
  } catch {
    return false;
  }
}

export async function markOnboardingDone() {
  try {
    await AsyncStorage.setItem(KEYS.ONBOARDING_DONE, 'true');
  } catch { /* silent */ }
}

// ─── Alerts ────────────────────────────────────────────────────────

/**
 * Load persisted alert list (up to 200 alerts).
 * Returns [] if nothing saved.
 */
export async function loadAlerts() {
  try {
    const json = await AsyncStorage.getItem(KEYS.ALERTS);
    return json ? JSON.parse(json) : [];
  } catch {
    return [];
  }
}

/**
 * Persist alert list (keep newest 200 entries).
 */
export async function saveAlerts(alerts) {
  try {
    const trimmed = alerts.slice(0, 200);
    await AsyncStorage.setItem(KEYS.ALERTS, JSON.stringify(trimmed));
  } catch { /* silent */ }
}

// ─── Daily session history ─────────────────────────────────────────

/**
 * Load array of daily session summaries (last 30 days).
 * Each entry: { date, avgEmg, alertCount, postureScore }
 */
export async function loadSessionHistory() {
  try {
    const json = await AsyncStorage.getItem(KEYS.SESSION_HISTORY);
    return json ? JSON.parse(json) : [];
  } catch {
    return [];
  }
}

/**
 * Append or update today's session summary.
 * Keeps last 30 entries.
 */
export async function saveTodaySession(summary) {
  try {
    const history = await loadSessionHistory();
    const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    const idx = history.findIndex((e) => e.date === today);
    if (idx >= 0) {
      history[idx] = { date: today, ...summary };
    } else {
      history.unshift({ date: today, ...summary });
    }
    const trimmed = history.slice(0, 30);
    await AsyncStorage.setItem(KEYS.SESSION_HISTORY, JSON.stringify(trimmed));
  } catch { /* silent */ }
}

// ─── User settings ─────────────────────────────────────────────────

const DEFAULT_SETTINGS = {
  alertsEnabled:       true,
  vibrationEnabled:    true,
  soundEnabled:        false,
  dailyReportEnabled:  true,
  weeklyReportEnabled: true,
  autoConnect:         true,
};

export async function loadSettings() {
  try {
    const json = await AsyncStorage.getItem(KEYS.SETTINGS);
    return json ? { ...DEFAULT_SETTINGS, ...JSON.parse(json) } : DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export async function saveSettings(settings) {
  try {
    await AsyncStorage.setItem(KEYS.SETTINGS, JSON.stringify(settings));
  } catch { /* silent */ }
}

/**
 * Clear alert history and session history.
 * Settings and onboarding state are preserved.
 */
export async function clearAllData() {
  try {
    await AsyncStorage.multiRemove([
      KEYS.ALERTS,
      KEYS.SESSION_HISTORY,
    ]);
  } catch { /* silent */ }
}
