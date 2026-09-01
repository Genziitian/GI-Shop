const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

const JWT_SECRET = 'super-secret-key-shop-ledger';

const db = new sqlite3.Database(path.join(__dirname, 'database.sqlite'), (err) => {
  if (err) console.error('DB Error:', err);
  else console.log('Connected to SQLite DB');
});

// Predefined Cities
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

// Initialize DB schema and seed default data
db.serialize(async () => {
  db.run(`CREATE TABLE IF NOT EXISTS Cities (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    status TEXT DEFAULT 'ACTIVE',
    createdAt TEXT
  )`);

  const defaultCities = ['Delhi', 'Mumbai', 'Bengaluru', 'Hyderabad', 'Chennai', 'Kolkata', 'Jaipur', 'Ahmedabad', 'Pune', 'Lucknow', 'Chandigarh', 'Indore'];
  defaultCities.forEach(cName => {
    db.run(`INSERT OR IGNORE INTO Cities (name, status, createdAt) VALUES (?, 'ACTIVE', ?)`, [cName, new Date().toISOString()]);
  });

  db.run(`CREATE TABLE IF NOT EXISTS Users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    shortId TEXT UNIQUE,
    name TEXT,
    email TEXT UNIQUE,
    phone TEXT UNIQUE,
    password TEXT,
    pin TEXT DEFAULT '1234',
    role TEXT, -- 'Customer', 'Shopkeeper', 'SuperManager'
    city TEXT,
    address TEXT,
    status TEXT DEFAULT 'ACTIVE', -- 'ACTIVE', 'TERMINATED'
    createdAt TEXT
  )`);

  db.run(`ALTER TABLE Users ADD COLUMN pin TEXT DEFAULT '1234'`, () => {});

  db.run(`CREATE TABLE IF NOT EXISTS Shops (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    shortId TEXT UNIQUE,
    ownerId INTEGER,
    shopName TEXT,
    shopPhone TEXT,
    city TEXT,
    shopAddress TEXT,
    timings TEXT,
    isOpen INTEGER DEFAULT 1, -- 1: Open, 0: Closed
    status TEXT DEFAULT 'ACTIVE', -- 'ACTIVE', 'TERMINATED'
    createdAt TEXT
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS ShopStaff (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    shopId INTEGER,
    userId INTEGER,
    userShortId TEXT,
    userName TEXT,
    userPhone TEXT,
    role TEXT DEFAULT 'Cashier',
    status TEXT DEFAULT 'INVITED', -- 'INVITED', 'ACCEPTED', 'DECLINED'
    invitedAt TEXT,
    respondedAt TEXT
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS Items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    shopId INTEGER,
    name TEXT,
    price REAL,
    unit TEXT
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS Orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    orderNumber TEXT UNIQUE,
    shopId INTEGER,
    customerId INTEGER,
    customerShortId TEXT,
    customerName TEXT,
    customerPhone TEXT,
    customerAddress TEXT,
    itemsJSON TEXT,
    estimatedTotal REAL,
    status TEXT DEFAULT 'PENDING', -- 'PENDING', 'ACCEPTED', 'PACKING', 'READY', 'DECLINED', 'COMPLETED', 'AUTO_CANCELLED_EXPIRED'
    packingMinutes INTEGER DEFAULT 0,
    acceptedAt TEXT,
    declineReason TEXT,
    cancelledAt TEXT,
    collectionStatus TEXT,
    collectedAt TEXT,
    createdAt TEXT
  )`);

  db.run(`ALTER TABLE Orders ADD COLUMN cancelledAt TEXT`, () => {});
  db.run(`ALTER TABLE Orders ADD COLUMN collectionStatus TEXT`, () => {});
  db.run(`ALTER TABLE Orders ADD COLUMN collectedAt TEXT`, () => {});

  db.run(`CREATE TABLE IF NOT EXISTS ShopBlockedCustomers (
    shopId INTEGER,
    customerPhone TEXT,
    reason TEXT,
    blockedAt TEXT,
    PRIMARY KEY(shopId, customerPhone)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS Sales (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    shopId INTEGER,
    customerPhone TEXT,
    customerShortId TEXT,
    itemsJSON TEXT,
    subtotal REAL,
    discount REAL,
    total REAL,
    paymentMethod TEXT,
    note TEXT, -- Max 20 chars note
    cashierName TEXT,
    date TEXT
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS Settlements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    shopId INTEGER,
    customerPhone TEXT,
    amount REAL,
    method TEXT,
    date TEXT
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS ShopCustomers (
    shopId INTEGER,
    customerPhone TEXT,
    name TEXT,
    address TEXT,
    status TEXT DEFAULT 'ACTIVE',
    PRIMARY KEY(shopId, customerPhone)
  )`);

  // Seed default demo accounts
  const passwordHash = await bcrypt.hash('password123', 10);
  const now = new Date().toISOString();

  // 1. Super Manager
  db.get(`SELECT id FROM Users WHERE email = 'admin@test.com'`, (err, user) => {
    if (!user) {
      db.run(`INSERT INTO Users (shortId, name, email, phone, password, role, city, address, status, createdAt)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        ['adm01', 'Platform Administrator', 'admin@test.com', '9999999999', passwordHash, 'SuperManager', 'Delhi', 'HQ Central Tower', 'ACTIVE', now]);
    }
  });

  // 2. Demo Shopkeeper & Shop
  db.get(`SELECT id FROM Users WHERE email = 'shop@test.com'`, (err, user) => {
    if (!user) {
      db.run(`INSERT INTO Users (shortId, name, email, phone, password, role, city, address, status, createdAt)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        ['ram84', 'Ramesh Gupta', 'shop@test.com', '9876543210', passwordHash, 'Shopkeeper', 'Delhi', 'Shop #4, Main Market, City Center', 'ACTIVE', now], function(err) {
          if (!err) {
            const shopkeeperId = this.lastID;
            db.run(`INSERT INTO Shops (shortId, ownerId, shopName, shopPhone, city, shopAddress, timings, isOpen, status, createdAt)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              ['shp49', shopkeeperId, 'Gupta Kirana & General Store', '9876543210', 'Delhi', 'Shop #4, Main Market, City Center', '08:00 AM - 10:00 PM', 1, 'ACTIVE', now], function(err) {
                const shopId = this.lastID;
                console.log('Seeded Gupta Kirana Shop with ID:', shopId);

                // Seed sample products
                const sampleItems = [
                  ['Milk (Amul Taaza)', 65.0, 'Litre'],
                  ['Rice (Basmati)', 75.0, 'Kilo'],
                  ['Kurkure Masala Munch', 20.0, 'Piece'],
                  ['Sugar (Premium)', 44.0, 'Kilo'],
                  ['Atta (Aashirvaad 5kg)', 240.0, 'Piece'],
                  ['Mustard Oil (Fortune)', 160.0, 'Litre'],
                  ['Maggie 2-Min Noodles', 14.0, 'Piece'],
                  ['Tata Tea Gold (250g)', 140.0, 'Piece'],
                  ['Toor Dal', 160.0, 'Kilo']
                ];
                sampleItems.forEach(([name, price, unit]) => {
                  db.run(`INSERT INTO Items (shopId, name, price, unit) VALUES (?, ?, ?, ?)`, [shopId, name, price, unit]);
                });

                // Pre-enroll Customers
                db.run(`INSERT OR IGNORE INTO ShopCustomers (shopId, customerPhone, name, address, status) VALUES (?, ?, ?, ?, 'ACTIVE')`,
                  [shopId, '9123456789', 'Amit Sharma', 'Flat 402, Green Valley Apts']);
                db.run(`INSERT OR IGNORE INTO ShopCustomers (shopId, customerPhone, name, address, status) VALUES (?, ?, ?, ?, 'ACTIVE')`,
                  [shopId, '9811223344', 'Priya Verma', 'B-12, Sector 4']);

                // Seed sales & ledger
                const sampleSaleItems = JSON.stringify([
                  { item: { id: 1, name: 'Milk (Amul Taaza)', price: 65, unit: 'Litre' }, qty: 2, rate: 65, amount: 130 },
                  { item: { id: 2, name: 'Rice (Basmati)', price: 75, unit: 'Kilo' }, qty: 1.5, rate: 75, amount: 112.5 }
                ]);
                db.run(`INSERT INTO Sales (shopId, customerPhone, customerShortId, itemsJSON, subtotal, discount, total, paymentMethod, note, cashierName, date)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                  [shopId, '9123456789', 'ayu32', sampleSaleItems, 242.5, 2.5, 240.0, 'Add to Book', 'Packed well', 'Ramesh Gupta', new Date(Date.now() - 86400000 * 2).toISOString()]);

                db.run(`INSERT INTO Settlements (shopId, customerPhone, amount, method, date) VALUES (?, ?, ?, ?, ?)`,
                  [shopId, '9123456789', 100.0, 'UPI', new Date(Date.now() - 86400000).toISOString()]);

                const priyaSaleItems = JSON.stringify([
                  { item: { id: 5, name: 'Atta (Aashirvaad 5kg)', price: 240, unit: 'Piece' }, qty: 1, rate: 240, amount: 240 },
                  { item: { id: 6, name: 'Mustard Oil (Fortune)', price: 160, unit: 'Litre' }, qty: 1, rate: 160, amount: 160 }
                ]);
                db.run(`INSERT INTO Sales (shopId, customerPhone, customerShortId, itemsJSON, subtotal, discount, total, paymentMethod, note, cashierName, date)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                  [shopId, '9811223344', 'pri12', priyaSaleItems, 400.0, 0.0, 400.0, 'Add to Book', 'First order', 'Ramesh Gupta', new Date().toISOString()]);
            });
          }
        });
    }
  });

  // 3. Second Shop in Delhi (for discovery demo)
  db.get(`SELECT id FROM Users WHERE email = 'shop2@test.com'`, (err, user) => {
    if (!user) {
      db.run(`INSERT INTO Users (shortId, name, email, phone, password, role, city, address, status, createdAt)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        ['raj92', 'Rajesh Sharma', 'shop2@test.com', '9877771122', passwordHash, 'Shopkeeper', 'Delhi', 'Plot 18, Connaught Place', 'ACTIVE', now], function(err) {
          if (!err) {
            const shopkeeperId = this.lastID;
            db.run(`INSERT INTO Shops (shortId, ownerId, shopName, shopPhone, city, shopAddress, timings, isOpen, status, createdAt)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              ['shp92', shopkeeperId, 'Rajesh Organic & Supermart', '9877771122', 'Delhi', 'Plot 18, Connaught Place', '09:00 AM - 11:00 PM', 1, 'ACTIVE', now], function(err) {
                const sId = this.lastID;
                db.run(`INSERT INTO Items (shopId, name, price, unit) VALUES (?, ?, ?, ?)`, [sId, 'Organic Honey (500g)', 280.0, 'Piece']);
                db.run(`INSERT INTO Items (shopId, name, price, unit) VALUES (?, ?, ?, ?)`, [sId, 'Almonds (California)', 450.0, 'Kilo']);
                db.run(`INSERT INTO Items (shopId, name, price, unit) VALUES (?, ?, ?, ?)`, [sId, 'Cold Pressed Coconut Oil', 220.0, 'Litre']);
            });
          }
        });
    }
  });

  // 4. Demo Customer
  db.get(`SELECT id FROM Users WHERE email = 'customer@test.com'`, (err, user) => {
    if (!user) {
      db.run(`INSERT INTO Users (shortId, name, email, phone, password, role, city, address, status, createdAt)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        ['ayu32', 'Amit Sharma', 'customer@test.com', '9123456789', passwordHash, 'Customer', 'Delhi', 'Flat 402, Green Valley Apts', 'ACTIVE', now]);
    }
  });

  // 5. Demo Customer 2 (who can be invited as Cashier)
  db.get(`SELECT id FROM Users WHERE email = 'rahul@test.com'`, (err, user) => {
    if (!user) {
      db.run(`INSERT INTO Users (shortId, name, email, phone, password, role, city, address, status, createdAt)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        ['rah55', 'Rahul Verma', 'rahul@test.com', '9888844444', passwordHash, 'Customer', 'Delhi', 'House 55, Model Town', 'ACTIVE', now]);
    }
  });

  // Auto-heal any existing orders with 0 or missing estimatedTotal
  db.all(`SELECT id, itemsJSON, estimatedTotal FROM Orders WHERE estimatedTotal IS NULL OR estimatedTotal = 0`, (err, rows) => {
    if (!err && rows) {
      rows.forEach(r => {
        try {
          const items = JSON.parse(r.itemsJSON || '[]');
          const sum = items.reduce((acc, it) => acc + (it.amount || (it.rate * it.qty) || ((it.item?.price || 0) * (it.qty || 1)) || 0), 0);
          if (sum > 0) {
            db.run(`UPDATE Orders SET estimatedTotal = ? WHERE id = ?`, [sum, r.id]);
          }
        } catch (e) {}
      });
    }
  });
});

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

app.post('/api/login', (req, res) => {
  const { email, password } = req.body;
  db.get(`SELECT * FROM Users WHERE email = ? OR phone = ? OR shortId = ?`, [email, email, email], async (err, user) => {
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
        const token = jwt.sign({ id: user.id, role: user.role, shopId: shop?.id, staffRole: 'Owner' }, JWT_SECRET);
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
        }, JWT_SECRET);
        res.json({ token, user, staffRole: staffRole || null });
      });
    }
  });
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
          res.json({ success: true, message: `Invite re-sent to ${customer.name} (${customer.shortId})` });
        });
      } else {
        db.run(`INSERT INTO ShopStaff (shopId, userId, userShortId, userName, userPhone, role, status, invitedAt)
                VALUES (?, ?, ?, ?, ?, 'Cashier', 'INVITED', ?)`,
          [req.user.shopId, customer.id, customer.shortId, customer.name, customer.phone, now], function() {
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
            res.json({ success: true, orderId: this.lastID, orderNumber, message: 'Order sent to shopkeeper!' });
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

    db.run(`UPDATE Orders SET status = 'PACKING', packingMinutes = ?, acceptedAt = ? WHERE id = ? AND shopId = ?`,
      [parseInt(packingMinutes) || 15, now.toISOString(), req.params.id, shopId], () => res.json({ success: true, status: 'PACKING' }));
  });
});

app.post('/api/shop/orders/:id/decline', authenticate, (req, res) => {
  const shopId = req.user.shopId;
  const { reason } = req.body;
  db.run(`UPDATE Orders SET status = 'DECLINED', declineReason = ? WHERE id = ? AND shopId = ?`,
    [reason || 'Item unavailable', req.params.id, shopId], () => res.json({ success: true, status: 'DECLINED' }));
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

app.listen(3001, () => console.log('Backend server running with full feature set on port 3001'));
