// GI SHOP - Production Server Entry Point (Hostinger / Node.js)
const path = require('path');
const fs = require('fs');

// Ensure serviceAccountKey.json is available
const rootKey = path.join(__dirname, 'serviceAccountKey.json');
const rootKeyDouble = path.join(__dirname, 'serviceAccountKey.json.json');
const serverKey = path.join(__dirname, 'shop-ledger', 'server', 'serviceAccountKey.json');

if (!fs.existsSync(serverKey)) {
  if (fs.existsSync(rootKey)) {
    fs.copyFileSync(rootKey, serverKey);
  } else if (fs.existsSync(rootKeyDouble)) {
    fs.copyFileSync(rootKeyDouble, serverKey);
  }
}

// Start Unified Express Backend (Serves /api endpoints + dist/ frontend)
require('./shop-ledger/server/index.js');
