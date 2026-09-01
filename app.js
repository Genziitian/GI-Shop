const http = require('http');
const fs = require('fs');
const path = require('path');

let port = parseInt(process.env.PORT, 10) || 3000;
const host = '0.0.0.0';

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
  return path.join(__dirname, 'dist');
}

const publicDir = getPublicDir();

const server = http.createServer((req, res) => {
  const urlPath = req.url.split('?')[0];

  if (urlPath === '/favicon.ico' || urlPath === '/favicon.svg') {
    const favPath = path.join(publicDir, 'favicon.svg');
    if (fs.existsSync(favPath)) {
      res.writeHead(200, { 'Content-Type': 'image/svg+xml' });
      return fs.createReadStream(favPath).pipe(res);
    }
  }

  let safePath = path.normalize(urlPath).replace(/^(\.\.[\/\\])+/, '');
  let filePath = path.join(publicDir, safePath);

  if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
    filePath = path.join(filePath, 'index.html');
  }

  if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
    filePath = path.join(publicDir, 'index.html');
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

function startServer(currentPort) {
  server.removeAllListeners('error');
  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.warn(`[GI-Shop Warning] Port ${currentPort} in use, trying port ${currentPort + 1}...`);
      if (currentPort < 3050) {
        setTimeout(() => startServer(currentPort + 1), 200);
      } else {
        server.listen(0, host, () => {
          console.log(`Server running on ${server.address().port}`);
        });
      }
    } else {
      console.error('[GI-Shop Server Error]', err);
    }
  });

  server.listen(currentPort, host, () => {
    console.log(`Server running on ${currentPort}`);
    console.log(`[GI-Shop Production Server] Serving from ${publicDir} on http://${host}:${currentPort}`);
  });
}

startServer(port);
