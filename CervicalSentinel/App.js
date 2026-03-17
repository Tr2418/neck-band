import React, { useState, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';

import { SensorProvider } from './src/context/SensorContext';
import DashboardScreen from './src/screens/DashboardScreen';
import AlertsScreen from './src/screens/AlertsScreen';
import AnalyticsScreen from './src/screens/AnalyticsScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import OnboardingScreen from './src/screens/OnboardingScreen';
import { isOnboardingDone } from './src/utils/storage';

const Tab = createBottomTabNavigator();

export default function App() {
  const [onboarded, setOnboarded] = useState(null); // null = loading

  useEffect(() => {
    isOnboardingDone().then((done) => setOnboarded(done));
  }, []);

  // Splash / loading state
  if (onboarded === null) return null;

  // First-time onboarding
  if (!onboarded) {
    return (
      <>
        <StatusBar style="dark" />
        <OnboardingScreen onDone={() => setOnboarded(true)} />
      </>
    );
  }

  return (
    <SensorProvider>
      <NavigationContainer>
        <StatusBar style="dark" />
        <Tab.Navigator
          screenOptions={{
            tabBarActiveTintColor: '#1565C0',
            tabBarInactiveTintColor: '#90A4AE',
            tabBarStyle: {
              backgroundColor: '#fff',
              borderTopColor: '#E8EAF0',
              paddingBottom: 4,
              height: 58,
            },
            headerStyle: { backgroundColor: '#F5F7FA' },
            headerTintColor: '#0D1B2A',
            headerTitleStyle: { fontWeight: '700' },
          }}
        >
          <Tab.Screen
            name="Dashboard"
            component={DashboardScreen}
            options={{
              headerTitle: 'Dashboard',
              tabBarIcon: ({ color, size }) => (
                <MaterialCommunityIcons name="monitor-dashboard" color={color} size={size} />
              ),
            }}
          />
          <Tab.Screen
            name="Alerts"
            component={AlertsScreen}
            options={{
              headerTitle: 'Alerts',
              tabBarIcon: ({ color, size }) => (
                <Ionicons name="notifications-outline" color={color} size={size} />
              ),
            }}
          />
          <Tab.Screen
            name="Analytics"
            component={AnalyticsScreen}
            options={{
              headerTitle: 'Analytics',
              tabBarIcon: ({ color, size }) => (
                <Ionicons name="bar-chart-outline" color={color} size={size} />
              ),
            }}
          />
          <Tab.Screen
            name="Settings"
            component={SettingsScreen}
            options={{
              headerTitle: 'Settings',
              tabBarIcon: ({ color, size }) => (
                <Ionicons name="settings-outline" color={color} size={size} />
              ),
            }}
          />
        </Tab.Navigator>
      </NavigationContainer>
    </SensorProvider>
  );
}
