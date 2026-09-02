# GI SHOP Mobile (React Native / Expo) 📱

A production-ready, clean, cross-platform mobile application for **GI SHOP** built with **React Native**, **Expo SDK 52**, and **React Navigation**.

Supports high-speed POS billing with smart unit conversion, offline-first responsive UI, real-time Khata (customer credit/debit ledger), item management, and itemized customer purchase histories.

---

## 🚀 Features

### 🏪 Shopkeeper Capabilities
- **Fast POS Billing:**
  - Live product search & quick touch grid.
  - **Smart Unit Modals:**
    - *Piece:* Fast `[-] [Qty] [+]` stepper.
    - *Kilo & Litre:* Presets (`250g`, `500g`, `1kg`, `2kg` / `250ml`, `500ml`, `1L`, `2L`), custom decimal inputs, and **bidirectional reverse price calculation** (typing `₹30` on a `₹60/kg` item automatically computes `0.5kg`).
  - Real-time cart calculations with flat rupee discount.
  - Multi-channel checkout: **Cash**, **Online (UPI)**, and **Add to Book (Khata)**.
  - **Printable Digital Receipts:** Itemized breakdown with shop header, bill ID, timestamp, customer phone, subtotal, discount, and payment mode.
- **Customer Ledger (Khata / Udhar):**
  - Instant total outstanding due calculation across all customers.
  - Sorting & filters: `All`, `Highest Due`, `Lowest Due`, `No Due`.
  - **Settle Due Modal:** Instant repayment recording (Full or Partial) with Cash or Online methods.
  - **Ledger Timeline:** Full chronological running balance ledger (Debits vs Credits).
  - Add new customers and soft-terminate relationships (`ACTIVE` → `TERMINATED`).
- **Inventory Management:**
  - Real-time catalog view with rates and units (`Piece`, `Kilo`, `Litre`).
  - Add product, edit existing product, and delete product modals.

### 👤 Customer Capabilities
- **Unified Purchases Timeline:**
  - View all historical purchases and itemized receipts across all enrolled stores.
  - Tap any bill to view the full digital printable receipt snapshot.
  - Lifetime spending analytics.

### ⚙️ Developer & Connectivity Features
- **Smart Backend Host Detection:**
  - Android Emulator: Automatically targets `http://10.0.2.2:3001`.
  - iOS Simulator & Web: Targets `http://localhost:3001`.
  - Physical Devices: In-app **Server Settings** modal allows setting any local Wi-Fi IP (e.g., `http://192.168.1.50:3001`) with 1 tap without editing code or rebuilding.
- **Real-Time Database Sync:**
  - Connects to central database for live POS, khata ledger, and digital receipt tracking.

---

## 📁 Project Structure

```
shop-ledger-mobile/
├── App.js                      # Root application entry with SafeAreaProvider & AuthProvider
├── index.js                    # Expo root register component
├── app.json                    # Expo & Google Play Store release configuration
├── eas.json                    # EAS Build configuration for APK & AAB releases
├── babel.config.js             # Babel preset configuration
├── package.json                # Project dependencies
├── assets/                     # App icon, splash, adaptive icons
└── src/
    ├── api/
    │   └── client.js           # JWT authentication, AsyncStorage persistence & REST endpoints
    ├── context/
    │   └── AuthContext.js      # React Context for auth session, user data, role, & server URL
    ├── theme/
    │   └── colors.js           # Design tokens, color palette, and shadow styles
    ├── components/
    │   ├── Header.js           # Top navigation bar with store name, role badge, & logout
    │   ├── QuickButton.js      # Reusable preset pill buttons
    │   ├── ProductUnitModal.js # Smart unit modal with reverse price calculation
    │   ├── ReceiptModal.js     # Printable digital receipt modal
    │   ├── SettleDueModal.js   # Khata payment / settlement modal
    │   ├── AddCustomerModal.js # Customer enrollment modal
    │   ├── EditProductModal.js # Add / Edit inventory item modal
    │   └── ServerSettingsModal.js # Live backend URL switcher modal
    ├── navigation/
    │   ├── RootNavigator.js    # Auth vs Role-based flow switcher
    │   ├── ShopkeeperNavigator.js # Bottom tabs for POS, Khata, and Inventory
    │   └── CustomerNavigator.js   # Stack navigator for Customer portal
    └── screens/
        ├── AuthScreen.js       # Login / Registration with role selector & real DB authentication
        ├── Shopkeeper/
        │   ├── POSScreen.js       # Fast POS billing screen with cart & payment selection
        │   ├── KhataScreen.js     # Customer credit ledger, filters, & timeline profile
        │   └── InventoryScreen.js # Product catalog & price management
        └── Customer/
            └── CustomerHomeScreen.js # Customer purchases timeline & digital receipts
```

---

## 🔑 Account Registration & Roles

The system supports role-based onboarding for real users:
- **🏪 Shopkeeper:** Register a store owner account with your shop name, contact number, and address to start POS billing, inventory management, and khata tracking.
- **👤 Customer:** Register as a customer to browse nearby shops, track your store receipts, place order requests, and monitor your khata ledger.
- **💼 Cashier:** Shop owners can invite registered customers to join as cashiers using their unique Short ID or phone number.
- **🛡️ Platform Administrator:** Bootstrap initial platform manager using `SUPERADMIN_EMAIL` and `SUPERADMIN_PASSWORD` environment variables in `server/.env`.

---

## 🛠️ Getting Started

### 1. Start the Backend Server
Ensure the backend server is running in `shop-ledger/server`:
```bash
cd ../shop-ledger/server
npm start
# Server listens on port 3001
```

### 2. Install Mobile Dependencies
```bash
cd shop-ledger-mobile
npm install
```

### 3. Run on Development Environment

#### Running on Android Emulator:
```bash
npm run android
```
*(The app automatically points to `http://10.0.2.2:3001`)*

#### Running on iOS Simulator:
```bash
npm run ios
```
*(The app automatically points to `http://localhost:3001`)*

#### Running on Physical Device via Expo Go:
```bash
npx expo start
```
1. Scan the QR code in the **Expo Go** app (Android / iOS).
2. Tap the ⚙️ (Settings) icon on the login screen of the app and set your computer's local Wi-Fi IP (e.g. `http://192.168.1.100:3001`).

---

## 📦 Building for Google Play Store (Production)

The project is pre-configured with `app.json` and `eas.json` for Android Google Play Store publishing.

- **Package Name:** `com.shopledger.app`
- **Version:** `1.0.0`
- **Version Code:** `1`

### Method 1: Cloud Build with EAS (Recommended)

1. **Install EAS CLI and Login:**
   ```bash
   npm install -g eas-cli
   eas login
   ```

2. **Configure project ID (if first time):**
   ```bash
   eas project:init
   ```

3. **Build Standalone APK (for direct testing/distribution):**
   ```bash
   eas build --platform android --profile preview
   ```

4. **Build Android App Bundle (.AAB) for Google Play Store:**
   ```bash
   eas build --platform android --profile production
   ```

5. **Submit directly to Google Play Store:**
   ```bash
   eas submit --platform android --profile production
   ```

---

### Method 2: Local Native Build with Gradle

If you prefer building locally without EAS cloud:

1. **Generate Native Android Project:**
   ```bash
   npx expo prebuild --platform android
   ```

2. **Build Release AAB / APK:**
   ```bash
   cd android
   ./gradlew bundleRelease  # Generates release .aab in app/build/outputs/bundle/release/
   # or
   ./gradlew assembleRelease # Generates release .apk in app/build/outputs/apk/release/
   ```

---

## 📄 License
MIT License. Built for Shop Ledger Platform.
