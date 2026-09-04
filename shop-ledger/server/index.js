const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');

// Load environment variables from .env if present
const envFiles = [
  path.join(__dirname, '.env'),
  path.join(__dirname, '..', '.env'),
  path.join(__dirname, '..', '..', '.env')
];
for (const envPath of envFiles) {
  if (fs.existsSync(envPath)) {
    try {
      const envContent = fs.readFileSync(envPath, 'utf8');
      envContent.split('\n').forEach(line => {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
          const idx = trimmed.indexOf('=');
          const key = trimmed.slice(0, idx).trim();
          const val = trimmed.slice(idx + 1).trim().replace(/^["']|["']$/g, '');
          if (!process.env[key]) {
            process.env[key] = val;
          }
        }
      });
    } catch (e) {}
  }
}

// Initialize Firebase Admin SDK
let firebaseAdminInitialized = false;
let firebaseAuth = null;
let firebaseMessaging = null;

const getCredential = (sa) => {
  if (typeof admin.cert === 'function') return admin.cert(sa);
  if (admin.credential && typeof admin.credential.cert === 'function') return admin.credential.cert(sa);
  return sa;
};

if (process.env.FIREBASE_SERVICE_ACCOUNT) {
  try {
    const raw = process.env.FIREBASE_SERVICE_ACCOUNT.trim();
    const serviceAccount = raw.startsWith('{') ? JSON.parse(raw) : JSON.parse(Buffer.from(raw, 'base64').toString('utf8'));
    const fbApp = admin.initializeApp({
      credential: getCredential(serviceAccount)
    });
    const { getAuth } = require('firebase-admin/auth');
    const { getMessaging } = require('firebase-admin/messaging');
    firebaseAuth = getAuth(fbApp);
    firebaseMessaging = getMessaging(fbApp);
    firebaseAdminInitialized = true;
    console.log('[Firebase Admin] Successfully initialized from FIREBASE_SERVICE_ACCOUNT env variable');
  } catch (e) {
    console.error('[Firebase Admin] Error initializing from env var:', e.message);
  }
}

if (!firebaseAdminInitialized) {
  const serviceAccountPaths = [
    path.join(__dirname, 'serviceAccountKey.json'),
    path.join(__dirname, 'serviceAccountKey.json.json'),
    path.join(__dirname, '..', 'serviceAccountKey.json'),
    path.join(__dirname, '..', '..', 'serviceAccountKey.json'),
    path.join(__dirname, '..', '..', 'serviceAccountKey.json.json')
  ];

  for (const saPath of serviceAccountPaths) {
    if (fs.existsSync(saPath)) {
      try {
        const serviceAccount = JSON.parse(fs.readFileSync(saPath, 'utf8'));
        const fbApp = admin.initializeApp({
          credential: getCredential(serviceAccount)
        });
        const { getAuth } = require('firebase-admin/auth');
        const { getMessaging } = require('firebase-admin/messaging');
        firebaseAuth = getAuth(fbApp);
        firebaseMessaging = getMessaging(fbApp);
        firebaseAdminInitialized = true;
        console.log('[Firebase Admin] Successfully initialized with service account from:', saPath);
        break;
      } catch (e) {
        console.error('[Firebase Admin] Error initializing with:', saPath, e.message);
      }
    }
  }
}

const app = express();
app.use(cors());
app.use(express.json());

const PORT = Number(process.env.PORT) || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'gi-shop-secure-jwt-production-secret';

// Connect Database Adapter (Supports MySQL via DB_HOST/DB_TYPE or SQLite fallback)
const db = require('./db');

// Helper: Push Notification Sender
async function sendPushNotification(userIds, { title, body, data = {} }) {
  if (!firebaseAdminInitialized || !firebaseMessaging) {
    console.log(`[Push Notification (Mock / No Firebase Admin)] Target: ${JSON.stringify(userIds)} | ${title} - ${body}`);
    return;
  }
  const idList = (Array.isArray(userIds) ? userIds : [userIds]).filter(Boolean);
  if (idList.length === 0) return;

  const placeholders = idList.map(() => '?').join(',');
  db.all(`SELECT token FROM UserFCMTokens WHERE userId IN (${placeholders})`, idList, async (err, rows) => {
    if (err || !rows || rows.length === 0) {
      console.log(`[FCM] No registered devices found for user(s): ${idList.join(', ')}`);
      return;
    }
    const tokens = [...new Set(rows.map(r => r.token).filter(Boolean))];
    if (tokens.length === 0) return;

    try {
      const message = {
        notification: { title, body },
        data: {
          ...Object.fromEntries(Object.entries(data).map(([k, v]) => [k, String(v)])),
          title,
          body
        },
        tokens
      };
      const response = await firebaseMessaging.sendEachForMulticast(message);
      console.log(`[FCM] Sent notification to ${tokens.length} token(s). Success: ${response.successCount}, Failures: ${response.failureCount}`);
      
      // Clean up dead/unregistered tokens
      if (response.failureCount > 0) {
        response.responses.forEach((resp, idx) => {
          if (!resp.success) {
            const error = resp.error;
            if (error && (error.code === 'messaging/invalid-registration-token' || error.code === 'messaging/registration-token-not-registered')) {
              const deadToken = tokens[idx];
              db.run(`DELETE FROM UserFCMTokens WHERE token = ?`, [deadToken], () => {});
            }
          }
        });
      }
    } catch (fcmErr) {
      console.error('[FCM] Error sending multicast notification:', fcmErr);
    }
  });
}

// Predefined Platform Baseline Cities
const CITIES = [
  'Delhi', 'Mumbai', 'Bengaluru', 'Hyderabad', 'Chennai', 
  'Kolkata', 'Jaipur', 'Ahmedabad', 'Pune', 'Lucknow', 'Chandigarh', 'Indore'
];

// Helper: Generate Short ID
function generateShortId(prefix = 'usr') {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let rand = '';
  for (let i = 0; i < 3; i++) {
    rand += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  const cleanPrefix = (prefix || 'usr').toLowerCase().replace(/[^a-z]/g, '').slice(0, 3) || 'usr';
  return `${cleanPrefix}${rand}${Math.floor(10 + Math.random() * 90)}`;
}

// Middleware: Authenticate & Context Injection
const authenticate = (req, res, next) => {
  const token = req.headers['authorization']?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Unauthorized: Token missing' });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    
    // Verify user is not terminated and fetch latest role & live shop association
    db.get(`SELECT id, shortId, name, email, phone, role, status FROM Users WHERE id = ?`, [decoded.id], (err, u) => {
      if (err || !u || u.status === 'TERMINATED') {
        return res.status(403).json({ error: 'Account terminated by platform administrator.' });
      }

      req.user.id = u.id;
      req.user.shortId = u.shortId;
      req.user.name = u.name;
      req.user.role = u.role;
      req.user.phone = u.phone;

      if (u.role === 'Shopkeeper') {
        db.get(`SELECT id, shortId, shopName FROM Shops WHERE ownerId = ? AND status = 'ACTIVE'`, [u.id], (err, shop) => {
          req.user.shopId = shop ? shop.id : null;
          req.user.staffRole = 'Owner';
          next();
        });
      } else {
        // Customer or Cashier: check if accepted staff of an active shop
        db.get(`SELECT ShopStaff.shopId, ShopStaff.role FROM ShopStaff 
                JOIN Shops ON ShopStaff.shopId = Shops.id 
                WHERE ShopStaff.userId = ? AND ShopStaff.status = 'ACCEPTED' AND Shops.status = 'ACTIVE'`, [u.id], (err, staff) => {
          if (staff) {
            req.user.shopId = staff.shopId;
            req.user.staffRole = staff.role; // 'Cashier'
          } else {
            req.user.shopId = null;
            req.user.staffRole = null;
          }
          next();
        });
      }
    });
  } catch (err) {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
};

// --- PUBLIC & DISCOVERY APIs ---
app.get('/api/cities', (req, res) => {
  db.all(`SELECT name FROM Cities WHERE status = 'ACTIVE' ORDER BY name ASC`, [], (err, rows) => {
    if (err || !rows || rows.length === 0) {
      return res.json(['Delhi', 'Mumbai', 'Bengaluru', 'Hyderabad', 'Chennai', 'Kolkata', 'Jaipur', 'Ahmedabad', 'Pune', 'Lucknow', 'Chandigarh', 'Indore']);
    }
    res.json(rows.map(r => r.name));
  });
});

app.get('/api/shops', (req, res) => {
  const { city } = req.query;
  let query = `SELECT id, shortId, shopName, shopPhone, city, shopAddress, timings, isOpen, status FROM Shops WHERE status = 'ACTIVE'`;
  const params = [];
  if (city) {
    query += ` AND city = ?`;
    params.push(city);
  }
  db.all(query, params, (err, rows) => {
    if (err) return res.status(500).json({ error: 'Failed to fetch shops' });
    res.json(rows || []);
  });
});

app.get('/api/shops/:id', (req, res) => {
  const shopId = req.params.id;
  db.get(`SELECT id, shortId, shopName, shopPhone, city, shopAddress, timings, isOpen, status FROM Shops WHERE (id = ? OR shortId = ?) AND status = 'ACTIVE'`, [shopId, shopId], (err, shop) => {
    if (err || !shop) return res.status(404).json({ error: 'Shop not found' });
    db.all(`SELECT id, name, price, unit FROM Items WHERE shopId = ?`, [shop.id], (err, items) => {
      res.json({ ...shop, items: items || [] });
    });
  });
});

app.get(['/api/items/compare', '/api/compare'], (req, res) => {
  const city = (req.query.city || '').trim();
  const q = (req.query.q || '').trim();

  let query = `
    SELECT Items.id, Items.name, Items.price, Items.unit,
           Shops.id as shopId, Shops.shortId as shopShortId, Shops.shopName, Shops.shopAddress, Shops.shopPhone, Shops.timings, Shops.isOpen, Shops.city
    FROM Items 
    JOIN Shops ON Items.shopId = Shops.id 
    WHERE (Shops.status IS NULL OR Shops.status = 'ACTIVE')
  `;
  const params = [];
  if (city && city !== 'All') {
    query += ` AND LOWER(Shops.city) = LOWER(?)`;
    params.push(city);
  }
  if (q) {
    query += ` AND LOWER(Items.name) LIKE LOWER(?)`;
    params.push(`%${q}%`);
  }
  query += ` ORDER BY Items.name ASC, Items.price ASC`;

  db.all(query, params, (err, rows) => {
    if (err) {
      console.warn('[Compare Items Query Error]:', err);
      return res.json([]);
    }
    res.json(rows || []);
  });
});

// --- AUTH APIs ---
app.post('/api/register', async (req, res) => {
  const { name, email, phone, password, role, city, address, shopName, shopAddress, timings, pin } = req.body;
  if (!name || !email || !phone || !password || !role) {
    return res.status(400).json({ error: 'Missing required registration fields' });
  }
  if (!['Customer', 'Shopkeeper'].includes(role)) {
    return res.status(400).json({ error: 'Invalid registration role' });
  }

  const userEmail = email.trim().toLowerCase();
  const userPhone = phone.trim();
  const userPin = pin && /^\d{4}$/.test(pin.toString().trim()) ? pin.toString().trim() : '1234';

  try {
    const hash = await bcrypt.hash(password, 10);
    const userShortId = generateShortId(name.slice(0, 3)).toLowerCase();
    const now = new Date().toISOString();

    db.run(`INSERT INTO Users (shortId, name, email, phone, password, pin, role, city, address, status, createdAt)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE', ?)`,
      [userShortId, name.trim(), userEmail, userPhone, hash, userPin, role, city || 'Delhi', address || '', now], function(err) {
        if (err) return res.status(400).json({ error: 'Email or phone number already registered' });
        const userId = this.lastID;

        if (role === 'Shopkeeper') {
          const shopShortId = generateShortId('shp');
          db.run(`INSERT INTO Shops (shortId, ownerId, shopName, shopPhone, city, shopAddress, timings, isOpen, status, createdAt)
                  VALUES (?, ?, ?, ?, ?, ?, ?, 1, 'ACTIVE', ?)`,
            [shopShortId, userId, shopName || `${name}'s Store`, phone, city || 'Delhi', shopAddress || address || '', timings || '08:00 AM - 10:00 PM', now], function(err) {
              if (err) return res.status(500).json({ error: 'Failed to create shop' });
              res.json({ success: true, userShortId, shopShortId, message: 'Shop created successfully!' });
          });
        } else {
          res.json({ success: true, userShortId, message: 'Customer account created successfully!' });
        }
    });
  } catch (e) {
    res.status(500).json({ error: 'Server error during registration' });
  }
});

// --- USER PROFILE & PIN SECURITY APIs ---
app.put('/api/user/profile', authenticate, (req, res) => {
  const { name, phone, city, address } = req.body;
  if (!name || !phone) return res.status(400).json({ error: 'Name and phone are required' });

  const cleanPhone = phone.toString().replace(/\D/g, '').slice(-10);
  if (cleanPhone.length !== 10) {
    return res.status(400).json({ error: 'Please enter a valid 10-digit mobile phone number' });
  }

  // Check if phone number is already registered by another account
  db.get(`SELECT id FROM Users WHERE phone = ? AND id != ?`, [cleanPhone, req.user.id], (err, existingPhone) => {
    if (err) return res.status(500).json({ error: 'Database error while checking phone number' });
    if (existingPhone) {
      return res.status(400).json({ error: 'This phone number is already registered with another account.' });
    }

    db.get(`SELECT role, city FROM Users WHERE id = ?`, [req.user.id], (err, currentUser) => {
      if (err || !currentUser) return res.status(404).json({ error: 'User not found' });

      // Shopkeeper cannot modify city - preserve registered city (SuperAdmin only)
      const isShopkeeper = currentUser.role === 'Shopkeeper';
      const targetCity = (isShopkeeper && currentUser.city) ? currentUser.city : (city || 'Delhi').trim();

      db.run(`UPDATE Users SET name = ?, phone = ?, city = ?, address = ? WHERE id = ?`,
        [name.trim(), cleanPhone, targetCity, (address || '').trim(), req.user.id], function(updateErr) {
          if (updateErr) return res.status(500).json({ error: 'Failed to update profile: ' + (updateErr.message || updateErr) });

          // If shopkeeper, also sync their shop's contact phone
          if (isShopkeeper) {
            db.run(`UPDATE Shops SET shopPhone = ? WHERE ownerId = ?`, [cleanPhone, req.user.id], () => {});
          }

          db.get(`SELECT id, shortId, name, email, phone, role, city, address, pin FROM Users WHERE id = ?`, [req.user.id], (err, updatedUser) => {
            res.json({ success: true, message: 'Profile updated successfully!', user: updatedUser });
          });
        });
    });
  });
});

app.post('/api/user/verify-pin', authenticate, async (req, res) => {
  const { pin, password } = req.body;
  if (!pin && !password) return res.status(400).json({ error: 'PIN or Password is required' });
  db.get(`SELECT pin, password FROM Users WHERE id = ?`, [req.user.id], async (err, user) => {
    if (err || !user) return res.status(404).json({ error: 'User not found' });
    
    // 1. Verify PIN
    if (pin) {
      const currentPin = user.pin || '1234';
      if (currentPin === pin.toString().trim()) {
        return res.json({ valid: true });
      }
    }

    // 2. Verify Password
    if (password && user.password) {
      try {
        const valid = await bcrypt.compare(password, user.password);
        if (valid) return res.json({ valid: true });
      } catch (e) {}
    }

    return res.status(400).json({ error: pin ? 'Incorrect 4-digit PIN' : 'Incorrect account password' });
  });
});

app.post('/api/user/change-pin', authenticate, (req, res) => {
  const { currentPin, newPin } = req.body;
  if (!currentPin || !newPin) return res.status(400).json({ error: 'Current PIN and New PIN are required' });
  if (!/^\d{4}$/.test(newPin.toString().trim())) {
    return res.status(400).json({ error: 'New PIN must be exactly 4 numeric digits' });
  }

  db.get(`SELECT pin FROM Users WHERE id = ?`, [req.user.id], (err, user) => {
    if (err || !user) return res.status(404).json({ error: 'User not found' });
    const actualPin = user.pin || '1234';
    if (actualPin !== currentPin.toString().trim()) {
      return res.status(400).json({ error: 'Current PIN is incorrect' });
    }

    db.run(`UPDATE Users SET pin = ? WHERE id = ?`, [newPin.toString().trim(), req.user.id], (err) => {
      if (err) return res.status(500).json({ error: 'Failed to update PIN' });
      res.json({ success: true, message: 'Security PIN updated successfully!' });
    });
  });
});

app.post('/api/user/change-password', authenticate, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!newPassword || newPassword.length < 4) {
    return res.status(400).json({ error: 'New password must be at least 4 characters long.' });
  }

  db.get(`SELECT id, password, COALESCE(hasPasswordSet, 0) as hasPasswordSet FROM Users WHERE id = ?`, [req.user.id], async (err, user) => {
    if (err || !user) return res.status(404).json({ error: 'User not found' });

    // If user already has a customized password set, require current password verification
    if (user.hasPasswordSet === 1) {
      if (!currentPassword || !currentPassword.trim()) {
        return res.status(400).json({ error: 'Current password is required to update your existing password.' });
      }
      const valid = await bcrypt.compare(currentPassword, user.password);
      if (!valid) {
        return res.status(400).json({ error: 'Current password is incorrect.' });
      }
    } else if (currentPassword && currentPassword.trim()) {
      const valid = await bcrypt.compare(currentPassword, user.password);
      if (!valid) {
        return res.status(400).json({ error: 'Current password is incorrect.' });
      }
    }

    try {
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      db.run(`UPDATE Users SET password = ?, hasPasswordSet = 1 WHERE id = ?`, [hashedPassword, req.user.id], (err) => {
        if (err) return res.status(500).json({ error: 'Failed to update password' });
        res.json({ success: true, message: 'Password saved successfully! You can now log in with your email/phone and password.' });
      });
    } catch (e) {
      res.status(500).json({ error: 'Failed to hash and save password' });
    }
  });
});

