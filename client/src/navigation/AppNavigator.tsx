import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { NavigationContainer } from '@react-navigation/native';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// Import Screens
import SetupScreen from '../screens/SetupScreen';
import LockScreen from '../screens/LockScreen';
import VaultScreen from '../screens/VaultScreen';
import GeneratorScreen from '../screens/GeneratorScreen';
import SettingsScreen from '../screens/SettingsScreen';

interface AppNavigatorProps {
  isSetUp: boolean;
  isAuthenticated: boolean;
  masterKey: string | null;
  onSetupComplete: (masterKey: string) => void;
  onUnlock: (masterKey: string) => void;
  onLogOut: () => void;
}

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function AppTabs({ masterKey, onLogOut }: { masterKey: string; onLogOut: () => void }) {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: '#000000',
        tabBarInactiveTintColor: '#8E8E93',
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.tabBarLabel,
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap = 'key-outline';

          if (route.name === 'Vault') {
            iconName = focused ? 'shield-checkmark' : 'shield-checkmark-outline';
          } else if (route.name === 'Generator') {
            iconName = focused ? 'flash' : 'flash-outline';
          } else if (route.name === 'Settings') {
            iconName = focused ? 'settings' : 'settings-outline';
          }

          return <Ionicons name={iconName} size={focused ? 24 : 22} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Vault">
        {() => <VaultScreen masterKey={masterKey} />}
      </Tab.Screen>
      <Tab.Screen name="Generator" component={GeneratorScreen} />
      <Tab.Screen name="Settings">
        {() => <SettingsScreen onLogOut={onLogOut} />}
      </Tab.Screen>
    </Tab.Navigator>
  );
}

export default function AppNavigator({
  isSetUp,
  isAuthenticated,
  masterKey,
  onSetupComplete,
  onUnlock,
  onLogOut,
}: AppNavigatorProps) {
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false, animation: 'fade' }}>
        {!isSetUp ? (
          // Setup flow
          <Stack.Screen name="Setup">
            {() => <SetupScreen onSetupComplete={onSetupComplete} />}
          </Stack.Screen>
        ) : !isAuthenticated ? (
          // Lock screen flow
          <Stack.Screen name="Lock">
            {() => <LockScreen onUnlock={onUnlock} />}
          </Stack.Screen>
        ) : (
          // Main tab flow
          <Stack.Screen name="Main">
            {() => <AppTabs masterKey={masterKey || ''} onLogOut={onLogOut} />}
          </Stack.Screen>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
    height: 60,
    paddingBottom: 8,
    paddingTop: 8,
  },
  tabBarLabel: {
    fontSize: 10,
    fontWeight: '500',
    letterSpacing: 0.5,
    fontFamily: 'System',
  },
});
