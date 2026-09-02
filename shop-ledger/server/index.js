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
  const { city, q } = req.query;
  let query = `
    SELECT Items.id, Items.name, Items.price, Items.unit,
           Shops.id as shopId, Shops.shortId as shopShortId, Shops.shopName, Shops.shopAddress, Shops.shopPhone, Shops.timings, Shops.isOpen, Shops.city
    FROM Items 
    JOIN Shops ON Items.shopId = Shops.id 
    WHERE Shops.status = 'ACTIVE'
  `;
  const params = [];
  if (city) {
    query += ` AND Shops.city = ?`;
    params.push(city);
  }
  if (q) {
    query += ` AND Items.name LIKE ?`;
    params.push(`%${q}%`);
  }
  query += ` ORDER BY Items.name ASC, Items.price ASC`;

  db.all(query, params, (err, rows) => {
    if (err) return res.status(500).json({ error: 'Failed to compare items' });
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

  const userPin = pin && /^\d{4}$/.test(pin.toString().trim()) ? pin.toString().trim() : '1234';

  try {
    const hash = await bcrypt.hash(password, 10);
    const userShortId = generateShortId(name.slice(0, 3));
    const now = new Date().toISOString();

    db.run(`INSERT INTO Users (shortId, name, email, phone, password, pin, role, city, address, status, createdAt)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE', ?)`,
      [userShortId, name, email, phone, hash, userPin, role, city || 'Delhi', address || '', now], function(err) {
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
  
  db.run(`UPDATE Users SET name = ?, phone = ?, city = ?, address = ? WHERE id = ?`,
    [name.trim(), phone.trim(), (city || 'Delhi').trim(), (address || '').trim(), req.user.id], function(err) {
      if (err) return res.status(500).json({ error: 'Failed to update profile' });
      db.get(`SELECT id, shortId, name, email, phone, role, city, address, pin FROM Users WHERE id = ?`, [req.user.id], (err, updatedUser) => {
        res.json({ success: true, message: 'Profile updated successfully!', user: updatedUser });
      });
    });
});

app.post('/api/user/verify-pin', authenticate, (req, res) => {
  const { pin } = req.body;
  if (!pin) return res.status(400).json({ error: 'PIN is required' });
  db.get(`SELECT pin FROM Users WHERE id = ?`, [req.user.id], (err, user) => {
    if (err || !user) return res.status(404).json({ error: 'User not found' });
    const currentPin = user.pin || '1234';
    if (currentPin === pin.toString().trim()) {
      return res.json({ valid: true });
    }
    return res.status(400).json({ error: 'Incorrect 4-digit PIN' });
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

  db.get(`SELECT id, password FROM Users WHERE id = ?`, [req.user.id], async (err, user) => {
    if (err || !user) return res.status(404).json({ error: 'User not found' });

    // If user already has a password set, verify currentPassword
    if (user.password) {
      if (!currentPassword) {
        return res.status(400).json({ error: 'Current password is required to change password.' });
      }
      const valid = await bcrypt.compare(currentPassword, user.password);
      if (!valid) {
        return res.status(400).json({ error: 'Current password is incorrect.' });
      }
    }

    try {
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      db.run(`UPDATE Users SET password = ? WHERE id = ?`, [hashedPassword, req.user.id], (err) => {
        if (err) return res.status(500).json({ error: 'Failed to update password' });
        res.json({ success: true, message: 'Password updated successfully! You can now log in with email and password.' });
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
      if (err) return res.status(500).json({ error: 'Failed to save passkey credential' });
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
  if (!email || !password) return res.status(400).json({ error: 'Email/Short ID and password are required' });
  const identifier = email.trim();
  db.get(`SELECT * FROM Users WHERE email = ? OR shortId = ?`, [identifier, identifier], async (err, user) => {
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
  db.get(`SELECT id, shortId, name, email, phone, role, city, address, status FROM Users WHERE id = ?`, [req.user.id], (err, user) => {
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
  const { shopName, shopPhone, city, shopAddress, timings } = req.body;
  db.run(`UPDATE Shops SET shopName = ?, shopPhone = ?, city = ?, shopAddress = ?, timings = ? WHERE id = ?`,
    [shopName, shopPhone, city, shopAddress, timings, req.user.shopId], function(err) {
      if (err) return res.status(500).json({ error: 'Failed to update shop details' });
      res.json({ success: true, message: 'Shop details updated successfully!' });
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

        db.run(`INSERT INTO Orders (orderNumber, shopId, customerId, customerShortId, customerName, customerPhone, customerAddress, itemsJSON, estimatedTotal, status, createdAt)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING', ?)`,
          [orderNumber, shopId, req.user.id, cust.shortId, cust.name, cust.phone, cust.address || '', JSON.stringify(items), calculatedTotal, now], function(err) {
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
    db.all(`SELECT * FROM Orders WHERE shopId = ? ORDER BY id DESC`, [shopId], (err, rows) => res.json(rows || []));
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
    db.run(`UPDATE Orders SET status = 'READY' WHERE id = ? AND shopId = ?`, [req.params.id, shopId], () => {
      if (order.customerId) {
        sendPushNotification(order.customerId, {
          title: '✅ Order Ready for Pickup!',
          body: `Your grocery order #${order.orderNumber} is packed and ready for pickup at the store!`,
          data: { type: 'ORDER_READY', orderId: String(order.id), orderNumber: order.orderNumber }
        });
      }
      res.json({ success: true, status: 'READY' });
    });
  });
});

// --- CUSTOMER MANAGEMENT & BLOCKING ---
app.get('/api/shop/customers', authenticate, (req, res) => {
  const shopId = req.user.shopId;
  db.all(`SELECT ShopCustomers.*, Users.shortId, 
          (SELECT COUNT(*) FROM ShopBlockedCustomers WHERE ShopBlockedCustomers.shopId = ? AND ShopBlockedCustomers.customerPhone = ShopCustomers.customerPhone) as isBlocked
          FROM ShopCustomers 
          LEFT JOIN Users ON ShopCustomers.customerPhone = Users.phone
          WHERE ShopCustomers.shopId = ? AND ShopCustomers.status = 'ACTIVE'`, [shopId, shopId], (err, rows) => res.json(rows || []));
});

app.post('/api/shop/customers', authenticate, (req, res) => {
  const shopId = req.user.shopId;
  const { phone, name, address } = req.body;
  db.run(`INSERT INTO ShopCustomers (shopId, customerPhone, name, address, status) VALUES (?, ?, ?, ?, 'ACTIVE')
          ON CONFLICT(shopId, customerPhone) DO UPDATE SET status='ACTIVE', name=?, address=?`,
    [shopId, phone, name, address, name, address], () => res.json({ success: true }));
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
  const { customerPhone, customerShortId, itemsJSON, subtotal, discount, total, paymentMethod, note } = req.body;
  const date = new Date().toISOString();
  const cashierName = req.user.role === 'Shopkeeper' ? 'Shopkeeper' : (req.user.staffRole || 'Cashier');

  // Verify 20-char note limit
  const sanitizedNote = (note || '').slice(0, 20);

  db.run(`INSERT INTO Sales (shopId, customerPhone, customerShortId, itemsJSON, subtotal, discount, total, paymentMethod, note, cashierName, date)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [shopId, customerPhone || '', customerShortId || '', itemsJSON, subtotal, discount, total, paymentMethod, sanitizedNote, cashierName, date], function(err) {
      if (err) return res.status(500).json({ error: 'Failed to record sale' });
      
      if (paymentMethod === 'Add to Book' && customerPhone) {
        db.run(`INSERT OR IGNORE INTO ShopCustomers (shopId, customerPhone, name, address, status) VALUES (?, ?, ?, ?, 'ACTIVE')`, 
          [shopId, customerPhone, 'Walk-in Customer', '']);
      }
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
      res.json({ sales: sales || [], settlements: settlements || [] });
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
    
    // Compute Financial Metrics
    const totalSales = sales.reduce((sum, s) => sum + (s.total || 0), 0);
    const cashSales = sales.filter(s => s.paymentMethod === 'Cash').reduce((sum, s) => sum + (s.total || 0), 0);
    const onlineSales = sales.filter(s => s.paymentMethod === 'Online' || s.paymentMethod === 'UPI').reduce((sum, s) => sum + (s.total || 0), 0);
    const khataSales = sales.filter(s => s.paymentMethod === 'Add to Book').reduce((sum, s) => sum + (s.total || 0), 0);

    res.json({
      sales: sales || [],
      analytics: {
        totalSales,
        cashSales,
        onlineSales,
        khataSales,
        count: sales.length,
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

// --- CUSTOMER PURCHASES TIMELINE API ---
app.get('/api/customer/history', authenticate, (req, res) => {
  if (req.user.role !== 'Customer') return res.status(403).json({ error: 'Forbidden' });
  const phone = req.user.phone;
  db.all(`SELECT Sales.*, Shops.shopName, Shops.city as shopCity, Shops.shopAddress, Shops.shopPhone 
          FROM Sales JOIN Shops ON Sales.shopId = Shops.id 
          WHERE Sales.customerPhone = ? AND Shops.status = 'ACTIVE' 
          ORDER BY Sales.date DESC`, [phone], (err, sales) => {
    res.json({ sales: sales || [] });
  });
});

// --- CUSTOMER MULTI-STORE KHATA & TRANSACTION LEDGER APIs (READ ONLY) ---
app.get('/api/customer/khata', authenticate, (req, res) => {
  if (req.user.role !== 'Customer') return res.status(403).json({ error: 'Forbidden' });
  const phone = req.user.phone;

  db.all(`SELECT id, shortId, shopName, city, shopAddress, shopPhone, timings, isOpen, status FROM Shops WHERE status = 'ACTIVE'`, [], (err, shops) => {
    if (err) return res.status(500).json({ error: 'Failed to fetch shops' });

    db.all(`SELECT * FROM Sales WHERE customerPhone = ?`, [phone], (err, sales) => {
      db.all(`SELECT * FROM Settlements WHERE customerPhone = ?`, [phone], (err, settlements) => {
        db.all(`SELECT * FROM Orders WHERE customerPhone = ?`, [phone], (err, orders) => {
          
          const khataStores = [];
          let overallDue = 0;

          (shops || []).forEach(shop => {
            const shopSales = (sales || []).filter(s => s.shopId === shop.id);
            const shopSettlements = (settlements || []).filter(st => st.shopId === shop.id);
            const shopOrders = (orders || []).filter(o => o.shopId === shop.id);

            const totalBook = shopSales.filter(s => s.paymentMethod === 'Add to Book').reduce((sum, s) => sum + (s.total || 0), 0);
            const totalPaid = shopSettlements.reduce((sum, st) => sum + (st.amount || 0), 0);
            const totalDue = Math.max(0, totalBook - totalPaid);
            const totalPurchases = shopSales.reduce((sum, s) => sum + (s.total || 0), 0);

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
  const shopId = parseInt(req.params.shopId);

  db.get(`SELECT id, shortId, shopName, city, shopAddress, shopPhone, timings, isOpen, status FROM Shops WHERE id = ?`, [shopId], (err, shop) => {
    if (err || !shop) return res.status(404).json({ error: 'Shop not found' });

    db.all(`SELECT * FROM Sales WHERE shopId = ? AND customerPhone = ? ORDER BY date DESC`, [shopId, phone], (err, sales) => {
      db.all(`SELECT * FROM Settlements WHERE shopId = ? AND customerPhone = ? ORDER BY date DESC`, [shopId, phone], (err, settlements) => {
        db.all(`SELECT * FROM Orders WHERE shopId = ? AND customerPhone = ? ORDER BY createdAt DESC`, [shopId, phone], (err, orders) => {
          
          const totalBook = (sales || []).filter(s => s.paymentMethod === 'Add to Book').reduce((sum, s) => sum + (s.total || 0), 0);
          const totalPaid = (settlements || []).reduce((sum, st) => sum + (st.amount || 0), 0);
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
