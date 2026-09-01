const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

console.log('[Deploy] Building web application from shop-ledger...');
const shopLedgerDir = path.resolve(__dirname, '../../shop-ledger');
const targetDist = path.resolve(__dirname, '../dist');
const targetBuild = path.resolve(__dirname, '../build');

try {
  // 1. Install and build inside shop-ledger
  execSync('npm install && npm run build', { cwd: shopLedgerDir, stdio: 'inherit' });

  const srcDist = path.resolve(shopLedgerDir, 'dist');

  // 2. Copy dist output to both ./dist and ./build inside shop-ledger-mobile
  if (fs.existsSync(srcDist)) {
    fs.mkdirSync(targetDist, { recursive: true });
    fs.cpSync(srcDist, targetDist, { recursive: true, force: true });

    fs.mkdirSync(targetBuild, { recursive: true });
    fs.cpSync(srcDist, targetBuild, { recursive: true, force: true });
    console.log('[Deploy] Web build successfully copied to dist/ and build/ folders!');
  } else {
    console.error('[Deploy Error] shop-ledger/dist not found!');
    process.exit(1);
  }
} catch (err) {
  console.error('[Deploy Error]', err.message);
  process.exit(1);
}
