const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

console.log('[Deploy] Building web application from shop-ledger...');
const shopLedgerDir = path.resolve(__dirname, '../../shop-ledger');
const targetDist = path.resolve(__dirname, '../dist');
const targetBuild = path.resolve(__dirname, '../build');
const targetPublic = path.resolve(__dirname, '../public');
const targetPublicHtml = path.resolve(__dirname, '../public_html');

try {
  // 1. Install and build inside shop-ledger
  execSync('npm install && npm run build', { cwd: shopLedgerDir, stdio: 'inherit' });

  const srcDist = path.resolve(shopLedgerDir, 'dist');

  // 2. Copy dist output to all standard web output folders
  if (fs.existsSync(srcDist)) {
    const targets = [targetDist, targetBuild, targetPublic, targetPublicHtml];
    for (const target of targets) {
      fs.mkdirSync(target, { recursive: true });
      fs.cpSync(srcDist, target, { recursive: true, force: true });
    }
    console.log('[Deploy] Web build successfully copied to dist/, build/, public/, and public_html/ folders!');
  } else {
    console.error('[Deploy Error] shop-ledger/dist not found!');
    process.exit(1);
  }
} catch (err) {
  console.error('[Deploy Error]', err.message);
  process.exit(1);
}
