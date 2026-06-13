import React, { useState, useEffect, useRef } from 'react';
import { AppState, AppStateStatus, StyleSheet, View, ActivityIndicator } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AppNavigator from './src/navigation/AppNavigator';
import { isAppSetUp } from './src/utils/storage';

export default function App() {
  const [loading, setLoading] = useState(true);
  const [isSetUp, setIsSetUp] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [masterKey, setMasterKey] = useState<string | null>(null);

  const appState = useRef(AppState.currentState);

  useEffect(() => {
    checkAppSetup();

    // Listen for AppState changes to auto-lock the vault when the app goes background
    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription.remove();
    };
  }, []);

  const checkAppSetup = async () => {
    try {
      const setUp = await isAppSetUp();
      setIsSetUp(setUp);
    } catch (e) {
      console.error('Failed to verify app configuration state:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleAppStateChange = (nextAppState: AppStateStatus) => {
    // If the app transitioned from active to background, lock the vault instantly
    if (
      appState.current === 'active' &&
      nextAppState.match(/inactive|background/)
    ) {
      setIsAuthenticated(false);
      setMasterKey(null);
    }
    appState.current = nextAppState;
  };

  const handleSetupComplete = (key: string) => {
    setIsSetUp(true);
    setIsAuthenticated(true);
    setMasterKey(key);
  };

  const handleUnlock = (key: string) => {
    setIsAuthenticated(true);
    setMasterKey(key);
  };

  const handleLogOut = () => {
    setIsSetUp(false);
    setIsAuthenticated(false);
    setMasterKey(null);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#000000" />
      </View>
    );
  }

  return (
    <SafeAreaProvider style={styles.container}>
      <StatusBar style="dark" />
      <AppNavigator
        isSetUp={isSetUp}
        isAuthenticated={isAuthenticated}
        masterKey={masterKey}
        onSetupComplete={handleSetupComplete}
        onUnlock={handleUnlock}
        onLogOut={handleLogOut}
      />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