// --- PASKEY (WEBAUTHN BIOMETRICS) APIS ---
const passkeyChallenges = new Map();

// 1. Passkey Registration Challenge (for logged-in user)
app.post('/api/passkey/register-challenge', authenticate, (req, res) => {
  const challenge = Buffer.from(Math.random().toString(36) + Date.now().toString(36)).toString('base64url');
  passkeyChallenges.set(`reg_${req.user.id}`, { challenge, timestamp: Date.now() });
  
  res.json({
    challenge,
    rp: { name: 'GI SHOP', id: req.hostname },
    user: {
      id: Buffer.from(String(req.user.id)).toString('base64url'),
      name: req.user.email || req.user.name || `user_${req.user.id}`,
      displayName: req.user.name || 'GI SHOP User'
    },
    pubKeyCredParams: [
      { alg: -7, type: 'public-key' },  // ES256
      { alg: -257, type: 'public-key' } // RS256
    ],
    authenticatorSelection: {
      authenticatorAttachment: 'platform',
      userVerification: 'preferred',
      residentKey: 'preferred'
    },
    timeout: 60000
  });
});

// 2. Passkey Registration Verification (Save Passkey credential to DB)
app.post('/api/passkey/register-verify', authenticate, (req, res) => {
  const { credentialId, publicKey, deviceLabel } = req.body;
  if (!credentialId || !publicKey) {
    return res.status(400).json({ error: 'Credential ID and Public Key are required' });
  }

  const passkeyId = 'pk_' + Math.random().toString(36).substring(2, 9);
  const createdAt = new Date().toISOString();

  db.run(`INSERT OR REPLACE INTO UserPasskeys (id, userId, credentialId, publicKey, deviceLabel, createdAt)
          VALUES (?, ?, ?, ?, ?, ?)`,
    [passkeyId, req.user.id, credentialId, publicKey, deviceLabel || 'Device Passkey', createdAt],
    function(err) {
      if (err) {
        console.error('[Passkey Save Error]', err);
        return res.status(500).json({ error: 'Failed to save passkey credential: ' + (err.message || err) });
      }
      res.json({ success: true, message: 'Passkey registered successfully! You can now log in instantly using Face ID / Fingerprint.' });
    }
  );
});

// 3. Passkey Authentication Challenge (Public for login)
app.post('/api/passkey/auth-challenge', (req, res) => {
  const challenge = Buffer.from(Math.random().toString(36) + Date.now().toString(36)).toString('base64url');
  const sessionKey = Math.random().toString(36).substring(2, 10);
  passkeyChallenges.set(`auth_${sessionKey}`, { challenge, timestamp: Date.now() });

  res.json({
    challenge,
    sessionKey,
    timeout: 60000,
    userVerification: 'preferred',
    rpId: req.hostname
  });
});

// 4. Passkey Authentication Verification (Login with Passkey)
app.post('/api/passkey/auth-verify', (req, res) => {
  const { credentialId } = req.body;
  if (!credentialId) return res.status(400).json({ error: 'Credential ID is required' });

  db.get(`SELECT UserPasskeys.*, Users.id as userId, Users.role, Users.name, Users.email, Users.phone, Users.status, Users.shortId, Users.city, Users.address
          FROM UserPasskeys 
          JOIN Users ON UserPasskeys.userId = Users.id 
          WHERE UserPasskeys.credentialId = ?`, [credentialId], (err, row) => {
    if (err || !row) {
      return res.status(401).json({ error: 'Passkey not recognized on this device. Please log in first with Google or Email/Password, then enable Passkey in your settings.' });
    }

    if (row.status === 'TERMINATED') {
      return res.status(403).json({ error: 'Your account has been deactivated.' });
    }

    const user = {
      id: row.userId,
      role: row.role,
      name: row.name,
      email: row.email,
      phone: row.phone,
      shortId: row.shortId,
      city: row.city,
      address: row.address,
      status: row.status
    };

    if (user.role === 'Shopkeeper') {
      db.get(`SELECT * FROM Shops WHERE ownerId = ?`, [user.id], (err, shop) => {
        if (shop && shop.status === 'TERMINATED') {
          return res.status(403).json({ error: 'This shop has been deactivated.' });
        }
        const token = jwt.sign({ id: user.id, role: user.role, shopId: shop?.id, staffRole: 'Owner' }, JWT_SECRET, { expiresIn: '30d' });
        res.json({ token, user, shop, isStaff: false });
      });
    } else {
      db.get(`SELECT ShopStaff.*, Shops.shopName, Shops.city, Shops.isOpen FROM ShopStaff 
              JOIN Shops ON ShopStaff.shopId = Shops.id 
              WHERE ShopStaff.userId = ? AND ShopStaff.status = 'ACCEPTED' AND Shops.status = 'ACTIVE'`, [user.id], (err, staffRole) => {
        const token = jwt.sign({ 
          id: user.id, 
          role: user.role, 
          phone: user.phone, 
          shopId: staffRole?.shopId || null, 
          staffRole: staffRole ? 'Cashier' : null 
        }, JWT_SECRET, { expiresIn: '30d' });
        res.json({ token, user, shop: staffRole ? { id: staffRole.shopId, shopName: staffRole.shopName, city: staffRole.city } : null, isStaff: !!staffRole });
      });
    }
  });
});

app.post('/api/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email or Short ID and password are required' });
  const identifier = email.trim().toLowerCase();
  db.get(`SELECT * FROM Users WHERE LOWER(email) = ? OR LOWER(shortId) = ?`, [identifier, identifier], async (err, user) => {
    if (err || !user) return res.status(401).json({ error: 'Invalid credentials. User not found.' });
    if (user.status === 'TERMINATED') {
      return res.status(403).json({ error: 'Your account has been deactivated by the platform administrator.' });
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ error: 'Incorrect password.' });

    // Check if user is shop owner
    if (user.role === 'Shopkeeper') {
      db.get(`SELECT * FROM Shops WHERE ownerId = ?`, [user.id], (err, shop) => {
        if (shop && shop.status === 'TERMINATED') {
          return res.status(403).json({ error: 'This shop has been deactivated by the platform administrator.' });
        }
        const token = jwt.sign({ id: user.id, role: user.role, shopId: shop?.id, staffRole: 'Owner' }, JWT_SECRET, { expiresIn: '30d' });
        res.json({ token, user, shop, isStaff: false });
      });
    } else {
      // Check if customer is also a Cashier in an active shop
      db.get(`SELECT ShopStaff.*, Shops.shopName, Shops.city, Shops.isOpen FROM ShopStaff 
              JOIN Shops ON ShopStaff.shopId = Shops.id 
              WHERE ShopStaff.userId = ? AND ShopStaff.status = 'ACCEPTED' AND Shops.status = 'ACTIVE'`, [user.id], (err, staffRole) => {
        const token = jwt.sign({ 
          id: user.id, 
          role: user.role, 
          phone: user.phone, 
          shopId: staffRole ? staffRole.shopId : null,
          staffRole: staffRole ? staffRole.role : null
        }, JWT_SECRET, { expiresIn: '30d' });
        res.json({ token, user, staffRole: staffRole || null });
      });
    }
  });
});

