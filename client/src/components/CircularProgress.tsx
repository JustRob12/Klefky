import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';

interface CircularProgressProps {
  score: number; // 0 to 100
  size?: number;
  strokeWidth?: number;
}

export default function CircularProgress({
  score,
  size = 180,
  strokeWidth = 12,
}: CircularProgressProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDashoffset = circumference - (Math.min(score, 100) / 100) * circumference;

  // Calculate color/status label based on score
  let statusText = 'Secure';
  let statusColor = '#000000';
  if (score < 50) {
    statusText = 'At Risk';
    statusColor = '#8E8E93';
  } else if (score < 80) {
    statusText = 'Warning';
    statusColor = '#8E8E93';
  }

  const isSmall = size < 120;
  const numberFontSize = isSmall ? Math.round(size * 0.28) : 48;

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Svg width={size} height={size} style={styles.svg}>
        <Defs>
          {/* Subtle gradient for the progress stroke */}
          <LinearGradient id="bwGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor="#000000" />
            <Stop offset="100%" stopColor="#8E8E93" />
          </LinearGradient>
        </Defs>

        {/* Background Circle */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#E5E5EA"
          strokeWidth={strokeWidth}
          fill="transparent"
        />

        {/* Foreground (Progress) Circle */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="url(#bwGradient)"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          fill="transparent"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>

      {/* Centered Content */}
      <View style={styles.textContainer}>
        <Text style={[styles.scoreNumber, { fontSize: numberFontSize }]}>{score}</Text>
        {!isSmall && (
          <>
            <Text style={styles.scoreLabel}>Score</Text>
            <Text style={[styles.statusText, { color: statusColor }]}>{statusText}</Text>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  svg: {
    position: 'absolute',
  },
  textContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  scoreNumber: {
    fontWeight: '300',
    color: '#000000',
    fontFamily: 'System',
  },
  scoreLabel: {
    fontSize: 12,
    color: '#8E8E93',
    textTransform: 'uppercase',
    letterSpacing: 2,
    marginTop: -4,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 8,
  },
});
