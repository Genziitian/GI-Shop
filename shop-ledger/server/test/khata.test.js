const assert = require('node:assert/strict');
const { test } = require('node:test');
const { DatabaseSync } = require('node:sqlite');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

// Exercise the real route handlers and SQL with an isolated database. Startup,
// authentication, notifications, environment files and network are stubbed.
function fixture() {
  const sql = new DatabaseSync(':memory:');
  sql.exec(`
    CREATE TABLE Users (id INTEGER PRIMARY KEY, shortId TEXT, email TEXT, phone TEXT, name TEXT, address TEXT, status TEXT, city TEXT, role TEXT);
    CREATE TABLE Sales (id INTEGER PRIMARY KEY, shopId INTEGER, customerPhone TEXT, customerShortId TEXT, itemsJSON TEXT, subtotal REAL, discount REAL, total REAL, paymentMethod TEXT, note TEXT, cashierName TEXT, date TEXT);
    CREATE TABLE ShopCustomers (shopId INTEGER, customerPhone TEXT, customerShortId TEXT, customerEmail TEXT, name TEXT, address TEXT, status TEXT, PRIMARY KEY(shopId, customerPhone));
    CREATE TABLE Settlements (id INTEGER PRIMARY KEY, shopId INTEGER, customerPhone TEXT, customerShortId TEXT, amount REAL, date TEXT);
    CREATE TABLE ShopBlockedCustomers (shopId INTEGER, customerPhone TEXT, reason TEXT, blockedAt TEXT);
    CREATE TABLE Orders (id INTEGER PRIMARY KEY, orderNumber TEXT, shopId INTEGER, customerId INTEGER, customerShortId TEXT, customerPhone TEXT, customerName TEXT, customerAddress TEXT, itemsJSON TEXT, estimatedTotal REAL, status TEXT, paymentRequested INTEGER DEFAULT 0, requestedAmount REAL DEFAULT 0, requestedDiscount REAL DEFAULT 0, paymentMethod TEXT, otpCode TEXT, otpCreatedAt TEXT, createdAt TEXT, timelineJSON TEXT, collectionStatus TEXT, collectedAt TEXT);
    CREATE TABLE Notifications (userId INTEGER, title TEXT, body TEXT, type TEXT, orderId INTEGER, orderNumber TEXT, isRead INTEGER, createdAt TEXT);
    INSERT INTO Users VALUES (1, 'ram123', 'ramesh@example.test', '9876543210', 'Ramesh', 'Patna', 'ACTIVE', 'Patna', 'Customer');
    INSERT INTO Users VALUES (2, 'old123', 'old@example.test', '9876543211', 'Old Account', '', 'TERMINATED', 'Patna', 'Customer');
  `);
  const db = {};
  let failVerification = false;
  let failHistory = false;
  for (const method of ['get', 'all', 'run']) {
    db[method] = (query, params, callback) => {
      if (typeof params === 'function') { callback = params; params = []; }
      let result;
      let error;
      try {
        if (failVerification && query.includes("AND status = 'ACTIVE' AND shortId")) throw new Error('test database failure');
        if (failHistory && query.includes('UPDATE Settlements')) throw new Error('test history failure');
        result = sql.prepare(query)[method](...(params || []));
      } catch (err) { error = err; }
      if (callback) callback.call(method === 'run' ? { lastID: Number(result?.lastInsertRowid), changes: result?.changes } : null, error, result);
      else if (error) throw error;
    };
  }

  const routes = new Map();
  const app = { use() {}, listen() {} };
  for (const method of ['get', 'post', 'put', 'delete']) {
    app[method] = (url, ...handlers) => routes.set(`${method} ${url}`, handlers.at(-1));
  }
  const express = Object.assign(() => app, { json: () => () => {}, static: () => () => {} });
  const imports = {
    express, cors: () => () => {}, sqlite3: { verbose: () => ({}) },
    jsonwebtoken: {}, bcrypt: {}, 'firebase-admin': {},
    fs: { existsSync: () => false }, path, './db': db, './khata': require('../khata'),
  };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../index.js'), 'utf8'), {
    require(name) { assert.ok(name in imports, `Unexpected dependency: ${name}`); return imports[name]; },
    __dirname: path.join(__dirname, '..'), module: { exports: {} },
    process: { env: {} }, setInterval() {}, Buffer,
    console: { log() {}, warn() {}, error() {} },
  });

  return {
    sql,
    failVerification() { failVerification = true; },
    failHistory(value) { failHistory = value; },
    invoke(url, body = {}, method = 'post') {
      let response;
      const res = { statusCode: 200, status(code) { this.statusCode = code; return this; }, json(data) { response = { status: this.statusCode, data }; } };
      routes.get(`${method} ${url}`)({ body, query: body, params: { id: 10 }, user: { id: 9, shopId: 5, role: 'Shopkeeper', name: 'Owner' } }, res);
      assert.ok(response, 'Route must respond');
      return response;
    },
    order(customerId = 1, shortId = 'ram123', method = 'Add to Book') {
      sql.prepare(`INSERT INTO Orders (id, orderNumber, shopId, customerId, customerShortId, customerPhone, customerName, customerAddress, itemsJSON, estimatedTotal, status, paymentMethod, otpCode, otpCreatedAt, createdAt, timelineJSON) VALUES (10, 'ORD-123456', 5, ?, ?, '9876543210', 'Ramesh', '', '[]', 100, 'READY', ?, '1234', ?, ?, '[]')`).run(customerId, shortId, method, new Date().toISOString(), new Date().toISOString());
    },
    count(table) { return sql.prepare(`SELECT COUNT(*) AS n FROM ${table}`).get().n; },
  };
}