// --- GOOGLE SIGN-IN & FIREBASE AUTH ENDPOINT ---
app.post('/api/auth/google', async (req, res) => {
  const { 
    idToken, 
    onboardComplete, 
    role = 'Customer', 
    name: inputName, 
    phone, 
    city = 'Delhi', 
    address, 
    shopName, 
    shopAddress, 
    timings, 
    pin, 
    password 
  } = req.body;

  if (!idToken) return res.status(400).json({ error: 'Google ID Token is required' });

  try {
    let decodedToken;
    if (firebaseAdminInitialized && firebaseAuth) {
      decodedToken = await firebaseAuth.verifyIdToken(idToken);
    } else {
      return res.status(500).json({ error: 'Firebase Admin authentication is not configured on server' });
    }

    const { email, name: googleName, uid } = decodedToken;
    if (!email) return res.status(400).json({ error: 'Google account does not provide an email address' });

    // Check if user already exists
    db.get(`SELECT * FROM Users WHERE email = ?`, [email], async (err, existingUser) => {
      if (err) return res.status(500).json({ error: 'Database error' });

      if (existingUser) {
        if (existingUser.status === 'TERMINATED') {
          return res.status(403).json({ error: 'Your account has been deactivated by the platform administrator.' });
        }

        // Existing user login
        if (existingUser.role === 'Shopkeeper') {
          db.get(`SELECT * FROM Shops WHERE ownerId = ?`, [existingUser.id], (err, shop) => {
            if (shop && shop.status === 'TERMINATED') {
              return res.status(403).json({ error: 'This shop has been deactivated by the platform administrator.' });
            }
            const token = jwt.sign({ id: existingUser.id, role: existingUser.role, shopId: shop?.id, staffRole: 'Owner' }, JWT_SECRET, { expiresIn: '30d' });
            return res.json({ token, user: existingUser, shop, isStaff: false, isNewUser: false });
          });
        } else {
          db.get(`SELECT ShopStaff.*, Shops.shopName, Shops.city, Shops.isOpen FROM ShopStaff 
                  JOIN Shops ON ShopStaff.shopId = Shops.id 
                  WHERE ShopStaff.userId = ? AND ShopStaff.status = 'ACCEPTED' AND Shops.status = 'ACTIVE'`, [existingUser.id], (err, staffRole) => {
            const token = jwt.sign({ 
              id: existingUser.id, 
              role: existingUser.role, 
              phone: existingUser.phone, 
              shopId: staffRole ? staffRole.shopId : null,
              staffRole: staffRole ? staffRole.role : null
            }, JWT_SECRET, { expiresIn: '30d' });
            return res.json({ token, user: existingUser, staffRole: staffRole || null, isNewUser: false });
          });
        }
      } else {
        // User does NOT exist in database!
        // If onboardComplete is false/missing, signal the frontend to show role selection and onboarding details
        if (!onboardComplete) {
          return res.json({
            isNewUser: true,
            googleUser: {
              email,
              name: googleName || '',
              uid
            }
          });
        }

        // Complete onboarding for new user
        const targetRole = (role === 'Shopkeeper' || role === 'Customer') ? role : 'Customer';
        const finalName = (inputName || googleName || (targetRole === 'Shopkeeper' ? 'Shop Owner' : 'Customer')).trim();
        const userShortId = generateShortId(finalName.slice(0, 3) || 'usr');
        const userCity = city || 'Delhi';
        const userAddress = (address || '').trim();
        const userPhone = phone ? phone.trim() : null;
        
        // Security PIN: if provided 4-digits use it, else default '1234'
        const finalPin = (pin && String(pin).trim().length === 4) ? String(pin).trim() : '1234';

        // Password: if provided hash it, otherwise hash a random secret
        const passwordToHash = (password && password.trim().length >= 4) ? password.trim() : (uid + Date.now() + Math.random());
        const hashedPassword = await bcrypt.hash(passwordToHash, 10);
        const now = new Date().toISOString();

        db.run(
          `INSERT INTO Users (shortId, name, email, phone, password, pin, role, city, address, status, createdAt)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE', ?)`,
          [userShortId, finalName, email, userPhone, hashedPassword, finalPin, targetRole, userCity, userAddress, now],
          function(err) {
            if (err) return res.status(500).json({ error: 'Failed to create user account: ' + err.message });
            const newUserId = this.lastID;
            const newUser = {
              id: newUserId,
              shortId: userShortId,
              name: finalName,
              email,
              phone: userPhone,
              role: targetRole,
              city: userCity,
              address: userAddress,
              status: 'ACTIVE',
              createdAt: now
            };

            if (targetRole === 'Shopkeeper') {
              const shopShortId = generateShortId('shp');
              const finalShopName = (shopName || `${finalName}'s Store`).trim();
              const finalTimings = (timings || '08:00 AM - 10:00 PM').trim();
              const finalShopAddress = (shopAddress || userAddress || userCity).trim();

              db.run(
                `INSERT INTO Shops (shortId, ownerId, shopName, shopPhone, city, shopAddress, timings, isOpen, status, createdAt)
                 VALUES (?, ?, ?, ?, ?, ?, ?, 1, 'ACTIVE', ?)`,
                [shopShortId, newUserId, finalShopName, userPhone || '', userCity, finalShopAddress, finalTimings, now],
                function(shopErr) {
                  const newShopId = this ? this.lastID : null;
                  const newShop = {
                    id: newShopId,
                    shortId: shopShortId,
                    ownerId: newUserId,
                    shopName: finalShopName,
                    shopPhone: userPhone || '',
                    city: userCity,
                    shopAddress: finalShopAddress,
                    timings: finalTimings,
                    isOpen: 1,
                    status: 'ACTIVE'
                  };
                  const token = jwt.sign({ id: newUserId, role: targetRole, shopId: newShopId, staffRole: 'Owner' }, JWT_SECRET, { expiresIn: '30d' });
                  return res.json({ token, user: newUser, shop: newShop, isStaff: false, isNewUser: false });
                }
              );
            } else {
              const token = jwt.sign({ id: newUserId, role: targetRole, phone: userPhone, shopId: null, staffRole: null }, JWT_SECRET, { expiresIn: '30d' });
              return res.json({ token, user: newUser, staffRole: null, isNewUser: false });
            }
          }
        );
      }
    });
  } catch (err) {
    console.error('[Google Auth Error]', err);
    return res.status(401).json({ error: 'Invalid Google Authentication token: ' + (err.message || err) });
  }
});

// --- PUSH NOTIFICATION TOKEN REGISTRATION ---
app.post('/api/notifications/register-token', authenticate, (req, res) => {
  const { token, platform = 'web' } = req.body;
  if (!token) return res.status(400).json({ error: 'FCM Token is required' });

  const now = new Date().toISOString();
  db.run(
    `INSERT INTO UserFCMTokens (userId, token, platform, updatedAt) 
     VALUES (?, ?, ?, ?)
     ON CONFLICT(token) DO UPDATE SET userId = excluded.userId, platform = excluded.platform, updatedAt = excluded.updatedAt`,
    [req.user.id, token, platform, now],
    (err) => {
      if (err) {
        console.error('[UserFCMTokens] Failed to register token:', err);
        return res.status(500).json({ error: 'Failed to save notification token' });
      }
      res.json({ success: true, message: 'Notification token registered successfully' });
    }
  );
});

app.get('/api/me', authenticate, (req, res) => {
  db.get(`SELECT id, shortId, name, email, phone, role, city, address, status, pin, (pin IS NOT NULL AND pin != '') as hasPinSet, COALESCE(hasPasswordSet, 0) as hasPasswordSet FROM Users WHERE id = ?`, [req.user.id], (err, user) => {
    if (err || !user) return res.status(404).json({ error: 'User not found' });
    if (user.role === 'Shopkeeper') {
      db.get(`SELECT * FROM Shops WHERE ownerId = ? AND status = 'ACTIVE'`, [user.id], (err, shop) => {
        res.json({ user, shop, isOwner: true, staffRole: 'Owner' });
      });
    } else {
      db.get(`SELECT ShopStaff.*, Shops.id as shopId, Shops.shortId as shopShortId, Shops.shopName, Shops.city, Shops.shopAddress, Shops.shopPhone, Shops.timings, Shops.isOpen 
              FROM ShopStaff 
              JOIN Shops ON ShopStaff.shopId = Shops.id 
              WHERE ShopStaff.userId = ? AND ShopStaff.status = 'ACCEPTED' AND Shops.status = 'ACTIVE'`, [user.id], (err, staffRole) => {
        const shop = staffRole ? {
          id: staffRole.shopId,
          shortId: staffRole.shopShortId,
          shopName: staffRole.shopName,
          city: staffRole.city,
          shopAddress: staffRole.shopAddress,
          shopPhone: staffRole.shopPhone,
          timings: staffRole.timings,
          isOpen: staffRole.isOpen
        } : null;
        res.json({ user, shop, staffRole: staffRole || null, isOwner: false });
      });
    }
  });
});

// --- STAFF INVITATION & MANAGEMENT APIs ---
app.post('/api/shop/staff/invite', authenticate, (req, res) => {
  if (req.user.role !== 'Shopkeeper') return res.status(403).json({ error: 'Forbidden: Only shop owner can invite staff' });
  const { identifier } = req.body; // shortId or phone

  db.get(`SELECT id, shortId, name, phone FROM Users WHERE (shortId = ? OR phone = ?) AND role = 'Customer' AND status = 'ACTIVE'`, [identifier, identifier], (err, customer) => {
    if (err || !customer) return res.status(404).json({ error: 'No active customer found with that Short ID or Phone number' });

    db.get(`SELECT id, status FROM ShopStaff WHERE shopId = ? AND userId = ?`, [req.user.shopId, customer.id], (err, existing) => {
      if (existing && existing.status === 'ACCEPTED') {
        return res.status(400).json({ error: 'This user is already an active Cashier in your shop' });
      }

      const now = new Date().toISOString();
      if (existing) {
        db.run(`UPDATE ShopStaff SET status = 'INVITED', invitedAt = ? WHERE id = ?`, [now, existing.id], () => {
          sendPushNotification(customer.id, {
            title: '💼 Staff Invitation',
            body: `You received an invitation to join as Cashier!`,
            data: { type: 'STAFF_INVITE', shopId: String(req.user.shopId) }
          });
          res.json({ success: true, message: `Invite re-sent to ${customer.name} (${customer.shortId})` });
        });
      } else {
        db.run(`INSERT INTO ShopStaff (shopId, userId, userShortId, userName, userPhone, role, status, invitedAt)
                VALUES (?, ?, ?, ?, ?, 'Cashier', 'INVITED', ?)`,
          [req.user.shopId, customer.id, customer.shortId, customer.name, customer.phone, now], function() {
            sendPushNotification(customer.id, {
              title: '💼 Staff Invitation',
              body: `You received an invitation to join as Cashier!`,
              data: { type: 'STAFF_INVITE', shopId: String(req.user.shopId) }
            });
            res.json({ success: true, message: `Invite sent to ${customer.name} (${customer.shortId})` });
        });
      }
    });
  });
});

app.get('/api/shop/staff', authenticate, (req, res) => {
  if (req.user.role !== 'Shopkeeper') return res.status(403).json({ error: 'Forbidden' });
  db.all(`SELECT * FROM ShopStaff WHERE shopId = ? ORDER BY id DESC`, [req.user.shopId], (err, rows) => res.json(rows || []));
});

