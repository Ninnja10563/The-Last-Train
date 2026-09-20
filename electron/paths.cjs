const path = require('node:path');
function assetPath(requestURL, root) {
  const url = new URL(requestURL);
  if (url.protocol !== 'app:' || url.host !== 'game') return null;
  const decoded = decodeURIComponent(url.pathname);
  if (decoded.includes('\0') || decoded.includes('\\')) return null;
  const file = path.resolve(root, '.' + (decoded === '/' ? '/index.html' : decoded));
  const relative = path.relative(root, file);
  if (!relative || relative.startsWith('..') || path.isAbsolute(relative)) return null;
  return file;
}
module.exports = { assetPath };
