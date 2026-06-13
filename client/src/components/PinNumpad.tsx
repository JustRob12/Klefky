import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Vibration, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface PinNumpadProps {
  pin: string;
  onPinChange: (newPin: string) => void;
  maxLength?: number;
  biometricType?: string | null;
  onBiometricPress?: () => void;
}

const { width } = Dimensions.get('window');
const BUTTON_SIZE = width * 0.18; // Responsive button sizing

export default function PinNumpad({
  pin,
  onPinChange,
  maxLength = 6,
  biometricType,
  onBiometricPress,
}: PinNumpadProps) {

  const handleKeyPress = (num: string) => {
    if (pin.length < maxLength) {
      Vibration.vibrate(15);
      onPinChange(pin + num);
    }
  };

  const handleBackspace = () => {
    if (pin.length > 0) {
      Vibration.vibrate(10);
      onPinChange(pin.slice(0, -1));
    }
  };

  // Render the indicator dots (6 dots)
  const renderDots = () => {
    const dots = [];
    for (let i = 0; i < maxLength; i++) {
      const isFilled = i < pin.length;
      dots.push(
        <View
          key={i}
          style={[
            styles.dot,
            isFilled ? styles.dotFilled : styles.dotEmpty,
          ]}
        />
      );
    }
    return <View style={styles.dotsContainer}>{dots}</View>;
  };

  // Keypad cell helper
  const renderButton = (value: string | number, onPress: () => void, isSpecial = false) => {
    return (
      <TouchableOpacity
        key={value}
        style={[styles.button, isSpecial && styles.specialButton]}
        onPress={onPress}
        activeOpacity={0.6}
      >
        {typeof value === 'string' && (value === 'backspace' || value === 'fingerprint') ? (
          value === 'backspace' ? (
            <Ionicons name="backspace-outline" size={24} color="#000000" />
          ) : (
            <Ionicons name="finger-print-outline" size={28} color="#000000" />
          )
        ) : (
          <Text style={styles.buttonText}>{value}</Text>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {renderDots()}

      <View style={styles.grid}>
        {/* Row 1 */}
        <View style={styles.row}>
          {renderButton(1, () => handleKeyPress('1'))}
          {renderButton(2, () => handleKeyPress('2'))}
          {renderButton(3, () => handleKeyPress('3'))}
        </View>

        {/* Row 2 */}
        <View style={styles.row}>
          {renderButton(4, () => handleKeyPress('4'))}
          {renderButton(5, () => handleKeyPress('5'))}
          {renderButton(6, () => handleKeyPress('6'))}
        </View>

        {/* Row 3 */}
        <View style={styles.row}>
          {renderButton(7, () => handleKeyPress('7'))}
          {renderButton(8, () => handleKeyPress('8'))}
          {renderButton(9, () => handleKeyPress('9'))}
        </View>

        {/* Row 4 */}
        <View style={styles.row}>
          {/* Biometrics button on bottom left */}
          {biometricType && onBiometricPress ? (
            renderButton('fingerprint', onBiometricPress, true)
          ) : (
            <View style={styles.placeholderButton} />
          )}

          {renderButton(0, () => handleKeyPress('0'))}

          {/* Backspace button on bottom right */}
          {renderButton('backspace', handleBackspace, true)}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 40,
    height: 20,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginHorizontal: 10,
    borderWidth: 1,
  },
  dotEmpty: {
    borderColor: '#C7C7CC',
    backgroundColor: 'transparent',
  },
  dotFilled: {
    borderColor: '#000000',
    backgroundColor: '#000000',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 3,
  },
  grid: {
    width: '80%',
    maxWidth: 320,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  button: {
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
    borderRadius: BUTTON_SIZE / 2,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    backgroundColor: '#F9F9F9',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  specialButton: {
    borderColor: 'transparent',
    backgroundColor: 'transparent',
    elevation: 0,
    shadowOpacity: 0,
  },
  placeholderButton: {
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
  },
  buttonText: {
    color: '#000000',
    fontSize: 26,
    fontWeight: '300',
    fontFamily: 'System',
  },
});