app.delete('/api/shop/staff/:id', authenticate, (req, res) => {
  if (req.user.role !== 'Shopkeeper') return res.status(403).json({ error: 'Forbidden' });
  db.run(`DELETE FROM ShopStaff WHERE id = ? AND shopId = ?`, [req.params.id, req.user.shopId], () => res.json({ success: true }));
});

app.get('/api/customer/invites', authenticate, (req, res) => {
  db.all(`SELECT ShopStaff.*, Shops.shopName, Shops.city, Shops.shopAddress FROM ShopStaff 
          JOIN Shops ON ShopStaff.shopId = Shops.id 
          WHERE ShopStaff.userId = ? AND ShopStaff.status = 'INVITED' AND Shops.status = 'ACTIVE'`, [req.user.id], (err, rows) => {
    res.json(rows || []);
  });
});

app.post('/api/customer/invites/:id/respond', authenticate, (req, res) => {
  const { action } = req.body; // 'ACCEPT' or 'DECLINE'
  const newStatus = action === 'ACCEPT' ? 'ACCEPTED' : 'DECLINED';
  const now = new Date().toISOString();
  db.run(`UPDATE ShopStaff SET status = ?, respondedAt = ? WHERE id = ? AND userId = ?`, [newStatus, now, req.params.id, req.user.id], function(err) {
    if (err) return res.status(500).json({ error: 'Failed to update invite' });
    res.json({ success: true, status: newStatus });
  });
});

// --- SHOP STATUS (OPEN / CLOSED) & DETAILS ---
app.get('/api/shop/details', authenticate, (req, res) => {
  const shopId = req.user.shopId;
  if (!shopId) return res.status(403).json({ error: 'Not associated with a shop' });
  db.get(`SELECT Shops.*, Users.name as ownerName, Users.phone as ownerPhone, Users.shortId as ownerShortId,
          (SELECT COUNT(*) FROM Items WHERE Items.shopId = Shops.id) as totalItemsCount,
          (SELECT COUNT(*) FROM ShopStaff WHERE ShopStaff.shopId = Shops.id AND ShopStaff.status = 'ACCEPTED') as totalStaffCount
          FROM Shops JOIN Users ON Shops.ownerId = Users.id WHERE Shops.id = ?`, [shopId], (err, shop) => {
    if (err || !shop) return res.status(404).json({ error: 'Shop not found' });
    res.json(shop);
  });
});

app.put('/api/shop/details', authenticate, (req, res) => {
  if (req.user.role !== 'Shopkeeper') return res.status(403).json({ error: 'Forbidden: Only shop owner can edit shop details' });
  const { shopName, shopPhone, shopAddress, timings } = req.body;
  const cleanPhone = (shopPhone || '').toString().replace(/\D/g, '').slice(-10);

  if (cleanPhone && cleanPhone.length !== 10) {
    return res.status(400).json({ error: 'Please enter a valid 10-digit shop contact phone number' });
  }

  // Check if phone number is already registered by another account
  const checkDuplicate = (cb) => {
    if (!cleanPhone) return cb(null);
    db.get(`SELECT id FROM Users WHERE phone = ? AND id != ?`, [cleanPhone, req.user.id], (err, existing) => {
      if (err) return res.status(500).json({ error: 'Database error while checking phone number' });
      if (existing) return res.status(400).json({ error: 'This phone number is already registered with another account.' });
      cb();
    });
  };

  checkDuplicate(() => {
    // Shopkeeper cannot change city - city is locked to SuperAdmin governance
    db.run(`UPDATE Shops SET shopName = ?, shopPhone = ?, shopAddress = ?, timings = ? WHERE id = ?`,
      [shopName, cleanPhone || shopPhone, shopAddress, timings, req.user.shopId], function(err) {
        if (err) return res.status(500).json({ error: 'Failed to update shop details' });

        // Keep shopkeeper user account phone in sync with their shop phone
        if (cleanPhone) {
          db.run(`UPDATE Users SET phone = ? WHERE id = ?`, [cleanPhone, req.user.id], () => {});
        }

        res.json({ success: true, message: 'Shop details updated successfully!' });
    });
  });
});

app.put('/api/shop/status', authenticate, (req, res) => {
  const shopId = req.user.shopId;
  if (!shopId) return res.status(403).json({ error: 'Not associated with a shop' });
  const { isOpen } = req.body; // 1 or 0
  db.run(`UPDATE Shops SET isOpen = ? WHERE id = ?`, [isOpen ? 1 : 0, shopId], () => res.json({ success: true, isOpen: isOpen ? 1 : 0 }));
});

// --- SHOPKEEPER & CASHIER INVENTORY APIs ---
app.get('/api/shop/items', authenticate, (req, res) => {
  const shopId = req.user.shopId;
  if (!shopId) return res.status(403).json({ error: 'No shop context' });
  db.all(`SELECT * FROM Items WHERE shopId = ?`, [shopId], (err, rows) => res.json(rows || []));
});

app.post('/api/shop/items', authenticate, (req, res) => {
  if (req.user.role !== 'Shopkeeper') return res.status(403).json({ error: 'Forbidden: Only shop owner can add products' });
  const { name, price, unit } = req.body;
  db.run(`INSERT INTO Items (shopId, name, price, unit) VALUES (?, ?, ?, ?)`,
    [req.user.shopId, name, price, unit], function() { res.json({ id: this.lastID, name, price, unit, shopId: req.user.shopId }); });
});

app.put('/api/shop/items/:id', authenticate, (req, res) => {
  if (req.user.role !== 'Shopkeeper') return res.status(403).json({ error: 'Forbidden: Only shop owner can edit products' });
  const { name, price, unit } = req.body;
  db.run(`UPDATE Items SET name=?, price=?, unit=? WHERE id=? AND shopId=?`,
    [name, price, unit, req.params.id, req.user.shopId], () => res.json({ success: true }));
});

app.delete('/api/shop/items/:id', authenticate, (req, res) => {
  if (req.user.role !== 'Shopkeeper') return res.status(403).json({ error: 'Forbidden: Only shop owner can delete products' });
  db.run(`DELETE FROM Items WHERE id=? AND shopId=?`, [req.params.id, req.user.shopId], () => res.json({ success: true }));
});

// --- CUSTOMER ORDERS / "MAKE A LIST" APIs ---
app.post('/api/orders', authenticate, (req, res) => {
  const { shopId, items, estimatedTotal } = req.body;
  if (!shopId || !items || items.length === 0) return res.status(400).json({ error: 'Invalid order request' });

  const calculatedTotal = (typeof estimatedTotal === 'number' && estimatedTotal > 0)
    ? estimatedTotal
    : items.reduce((sum, it) => sum + (it.amount || (it.rate * it.qty) || ((it.item?.price || 0) * (it.qty || 1)) || 0), 0);

  // 1. Verify shop is active and open
  db.get(`SELECT id, shopName, isOpen, status FROM Shops WHERE id = ?`, [shopId], (err, shop) => {
    if (err || !shop || shop.status !== 'ACTIVE') return res.status(404).json({ error: 'Shop is not available' });
    if (!shop.isOpen) return res.status(400).json({ error: 'This shop is currently closed. Orders cannot be placed right now.' });

    // 2. Verify customer is not blocked by this shop
    db.get(`SELECT * FROM ShopBlockedCustomers WHERE shopId = ? AND customerPhone = ?`, [shopId, req.user.phone], (err, blocked) => {
      if (blocked) return res.status(403).json({ error: 'You are blocked by this shop. Please contact the shopkeeper directly.' });

      // Fetch customer details
      db.get(`SELECT shortId, name, phone, address FROM Users WHERE id = ?`, [req.user.id], (err, cust) => {
        const orderNumber = 'ORD-' + Math.floor(100000 + Math.random() * 900000);
        const now = new Date().toISOString();
        const initialTimeline = JSON.stringify([
          {
            title: 'Order Created',
            timestamp: now,
            description: 'Customer placed the order',
            status: 'CREATED'
          },
          {
            title: 'Order Received by Shop',
            timestamp: new Date(new Date(now).getTime() + 1000).toISOString(),
            description: `Order #${orderNumber} received by shop`,
            status: 'RECEIVED'
          }
        ]);

        db.run(`INSERT INTO Orders (orderNumber, shopId, customerId, customerShortId, customerName, customerPhone, customerAddress, itemsJSON, estimatedTotal, status, timelineJSON, createdAt)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING', ?, ?)`,
          [orderNumber, shopId, req.user.id, cust.shortId, cust.name, cust.phone, cust.address || '', JSON.stringify(items), calculatedTotal, initialTimeline, now], function(err) {
            if (err) return res.status(500).json({ error: 'Failed to place order' });
            const newOrderId = this.lastID;

            // Notify Shopkeeper and Staff via Push Notification
            db.get(`SELECT ownerId FROM Shops WHERE id = ?`, [shopId], (err, sRow) => {
              if (sRow && sRow.ownerId) {
                db.all(`SELECT userId FROM ShopStaff WHERE shopId = ? AND status = 'ACCEPTED'`, [shopId], (err, staffRows) => {
                  const targetUserIds = [sRow.ownerId, ...(staffRows ? staffRows.map(s => s.userId) : [])];
                  sendPushNotification(targetUserIds, {
                    title: '🛒 New Order Received!',
                    body: `Order #${orderNumber} from ${cust.name || 'Customer'} (₹${calculatedTotal.toFixed(0)})`,
                    data: {
                      type: 'NEW_ORDER',
                      orderId: String(newOrderId),
                      orderNumber,
                      shopId: String(shopId)
                    }
                  });
                });
              }
            });

            res.json({ success: true, orderId: newOrderId, orderNumber, message: 'Order sent to shopkeeper!' });
        });
      });
    });
  });
});

// Helper: Append Event to Order Timeline
function appendOrderTimeline(orderId, event, callback) {
  db.get(`SELECT timelineJSON, createdAt FROM Orders WHERE id = ?`, [orderId], (err, row) => {
    let timeline = [];
    if (row && row.timelineJSON) {
      try {
        timeline = JSON.parse(row.timelineJSON);
      } catch (e) {
        timeline = [];
      }
    }
    const newEntry = {
      title: event.title,
      timestamp: event.timestamp || new Date().toISOString(),
      description: event.description || '',
      status: event.status || ''
    };
    timeline.push(newEntry);
    const jsonStr = JSON.stringify(timeline);
    db.run(`UPDATE Orders SET timelineJSON = ? WHERE id = ?`, [jsonStr, orderId], () => {
      if (callback) callback(timeline);
    });
  });
}

// --- 45-MINUTE AUTO-CANCEL FOR PENDING ORDERS ---
const autoCancelExpiredOrders = (callback) => {
  const nowMs = Date.now();
  const cutoffMs = nowMs - 45 * 60 * 1000;
  const nowStr = new Date().toISOString();

  db.all(`SELECT id, createdAt FROM Orders WHERE status = 'PENDING'`, (err, rows) => {
    if (err || !rows || rows.length === 0) {
      if (callback) return callback(null);
      return;
    }
    const expiredIds = rows
      .filter((r) => {
        const createdMs = new Date(r.createdAt).getTime();
        return !isNaN(createdMs) && createdMs <= cutoffMs;
      })
      .map((r) => r.id);

    if (expiredIds.length === 0) {
      if (callback) return callback(null);
      return;
    }

    const placeholders = expiredIds.map(() => '?').join(',');
    db.run(
      `UPDATE Orders 
       SET status = 'AUTO_CANCELLED_EXPIRED', 
           declineReason = 'Auto-cancelled: Shopkeeper did not accept within 45 minutes',
           cancelledAt = ?
       WHERE id IN (${placeholders})`,
      [nowStr, ...expiredIds],
      (err) => {
        if (callback) callback(err);
      }
    );
  });
};

// Periodic background check every 30 seconds
setInterval(autoCancelExpiredOrders, 30000);

app.get('/api/customer/orders', authenticate, (req, res) => {
  autoCancelExpiredOrders(() => {
    db.all(`SELECT Orders.*, Shops.shortId as shopShortId, Shops.shopName, Shops.shopPhone, Shops.shopAddress, Shops.city as shopCity, Shops.timings as shopTimings FROM Orders 
            JOIN Shops ON Orders.shopId = Shops.id 
            WHERE Orders.customerId = ? ORDER BY Orders.id DESC`, [req.user.id], (err, rows) => {
      res.json(rows || []);
    });
  });
});

