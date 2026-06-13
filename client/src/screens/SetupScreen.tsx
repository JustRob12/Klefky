import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as LocalAuthentication from 'expo-local-authentication';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import PinNumpad from '../components/PinNumpad';
import { completeSetup } from '../utils/storage';

interface SetupScreenProps {
  onSetupComplete: (masterKey: string) => void;
}

export default function SetupScreen({ onSetupComplete }: SetupScreenProps) {
  const [step, setStep] = useState<'welcome' | 'biometrics' | 'pin' | 'confirm-pin'>('welcome');
  const [hasBiometrics, setHasBiometrics] = useState(false);
  const [biometricsEnabled, setBiometricsEnabled] = useState(false);
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    checkBiometricHardware();
  }, []);

  const checkBiometricHardware = async () => {
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      setHasBiometrics(hasHardware && isEnrolled);
    } catch (e) {
      console.error(e);
      setHasBiometrics(false);
    }
  };

  const handleEnableBiometrics = async () => {
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Enroll Biometrics for Klefky',
        fallbackLabel: 'Use PIN',
      });
      if (result.success) {
        setBiometricsEnabled(true);
        Alert.alert('Success', 'Biometric login enabled successfully.');
        setStep('pin');
      } else {
        Alert.alert('Verification Failed', 'Could not verify biometrics. Please try again.');
      }
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'An error occurred during biometrics configuration.');
    }
  };

  const handlePinChange = (newPin: string) => {
    if (step === 'pin') {
      setPin(newPin);
      if (newPin.length === 6) {
        // Automatically proceed to confirmation
        setTimeout(() => setStep('confirm-pin'), 300);
      }
    } else if (step === 'confirm-pin') {
      setConfirmPin(newPin);
      if (newPin.length === 6) {
        // Complete the PIN confirmation
        setTimeout(() => handleFinalizeSetup(newPin), 300);
      }
    }
  };

  const handleFinalizeSetup = async (finalConfirmPin: string) => {
    if (pin !== finalConfirmPin) {
      Alert.alert('Mismatch', 'PINs do not match. Please try setting your PIN again.', [
        {
          text: 'Restart PIN Setup',
          onPress: () => {
            setPin('');
            setConfirmPin('');
            setStep('pin');
          },
        },
      ]);
      return;
    }

    setLoading(true);
    try {
      // Initialize encryption keys and offline database files
      const masterKey = await completeSetup(pin, biometricsEnabled);
      onSetupComplete(masterKey);
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Failed to save configuration. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#000000" />
        <Text style={styles.loadingText}>Initializing Secure Vault...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {step === 'welcome' && (
        <View style={styles.content}>
          <View style={styles.logoContainer}>
            <Ionicons name="shield-checkmark-outline" size={80} color="#000000" />
            <Text style={styles.title}>KLEFKY</Text>
            <Text style={styles.subtitle}>Completely local, offline vault for your emails and passwords.</Text>
          </View>

          <View style={styles.featuresContainer}>
            <View style={styles.featureItem}>
              <Ionicons name="lock-closed-outline" size={24} color="#000000" style={styles.featureIcon} />
              <View>
                <Text style={styles.featureTitle}>Zero Cloud Storage</Text>
                <Text style={styles.featureDesc}>All login credentials remain strictly offline on this phone.</Text>
              </View>
            </View>
            <View style={styles.featureItem}>
              <Ionicons name="finger-print-outline" size={24} color="#000000" style={styles.featureIcon} />
              <View>
                <Text style={styles.featureTitle}>Biometric Access</Text>
                <Text style={styles.featureDesc}>Unlock instantly with fingerprint or passcode.</Text>
              </View>
            </View>
          </View>

          <TouchableOpacity style={styles.buttonContainer} onPress={() => setStep(hasBiometrics ? 'biometrics' : 'pin')}>
            <LinearGradient
              colors={['#000000', '#1C1C1E']}
              style={styles.gradientButton}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Text style={styles.buttonText}>Get Started</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      )}

      {step === 'biometrics' && (
        <View style={styles.content}>
          <TouchableOpacity style={styles.backButton} onPress={() => setStep('welcome')}>
            <Ionicons name="arrow-back" size={24} color="#000000" />
          </TouchableOpacity>

          <View style={styles.logoContainer}>
            <Ionicons name="finger-print" size={80} color="#000000" />
            <Text style={styles.title}>Secure Login</Text>
            <Text style={styles.subtitle}>Enable biometric fingerprint login for faster unlock access.</Text>
          </View>

          <View style={styles.optionsContainer}>
            <TouchableOpacity style={styles.buttonContainer} onPress={handleEnableBiometrics}>
              <LinearGradient
                colors={['#000000', '#1C1C1E']}
                style={styles.gradientButton}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Text style={styles.buttonText}>Enable Fingerprint</Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity style={styles.skipButton} onPress={() => setStep('pin')}>
              <Text style={styles.skipButtonText}>Skip for now</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {(step === 'pin' || step === 'confirm-pin') && (
        <View style={styles.pinContent}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => {
              if (step === 'confirm-pin') {
                setPin('');
                setConfirmPin('');
                setStep('pin');
              } else {
                setStep(hasBiometrics ? 'biometrics' : 'welcome');
              }
            }}
          >
            <Ionicons name="arrow-back" size={24} color="#000000" />
          </TouchableOpacity>

          <View style={styles.pinHeader}>
            <Text style={styles.pinTitle}>
              {step === 'pin' ? 'Create a 6-digit PIN' : 'Confirm 6-digit PIN'}
            </Text>
            <Text style={styles.pinSubtitle}>
              {step === 'pin'
                ? 'Your PIN is a fallback code used to decrypt and access your credentials.'
                : 'Enter your 6-digit PIN again to confirm.'}
            </Text>
          </View>

          <PinNumpad
            pin={step === 'pin' ? pin : confirmPin}
            onPinChange={handlePinChange}
            maxLength={6}
          />
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  content: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: 30,
    paddingVertical: 40,
  },
  pinContent: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: 30,
    paddingVertical: 20,
  },
  backButton: {
    alignSelf: 'flex-start',
    padding: 8,
    marginTop: 10,
  },
  logoContainer: {
    alignItems: 'center',
    marginTop: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: '300',
    color: '#000000',
    letterSpacing: 4,
    marginTop: 20,
    fontFamily: 'System',
  },
  subtitle: {
    fontSize: 15,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 22,
    marginTop: 12,
    paddingHorizontal: 20,
    fontFamily: 'System',
  },
  featuresContainer: {
    marginVertical: 40,
    paddingHorizontal: 10,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 28,
  },
  featureIcon: {
    marginRight: 18,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    fontFamily: 'System',
  },
  featureDesc: {
    fontSize: 13,
    color: '#8E8E93',
    marginTop: 2,
    fontFamily: 'System',
  },
  optionsContainer: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 20,
  },
  buttonContainer: {
    width: '100%',
    height: 52,
    borderRadius: 8,
    overflow: 'hidden',
  },
  gradientButton: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.5,
    fontFamily: 'System',
  },
  skipButton: {
    padding: 15,
    marginTop: 10,
  },
  skipButtonText: {
    color: '#8E8E93',
    fontSize: 14,
    fontFamily: 'System',
  },
  pinHeader: {
    alignItems: 'center',
    marginTop: 20,
    paddingHorizontal: 10,
  },
  pinTitle: {
    fontSize: 24,
    fontWeight: '300',
    color: '#000000',
    letterSpacing: 1,
    fontFamily: 'System',
  },
  pinSubtitle: {
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 20,
    marginTop: 10,
    fontFamily: 'System',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#8E8E93',
    fontSize: 16,
    marginTop: 15,
    fontFamily: 'System',
  },
});
