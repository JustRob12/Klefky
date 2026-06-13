# Klefky: Offline Password Vault

Klefky is a secure, completely offline password manager designed with a minimalist black-and-white aesthetic, subtle gradients, and a highly professional, simple user experience.

---

## 🎨 Color Palette & UI Design System
To achieve a simple, professional, and elegant design, the app will use:
* **Backgrounds:** Pure black (`#000000`) and deep carbon gray (`#121212`) for high contrast and battery savings.
* **Accents & Text:** Crisp white (`#FFFFFF`) and slate gray (`#8E8E93`) for readable hierarchy.
* **Gradients:** Subtle, smooth metallic/silver gradients (e.g., `#FFFFFF` to `#E5E5EA` or `#1E1E1E` to `#0A0A0A`) for interactive buttons and progress indicators.
* **Typography:** Clean, geometric sans-serif fonts (e.g., standard system Inter/Roboto).
* **Atmosphere:** Glassmorphic borders, soft drop shadows, and minimalist line-art icons.

---

## 🔒 Offline & Local-First Security Architecture
No cloud servers, no network calls. Your credentials never leave your physical device.

1. **Keychain Secret Storage (`expo-secure-store`):**
   * Stores the hardware-backed **Master Encryption Key** (generated on first launch).
   * Stores the **PIN Hash** and **Biometrics Preferences** (whether fingerprint is enabled).
2. **Encrypted Database Storage (`expo-file-system`):**
   * Since `secure-store` has a 2KB limit, the list of logins is saved as a JSON file in the app's local document directory.
   * Every time you save a password, the JSON is encrypted using **AES-256** with the Master Encryption Key before being written to disk.
   * It is only decrypted in memory when the app is unlocked.

---

## 🚀 App Flow & Navigation

### 1. First Launch Flow
* **Welcome Screen:** High-contrast introduction to Klefky's offline vault.
* **Biometrics Setup:** Queries the system for fingerprint/face scanning using `expo-local-authentication`. Request registration to enable instant unlock.
* **6-Digit Backup PIN:** A clean, custom grid numpad to set a 6-digit backup PIN (entered twice for verification).

### 2. Subsequent App Launch
* The app boots directly to an elegant lock screen.
* It immediately prompts for biometric authentication (fingerprint).
* If cancelled or failed, the user can type their 6-digit PIN on the custom numpad to decrypt and enter the vault.

### 3. Main Authenticated Interface (Bottom Tabs)
We suggest **three clean and professional tabs** to keep navigation simple:

#### 📁 Tab 1: Vault (Home)
* **Search & Filter:** A top search bar with pill-tabs for categories (e.g., All, Logins, Cards, Notes).
* **Credential List:** Clean white cards with subtle gradients displaying the App Name, Username, and quick buttons to:
  * Copy Username/Email to clipboard.
  * Copy Password to clipboard.
* **Add Credential Screen:** A sliding bottom drawer or dedicated screen. Select service type (e.g. Steam, Google, or custom), enter details, and hit Save.

#### ⚡ Tab 2: Generator
* **Interactive Tool:** Generate secure, complex passwords.
* **Sliders & Toggles:** Simple sliders for password length (8-64 characters) and toggle switches for symbols, numbers, and uppercase letters.
* **Subtle Gradients:** The generated password is shown in a prominent, gradient-filled box with a tap-to-copy feedback animation.

#### ⚙️ Tab 3: Settings
* **Security Controls:** Toggle Fingerprint unlock on/off, change the 6-digit PIN.
* **Vault Actions:**
  * **Export Encrypted Backup:** Saves the raw encrypted database file to the device storage so you can back it up manually.
  * **Self-Destruct / Purge Vault:** Completely wipe all credentials and settings from the device (requires PIN confirmation).