// --- CUSTOMER ORDER ACTIONS: CANCEL / TAKE BACK & COLLECTION STATUS ---
app.post('/api/customer/orders/:id/cancel', authenticate, (req, res) => {
  if (req.user.role !== 'Customer') return res.status(403).json({ error: 'Forbidden' });
  const orderId = req.params.id;
  const customerId = req.user.id;

  db.get(`SELECT * FROM Orders WHERE id = ? AND customerId = ?`, [orderId, customerId], (err, order) => {
    if (err || !order) return res.status(404).json({ error: 'Order not found' });
    
    if (['COLLECTED', 'NOT_COLLECTED', 'CANCELLED_BY_CUSTOMER', 'AUTO_CANCELLED_EXPIRED', 'DECLINED'].includes(order.status)) {
      return res.status(400).json({ error: 'This order is finalized and cannot be modified or cancelled.' });
    }

    const now = new Date().toISOString();
    db.run(`UPDATE Orders SET status = 'CANCELLED_BY_CUSTOMER', cancelledAt = ? WHERE id = ?`, [now, orderId], () => {
      appendOrderTimeline(orderId, {
        status: 'CANCELLED_BY_CUSTOMER',
        title: 'Order Cancelled',
        description: 'Customer cancelled / took back the order'
      });
      res.json({ success: true, status: 'CANCELLED_BY_CUSTOMER', message: 'Order cancelled / taken back successfully.' });
    });
  });
});

app.post('/api/customer/orders/:id/collection', authenticate, (req, res) => {
  if (req.user.role !== 'Customer') return res.status(403).json({ error: 'Forbidden' });
  const orderId = req.params.id;
  const customerId = req.user.id;
  const { collectionStatus } = req.body; // 'COLLECTED' | 'NOT_COLLECTED'

  if (!['COLLECTED', 'NOT_COLLECTED'].includes(collectionStatus)) {
    return res.status(400).json({ error: 'Invalid collection status.' });
  }

  db.get(`SELECT * FROM Orders WHERE id = ? AND customerId = ?`, [orderId, customerId], (err, order) => {
    if (err || !order) return res.status(404).json({ error: 'Order not found' });

    if (['COLLECTED', 'NOT_COLLECTED', 'CANCELLED_BY_CUSTOMER', 'AUTO_CANCELLED_EXPIRED', 'DECLINED'].includes(order.status)) {
      return res.status(400).json({ error: 'Order status has already been finalized and locked.' });
    }

    const now = new Date().toISOString();
    db.run(`UPDATE Orders SET status = ?, collectionStatus = ?, collectedAt = ? WHERE id = ?`,
      [collectionStatus, collectionStatus, now, orderId], () => {
        res.json({ success: true, status: collectionStatus, collectionStatus });
      });
  });
});

// --- SHOPKEEPER & CASHIER ORDER MANAGEMENT ---
app.get('/api/shop/orders', authenticate, (req, res) => {
  const shopId = req.user.shopId;
  if (!shopId) return res.status(403).json({ error: 'No shop context' });
  autoCancelExpiredOrders(() => {
    db.all(`SELECT * FROM Orders WHERE shopId = ? ORDER BY id DESC`, [shopId], (err, rows) => {
      const sanitized = (rows || []).map(r => {
        const { otpCode, ...rest } = r;
        return rest;
      });
      res.json(sanitized);
    });
  });
});

app.post('/api/shop/orders/:id/accept', authenticate, (req, res) => {
  const shopId = req.user.shopId;
  const { packingMinutes } = req.body;
  const now = new Date();

  db.get(`SELECT * FROM Orders WHERE id = ? AND shopId = ?`, [req.params.id, shopId], (err, order) => {
    if (err || !order) return res.status(404).json({ error: 'Order not found' });
    
    if (order.status !== 'PENDING') {
      return res.status(400).json({ error: `Order cannot be accepted because it is already ${order.status}` });
    }

    // Check if 45 minutes elapsed
    const createdTime = new Date(order.createdAt).getTime();
    if (Date.now() - createdTime > 45 * 60 * 1000) {
      db.run(
        `UPDATE Orders SET status = 'AUTO_CANCELLED_EXPIRED', declineReason = 'Auto-cancelled: Shopkeeper did not accept within 45 minutes', cancelledAt = ? WHERE id = ?`,
        [now.toISOString(), order.id]
      );
      return res.status(400).json({ error: 'Order expired! 45-minute acceptance window has elapsed and the order was auto-cancelled.' });
    }

    const packingMins = parseInt(packingMinutes) || 15;
    db.run(`UPDATE Orders SET status = 'PACKING', packingMinutes = ?, acceptedAt = ? WHERE id = ? AND shopId = ?`,
      [packingMins, now.toISOString(), req.params.id, shopId], () => {
        appendOrderTimeline(req.params.id, {
          status: 'ACCEPTED',
          title: 'Order Accepted & Preparing',
          description: `Shopkeeper accepted the order. Estimated preparation time: ${packingMins} minutes`
        });
        if (order.customerId) {
          sendPushNotification(order.customerId, {
            title: '📦 Order is Packing!',
            body: `The shop is packing your order #${order.orderNumber}. Estimated time: ~${packingMins} mins.`,
            data: { type: 'ORDER_PACKING', orderId: String(order.id), orderNumber: order.orderNumber }
          });
        }
        res.json({ success: true, status: 'PACKING' });
      });
  });
});

app.post('/api/shop/orders/:id/decline', authenticate, (req, res) => {
  const shopId = req.user.shopId;
  const { reason } = req.body;
  const finalReason = reason || 'Item unavailable';
  
  db.get(`SELECT * FROM Orders WHERE id = ? AND shopId = ?`, [req.params.id, shopId], (err, order) => {
    db.run(`UPDATE Orders SET status = 'DECLINED', declineReason = ? WHERE id = ? AND shopId = ?`,
      [finalReason, req.params.id, shopId], () => {
        appendOrderTimeline(req.params.id, {
          status: 'DECLINED',
          title: 'Order Declined',
          description: `Shopkeeper declined order: ${finalReason}`
        });
        if (order && order.customerId) {
          sendPushNotification(order.customerId, {
            title: '❌ Order Declined',
            body: `Order #${order.orderNumber} was declined by the shop (${finalReason}).`,
            data: { type: 'ORDER_DECLINED', orderId: String(order.id), orderNumber: order.orderNumber }
          });
        }
        res.json({ success: true, status: 'DECLINED' });
      });
  });
});

app.post('/api/shop/orders/:id/update-items', authenticate, (req, res) => {
  const shopId = req.user.shopId;
  const { items } = req.body; // array of items with isUnavailable flag
  if (!Array.isArray(items)) return res.status(400).json({ error: 'Invalid items payload' });

  db.get(`SELECT * FROM Orders WHERE id = ? AND shopId = ?`, [req.params.id, shopId], (err, order) => {
    if (err || !order) return res.status(404).json({ error: 'Order not found' });
    if (['COLLECTED', 'CANCELLED_BY_CUSTOMER', 'AUTO_CANCELLED_EXPIRED', 'DECLINED'].includes(order.status)) {
      return res.status(400).json({ error: 'Order is finalized and items cannot be modified.' });
    }

    const oldTotal = order.estimatedTotal || 0;
    let recalculatedTotal = 0;
    let unavailableCount = 0;
    items.forEach((it) => {
      if (it.isUnavailable || it.unavailable) {
        unavailableCount++;
      } else {
        const rate = it.rate || it.price || (it.item?.price) || 0;
        const qty = it.qty || 1;
        recalculatedTotal += (it.amount || (rate * qty));
      }
    });

    const itemsJSON = JSON.stringify(items);
    db.run(
      `UPDATE Orders SET itemsJSON = ?, estimatedTotal = ? WHERE id = ? AND shopId = ?`,
      [itemsJSON, recalculatedTotal, req.params.id, shopId],
      () => {
        let desc = `Order items updated.`;
        if (unavailableCount > 0) {
          desc = `${unavailableCount} item(s) marked unavailable. Total updated from ₹${oldTotal.toFixed(2)} → ₹${recalculatedTotal.toFixed(2)}`;
        }
        appendOrderTimeline(req.params.id, {
          status: 'ITEMS_UPDATED',
          title: 'Items & Total Updated',
          description: desc
        });
        res.json({ success: true, estimatedTotal: recalculatedTotal, itemsJSON });
      }
    );
  });
});

app.post('/api/shop/orders/:id/complete', authenticate, (req, res) => {
  const shopId = req.user.shopId;
  db.get(`SELECT * FROM Orders WHERE id = ? AND shopId = ?`, [req.params.id, shopId], (err, order) => {
    if (err || !order) return res.status(404).json({ error: 'Order not found' });
    if (order.status === 'CANCELLED_BY_CUSTOMER') {
      return res.status(400).json({ error: 'This order was cancelled by the customer.' });
    }
    if (['COLLECTED', 'NOT_COLLECTED', 'DECLINED'].includes(order.status)) {
      return res.status(400).json({ error: 'This order is already finalized.' });
    }

    const otp = Math.floor(1000 + Math.random() * 9000).toString();
    const nowIso = new Date().toISOString();

    db.run(
      `UPDATE Orders SET status = 'READY', otpCode = ?, otpCreatedAt = ? WHERE id = ? AND shopId = ?`,
      [otp, nowIso, req.params.id, shopId],
      () => {
        appendOrderTimeline(req.params.id, {
          status: 'READY',
          title: 'Order Ready for Pickup',
          description: 'Shopkeeper marked the order as packed and ready for pickup.'
        });
        if (order.customerId) {
          sendPushNotification(order.customerId, {
            title: '✅ Order Ready for Pickup!',
            body: `Your order #${order.orderNumber} is packed and ready for pickup! Show 4-digit OTP: ${otp}`,
            data: { type: 'ORDER_READY', orderId: String(order.id), orderNumber: order.orderNumber }
          });
        }
        // Do NOT return otpCode to shopkeeper
        res.json({ success: true, status: 'READY' });
      }
    );
  });
});

app.post('/api/shop/orders/:id/get-payment', authenticate, (req, res) => {
  const shopId = req.user.shopId;
  const { discount, paymentMethod } = req.body;
  const orderIdentifier = req.params.id;

  db.get(`SELECT * FROM Orders WHERE (id = ? OR orderNumber = ?) AND shopId = ?`, [orderIdentifier, orderIdentifier, shopId], (err, order) => {
    if (err || !order) return res.status(404).json({ error: 'Order not found' });
    
    const discNum = parseFloat(discount || 0);
    const finalAmount = Math.max(0, (order.estimatedTotal || 0) - discNum);
    const mode = paymentMethod || 'Cash';
    const otp = Math.floor(1000 + Math.random() * 9000).toString();
    const nowIso = new Date().toISOString();

    db.run(
      `UPDATE Orders SET paymentRequested = 1, requestedDiscount = ?, requestedAmount = ?, paymentMethod = ?, otpCode = ?, otpCreatedAt = ? WHERE id = ? AND shopId = ?`,
      [discNum, finalAmount, mode, otp, nowIso, order.id, shopId],
      (runErr) => {
        if (runErr) {
          console.error('[Get Payment DB Error]', runErr);
          return res.status(500).json({ error: 'Database update failed: ' + (runErr.message || runErr) });
        }
        appendOrderTimeline(order.id, {
          status: 'PAYMENT_REQUESTED',
          title: 'Payment Requested',
          description: `Amount requested: ₹${finalAmount.toFixed(2)}${discNum > 0 ? ` (Discount: ₹${discNum.toFixed(2)})` : ''}. Payment mode: ${mode}`
        });
        if (order.customerId) {
          sendPushNotification(order.customerId, {
            title: '💳 Payment Request Sent!',
            body: `Shopkeeper requested ₹${finalAmount.toFixed(2)} (${mode}) for order #${order.orderNumber}. Click to view 4-digit OTP.`,
            data: { type: 'PAYMENT_REQUESTED', orderId: String(order.id), orderNumber: order.orderNumber }
          });
        }
        // Do NOT return otpCode to shopkeeper
        res.json({
          success: true,
          paymentRequested: 1,
          requestedAmount: finalAmount,
          requestedDiscount: discNum,
          paymentMethod: mode
        });
      }
    );
  });
});

