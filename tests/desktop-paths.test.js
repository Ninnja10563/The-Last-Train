import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import path from 'node:path';
const { assetPath } = createRequire(import.meta.url)('../electron/paths.cjs');
const root = path.resolve('/game/dist');
test('desktop protocol serves only the bundled game origin and directory', () => {
  assert.equal(assetPath('app://game/', root), path.join(root, 'index.html'));
  assert.equal(assetPath('app://game/assets/main.js', root), path.join(root, 'assets/main.js'));
  for (const url of [
    'https://game/assets/main.js',
    'app://other/index.html',
    'app://game/%2e%2e%2fsecret',
    'app://game/%00',
    'app://game/a%5cb',
  ])
    assert.equal(assetPath(url, root), null);
});
