const fs = require('fs');
const path = require('path');

// Metro in Expo SDK 52 expects image-size 1.x's callable CommonJS export.
// The pinned 2.x dependency exposes imageSize and accepts buffers, not paths.
const assetsPath = path.join(path.dirname(require.resolve('metro/package.json')), 'src', 'Assets.js');
const original = 'const getImageSize = require("image-size");';
const replacement = [
  'const imageSize = require("image-size");',
  'const getImageSize = (input) =>',
  '  (imageSize.imageSize || imageSize)(',
  '    typeof input === "string" ? fs.readFileSync(input) : input',
  '  );',
].join('\n');
const source = fs.readFileSync(assetsPath, 'utf8');

if (source.includes(replacement)) {
  console.log('[Patch] Metro image-size compatibility already applied');
} else if (source.includes(original)) {
  fs.writeFileSync(assetsPath, source.replace(original, replacement));
  console.log('[Patch] Updated Metro to support image-size 2.x');
} else {
  throw new Error('Metro Assets.js changed; review the image-size compatibility patch.');
}