app.post('/api/shop/orders/:id/verify-otp', authenticate, (req, res) => {
  const shopId = req.user.shopId;
  const { otp } = req.body;
  const enteredOtp = (otp || '').toString().trim();
  const orderIdentifier = req.params.id;

  db.get(`SELECT * FROM Orders WHERE (id = ? OR orderNumber = ?) AND shopId = ?`, [orderIdentifier, orderIdentifier, shopId], (err, order) => {
    if (err || !order) return res.status(404).json({ error: 'Order not found' });
    
    if (!enteredOtp) {
      return res.status(400).json({ error: 'Please enter the 4-digit customer OTP.' });
    }

    if (!order.otpCode || order.otpCode !== enteredOtp) {
      return res.status(400).json({ error: 'Invalid OTP' });
    }

    // 24-hour expiration check (86,400,000 ms)
    const otpTime = order.otpCreatedAt ? new Date(order.otpCreatedAt).getTime() : (order.createdAt ? new Date(order.createdAt).getTime() : Date.now());
    const ageMs = Date.now() - otpTime;
    const MAX_AGE_MS = 24 * 60 * 60 * 1000;

    if (ageMs > MAX_AGE_MS) {
      return res.status(400).json({ error: 'OTP Expired. Please click Get Payment to issue a new request.' });
    }

    const now = new Date().toISOString();
    const finalTotal = order.requestedAmount > 0 ? order.requestedAmount : (order.estimatedTotal || 0);
    const mode = order.paymentMethod || 'Cash';
    const disc = order.requestedDiscount || 0;

    // 1. Mark Order as COMPLETED & COLLECTED
    db.run(
      `UPDATE Orders SET status = 'COMPLETED', collectionStatus = 'COLLECTED', collectedAt = ? WHERE id = ? AND shopId = ?`,
      [now, order.id, shopId],
      function() {
        appendOrderTimeline(order.id, {
          status: 'VERIFIED',
          title: 'Customer Verified',
          description: 'Customer 4-digit OTP successfully verified'
        }, () => {
          appendOrderTimeline(order.id, {
            status: 'COMPLETED',
            title: 'Order Delivered & Completed',
            description: 'Order handed over and sale completed'
          });
        });
        // 2. Automatically record POS sale in Sales table
        db.run(
          `INSERT INTO Sales (shopId, customerPhone, customerShortId, itemsJSON, subtotal, discount, total, paymentMethod, note, cashierName, date)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            shopId,
            order.customerPhone || '',
            order.customerShortId || '',
            order.itemsJSON,
            order.estimatedTotal,
            disc,
            finalTotal,
            mode,
            `Order #${order.orderNumber}`,
            req.user.name || 'Shopkeeper',
            now
          ],
          function() {
            // If payment mode is Add to Book, add to ShopCustomers
            if (mode === 'Add to Book' && (order.customerPhone || order.customerShortId)) {
              db.run(
                `INSERT INTO ShopCustomers (shopId, customerPhone, customerShortId, customerEmail, name, address, status) VALUES (?, ?, ?, ?, ?, ?, 'ACTIVE')
                 ON CONFLICT(shopId, customerPhone) DO UPDATE SET status='ACTIVE', customerShortId=?`,
                [shopId, order.customerPhone || '', order.customerShortId || '', '', order.customerName || 'App Customer', order.customerAddress || '', order.customerShortId || '']
              );
            }

            if (order.customerId) {
              sendPushNotification(order.customerId, {
                title: '🎉 Order Completed & Collected!',
                body: `Order #${order.orderNumber} has been verified and handed over! Thank you for shopping with us.`,
                data: { type: 'ORDER_COMPLETED', orderId: String(order.id), orderNumber: order.orderNumber }
              });
            }

            res.json({ success: true, status: 'COMPLETED', collectionStatus: 'COLLECTED', message: 'OTP verified! Order completed and sale recorded.' });
          }
        );
      }
    );
  });
});

