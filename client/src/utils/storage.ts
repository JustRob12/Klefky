import * as SecureStore from 'expo-secure-store';
import * as FileSystem from 'expo-file-system/legacy';
import { encryptData, decryptData, hashPin, generateMasterKey } from './security';

// Interfaces
export interface CredentialItem {
  id: string;
  service: string;       // e.g., Steam, Google, Spotify
  username: string;
  password: string;
  url?: string;
  category: 'Login' | 'Card' | 'Note' | string;
  notes?: string;
  createdAt: number;
  color?: string;        // hex color code, e.g. #007AFF
}

// Secure Store Keys
const MASTER_KEY_KEY = 'klefky_master_key';
const PIN_HASH_KEY = 'klefky_pin_hash';
const BIOMETRIC_PREF_KEY = 'klefky_biometric_pref';
const SETUP_COMPLETE_KEY = 'klefky_setup_complete';

// Encrypted Database File Path
const VAULT_FILE_PATH = `${FileSystem.documentDirectory}klefky_vault.enc`;

/**
 * Checks if the user has already gone through the first-launch setup flow.
 */
export async function isAppSetUp(): Promise<boolean> {
  try {
    const setup = await SecureStore.getItemAsync(SETUP_COMPLETE_KEY);
    return setup === 'true';
  } catch (error) {
    console.error('Error checking setup status:', error);
    return false;
  }
}

/**
 * Initializes the vault during first-launch setup.
 * Generates a master key, hashes the PIN, stores biometric preference,
 * and sets setup status to complete.
 * @returns The generated master key.
 */
export async function completeSetup(pin: string, biometricsEnabled: boolean): Promise<string> {
  try {
    // 1. Generate master encryption key
    const masterKey = generateMasterKey();
    
    // 2. Hash PIN
    const hashedPin = hashPin(pin);
    
    // 3. Save to SecureStore
    await SecureStore.setItemAsync(MASTER_KEY_KEY, masterKey);
    await SecureStore.setItemAsync(PIN_HASH_KEY, hashedPin);
    await SecureStore.setItemAsync(BIOMETRIC_PREF_KEY, biometricsEnabled ? 'true' : 'false');
    
    // 4. Save empty vault file encrypted
    await saveVault([], masterKey);
    
    // 5. Mark setup as complete
    await SecureStore.setItemAsync(SETUP_COMPLETE_KEY, 'true');
    
    return masterKey;
  } catch (error) {
    console.error('Error during setup completion:', error);
    throw new Error('Failed to complete setup');
  }
}

/**
 * Verifies if the entered PIN is correct.
 * If correct, returns the master encryption key from SecureStore.
 */
export async function verifyPinAndGetMasterKey(pin: string): Promise<string | null> {
  try {
    const storedHash = await SecureStore.getItemAsync(PIN_HASH_KEY);
    const enteredHash = hashPin(pin);
    
    if (storedHash === enteredHash) {
      const masterKey = await SecureStore.getItemAsync(MASTER_KEY_KEY);
      return masterKey;
    }
    return null;
  } catch (error) {
    console.error('Error verifying PIN:', error);
    return null;
  }
}

/**
 * Gets the master encryption key directly (used for biometric unlock).
 */
export async function getMasterKeyDirectly(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(MASTER_KEY_KEY);
  } catch (error) {
    console.error('Error retrieving master key directly:', error);
    return null;
  }
}

/**
 * Saves credentials vault as an AES-encrypted JSON file locally.
 */
export async function saveVault(credentials: CredentialItem[], masterKey: string): Promise<void> {
  try {
    const jsonString = JSON.stringify(credentials);
    const encryptedData = encryptData(jsonString, masterKey);
    
    await FileSystem.writeAsStringAsync(VAULT_FILE_PATH, encryptedData, {
      encoding: FileSystem.EncodingType.UTF8,
    });
  } catch (error) {
    console.error('Error saving vault:', error);
    throw new Error('Failed to encrypt and save vault data');
  }
}

/**
 * Loads and decrypts the credentials vault from local file storage.
 */
export async function loadVault(masterKey: string): Promise<CredentialItem[]> {
  try {
    const fileExists = await FileSystem.getInfoAsync(VAULT_FILE_PATH);
    if (!fileExists.exists) {
      return [];
    }
    
    const encryptedData = await FileSystem.readAsStringAsync(VAULT_FILE_PATH, {
      encoding: FileSystem.EncodingType.UTF8,
    });
    
    const decryptedJson = decryptData(encryptedData, masterKey);
    return JSON.parse(decryptedJson) as CredentialItem[];
  } catch (error) {
    console.error('Error loading vault:', error);
    throw error;
  }
}

/**
 * Toggles biometric preference.
 */
export async function toggleBiometrics(enabled: boolean): Promise<void> {
  try {
    await SecureStore.setItemAsync(BIOMETRIC_PREF_KEY, enabled ? 'true' : 'false');
  } catch (error) {
    console.error('Error toggling biometrics preference:', error);
    throw new Error('Failed to save biometric preference');
  }
}

/**
 * Retrieves whether biometrics is enabled in user settings.
 */
export async function getBiometricPreference(): Promise<boolean> {
  try {
    const pref = await SecureStore.getItemAsync(BIOMETRIC_PREF_KEY);
    return pref === 'true';
  } catch (error) {
    console.error('Error retrieving biometric preference:', error);
    return false;
  }
}

/**
 * Changes user's PIN code.
 */
export async function changePin(oldPin: string, newPin: string): Promise<boolean> {
  try {
    const storedHash = await SecureStore.getItemAsync(PIN_HASH_KEY);
    const oldHash = hashPin(oldPin);
    
    if (storedHash === oldHash) {
      const newHash = hashPin(newPin);
      await SecureStore.setItemAsync(PIN_HASH_KEY, newHash);
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error changing PIN:', error);
    return false;
  }
}

/**
 * Purges all vault data and keychain configuration (resetting the app).
 */
export async function purgeAllData(): Promise<void> {
  try {
    // Delete file
    const fileInfo = await FileSystem.getInfoAsync(VAULT_FILE_PATH);
    if (fileInfo.exists) {
      await FileSystem.deleteAsync(VAULT_FILE_PATH, { idempotent: true });
    }
    
    // Delete secure keys
    await SecureStore.deleteItemAsync(MASTER_KEY_KEY);
    await SecureStore.deleteItemAsync(PIN_HASH_KEY);
    await SecureStore.deleteItemAsync(BIOMETRIC_PREF_KEY);
    await SecureStore.deleteItemAsync(SETUP_COMPLETE_KEY);
  } catch (error) {
    console.error('Error purging data:', error);
    throw new Error('Failed to wipe application database');
  }
}
