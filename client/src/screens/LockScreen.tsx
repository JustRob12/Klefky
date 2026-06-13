import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Alert, Vibration } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as LocalAuthentication from 'expo-local-authentication';
import { Ionicons } from '@expo/vector-icons';
import PinNumpad from '../components/PinNumpad';
import { getBiometricPreference, getMasterKeyDirectly, verifyPinAndGetMasterKey } from '../utils/storage';

interface LockScreenProps {
  onUnlock: (masterKey: string) => void;
}

export default function LockScreen({ onUnlock }: LockScreenProps) {
  const [pin, setPin] = useState('');
  const [biometricsAvailable, setBiometricsAvailable] = useState(false);
  const [errorText, setErrorText] = useState('');

  useEffect(() => {
    checkBiometrics();
  }, []);

  const checkBiometrics = async () => {
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      const userPref = await getBiometricPreference();
      
      const available = hasHardware && isEnrolled && userPref;
      setBiometricsAvailable(available);

      if (available) {
        // Automatically trigger biometric unlock on load
        triggerBiometricUnlock();
      }
    } catch (e) {
      console.error('Biometrics check error:', e);
      setBiometricsAvailable(false);
    }
  };

  const triggerBiometricUnlock = async () => {
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Unlock Klefky Vault',
        fallbackLabel: 'Use PIN',
      });

      if (result.success) {
        const masterKey = await getMasterKeyDirectly();
        if (masterKey) {
          onUnlock(masterKey);
        } else {
          Alert.alert('Vault Error', 'Could not retrieve decryption keys. Please re-enter your PIN.');
        }
      }
    } catch (e) {
      console.error('Biometric authentication failed:', e);
    }
  };

  const handlePinChange = async (newPin: string) => {
    setPin(newPin);
    setErrorText('');

    if (newPin.length === 6) {
      // Small timeout to allow the dot fill animation to render
      setTimeout(async () => {
        const masterKey = await verifyPinAndGetMasterKey(newPin);
        if (masterKey) {
          onUnlock(masterKey);
        } else {
          // Authentication failure
          Vibration.vibrate([0, 50, 50, 50]);
          setErrorText('Incorrect PIN. Please try again.');
          setPin('');
        }
      }, 200);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="lock-closed-outline" size={56} color="#000000" style={styles.lockIcon} />
        <Text style={styles.title}>Vault Locked</Text>
        <Text style={styles.subtitle}>Enter PIN or use biometrics to decrypt credentials.</Text>
      </View>

      <View style={styles.numpadContainer}>
        {errorText ? <Text style={styles.errorText}>{errorText}</Text> : <View style={styles.placeholder} />}
        <PinNumpad
          pin={pin}
          onPinChange={handlePinChange}
          maxLength={6}
          biometricType={biometricsAvailable ? 'fingerprint' : null}
          onBiometricPress={triggerBiometricUnlock}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    justifyContent: 'space-between',
    paddingVertical: 40,
  },
  header: {
    alignItems: 'center',
    marginTop: 60,
  },
  lockIcon: {
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '300',
    color: '#000000',
    letterSpacing: 2,
    fontFamily: 'System',
  },
  subtitle: {
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 40,
    fontFamily: 'System',
  },
  numpadContainer: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 20,
  },
  errorText: {
    color: '#000000',
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 20,
    letterSpacing: 0.5,
    fontFamily: 'System',
  },
  placeholder: {
    height: 20,
    marginBottom: 20,
  },
});
