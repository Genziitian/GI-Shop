const path = require('path');
const fs = require('fs');

// Determine Database Mode: MySQL or SQLite
const DB_TYPE = (process.env.DB_TYPE || (process.env.DB_HOST ? 'mysql' : 'sqlite')).toLowerCase();

let dbInstance = null;

function generateShortId(prefix = 'usr') {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let rand = '';
  for (let i = 0; i < 3; i++) {
    rand += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  const cleanPrefix = (prefix || 'usr').toLowerCase().replace(/[^a-z]/g, '').slice(0, 3) || 'usr';
  return `${cleanPrefix}${rand}${Math.floor(10 + Math.random() * 90)}`;
}

if (DB_TYPE === 'mysql') {
  const mysql = require('mysql2');

  const pool = mysql.createPool({
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'u404320264_gishop',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 10000,
    charset: 'utf8mb4'
  });

  // Test connection
  pool.getConnection((err, conn) => {
    if (err) {
      console.error('❌ [GI-Shop DB] MySQL connection error:', err.message);
      console.error('👉 Please check DB_HOST, DB_USER, DB_PASSWORD, DB_NAME in your environment variables.');
    } else {
      console.log(`✅ [GI-Shop DB] Connected to MySQL Database "${process.env.DB_NAME || 'u404320264_gishop'}" on ${process.env.DB_HOST || '127.0.0.1'}`);
      conn.release();
    }
  });

  function translateSql(sql) {
    let s = sql;
    // Replace SQLite INSERT OR IGNORE with MySQL INSERT IGNORE
    s = s.replace(/INSERT\s+OR\s+IGNORE\s+INTO/gi, 'INSERT IGNORE INTO');
    // Replace SQLite INSERT OR REPLACE with MySQL REPLACE INTO
    s = s.replace(/INSERT\s+OR\s+REPLACE\s+INTO/gi, 'REPLACE INTO');
    return s;
  }

  function normalizeParams(params) {
    if (params === undefined || params === null) return [];
    if (!Array.isArray(params)) return [params];
    return params.map(p => (p === undefined ? null : p));
  }

  dbInstance = {
    isMySQL: true,
    pool,

    get(sql, params, cb) {
      if (typeof params === 'function') {
        cb = params;
        params = [];
      }
      const finalSql = translateSql(sql);
      const finalParams = normalizeParams(params);

      pool.query(finalSql, finalParams, (err, rows) => {
        if (err) return cb ? cb(err) : null;
        const row = Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
        if (cb) cb(null, row);
      });
    },

    all(sql, params, cb) {
      if (typeof params === 'function') {
        cb = params;
        params = [];
      }
      const finalSql = translateSql(sql);
      const finalParams = normalizeParams(params);

      pool.query(finalSql, finalParams, (err, rows) => {
        if (err) return cb ? cb(err) : null;
        if (cb) cb(null, rows || []);
      });
    },

    run(sql, params, cb) {
      if (typeof params === 'function') {
        cb = params;
        params = [];
      }
      const finalSql = translateSql(sql);
      const finalParams = normalizeParams(params);

      pool.query(finalSql, finalParams, (err, result) => {
        if (err) return cb ? cb(err) : null;
        const context = {
          lastID: result ? result.insertId : null,
          changes: result ? result.affectedRows : 0
        };
        if (cb) cb.call(context, null);
      });
    },

    serialize(fn) {
      if (typeof fn === 'function') fn();
    }
  };

  // Auto-initialize MySQL tables
  (async () => {
    const tableQueries = [
      `CREATE TABLE IF NOT EXISTS Cities (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) UNIQUE NOT NULL,
        status VARCHAR(20) DEFAULT 'ACTIVE',
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`,

      `CREATE TABLE IF NOT EXISTS Users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        shortId VARCHAR(50) UNIQUE,
        name VARCHAR(255),
        email VARCHAR(255) UNIQUE,
        phone VARCHAR(20) UNIQUE,
        password VARCHAR(255),
        pin VARCHAR(10) DEFAULT '1234',
        role VARCHAR(50),
        city VARCHAR(100),
        address TEXT,
        status VARCHAR(20) DEFAULT 'ACTIVE',
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`,

      `CREATE TABLE IF NOT EXISTS Shops (
        id INT AUTO_INCREMENT PRIMARY KEY,
        shortId VARCHAR(50) UNIQUE,
        ownerId INT,
        shopName VARCHAR(255),
        shopPhone VARCHAR(20),
        city VARCHAR(100),
        shopAddress TEXT,
        timings VARCHAR(100),
        isOpen TINYINT(1) DEFAULT 1,
        status VARCHAR(20) DEFAULT 'ACTIVE',
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`,

      `CREATE TABLE IF NOT EXISTS ShopStaff (
        id INT AUTO_INCREMENT PRIMARY KEY,
        shopId INT,
        userId INT,
        userShortId VARCHAR(50),
        userName VARCHAR(255),
        userPhone VARCHAR(20),
        role VARCHAR(50) DEFAULT 'Cashier',
        status VARCHAR(20) DEFAULT 'INVITED',
        invitedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        respondedAt DATETIME NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`,

      `CREATE TABLE IF NOT EXISTS Items (
        id INT AUTO_INCREMENT PRIMARY KEY,
        shopId INT,
        name VARCHAR(255),
        price DECIMAL(10,2),
        unit VARCHAR(50)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`,

      `CREATE TABLE IF NOT EXISTS Orders (
        id INT AUTO_INCREMENT PRIMARY KEY,
        orderNumber VARCHAR(50) UNIQUE,
        shopId INT,
        customerId INT,
        customerShortId VARCHAR(50),
        customerName VARCHAR(255),
        customerPhone VARCHAR(20),
        customerAddress TEXT,
        itemsJSON LONGTEXT,
        estimatedTotal DECIMAL(10,2) DEFAULT 0.00,
        status VARCHAR(50) DEFAULT 'PENDING',
        packingMinutes INT DEFAULT 0,
        acceptedAt DATETIME NULL,
        declineReason TEXT,
        cancelledAt DATETIME NULL,
        collectionStatus VARCHAR(50) NULL,
        collectedAt DATETIME NULL,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`,

      `CREATE TABLE IF NOT EXISTS ShopBlockedCustomers (
        shopId INT,
        customerPhone VARCHAR(20),
        reason TEXT,
        blockedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY(shopId, customerPhone)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`,

      `CREATE TABLE IF NOT EXISTS Sales (
        id INT AUTO_INCREMENT PRIMARY KEY,
        shopId INT,
        customerPhone VARCHAR(20),
        customerShortId VARCHAR(50),
        itemsJSON LONGTEXT,
        subtotal DECIMAL(10,2),
        discount DECIMAL(10,2) DEFAULT 0.00,
        total DECIMAL(10,2),
        paymentMethod VARCHAR(50),
        note VARCHAR(255),
        cashierName VARCHAR(255),
        date DATETIME DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`,

      `CREATE TABLE IF NOT EXISTS Settlements (
        id INT AUTO_INCREMENT PRIMARY KEY,
        shopId INT,
        customerPhone VARCHAR(20),
        amount DECIMAL(10,2),
        method VARCHAR(50),
        date DATETIME DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`,

      `CREATE TABLE IF NOT EXISTS ShopCustomers (
        shopId INT,
        customerPhone VARCHAR(20),
        name VARCHAR(255),
        address TEXT,
        status VARCHAR(20) DEFAULT 'ACTIVE',
        PRIMARY KEY(shopId, customerPhone)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`,

      `CREATE TABLE IF NOT EXISTS UserFCMTokens (
        id INT AUTO_INCREMENT PRIMARY KEY,
        userId INT,
        token VARCHAR(500) NOT NULL,
        platform VARCHAR(50) DEFAULT 'web',
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY unique_user_token (userId, token(255))
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`,

      `CREATE TABLE IF NOT EXISTS UserPasskeys (
        id VARCHAR(255) PRIMARY KEY,
        userId INT NOT NULL,
        credentialId VARCHAR(255) UNIQUE NOT NULL,
        publicKey TEXT NOT NULL,
        deviceLabel VARCHAR(255),
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_passkeys_userId (userId)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`,

      `CREATE TABLE IF NOT EXISTS PlatformSettings (
        settingKey VARCHAR(255) PRIMARY KEY,
        settingValue TEXT
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`
    ];

    for (const q of tableQueries) {
      pool.query(q, (err) => {
        if (err && !err.message.includes('already exists')) {
          console.warn('[MySQL Schema Warning]', err.message);
        }
      });
    }

    // MySQL column migrations
    pool.query(`ALTER TABLE Users ADD COLUMN hasPasswordSet TINYINT(1) DEFAULT 0`, () => {});

    // Seed baseline cities
    const defaultCities = ['Delhi', 'Mumbai', 'Bengaluru', 'Hyderabad', 'Chennai', 'Kolkata', 'Jaipur', 'Ahmedabad', 'Pune', 'Lucknow', 'Chandigarh', 'Indore'];
    defaultCities.forEach(cName => {
      pool.query(`INSERT IGNORE INTO Cities (name, status) VALUES (?, 'ACTIVE')`, [cName], () => {});
    });

    // Optional Super Administrator Bootstrap
    const superAdminEmail = process.env.SUPERADMIN_EMAIL;
    if (superAdminEmail) {
      const bcrypt = require('bcrypt');
      pool.query(`SELECT id FROM Users WHERE email = ? OR role = 'SuperManager'`, [superAdminEmail], async (err, rows) => {
        if (!err && (!rows || rows.length === 0)) {
          try {
            const superAdminPassword = process.env.SUPERADMIN_PASSWORD || 'adminPassword123!';
            const hash = await bcrypt.hash(superAdminPassword, 10);
            const shortId = generateShortId('adm');
            const name = process.env.SUPERADMIN_NAME || 'Platform Administrator';
            const phone = process.env.SUPERADMIN_PHONE || '9999999999';
            const pin = process.env.SUPERADMIN_PIN || '1234';
            const city = process.env.SUPERADMIN_CITY || 'Delhi';

            pool.query(
              `INSERT INTO Users (shortId, name, email, phone, password, pin, role, city, address, status, createdAt)
               VALUES (?, ?, ?, ?, ?, ?, 'SuperManager', ?, 'HQ Central', 'ACTIVE', NOW())`,
              [shortId, name, superAdminEmail, phone, hash, pin, city],
              (insertErr) => {
                if (insertErr) console.error('[GI-Shop DB] Failed to bootstrap SuperAdmin:', insertErr.message);
                else console.log(`✅ [GI-Shop DB] Initial SuperManager bootstrapped into MySQL (${superAdminEmail}, ID: ${shortId})`);
              }
            );
          } catch (e) {
            console.error('[GI-Shop DB] SuperAdmin bootstrap error:', e);
          }
        }
      });
    }
  })();

} else {
  // SQLite Mode
  const sqlite3 = require('sqlite3').verbose();
  const DB_FILE = process.env.DATABASE_PATH 
    ? path.resolve(process.cwd(), process.env.DATABASE_PATH)
    : path.join(__dirname, 'database.sqlite');

  const sqliteDb = new sqlite3.Database(DB_FILE, (err) => {
    if (err) console.error('[GI-Shop DB] SQLite connection error:', err);
    else console.log('[GI-Shop DB] Connected to real SQLite database at:', DB_FILE);
  });

  dbInstance = sqliteDb;
  dbInstance.isMySQL = false;

  // Initialize SQLite schema
  sqliteDb.serialize(async () => {
    sqliteDb.run(`CREATE TABLE IF NOT EXISTS Cities (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      status TEXT DEFAULT 'ACTIVE',
      createdAt TEXT
    )`);

    const defaultCities = ['Delhi', 'Mumbai', 'Bengaluru', 'Hyderabad', 'Chennai', 'Kolkata', 'Jaipur', 'Ahmedabad', 'Pune', 'Lucknow', 'Chandigarh', 'Indore'];
    defaultCities.forEach(cName => {
      sqliteDb.run(`INSERT OR IGNORE INTO Cities (name, status, createdAt) VALUES (?, 'ACTIVE', ?)`, [cName, new Date().toISOString()]);
    });

    sqliteDb.run(`CREATE TABLE IF NOT EXISTS Users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      shortId TEXT UNIQUE,
      name TEXT,
      email TEXT UNIQUE,
      phone TEXT UNIQUE,
      password TEXT,
      pin TEXT DEFAULT '1234',
      hasPasswordSet INTEGER DEFAULT 0,
      role TEXT,
      city TEXT,
      address TEXT,
      status TEXT DEFAULT 'ACTIVE',
      createdAt TEXT
    )`);

    sqliteDb.run(`ALTER TABLE Users ADD COLUMN pin TEXT DEFAULT '1234'`, () => {});
    sqliteDb.run(`ALTER TABLE Users ADD COLUMN hasPasswordSet INTEGER DEFAULT 0`, () => {});

    sqliteDb.run(`CREATE TABLE IF NOT EXISTS Shops (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      shortId TEXT UNIQUE,
      ownerId INTEGER,
      shopName TEXT,
      shopPhone TEXT,
      city TEXT,
      shopAddress TEXT,
      timings TEXT,
      isOpen INTEGER DEFAULT 1,
      status TEXT DEFAULT 'ACTIVE',
      createdAt TEXT
    )`);

    sqliteDb.run(`CREATE TABLE IF NOT EXISTS ShopStaff (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      shopId INTEGER,
      userId INTEGER,
      userShortId TEXT,
      userName TEXT,
      userPhone TEXT,
      role TEXT DEFAULT 'Cashier',
      status TEXT DEFAULT 'INVITED',
      invitedAt TEXT,
      respondedAt TEXT
    )`);

    sqliteDb.run(`CREATE TABLE IF NOT EXISTS Items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      shopId INTEGER,
      name TEXT,
      price REAL,
      unit TEXT
    )`);

    sqliteDb.run(`CREATE TABLE IF NOT EXISTS Orders (
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
      status TEXT DEFAULT 'PENDING',
      packingMinutes INTEGER DEFAULT 0,
      acceptedAt TEXT,
      declineReason TEXT,
      cancelledAt TEXT,
      collectionStatus TEXT,
      collectedAt TEXT,
      createdAt TEXT
    )`);

    sqliteDb.run(`ALTER TABLE Orders ADD COLUMN cancelledAt TEXT`, () => {});
    sqliteDb.run(`ALTER TABLE Orders ADD COLUMN collectionStatus TEXT`, () => {});
    sqliteDb.run(`ALTER TABLE Orders ADD COLUMN collectedAt TEXT`, () => {});

    sqliteDb.run(`CREATE TABLE IF NOT EXISTS ShopBlockedCustomers (
      shopId INTEGER,
      customerPhone TEXT,
      reason TEXT,
      blockedAt TEXT,
      PRIMARY KEY(shopId, customerPhone)
    )`);

    sqliteDb.run(`CREATE TABLE IF NOT EXISTS Sales (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      shopId INTEGER,
      customerPhone TEXT,
      customerShortId TEXT,
      itemsJSON TEXT,
      subtotal REAL,
      discount REAL,
      total REAL,
      paymentMethod TEXT,
      note TEXT,
      cashierName TEXT,
      date TEXT
    )`);

    sqliteDb.run(`CREATE TABLE IF NOT EXISTS Settlements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      shopId INTEGER,
      customerPhone TEXT,
      amount REAL,
      method TEXT,
      date TEXT
    )`);

    sqliteDb.run(`CREATE TABLE IF NOT EXISTS ShopCustomers (
      shopId INTEGER,
      customerPhone TEXT,
      name TEXT,
      address TEXT,
      status TEXT DEFAULT 'ACTIVE',
      PRIMARY KEY(shopId, customerPhone)
    )`);

    sqliteDb.run(`CREATE TABLE IF NOT EXISTS UserFCMTokens (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER,
      token TEXT,
      platform TEXT DEFAULT 'web',
      updatedAt TEXT,
      UNIQUE(userId, token)
    )`);

    sqliteDb.run(`CREATE TABLE IF NOT EXISTS UserPasskeys (
      id TEXT PRIMARY KEY,
      userId INTEGER NOT NULL,
      credentialId TEXT UNIQUE NOT NULL,
      publicKey TEXT NOT NULL,
      deviceLabel TEXT,
      createdAt TEXT
    )`);

    sqliteDb.run(`CREATE TABLE IF NOT EXISTS PlatformSettings (
      settingKey TEXT PRIMARY KEY,
      settingValue TEXT
    )`);

    // Performance Indexes
    sqliteDb.run(`CREATE INDEX IF NOT EXISTS idx_users_email ON Users(email)`);
    sqliteDb.run(`CREATE INDEX IF NOT EXISTS idx_passkeys_userId ON UserPasskeys(userId)`);
    sqliteDb.run(`CREATE INDEX IF NOT EXISTS idx_passkeys_credId ON UserPasskeys(credentialId)`);
    sqliteDb.run(`CREATE INDEX IF NOT EXISTS idx_users_phone ON Users(phone)`);
    sqliteDb.run(`CREATE INDEX IF NOT EXISTS idx_users_shortId ON Users(shortId)`);
    sqliteDb.run(`CREATE INDEX IF NOT EXISTS idx_shops_ownerId ON Shops(ownerId)`);
    sqliteDb.run(`CREATE INDEX IF NOT EXISTS idx_shops_city ON Shops(city)`);
    sqliteDb.run(`CREATE INDEX IF NOT EXISTS idx_items_shopId ON Items(shopId)`);
    sqliteDb.run(`CREATE INDEX IF NOT EXISTS idx_orders_shopId ON Orders(shopId)`);
    sqliteDb.run(`CREATE INDEX IF NOT EXISTS idx_orders_customerId ON Orders(customerId)`);
    sqliteDb.run(`CREATE INDEX IF NOT EXISTS idx_sales_shopId ON Sales(shopId)`);
    sqliteDb.run(`CREATE INDEX IF NOT EXISTS idx_sales_customerPhone ON Sales(customerPhone)`);
    sqliteDb.run(`CREATE INDEX IF NOT EXISTS idx_settlements_shopId ON Settlements(shopId)`);
    sqliteDb.run(`CREATE INDEX IF NOT EXISTS idx_settlements_customerPhone ON Settlements(customerPhone)`);
    sqliteDb.run(`CREATE INDEX IF NOT EXISTS idx_shopstaff_shopId ON ShopStaff(shopId)`);
    sqliteDb.run(`CREATE INDEX IF NOT EXISTS idx_shopstaff_userId ON ShopStaff(userId)`);
    sqliteDb.run(`CREATE INDEX IF NOT EXISTS idx_fcm_userId ON UserFCMTokens(userId)`);

    // Optional Super Administrator Bootstrap
    const superAdminEmail = process.env.SUPERADMIN_EMAIL;
    if (superAdminEmail) {
      const bcrypt = require('bcrypt');
      sqliteDb.get(`SELECT id FROM Users WHERE email = ? OR role = 'SuperManager'`, [superAdminEmail], async (err, existingAdmin) => {
        if (!err && !existingAdmin) {
          try {
            const superAdminPassword = process.env.SUPERADMIN_PASSWORD || 'adminPassword123!';
            const hash = await bcrypt.hash(superAdminPassword, 10);
            const shortId = generateShortId('adm');
            const name = process.env.SUPERADMIN_NAME || 'Platform Administrator';
            const phone = process.env.SUPERADMIN_PHONE || '9999999999';
            const pin = process.env.SUPERADMIN_PIN || '1234';
            const city = process.env.SUPERADMIN_CITY || 'Delhi';
            const now = new Date().toISOString();

            sqliteDb.run(
              `INSERT INTO Users (shortId, name, email, phone, password, pin, role, city, address, status, createdAt)
               VALUES (?, ?, ?, ?, ?, ?, 'SuperManager', ?, 'HQ Central', 'ACTIVE', ?)`,
              [shortId, name, superAdminEmail, phone, hash, pin, city, now],
              (insertErr) => {
                if (insertErr) console.error('[GI-Shop DB] Failed to bootstrap SuperAdmin:', insertErr.message);
                else console.log(`✅ [GI-Shop DB] Initial SuperManager bootstrapped into SQLite (${superAdminEmail}, ID: ${shortId})`);
              }
            );
          } catch (e) {
            console.error('[GI-Shop DB] SuperAdmin bootstrap error:', e);
          }
        }
      });
    }
  });
}

module.exports = dbInstance;
