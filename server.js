const http = require('http');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const PORT = parseInt(process.env.PORT, 10) || 3000;
const HOST = '0.0.0.0';

const MIME_TYPES = {
  '.html': 'text/html; charset=UTF-8',
  '.js': 'text/javascript; charset=UTF-8',
  '.css': 'text/css; charset=UTF-8',
  '.json': 'application/json; charset=UTF-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.ttf': 'font/ttf',
  '.webmanifest': 'application/manifest+json',
  '.map': 'application/json'
};

function getPublicDir() {
  const possiblePaths = [
    path.join(__dirname, 'dist'),
    path.join(__dirname, 'build'),
    path.join(__dirname, '../shop-ledger/dist'),
    path.join(__dirname, 'public_html'),
    path.join(__dirname, 'public')
  ];
  for (const p of possiblePaths) {
    if (fs.existsSync(p) && fs.existsSync(path.join(p, 'index.html'))) {
      return p;
    }
  }
  return null;
}

let publicDir = getPublicDir();

// If dist/build does not exist yet, build on the fly
if (!publicDir) {
  try {
    console.log('[Server Startup] Build files not found, running build-web.js...');
    execSync('node scripts/build-web.js', { cwd: __dirname, stdio: 'inherit' });
    publicDir = getPublicDir() || path.join(__dirname, 'dist');
  } catch (e) {
    console.error('[Server Startup Error]', e.message);
    publicDir = path.join(__dirname, 'dist');
  }
}

const server = http.createServer((req, res) => {
  const currentPublicDir = publicDir || path.join(__dirname, 'dist');
  const urlPath = req.url.split('?')[0];
  let safePath = path.normalize(urlPath).replace(/^(\.\.[\/\\])+/, '');
  let filePath = path.join(currentPublicDir, safePath);

  // If path is a directory or root, serve index.html
  if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
    filePath = path.join(filePath, 'index.html');
  }

  // If file does not exist, fallback to index.html for SPA client-side routing
  if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
    filePath = path.join(currentPublicDir, 'index.html');
  }

  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('404 Not Found');
    } else {
      res.writeHead(200, {
        'Content-Type': contentType,
        'Cache-Control': ext === '.html' ? 'no-cache' : 'public, max-age=31536000'
      });
      res.end(data);
    }
  });
});

server.listen(PORT, HOST, () => {
  console.log(`Server running on ${PORT}`);
  console.log(`[GI-Shop Production Server] Serving from ${publicDir} on http://${HOST}:${PORT}`);
});
