const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const readline = require('readline');
const path = require('path');
const fs = require('fs');

// Load environment variables if available
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
          if (!process.env[key]) process.env[key] = val;
        }
      });
    } catch (e) {}
  }
}

const DB_FILE = process.env.DATABASE_PATH 
  ? path.resolve(process.cwd(), process.env.DATABASE_PATH)
  : path.join(__dirname, 'database.sqlite');

const db = new sqlite3.Database(DB_FILE, (err) => {
  if (err) {
    console.error('❌ Could not connect to database:', err.message);
    process.exit(1);
  }
});

function generateShortId(prefix = 'adm') {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let rand = '';
  for (let i = 0; i < 3; i++) {
    rand += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `${prefix}${rand}${Math.floor(10 + Math.random() * 90)}`;
}

async function createAdmin(email, password, name, phone, pin, city) {
  const hash = await bcrypt.hash(password, 10);
  const shortId = generateShortId('adm');
  const now = new Date().toISOString();

  db.get(`SELECT id, email, role FROM Users WHERE email = ? OR phone = ?`, [email, phone], (err, existing) => {
    if (existing) {
      if (existing.role === 'SuperManager') {
        console.log(`⚠️ Super Admin with email "${email}" or phone "${phone}" already exists.`);
      } else {
        console.log(`⚠️ User with email "${email}" or phone "${phone}" exists as role "${existing.role}".`);
      }
      db.close();
      process.exit(0);
    }

    db.run(
      `INSERT INTO Users (shortId, name, email, phone, password, pin, role, city, address, status, createdAt)
       VALUES (?, ?, ?, ?, ?, ?, 'SuperManager', ?, 'HQ Central', 'ACTIVE', ?)`,
      [shortId, name, email, phone, hash, pin, city, now],
      function (insertErr) {
        if (insertErr) {
          console.error('❌ Failed to create Super Admin:', insertErr.message);
        } else {
          console.log('\n========================================');
          console.log('✅ SUPER ADMIN CREATED SUCCESSFULLY!');
          console.log('========================================');
          console.log(`👤 Name:     ${name}`);
          console.log(`📧 Email:    ${email}`);
          console.log(`📱 Phone:    ${phone}`);
          console.log(`🆔 User ID:  ${shortId}`);
          console.log(`🔑 PIN:      ${pin}`);
          console.log(`🏙️ City:     ${city}`);
          console.log('========================================\n');
        }
        db.close();
        process.exit(insertErr ? 1 : 0);
      }
    );
  });
}

const args = process.argv.slice(2);

if (args.length >= 2) {
  const [email, password, name = 'Platform Administrator', phone = '9999999999', pin = '1234', city = 'Delhi'] = args;
  createAdmin(email.trim(), password.trim(), name.trim(), phone.trim(), pin.trim(), city.trim());
} else {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  console.log('\n🛡️  GI SHOP — Create Super Administrator\n');

  rl.question('Enter Admin Name (default: Platform Administrator): ', (nameInput) => {
    const name = nameInput.trim() || 'Platform Administrator';

    rl.question('Enter Admin Email (required): ', (emailInput) => {
      const email = emailInput.trim();
      if (!email) {
        console.log('❌ Email is required.');
        rl.close();
        process.exit(1);
      }

      rl.question('Enter Admin Password (required): ', (passInput) => {
        const password = passInput.trim();
        if (!password) {
          console.log('❌ Password is required.');
          rl.close();
          process.exit(1);
        }

        rl.question('Enter Mobile Phone (default: 9999999999): ', (phoneInput) => {
          const phone = phoneInput.trim() || '9999999999';

          rl.question('Enter 4-Digit Security PIN (default: 1234): ', (pinInput) => {
            const pin = pinInput.trim() || '1234';

            rl.question('Enter City (default: Delhi): ', (cityInput) => {
              const city = cityInput.trim() || 'Delhi';
              rl.close();
              createAdmin(email, password, name, phone, pin, city);
            });
          });
        });
      });
    });
  });
}
