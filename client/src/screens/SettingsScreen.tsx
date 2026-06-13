import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Modal,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as LocalAuthentication from 'expo-local-authentication';
import {
  getBiometricPreference,
  toggleBiometrics,
  changePin,
  purgeAllData,
} from '../utils/storage';
import PinNumpad from '../components/PinNumpad';

interface SettingsScreenProps {
  onLogOut: () => void; // Used to reset app state back to setup flow when purged
}

export default function SettingsScreen({ onLogOut }: SettingsScreenProps) {
  const [biometricsEnabled, setBiometricsEnabled] = useState(false);
  const [hasHardware, setHasHardware] = useState(false);
  
  // PIN Change Form Modal State
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [pinStep, setPinStep] = useState<'old' | 'new' | 'confirm'>('old');
  const [oldPin, setOldPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');

  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    try {
      const isBiometricsSupported = await LocalAuthentication.hasHardwareAsync();
      const isBiometricsEnrolled = await LocalAuthentication.isEnrolledAsync();
      setHasHardware(isBiometricsSupported && isBiometricsEnrolled);

      const pref = await getBiometricPreference();
      setBiometricsEnabled(pref);
    } catch (e) {
      console.error(e);
    }
  };

  const handleToggleBiometrics = async () => {
    if (!hasHardware) {
      Alert.alert('Unsupported', 'Biometric scanner hardware not detected or no fingerprints are enrolled on this device.');
      return;
    }

    const nextState = !biometricsEnabled;
    try {
      // Authenticate to verify before toggling
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: nextState ? 'Confirm enabling biometric unlock' : 'Confirm disabling biometric unlock',
        fallbackLabel: 'Use PIN',
      });

      if (result.success) {
        await toggleBiometrics(nextState);
        setBiometricsEnabled(nextState);
        Alert.alert('Success', `Biometric unlock ${nextState ? 'enabled' : 'disabled'}.`);
      }
    } catch (e) {
      Alert.alert('Error', 'Failed to toggle biometrics.');
    }
  };

  const handlePinChangeInput = (value: string) => {
    if (pinStep === 'old') {
      setOldPin(value);
      if (value.length === 6) {
        setTimeout(() => setPinStep('new'), 300);
      }
    } else if (pinStep === 'new') {
      setNewPin(value);
      if (value.length === 6) {
        setTimeout(() => setPinStep('confirm'), 300);
      }
    } else if (pinStep === 'confirm') {
      setConfirmPin(value);
      if (value.length === 6) {
        setTimeout(() => finalizePinChange(value), 300);
      }
    }
  };

  const finalizePinChange = async (finalConfirmPin: string) => {
    if (newPin !== finalConfirmPin) {
      Alert.alert('Mismatch', 'New PINs do not match. Please try again.', [
        {
          text: 'Cancel',
          onPress: resetPinChangeState,
        },
      ]);
      return;
    }

    const success = await changePin(oldPin, newPin);
    if (success) {
      Alert.alert('Success', 'PIN code changed successfully.');
      resetPinChangeState();
    } else {
      Alert.alert('Error', 'Incorrect current PIN. Verification failed.', [
        {
          text: 'Try Again',
          onPress: () => {
            setOldPin('');
            setPinStep('old');
          },
        },
      ]);
    }
  };

  const resetPinChangeState = () => {
    setOldPin('');
    setNewPin('');
    setConfirmPin('');
    setPinStep('old');
    setIsPinModalOpen(false);
  };

  const handlePurgeVault = () => {
    Alert.alert(
      'Reset Vault',
      'WARNING: This will permanently delete all stored credentials and encryption keys from this device. This action CANNOT be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Wipe Everything',
          style: 'destructive',
          onPress: () => {
            // Confirm again before delete
            Alert.alert(
              'Confirm Deletion',
              'Are you absolutely sure? This will wipe your offline backup key and delete your password list forever.',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Confirm WIPE',
                  style: 'destructive',
                  onPress: async () => {
                    try {
                      await purgeAllData();
                      Alert.alert('Vault Reset', 'All data has been successfully wiped from this device.');
                      onLogOut();
                    } catch (e) {
                      Alert.alert('Error', 'Failed to wipe vault data.');
                    }
                  },
                },
              ]
            );
          },
        },
      ]
    );
  };

  const renderSettingRow = (iconName: keyof typeof Ionicons.glyphMap, title: string, desc: string, onPress: () => void, rightElement?: React.ReactNode) => {
    return (
      <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.7}>
        <View style={styles.rowLeft}>
          <View style={styles.iconContainer}>
            <Ionicons name={iconName} size={20} color="#000000" />
          </View>
          <View style={styles.textContainer}>
            <Text style={styles.rowTitle}>{title}</Text>
            <Text style={styles.rowDesc}>{desc}</Text>
          </View>
        </View>
        {rightElement ? rightElement : <Ionicons name="chevron-forward" size={18} color="#8E8E93" />}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>SETTINGS</Text>
        <Text style={styles.headerSubtitle}>App security & database utilities</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Security Settings */}
        <Text style={styles.sectionHeader}>Security</Text>
        <View style={styles.sectionGroup}>
          {renderSettingRow(
            'finger-print-outline',
            'Biometric Unlock',
            hasHardware ? 'Fingerprint authentication enabled' : 'Biometrics unavailable',
            handleToggleBiometrics,
            <View style={[styles.toggleBorder, biometricsEnabled && styles.toggleBorderActive]}>
              <View style={[styles.toggleDot, biometricsEnabled && styles.toggleDotActive]} />
            </View>
          )}

          {renderSettingRow(
            'keypad-outline',
            'Change 6-Digit PIN',
            'Update your backup unlock passcode',
            () => setIsPinModalOpen(true)
          )}
        </View>

        {/* Database Management */}
        <Text style={styles.sectionHeader}>Database Management</Text>
        <View style={styles.sectionGroup}>
          {renderSettingRow(
            'trash-outline',
            'Reset App Vault',
            'Delete all secure databases and configurations',
            handlePurgeVault
          )}
        </View>

        {/* Informative Block */}
        <Text style={styles.sectionHeader}>About Klefky</Text>
        <View style={styles.aboutCard}>
          <Ionicons name="shield-outline" size={36} color="#8E8E93" style={styles.aboutIcon} />
          <Text style={styles.aboutTitle}>Zero Cloud Architecture</Text>
          <Text style={styles.aboutText}>
            Klefky stores your passwords locally inside a sandboxed environment on this mobile device.
            Your credentials are encrypted in real-time with AES-256 and never contact the internet.
          </Text>
          <Text style={styles.aboutVersion}>Version 1.0.0 (Offline Build)</Text>
        </View>
      </ScrollView>

      {/* Modal: PIN Change Numpad */}
      <Modal visible={isPinModalOpen} animationType="slide" transparent>
        <SafeAreaView style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Change PIN</Text>
              <TouchableOpacity onPress={resetPinChangeState}>
                <Ionicons name="close" size={24} color="#000000" />
              </TouchableOpacity>
            </View>

            <View style={styles.pinHeader}>
              <Text style={styles.pinTitle}>
                {pinStep === 'old'
                  ? 'Verify Current PIN'
                  : pinStep === 'new'
                  ? 'Enter New PIN'
                  : 'Confirm New PIN'}
              </Text>
              <Text style={styles.pinSubtitle}>
                {pinStep === 'old'
                  ? 'Enter your current 6-digit passcode to verify identity.'
                  : pinStep === 'new'
                  ? 'Enter your new 6-digit passcode.'
                  : 'Re-enter your new PIN to confirm.'}
              </Text>
            </View>

            <PinNumpad
              pin={pinStep === 'old' ? oldPin : pinStep === 'new' ? newPin : confirmPin}
              onPinChange={handlePinChangeInput}
              maxLength={6}
            />
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 15,
    paddingBottom: 10,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '300',
    color: '#000000',
    letterSpacing: 3,
    fontFamily: 'System',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#8E8E93',
    fontFamily: 'System',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 40,
  },
  sectionHeader: {
    color: '#8E8E93',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: 25,
    marginBottom: 10,
  },
  sectionGroup: {
    backgroundColor: '#F9F9F9',
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderRadius: 10,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 6,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E5EA',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  textContainer: {
    flex: 1,
  },
  rowTitle: {
    color: '#000000',
    fontSize: 15,
    fontWeight: '500',
    fontFamily: 'System',
  },
  rowDesc: {
    color: '#8E8E93',
    fontSize: 11,
    marginTop: 3,
    fontFamily: 'System',
  },
  toggleBorder: {
    width: 44,
    height: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#C7C7CC',
    backgroundColor: '#FFFFFF',
    padding: 2,
    justifyContent: 'center',
  },
  toggleBorderActive: {
    backgroundColor: '#000000',
    borderColor: '#000000',
  },
  toggleDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#8E8E93',
  },
  toggleDotActive: {
    backgroundColor: '#FFFFFF',
    transform: [{ translateX: 20 }],
  },
  aboutCard: {
    backgroundColor: '#F9F9F9',
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderRadius: 10,
    padding: 20,
    alignItems: 'center',
    marginTop: 5,
  },
  aboutIcon: {
    marginBottom: 12,
  },
  aboutTitle: {
    color: '#000000',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  aboutText: {
    color: '#8E8E93',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    fontFamily: 'System',
  },
  aboutVersion: {
    color: '#C7C7CC',
    fontSize: 11,
    marginTop: 15,
    fontFamily: 'System',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  modalContent: {
    flex: 1,
    justifyContent: 'space-between',
    paddingBottom: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 15,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderColor: '#E5E5EA',
  },
  modalTitle: {
    color: '#000000',
    fontSize: 18,
    fontWeight: '600',
  },
  pinHeader: {
    alignItems: 'center',
    marginTop: 30,
    paddingHorizontal: 30,
  },
  pinTitle: {
    fontSize: 22,
    fontWeight: '300',
    color: '#000000',
    fontFamily: 'System',
  },
  pinSubtitle: {
    fontSize: 13,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 18,
    marginTop: 8,
    fontFamily: 'System',
  },
});
