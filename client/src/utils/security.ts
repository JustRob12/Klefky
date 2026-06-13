import CryptoJS from 'crypto-js';
import * as Crypto from 'expo-crypto';

/**
 * Encrypts a string using AES-256 with a secret key.
 */
export function encryptData(data: string, secretKey: string): string {
  try {
    return CryptoJS.AES.encrypt(data, secretKey).toString();
  } catch (error) {
    console.error('Encryption failed:', error);
    throw new Error('Failed to encrypt data');
  }
}

/**
 * Decrypts an AES-256 encrypted ciphertext using a secret key.
 */
export function decryptData(ciphertext: string, secretKey: string): string {
  try {
    const bytes = CryptoJS.AES.decrypt(ciphertext, secretKey);
    const decryptedText = bytes.toString(CryptoJS.enc.Utf8);
    if (!decryptedText) {
      throw new Error('Decryption resulted in empty string (invalid key)');
    }
    return decryptedText;
  } catch (error) {
    console.error('Decryption failed:', error);
    throw new Error('Failed to decrypt data. Invalid key or corrupted vault.');
  }
}

/**
 * Hashes a 6-digit PIN using SHA-256 to securely verify it without storing it in plaintext.
 */
export function hashPin(pin: string): string {
  return CryptoJS.SHA256(pin).toString(CryptoJS.enc.Hex);
}

/**
 * Generates a cryptographically random Master Encryption Key (64 characters hex / 256 bits).
 */
export function generateMasterKey(): string {
  const randomBytes = Crypto.getRandomBytes(32);
  return Array.from(randomBytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Password Generator options
 */
interface GeneratorOptions {
  numbers: boolean;
  symbols: boolean;
  uppercase: boolean;
  lowercase: boolean;
}

/**
 * Generates a strong random password based on specified options.
 */
export function generatePassword(length: number = 16, options: GeneratorOptions): string {
  const lowercaseChars = 'abcdefghijklmnopqrstuvwxyz';
  const uppercaseChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const numberChars = '0123456789';
  const symbolChars = '!@#$%^&*()_+-=[]{}|;:,.<>?';

  let characterPool = '';
  let guaranteedCharacters: string[] = [];

  if (options.lowercase) {
    characterPool += lowercaseChars;
    // Guarantee at least one lowercase
    guaranteedCharacters.push(lowercaseChars.charAt(Math.floor(Math.random() * lowercaseChars.length)));
  }
  if (options.uppercase) {
    characterPool += uppercaseChars;
    // Guarantee at least one uppercase
    guaranteedCharacters.push(uppercaseChars.charAt(Math.floor(Math.random() * uppercaseChars.length)));
  }
  if (options.numbers) {
    characterPool += numberChars;
    // Guarantee at least one number
    guaranteedCharacters.push(numberChars.charAt(Math.floor(Math.random() * numberChars.length)));
  }
  if (options.symbols) {
    characterPool += symbolChars;
    // Guarantee at least one symbol
    guaranteedCharacters.push(symbolChars.charAt(Math.floor(Math.random() * symbolChars.length)));
  }

  // If no pools selected, default to lowercase + uppercase + numbers
  if (characterPool === '') {
    characterPool = lowercaseChars + uppercaseChars + numberChars;
    guaranteedCharacters.push(lowercaseChars.charAt(Math.floor(Math.random() * lowercaseChars.length)));
  }

  let generatedPassword = '';
  // Fill the remaining length with random pool characters
  const remainingLength = Math.max(0, length - guaranteedCharacters.length);
  
  // Custom random generation using expo-crypto random bytes for extra security
  const randomBytes = Crypto.getRandomBytes(remainingLength);
  
  for (let i = 0; i < remainingLength; i++) {
    const byte = randomBytes[i];
    const poolIndex = byte % characterPool.length;
    generatedPassword += characterPool.charAt(poolIndex);
  }

  // Prepend the guaranteed characters to verify complexity
  generatedPassword = guaranteedCharacters.join('') + generatedPassword;

  // Shuffle the result for better randomness
  return generatedPassword
    .split('')
    .sort(() => Math.random() - 0.5)
    .join('');
}
