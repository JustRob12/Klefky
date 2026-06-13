import * as Crypto from 'expo-crypto';

// Polyfill for crypto.getRandomValues in React Native / Expo environment
const getRandomValuesPolyfill = (array: any) => {
  try {
    if (!array) return array;
    
    // Calculate byte length of target array
    const byteLength = array.byteLength || (array.length * (array.BYTES_PER_ELEMENT || 1));
    
    // Generate secure random bytes using expo-crypto
    const randomBytes = Crypto.getRandomBytes(byteLength);
    
    // Create a Uint8Array view of the target array's buffer and set the values
    const uint8View = new Uint8Array(array.buffer, array.byteOffset, byteLength);
    uint8View.set(randomBytes);
    
    return array;
  } catch (error) {
    console.error('getRandomValuesPolyfill error:', error);
    throw error;
  }
};

try {
  const cryptoObj = { getRandomValues: getRandomValuesPolyfill };
  
  // Define on global
  Object.defineProperty(global, 'crypto', {
    value: cryptoObj,
    configurable: true,
    writable: true,
  });
  
  // Define on globalThis
  if (typeof globalThis !== 'undefined') {
    Object.defineProperty(globalThis, 'crypto', {
      value: cryptoObj,
      configurable: true,
      writable: true,
    });
  }

  // Define on window
  if (typeof window === 'object') {
    Object.defineProperty(window, 'crypto', {
      value: cryptoObj,
      configurable: true,
      writable: true,
    });
  }
} catch (e) {
  console.error('Failed to configure global crypto polyfill:', e);
}