const sale = { itemsJSON: '[]', subtotal: 100, discount: 0, total: 100, paymentMethod: 'Add to Book' };
const paymentRoute = '/api/shop/orders/:id/get-payment';
const pickupRoute = '/api/shop/orders/:id/verify-otp';

test('Khata rejects phone-only, unknown, inactive and malformed accounts without saving credit', () => {
  const f = fixture();
  for (const identity of [{}, { customerPhone: '9876543210' }, { customerShortId: 'fake' }, { customerShortId: 'old123' }, { customerShortId: {} }]) {
    const result = f.invoke('/api/shop/sales', { ...sale, ...identity });
    assert.equal(result.status, 400);
    assert.match(result.data.error, /registered, active/);
  }
  assert.equal(f.count('Sales'), 0);
  assert.equal(f.count('ShopCustomers'), 0);
  f.sql.close();
});

test('valid credit uses canonical account details and normalizes legacy Book labels', () => {
  const f = fixture();
  const result = f.invoke('/api/shop/sales', { ...sale, paymentMethod: 'Legacy Book', customerShortId: ' RAM123 ', customerPhone: '1111111111', customerEmail: 'wrong@example.test' });
  assert.equal(result.status, 200);
  const saved = f.sql.prepare('SELECT * FROM Sales').get();
  assert.equal(saved.customerShortId, 'ram123');
  assert.equal(saved.customerPhone, '9876543210');
  assert.equal(saved.paymentMethod, 'Add to Book');
  assert.equal(f.sql.prepare('SELECT customerEmail FROM ShopCustomers').get().customerEmail, 'ramesh@example.test');
  f.sql.close();
});

test('walk-in Cash and Online sales still work', () => {
  const f = fixture();
  for (const paymentMethod of ['Cash', 'Online']) assert.equal(f.invoke('/api/shop/sales', { ...sale, paymentMethod }).status, 200);
  assert.equal(f.count('Sales'), 2);
  f.sql.close();
});

test('failed account verification returns an error and saves no sale', () => {
  const f = fixture();
  f.failVerification();
  assert.equal(f.invoke('/api/shop/sales', { ...sale, customerShortId: 'ram123' }).status, 500);
  assert.equal(f.count('Sales'), 0);
  f.sql.close();
});

test('order credit rejects inactive or missing customerId even if another Short ID matches', () => {
  for (const customerId of [2, 999]) {
    const f = fixture();
    f.order(customerId);
    assert.equal(f.invoke(paymentRoute, { paymentMethod: 'Add to Book' }).status, 400);
    assert.equal(f.sql.prepare('SELECT paymentRequested FROM Orders').get().paymentRequested, 0);
    assert.equal(f.count('Notifications'), 0);
    f.sql.close();
  }
});

test('active order customer can receive Khata payment request and complete pickup', () => {
  const f = fixture();
  f.order();
  assert.equal(f.invoke(paymentRoute, { paymentMethod: 'Add to Book' }).status, 200);
  const { otpCode } = f.sql.prepare('SELECT otpCode FROM Orders').get();
  assert.equal(f.invoke(pickupRoute, { otp: otpCode }).status, 200);
  assert.equal(f.count('Sales'), 1);
  assert.equal(f.sql.prepare('SELECT customerShortId FROM Sales').get().customerShortId, 'ram123');
  assert.equal(f.sql.prepare('SELECT collectionStatus FROM Orders').get().collectionStatus, 'COLLECTED');
  f.sql.close();
});

test('deactivation after payment request blocks pickup credit without consuming OTP', () => {
  const f = fixture();
  f.order();
  assert.equal(f.invoke(paymentRoute, { paymentMethod: 'Add to Book' }).status, 200);
  const { otpCode } = f.sql.prepare('SELECT otpCode FROM Orders').get();
  f.sql.exec("UPDATE Users SET status = 'TERMINATED' WHERE id = 1");
  assert.equal(f.invoke(pickupRoute, { otp: otpCode }).status, 400);
  assert.equal(f.sql.prepare('SELECT otpCode FROM Orders').get().otpCode, otpCode);
  assert.equal(f.sql.prepare('SELECT status FROM Orders').get().status, 'READY');
  assert.equal(f.count('Sales'), 0);
  f.sql.close();
});