// --- CUSTOMER MANAGEMENT & BLOCKING ---
app.get('/api/shop/customers/search-registered', authenticate, (req, res) => {
  const rawQuery = (req.query.query || '').trim();
  if (!rawQuery) return res.json([]);

  const cleanQuery = rawQuery.replace(/^(#|ID:\s*)/i, '').trim().toLowerCase();
  const cleanPhone = rawQuery.replace(/\D/g, '').slice(-10);
  const searchPattern = `%${cleanQuery}%`;
  const phonePattern = cleanPhone ? `%${cleanPhone}%` : `%${rawQuery}%`;

  const sql = `SELECT u.id, u.shortId, u.name, u.email, u.phone, u.city, u.role, s.shopName, s.shortId as shopShortId 
               FROM Users u 
               LEFT JOIN Shops s ON s.ownerId = u.id
               WHERE (u.status = 'ACTIVE' OR u.status IS NULL OR u.status = 'active') 
               AND (
                 LOWER(u.shortId) = ? 
                 OR LOWER(u.shortId) LIKE ? 
                 OR (s.shortId IS NOT NULL AND (LOWER(s.shortId) = ? OR LOWER(s.shortId) LIKE ?))
                 OR u.phone LIKE ? 
                 OR LOWER(u.email) = ? 
                 OR LOWER(u.email) LIKE ?
                 OR LOWER(u.name) LIKE ?
                 OR (s.shopName IS NOT NULL AND LOWER(s.shopName) LIKE ?)
               )
               LIMIT 20`;

  db.all(
    sql,
    [
      cleanQuery, searchPattern,
      cleanQuery, searchPattern,
      phonePattern,
      cleanQuery, searchPattern,
      searchPattern,
      searchPattern
    ],
    (err, rows) => {
      if (err) {
        console.error('[Search Registered Customer Error]', err);
        return res.status(500).json({ error: 'Search failed' });
      }
      res.json(rows || []);
    }
  );
});

app.get('/api/shop/customers', authenticate, (req, res) => {
  const shopId = req.user.shopId;
  db.all(`SELECT ShopCustomers.*, 
          COALESCE(ShopCustomers.customerShortId, Users.shortId) as shortId,
          COALESCE(ShopCustomers.customerEmail, Users.email) as email,
          (SELECT COUNT(*) FROM ShopBlockedCustomers WHERE ShopBlockedCustomers.shopId = ? AND ShopBlockedCustomers.customerPhone = ShopCustomers.customerPhone) as isBlocked
          FROM ShopCustomers 
          LEFT JOIN Users ON ShopCustomers.customerPhone = Users.phone OR (ShopCustomers.customerShortId IS NOT NULL AND ShopCustomers.customerShortId = Users.shortId)
          WHERE ShopCustomers.shopId = ? AND ShopCustomers.status = 'ACTIVE'`, [shopId, shopId], (err, rows) => res.json(rows || []));
});

app.post('/api/shop/customers', authenticate, (req, res) => {
  const shopId = req.user.shopId;
  const { phone, customerShortId, customerEmail, name, address } = req.body;
  const sId = customerShortId || null;
  const cEmail = customerEmail || null;
  db.run(`INSERT INTO ShopCustomers (shopId, customerPhone, customerShortId, customerEmail, name, address, status) VALUES (?, ?, ?, ?, ?, ?, 'ACTIVE')
          ON CONFLICT(shopId, customerPhone) DO UPDATE SET status='ACTIVE', customerShortId=?, customerEmail=?, name=?, address=?`,
    [shopId, phone, sId, cEmail, name, address, sId, cEmail, name, address], () => res.json({ success: true }));
});

app.put('/api/shop/customers/block', authenticate, (req, res) => {
  const shopId = req.user.shopId;
  const { phone, reason } = req.body;
  const now = new Date().toISOString();
  db.run(`INSERT INTO ShopBlockedCustomers (shopId, customerPhone, reason, blockedAt) VALUES (?, ?, ?, ?)
          ON CONFLICT(shopId, customerPhone) DO UPDATE SET reason = ?, blockedAt = ?`,
    [shopId, phone, reason || 'Blocked by shopkeeper', now, reason || 'Blocked by shopkeeper', now], () => res.json({ success: true, isBlocked: true }));
});

app.put('/api/shop/customers/unblock', authenticate, (req, res) => {
  const shopId = req.user.shopId;
  const { phone } = req.body;
  db.run(`DELETE FROM ShopBlockedCustomers WHERE shopId = ? AND customerPhone = ?`, [shopId, phone], () => res.json({ success: true, isBlocked: false }));
});

app.put('/api/shop/customers/terminate', authenticate, (req, res) => {
  const shopId = req.user.shopId;
  const { phone } = req.body;
  db.run(`UPDATE ShopCustomers SET status='TERMINATED' WHERE shopId=? AND customerPhone=?`, [shopId, phone], () => res.json({ success: true }));
});

// --- SALES & KHATA APIs ---
app.post('/api/shop/sales', authenticate, (req, res) => {
  const shopId = req.user.shopId;
  const { customerPhone, customerShortId, customerEmail, itemsJSON, subtotal, discount, total, paymentMethod, note } = req.body;
  const date = new Date().toISOString();
  const cashierName = req.user.role === 'Shopkeeper' ? 'Shopkeeper' : (req.user.staffRole || 'Cashier');

  // Verify 20-char note limit
  const sanitizedNote = (note || '').slice(0, 20);

  if (paymentMethod === 'Add to Book') {
    // Check if customer is registered and has shortId
    const findQuery = customerShortId 
      ? `SELECT id, shortId, email, phone, name FROM Users WHERE shortId = ? AND status = 'ACTIVE'`
      : `SELECT id, shortId, email, phone, name FROM Users WHERE phone = ? AND status = 'ACTIVE'`;
    const findParam = customerShortId || customerPhone;

    db.get(findQuery, [findParam], (err, user) => {
      if (err || !user || !user.shortId) {
        return res.status(400).json({ error: 'Khata credit billing ("Add to Book") requires selecting a registered app customer with a Short ID / Email. Walk-in customers without an app account cannot be added to Khata.' });
      }

      const activeShortId = user.shortId;
      const activeEmail = user.email || customerEmail || '';
      const activePhone = user.phone || customerPhone || '';

      db.run(`INSERT INTO Sales (shopId, customerPhone, customerShortId, itemsJSON, subtotal, discount, total, paymentMethod, note, cashierName, date)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [shopId, activePhone, activeShortId, itemsJSON, subtotal, discount, total, paymentMethod, sanitizedNote, cashierName, date], function(err) {
          if (err) return res.status(500).json({ error: 'Failed to record sale' });
          
          db.run(`INSERT INTO ShopCustomers (shopId, customerPhone, customerShortId, customerEmail, name, address, status) VALUES (?, ?, ?, ?, ?, '', 'ACTIVE')
                  ON CONFLICT(shopId, customerPhone) DO UPDATE SET status='ACTIVE', customerShortId=?, customerEmail=?`, 
            [shopId, activePhone, activeShortId, activeEmail, user.name || 'App Customer', activeShortId, activeEmail]);

          res.json({ id: this.lastID, date, total, paymentMethod, note: sanitizedNote, customerShortId: activeShortId });
        });
    });
    return;
  }

  // Non-Khata payment methods (Cash, Online/UPI)
  db.run(`INSERT INTO Sales (shopId, customerPhone, customerShortId, itemsJSON, subtotal, discount, total, paymentMethod, note, cashierName, date)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [shopId, customerPhone || '', customerShortId || '', itemsJSON, subtotal, discount, total, paymentMethod, sanitizedNote, cashierName, date], function(err) {
      if (err) return res.status(500).json({ error: 'Failed to record sale' });
      res.json({ id: this.lastID, date, total, paymentMethod, note: sanitizedNote });
    });
});

app.put('/api/shop/sales/:id/note', authenticate, (req, res) => {
  const shopId = req.user.shopId;
  const { note } = req.body;
  const sanitizedNote = (note || '').slice(0, 20);
  db.run(`UPDATE Sales SET note = ? WHERE id = ? AND shopId = ?`, [sanitizedNote, req.params.id, shopId], () => {
    res.json({ success: true, note: sanitizedNote });
  });
});

app.post('/api/shop/settlements', authenticate, (req, res) => {
  const shopId = req.user.shopId;
  const { customerPhone, amount, method } = req.body;
  const date = new Date().toISOString();
  db.run(`INSERT INTO Settlements (shopId, customerPhone, amount, method, date) VALUES (?, ?, ?, ?, ?)`,
    [shopId, customerPhone, amount, method, date], function() { res.json({ id: this.lastID, date }); });
});

app.get('/api/shop/ledger/:phone', authenticate, (req, res) => {
  const shopId = req.user.shopId;
  const phone = req.params.phone;
  db.all(`SELECT * FROM Sales WHERE shopId=? AND customerPhone=?`, [shopId, phone], (err, sales) => {
    db.all(`SELECT * FROM Settlements WHERE shopId=? AND customerPhone=?`, [shopId, phone], (err, settlements) => {
      const parsedSales = (sales || []).map((s) => ({
        ...s,
        total: Number(s.total) || 0,
        subtotal: Number(s.subtotal) || 0,
        discount: Number(s.discount) || 0,
      }));
      const parsedSettlements = (settlements || []).map((st) => ({
        ...st,
        amount: Number(st.amount) || 0,
      }));
      res.json({ sales: parsedSales, settlements: parsedSettlements });
    });
  });
});

// --- ADVANCED TRANSACTIONS & ANALYTICS ---
app.get('/api/shop/sales', authenticate, (req, res) => {
  const shopId = req.user.shopId;
  const isCashier = req.user.staffRole === 'Cashier';
  const { range, startDate, endDate } = req.query;

  let query = `SELECT * FROM Sales WHERE shopId = ?`;
  const params = [shopId];

  if (isCashier || range === 'Today') {
    // Cashier restricted to Today
    const today = new Date().toISOString().split('T')[0];
    query += ` AND date LIKE '${today}%'`;
  } else if (range === 'Yesterday') {
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    query += ` AND date LIKE '${yesterday}%'`;
  } else if (range === '7Days') {
    const past = new Date(Date.now() - 7 * 86400000).toISOString();
    query += ` AND date >= ?`;
    params.push(past);
  } else if (range === '15Days') {
    const past = new Date(Date.now() - 15 * 86400000).toISOString();
    query += ` AND date >= ?`;
    params.push(past);
  } else if (range === '1Month') {
    const past = new Date(Date.now() - 30 * 86400000).toISOString();
    query += ` AND date >= ?`;
    params.push(past);
  } else if (range === '3Months') {
    const past = new Date(Date.now() - 90 * 86400000).toISOString();
    query += ` AND date >= ?`;
    params.push(past);
  } else if (range === '1Year') {
    const past = new Date(Date.now() - 365 * 86400000).toISOString();
    query += ` AND date >= ?`;
    params.push(past);
  } else if (startDate && endDate) {
    query += ` AND date >= ? AND date <= ?`;
    params.push(new Date(startDate).toISOString(), new Date(endDate + 'T23:59:59').toISOString());
  }

  query += ` ORDER BY date DESC`;

  db.all(query, params, (err, sales) => {
    if (err) return res.status(500).json({ error: 'Failed to fetch sales' });
    
    const parsedSales = (sales || []).map((s) => ({
      ...s,
      total: Number(s.total) || 0,
      subtotal: Number(s.subtotal) || 0,
      discount: Number(s.discount) || 0,
    }));

    // Compute Financial Metrics safely with numeric casting
    const totalSales = parsedSales.reduce((sum, s) => sum + (Number(s.total) || 0), 0);
    const cashSales = parsedSales.filter(s => s.paymentMethod === 'Cash').reduce((sum, s) => sum + (Number(s.total) || 0), 0);
    const onlineSales = parsedSales.filter(s => s.paymentMethod === 'Online' || s.paymentMethod === 'UPI').reduce((sum, s) => sum + (Number(s.total) || 0), 0);
    const khataSales = parsedSales.filter(s => s.paymentMethod === 'Add to Book').reduce((sum, s) => sum + (Number(s.total) || 0), 0);

    res.json({
      sales: parsedSales,
      analytics: {
        totalSales,
        cashSales,
        onlineSales,
        khataSales,
        count: parsedSales.length,
        isCashierLimited: isCashier
      }
    });
  });
});

// --- SUPER MANAGER (ADMIN) GOVERNANCE APIs ---
app.get('/api/admin/shops', authenticate, (req, res) => {
  if (req.user.role !== 'SuperManager') return res.status(403).json({ error: 'Forbidden: Super Manager access required' });
  db.all(`SELECT Shops.*, Users.name as ownerName, Users.email as ownerEmail, Users.phone as ownerPhone,
          (SELECT COUNT(*) FROM Sales WHERE Sales.shopId = Shops.id) as totalSalesCount,
          (SELECT COALESCE(SUM(total), 0) FROM Sales WHERE Sales.shopId = Shops.id) as totalRevenue
          FROM Shops JOIN Users ON Shops.ownerId = Users.id ORDER BY Shops.id DESC`, [], (err, rows) => {
    res.json(rows || []);
  });
});

app.get('/api/admin/users', authenticate, (req, res) => {
  if (req.user.role !== 'SuperManager') return res.status(403).json({ error: 'Forbidden: Super Manager access required' });
  db.all(`SELECT id, shortId, name, email, phone, role, city, address, status, createdAt FROM Users ORDER BY id DESC`, [], (err, rows) => {
    res.json(rows || []);
  });
});

app.put('/api/admin/terminate-shop', authenticate, (req, res) => {
  if (req.user.role !== 'SuperManager') return res.status(403).json({ error: 'Forbidden' });
  const { shopId } = req.body;
  db.run(`UPDATE Shops SET status = 'TERMINATED' WHERE id = ?`, [shopId], () => res.json({ success: true, status: 'TERMINATED' }));
});

app.put('/api/admin/reactivate-shop', authenticate, (req, res) => {
  if (req.user.role !== 'SuperManager') return res.status(403).json({ error: 'Forbidden' });
  const { shopId } = req.body;
  db.run(`UPDATE Shops SET status = 'ACTIVE' WHERE id = ?`, [shopId], () => res.json({ success: true, status: 'ACTIVE' }));
});

app.put('/api/admin/terminate-user', authenticate, (req, res) => {
  if (req.user.role !== 'SuperManager') return res.status(403).json({ error: 'Forbidden' });
  const { userId } = req.body;
  db.run(`UPDATE Users SET status = 'TERMINATED' WHERE id = ?`, [userId], () => res.json({ success: true, status: 'TERMINATED' }));
});

app.put('/api/admin/reactivate-user', authenticate, (req, res) => {
  if (req.user.role !== 'SuperManager') return res.status(403).json({ error: 'Forbidden' });
  const { userId } = req.body;
  db.run(`UPDATE Users SET status = 'ACTIVE' WHERE id = ?`, [userId], () => res.json({ success: true, status: 'ACTIVE' }));
});

app.post('/api/admin/reset-pin', authenticate, (req, res) => {
  if (req.user.role !== 'SuperManager') return res.status(403).json({ error: 'Forbidden: Super Manager access required' });
  const { userId, newPin } = req.body;
  if (!userId) return res.status(400).json({ error: 'User ID is required' });
  const resetPin = newPin && /^\d{4}$/.test(newPin.toString().trim()) ? newPin.toString().trim() : '1234';

  db.run(`UPDATE Users SET pin = ? WHERE id = ?`, [resetPin, userId], function(err) {
    if (err || this.changes === 0) return res.status(404).json({ error: 'User not found or PIN update failed' });
    res.json({ success: true, message: `Security PIN reset successfully to ${resetPin}!` });
  });
});

app.put('/api/admin/change-shop-city', authenticate, (req, res) => {
  if (req.user.role !== 'SuperManager') return res.status(403).json({ error: 'Forbidden: Super Manager access required' });
  const { shopId, newCity } = req.body;
  if (!shopId || !newCity) return res.status(400).json({ error: 'Shop ID and new city are required' });

  db.run(`UPDATE Shops SET city = ? WHERE id = ?`, [newCity.trim(), shopId], function(err) {
    if (err) return res.status(500).json({ error: 'Failed to update shop city' });
    // Also sync the owner's city if shop has an ownerId
    db.run(`UPDATE Users SET city = ? WHERE id = (SELECT ownerId FROM Shops WHERE id = ?)`, [newCity.trim(), shopId], () => {
      res.json({ success: true, message: `Shop city successfully updated to ${newCity.trim()}!` });
    });
  });
});

app.delete('/api/admin/shops/:id', authenticate, (req, res) => {
  if (req.user.role !== 'SuperManager') return res.status(403).json({ error: 'Forbidden: Super Manager access required' });
  const shopId = req.params.id;
  if (!shopId) return res.status(400).json({ error: 'Shop ID is required' });

  db.get(`SELECT * FROM Shops WHERE id = ?`, [shopId], (err, shop) => {
    if (err || !shop) return res.status(404).json({ error: 'Shop not found' });

    const ownerId = shop.ownerId;
    const shopName = shop.shopName || 'Shop';

    // 1. Convert linked shopkeeper account to normal Customer
    if (ownerId) {
      db.run(`UPDATE Users SET role = 'Customer' WHERE id = ?`, [ownerId], (uErr) => {
        if (uErr) console.warn('[Admin Delete Shop] Error converting owner role:', uErr);
      });
    }

    // 2. Cascade delete dependent shop records
    db.run(`DELETE FROM ShopStaff WHERE shopId = ?`, [shopId], () => {});
    db.run(`DELETE FROM Items WHERE shopId = ?`, [shopId], () => {});
    db.run(`DELETE FROM Orders WHERE shopId = ?`, [shopId], () => {});
    db.run(`DELETE FROM Sales WHERE shopId = ?`, [shopId], () => {});
    db.run(`DELETE FROM Settlements WHERE shopId = ?`, [shopId], () => {});
    db.run(`DELETE FROM ShopBlockedCustomers WHERE shopId = ?`, [shopId], () => {});
    db.run(`DELETE FROM ShopCustomers WHERE shopId = ?`, [shopId], () => {});
    db.run(`DELETE FROM SyncedContacts WHERE shopId = ?`, [shopId], () => {});

    // 3. Delete the shop itself
    db.run(`DELETE FROM Shops WHERE id = ?`, [shopId], function(delErr) {
      if (delErr) return res.status(500).json({ error: 'Failed to delete shop from database' });
      res.json({
        success: true,
        message: `Shop "${shopName}" deleted successfully. The linked owner account has been converted to a normal Customer.`
      });
    });
  });
});

// --- SUPER MANAGER (ADMIN) CITY GOVERNANCE APIs ---
app.get('/api/admin/cities', authenticate, (req, res) => {
  if (req.user.role !== 'SuperManager') return res.status(403).json({ error: 'Forbidden: Super Manager access required' });
  db.all(`SELECT Cities.*, (SELECT COUNT(*) FROM Shops WHERE Shops.city = Cities.name AND Shops.status = 'ACTIVE') as shopCount 
          FROM Cities ORDER BY Cities.name ASC`, [], (err, rows) => {
    res.json(rows || []);
  });
});

app.post('/api/admin/cities', authenticate, (req, res) => {
  if (req.user.role !== 'SuperManager') return res.status(403).json({ error: 'Forbidden: Super Manager access required' });
  const { name } = req.body;
  if (!name || !name.trim()) return res.status(400).json({ error: 'City name is required' });
  const cleanName = name.trim();
  db.run(`INSERT INTO Cities (name, status, createdAt) VALUES (?, 'ACTIVE', ?)`, [cleanName, new Date().toISOString()], function(err) {
    if (err) return res.status(400).json({ error: 'City already exists in database' });
    res.json({ success: true, id: this.lastID, name: cleanName, message: `City "${cleanName}" added successfully!` });
  });
});

app.delete('/api/admin/cities/:id', authenticate, (req, res) => {
  if (req.user.role !== 'SuperManager') return res.status(403).json({ error: 'Forbidden: Super Manager access required' });
  db.run(`DELETE FROM Cities WHERE id = ?`, [req.params.id], function(err) {
    if (err) return res.status(500).json({ error: 'Failed to delete city' });
    res.json({ success: true, message: 'City removed successfully!' });
  });
});

// --- PLATFORM SUPPORT CONTACT SETTINGS (SUPER MANAGER & PUBLIC) ---
app.get('/api/support-settings', (req, res) => {
  db.all(`SELECT settingKey, settingValue FROM PlatformSettings`, [], (err, rows) => {
    const settings = {
      supportPhone: '',
      supportWhatsapp: '',
      supportEmail: '',
      supportHours: '09:00 AM - 09:00 PM'
    };
    if (rows && Array.isArray(rows)) {
      rows.forEach(r => {
        if (r.settingKey === 'support_phone') settings.supportPhone = r.settingValue || '';
        if (r.settingKey === 'support_whatsapp') settings.supportWhatsapp = r.settingValue || '';
        if (r.settingKey === 'support_email') settings.supportEmail = r.settingValue || '';
        if (r.settingKey === 'support_hours') settings.supportHours = r.settingValue || '09:00 AM - 09:00 PM';
      });
    }
    res.json(settings);
  });
});

app.put('/api/admin/support-settings', authenticate, (req, res) => {
  if (req.user.role !== 'SuperManager') return res.status(403).json({ error: 'Forbidden: Super Manager access required' });
  const { supportPhone, supportWhatsapp, supportEmail, supportHours } = req.body;

  const updates = [
    ['support_phone', (supportPhone || '').toString().trim()],
    ['support_whatsapp', (supportWhatsapp || '').toString().trim()],
    ['support_email', (supportEmail || '').toString().trim()],
    ['support_hours', (supportHours || '09:00 AM - 09:00 PM').toString().trim()]
  ];

  let pending = updates.length;
  let hasError = false;

  updates.forEach(([k, v]) => {
    db.run(
      `INSERT OR REPLACE INTO PlatformSettings (settingKey, settingValue) VALUES (?, ?)`,
      [k, v],
      (err) => {
        if (err) hasError = true;
        pending--;
        if (pending === 0) {
          if (hasError) return res.status(500).json({ error: 'Failed to update support settings' });
          res.json({
            success: true,
            message: 'Platform support contact settings updated successfully!',
            settings: {
              supportPhone: updates[0][1],
              supportWhatsapp: updates[1][1],
              supportEmail: updates[2][1],
              supportHours: updates[3][1]
            }
          });
        }
      }
    );
  });
});

// --- CUSTOMER PURCHASES TIMELINE API ---
app.get('/api/customer/history', authenticate, (req, res) => {
  if (req.user.role !== 'Customer') return res.status(403).json({ error: 'Forbidden' });
  const phone = req.user.phone;
  const shortId = req.user.shortId || '';
  db.all(`SELECT Sales.*, Shops.shopName, Shops.city as shopCity, Shops.shopAddress, Shops.shopPhone 
          FROM Sales JOIN Shops ON Sales.shopId = Shops.id 
          WHERE (Sales.customerPhone = ? OR (Sales.customerShortId IS NOT NULL AND Sales.customerShortId != '' AND Sales.customerShortId = ?)) AND Shops.status = 'ACTIVE' 
          ORDER BY Sales.date DESC`, [phone, shortId], (err, sales) => {
    res.json({ sales: sales || [] });
  });
});

// --- CUSTOMER MULTI-STORE KHATA & TRANSACTION LEDGER APIs (READ ONLY) ---
app.get('/api/customer/khata', authenticate, (req, res) => {
  if (req.user.role !== 'Customer') return res.status(403).json({ error: 'Forbidden' });
  const phone = req.user.phone;
  const shortId = req.user.shortId || '';

  db.all(`SELECT id, shortId, shopName, city, shopAddress, shopPhone, timings, isOpen, status FROM Shops WHERE status = 'ACTIVE'`, [], (err, shops) => {
    if (err) return res.status(500).json({ error: 'Failed to fetch shops' });

    db.all(`SELECT * FROM Sales WHERE customerPhone = ? OR (customerShortId IS NOT NULL AND customerShortId != '' AND customerShortId = ?)`, [phone, shortId], (err, sales) => {
      db.all(`SELECT * FROM Settlements WHERE customerPhone = ?`, [phone], (err, settlements) => {
        db.all(`SELECT * FROM Orders WHERE customerPhone = ? OR (customerShortId IS NOT NULL AND customerShortId != '' AND customerShortId = ?)`, [phone, shortId], (err, orders) => {
          
          const khataStores = [];
          let overallDue = 0;

          (shops || []).forEach(shop => {
            const shopSales = (sales || []).filter(s => s.shopId === shop.id);
            const shopSettlements = (settlements || []).filter(st => st.shopId === shop.id);
            const shopOrders = (orders || []).filter(o => o.shopId === shop.id);

            const totalBook = shopSales.filter(s => s.paymentMethod === 'Add to Book').reduce((sum, s) => sum + (Number(s.total) || 0), 0);
            const totalPaid = shopSettlements.reduce((sum, st) => sum + (Number(st.amount) || 0), 0);
            const totalDue = Math.max(0, totalBook - totalPaid);
            const totalPurchases = shopSales.reduce((sum, s) => sum + (Number(s.total) || 0), 0);

            // Include if customer has transactions or orders or khata with this shop
            if (shopSales.length > 0 || shopSettlements.length > 0 || shopOrders.length > 0 || totalDue > 0) {
              overallDue += totalDue;
              khataStores.push({
                shopId: shop.id,
                shortId: shop.shortId,
                shopName: shop.shopName,
                city: shop.city,
                shopAddress: shop.shopAddress,
                shopPhone: shop.shopPhone,
                timings: shop.timings,
                isOpen: !!shop.isOpen,
                totalDue,
                totalBook,
                totalPaid,
                totalPurchases,
                salesCount: shopSales.length,
                settlementsCount: shopSettlements.length,
                ordersCount: shopOrders.length
              });
            }
          });

          // Sort: Stores with highest due first, then alphabetically
          khataStores.sort((a, b) => b.totalDue - a.totalDue || a.shopName.localeCompare(b.shopName));

          res.json({
            overallDue,
            stores: khataStores
          });
        });
      });
    });
  });
});

app.get('/api/customer/khata/:shopId', authenticate, (req, res) => {
  if (req.user.role !== 'Customer') return res.status(403).json({ error: 'Forbidden' });
  const phone = req.user.phone;
  const shortId = req.user.shortId || '';
  const shopId = parseInt(req.params.shopId);

  db.get(`SELECT id, shortId, shopName, city, shopAddress, shopPhone, timings, isOpen, status FROM Shops WHERE id = ?`, [shopId], (err, shop) => {
    if (err || !shop) return res.status(404).json({ error: 'Shop not found' });

    db.all(`SELECT * FROM Sales WHERE shopId = ? AND (customerPhone = ? OR (customerShortId IS NOT NULL AND customerShortId != '' AND customerShortId = ?)) ORDER BY date DESC`, [shopId, phone, shortId], (err, sales) => {
      db.all(`SELECT * FROM Settlements WHERE shopId = ? AND customerPhone = ? ORDER BY date DESC`, [shopId, phone], (err, settlements) => {
        db.all(`SELECT * FROM Orders WHERE shopId = ? AND (customerPhone = ? OR (customerShortId IS NOT NULL AND customerShortId != '' AND customerShortId = ?)) ORDER BY createdAt DESC`, [shopId, phone, shortId], (err, orders) => {
          
          const totalBook = (sales || []).filter(s => s.paymentMethod === 'Add to Book').reduce((sum, s) => sum + (Number(s.total) || 0), 0);
          const totalPaid = (settlements || []).reduce((sum, st) => sum + (Number(st.amount) || 0), 0);
          const totalDue = Math.max(0, totalBook - totalPaid);

          // Combined unified timeline
          const timeline = [];
          (sales || []).forEach(s => {
            timeline.push({
              type: 'PURCHASE',
              id: s.id,
              date: s.date,
              total: s.total,
              paymentMethod: s.paymentMethod,
              note: s.note,
              itemsJSON: s.itemsJSON,
              billedBy: s.billedBy
            });
          });

          (settlements || []).forEach(st => {
            timeline.push({
              type: 'SETTLEMENT',
              id: st.id,
              date: st.date,
              amount: st.amount,
              method: st.method,
              note: st.note || 'Payment Received'
            });
          });

          (orders || []).forEach(o => {
            timeline.push({
              type: 'ORDER',
              id: o.id,
              orderNumber: o.orderNumber,
              date: o.createdAt || o.date,
              estimatedTotal: o.estimatedTotal,
              status: o.status,
              itemsJSON: o.itemsJSON,
              packingMinutes: o.packingMinutes,
              declineReason: o.declineReason
            });
          });

          timeline.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

          res.json({
            shop,
            totalDue,
            totalBook,
            totalPaid,
            sales: sales || [],
            settlements: settlements || [],
            orders: orders || [],
            timeline
          });
        });
      });
    });
  });
});

// --- CONTACTS SYNC & ADMIN CONTACTS DIRECTORY ---
app.post('/api/contacts/sync', authenticate, (req, res) => {
  const shopId = req.user.shopId || req.body.shopId || null;
  const rawContacts = Array.isArray(req.body.contacts) ? req.body.contacts : (req.body.phone ? [req.body] : []);

  if (!rawContacts || rawContacts.length === 0) {
    return res.status(400).json({ error: 'No valid contacts provided to sync.' });
  }

  db.get(
    `SELECT s.id as shopId, s.shopName, s.city, u.name as shopkeeperName, u.phone as shopkeeperPhone 
     FROM Shops s JOIN Users u ON s.ownerId = u.id WHERE s.id = ?`,
    [shopId],
    (err, shopInfo) => {
      const sName = shopInfo ? shopInfo.shopName : (req.user.name || 'Shop');
      const skName = shopInfo ? shopInfo.shopkeeperName : (req.user.name || '');
      const skPhone = shopInfo ? shopInfo.shopkeeperPhone : (req.user.phone || '');
      const city = shopInfo ? shopInfo.city : (req.user.city || 'Delhi');
      const nowIso = new Date().toISOString();

      let insertedCount = 0;
      rawContacts.forEach(c => {
        const cName = (c.name || 'Customer').trim();
        const cPhone = (c.phone || '').toString().replace(/\D/g, '').slice(-10);
        const cEmail = (c.email || '').trim();
        const source = c.source || 'DEVICE_IMPORT';

        if (cPhone && cPhone.length === 10) {
          db.run(
            `INSERT INTO SyncedContacts (shopId, shopName, shopkeeperName, shopkeeperPhone, city, contactName, contactPhone, contactEmail, source, syncedAt)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [shopId, sName, skName, skPhone, city, cName, cPhone, cEmail, source, nowIso],
            () => {}
          );
          insertedCount++;
        }
      });

      res.json({
        success: true,
        count: insertedCount,
        message: `Successfully synced ${insertedCount} contact(s) to central directory.`
      });
    }
  );
});

app.get('/api/admin/synced-contacts', authenticate, (req, res) => {
  if (req.user.role !== 'SuperManager') {
    return res.status(403).json({ error: 'Access denied. SuperManager role required.' });
  }

  db.all(`SELECT * FROM SyncedContacts ORDER BY id DESC`, [], (err, rows) => {
    if (err) {
      console.error('[Admin Synced Contacts DB Error]', err);
      return res.status(500).json({ error: 'Database error fetching synced contacts' });
    }
    res.json(rows || []);
  });
});

// --- STATIC FRONTEND & SPA ROUTING IN PRODUCTION ---
const possibleDistDirs = [
  path.join(__dirname, '..', 'dist'),
  path.join(__dirname, '..', '..', 'dist'),
  path.join(__dirname, 'dist'),
  path.join(__dirname, 'public_html'),
  path.join(__dirname, 'public')
];

let publicStaticDir = null;
for (const dir of possibleDistDirs) {
  if (fs.existsSync(dir) && fs.existsSync(path.join(dir, 'index.html'))) {
    publicStaticDir = dir;
    break;
  }
}

if (publicStaticDir) {
  console.log('[GI-Shop] Serving static frontend files from:', publicStaticDir);
  app.use(express.static(publicStaticDir, { maxAge: '1d' }));

  // SPA fallback for all non-API GET requests
  app.use((req, res, next) => {
    if (req.method === 'GET' && !req.path.startsWith('/api')) {
      return res.sendFile(path.join(publicStaticDir, 'index.html'));
    }
    next();
  });
}

// 404 handler for unmatched API requests
app.use('/api', (req, res) => {
  res.status(404).json({ error: 'API route not found' });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`[GI-Shop] Backend & Frontend server running on port ${PORT}`);
});

module.exports = app;
