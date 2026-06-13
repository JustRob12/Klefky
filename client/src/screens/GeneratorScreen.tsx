import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { LinearGradient } from 'expo-linear-gradient';
import { generatePassword } from '../utils/security';

export default function GeneratorScreen() {
  const [password, setPassword] = useState('');
  const [length, setLength] = useState(16);
  const [options, setOptions] = useState({
    lowercase: true,
    uppercase: true,
    numbers: true,
    symbols: true,
  });

  useEffect(() => {
    handleGenerate();
  }, [length, options]);

  const handleGenerate = () => {
    const pwd = generatePassword(length, options);
    setPassword(pwd);
  };

  const handleCopy = async () => {
    if (!password) return;
    await Clipboard.setStringAsync(password);
    Alert.alert('Copied', 'Generated password copied to clipboard.');
  };

  const toggleOption = (key: keyof typeof options) => {
    // Prevent disabling all options
    const activeCount = Object.values(options).filter(Boolean).length;
    if (options[key] && activeCount === 1) {
      return;
    }
    setOptions(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const adjustLength = (amount: number) => {
    setLength(prev => Math.max(8, Math.min(64, prev + amount)));
  };

  // Checkbox sub-component
  const renderOptionRow = (label: string, value: boolean, onPress: () => void, desc: string) => {
    return (
      <TouchableOpacity style={styles.optionRow} onPress={onPress} activeOpacity={0.7}>
        <View style={styles.optionTextContainer}>
          <Text style={styles.optionLabel}>{label}</Text>
          <Text style={styles.optionDesc}>{desc}</Text>
        </View>
        <View style={[styles.checkbox, value && styles.checkboxChecked]}>
          {value && <Ionicons name="checkmark" size={16} color="#FFFFFF" />}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>GENERATOR</Text>
        <Text style={styles.headerSubtitle}>Create cryptographically strong passwords</Text>
      </View>

      <View style={styles.content}>
        {/* Generated Password Box (Silver Metallic Gradient) */}
        <LinearGradient
          colors={['#FFFFFF', '#E5E5EA']}
          style={styles.passwordCard}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Text style={styles.passwordText} selectable numberOfLines={2}>
            {password}
          </Text>

          <View style={styles.passwordActions}>
            <TouchableOpacity style={styles.actionButton} onPress={handleGenerate}>
              <Ionicons name="refresh" size={20} color="#8E8E93" />
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.copyButton} onPress={handleCopy}>
              <LinearGradient
                colors={['#000000', '#1C1C1E']}
                style={styles.copyButtonGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Ionicons name="copy-outline" size={18} color="#FFFFFF" />
                <Text style={styles.copyButtonText}>Copy</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </LinearGradient>

        {/* Adjust Length Controls */}
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>Password Length</Text>
          <View style={styles.lengthControlContainer}>
            <TouchableOpacity style={styles.lengthAdjustBtn} onPress={() => adjustLength(-1)}>
              <Ionicons name="remove" size={24} color="#000000" />
            </TouchableOpacity>
            
            <View style={styles.lengthDisplay}>
              <Text style={styles.lengthValue}>{length}</Text>
              <Text style={styles.lengthUnit}>chars</Text>
            </View>

            <TouchableOpacity style={styles.lengthAdjustBtn} onPress={() => adjustLength(1)}>
              <Ionicons name="add" size={24} color="#000000" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Options Toggles */}
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>Complexity Options</Text>
          <View style={styles.optionsList}>
            {renderOptionRow(
              'Lowercase letters',
              options.lowercase,
              () => toggleOption('lowercase'),
              'abcdefghijklmnopqrstuvwxyz'
            )}
            {renderOptionRow(
              'Uppercase letters',
              options.uppercase,
              () => toggleOption('uppercase'),
              'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
            )}
            {renderOptionRow(
              'Numbers',
              options.numbers,
              () => toggleOption('numbers'),
              '0123456789'
            )}
            {renderOptionRow(
              'Special Symbols',
              options.symbols,
              () => toggleOption('symbols'),
              '!@#$%^&*()_+-=[]{}|;:,.<>?'
            )}
          </View>
        </View>
      </View>
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
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  passwordCard: {
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderRadius: 12,
    padding: 20,
    minHeight: 140,
    justifyContent: 'space-between',
    marginBottom: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  passwordText: {
    color: '#000000',
    fontSize: 22,
    fontWeight: '300',
    letterSpacing: 1,
    textAlign: 'center',
    paddingHorizontal: 10,
    marginVertical: 10,
    fontFamily: 'System',
  },
  passwordActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  actionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    backgroundColor: '#F9F9F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  copyButton: {
    borderRadius: 6,
    overflow: 'hidden',
  },
  copyButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  copyButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
    fontFamily: 'System',
  },
  section: {
    marginBottom: 25,
  },
  sectionHeader: {
    color: '#8E8E93',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 12,
  },
  lengthControlContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F9F9F9',
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderRadius: 10,
    padding: 12,
  },
  lengthAdjustBtn: {
    width: 44,
    height: 44,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  lengthDisplay: {
    alignItems: 'center',
  },
  lengthValue: {
    color: '#000000',
    fontSize: 24,
    fontWeight: 'bold',
    fontFamily: 'System',
  },
  lengthUnit: {
    color: '#8E8E93',
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: 2,
  },
  optionsList: {
    backgroundColor: '#F9F9F9',
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderRadius: 10,
    overflow: 'hidden',
  },
  optionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  optionTextContainer: {
    flex: 1,
    marginRight: 10,
  },
  optionLabel: {
    color: '#000000',
    fontSize: 15,
    fontWeight: '500',
    fontFamily: 'System',
  },
  optionDesc: {
    color: '#8E8E93',
    fontSize: 11,
    marginTop: 4,
    fontFamily: 'System',
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#8E8E93',
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    borderColor: '#000000',
    backgroundColor: '#000000',
  },
});