test('Cash order payment and pickup still work without a registered customer', () => {
  const f = fixture();
  f.order(999, '', 'Cash');
  assert.equal(f.invoke(paymentRoute, { paymentMethod: 'Cash' }).status, 200);
  const { otpCode } = f.sql.prepare('SELECT otpCode FROM Orders').get();
  assert.equal(f.invoke(pickupRoute, { otp: otpCode }).status, 200);
  assert.equal(f.count('Sales'), 1);
  f.sql.close();
});


test('customer search supports name, phone, exact email and ID without matching ID digits to phones', () => {
  const f = fixture();
  f.sql.exec("INSERT INTO Users VALUES (3, 'other55', 'other@example.test', '9876512321', 'Different Person', '', 'ACTIVE', 'Patna', 'Customer')");
  for (const query of ['Ramesh', '9876543210', 'ramesh@example.test', '#RAM123']) {
    const result = f.invoke('/api/shop/customers/search-registered', { query }, 'get');
    assert.equal(result.status, 200);
    assert.equal(result.data.length, 1);
    assert.equal(result.data[0].shortId, 'ram123');
    assert.equal(result.data[0].email, 'ramesh@example.test');
  }
  assert.equal(f.invoke('/api/shop/customers/search-registered', { query: 'old123' }, 'get').data.length, 0);
  f.sql.close();
});

test('phone match alone does not link a saved walk-in after app registration', () => {
  const f = fixture();
  f.sql.exec("INSERT INTO ShopCustomers VALUES (5, '9876543210', NULL, NULL, 'Ramesh from shop', '', 'ACTIVE')");
  const result = f.invoke('/api/shop/customers', {}, 'get');
  assert.equal(result.status, 200);
  assert.equal(result.data.length, 1);
  assert.ok(!result.data[0].shortId);
  assert.equal(result.data[0].name, 'Ramesh from shop');
  f.sql.close();
});

function seedHistory(f) {
  f.sql.exec(`
    INSERT INTO ShopCustomers VALUES (5, '9876543210', NULL, NULL, 'Ramesh from shop', '', 'ACTIVE');
    INSERT INTO Sales (shopId, customerPhone, total, paymentMethod) VALUES (5, '9876543210', 100, 'Cash'), (5, '9876543210', 200, 'Add to Book'), (6, '9876543210', 300, 'Add to Book');
    INSERT INTO Settlements (shopId, customerPhone, amount) VALUES (5, '9876543210', 40), (6, '9876543210', 20);
  `);
  f.order();
  f.sql.exec('UPDATE Orders SET customerShortId = NULL WHERE id = 10');
}

test('connecting later attaches paid bills, legacy credit, repayments and orders only in the current shop', () => {
  const f = fixture(); seedHistory(f);
  const result = f.invoke('/api/shop/customers/link-account', { phone: '9876543210', customerId: 'ram123', email: 'ramesh@example.test' });
  assert.equal(result.status, 200);
  assert.equal(f.count('Sales'), 3);
  assert.equal(f.sql.prepare('SELECT COUNT(*) AS n FROM Sales WHERE shopId = 5 AND customerShortId = ?').get('ram123').n, 2);
  assert.equal(f.sql.prepare('SELECT customerShortId FROM Sales WHERE shopId = 6').get().customerShortId, null);
  assert.equal(f.sql.prepare('SELECT customerShortId FROM Orders WHERE id = 10').get().customerShortId, 'ram123');
  assert.equal(f.sql.prepare('SELECT customerShortId FROM Settlements WHERE shopId = 5').get().customerShortId, 'ram123');
  assert.equal(f.sql.prepare('SELECT customerShortId FROM Settlements WHERE shopId = 6').get().customerShortId, null);
  assert.equal(f.sql.prepare('SELECT SUM(total) AS total FROM Sales WHERE shopId = 5').get().total, 300);
  assert.equal(f.sql.prepare('SELECT amount FROM Settlements WHERE shopId = 5').get().amount, 40);
  assert.equal(f.sql.prepare('SELECT name FROM ShopCustomers WHERE shopId = 5').get().name, 'Ramesh from shop');
  f.sql.close();
});

test('failed historical connection does not report success or lock the link and can be retried', () => {
  const f = fixture(); seedHistory(f); f.failHistory(true);
  const payload = { phone: '9876543210', customerId: 'ram123', email: 'ramesh@example.test' };
  assert.equal(f.invoke('/api/shop/customers/link-account', payload).status, 500);
  assert.equal(f.sql.prepare('SELECT customerShortId FROM ShopCustomers WHERE shopId = 5').get().customerShortId, null);
  f.failHistory(false);
  assert.equal(f.invoke('/api/shop/customers/link-account', payload).status, 200);
  assert.equal(f.sql.prepare('SELECT customerShortId FROM ShopCustomers WHERE shopId = 5').get().customerShortId, 'ram123');
  f.sql.close();
});
