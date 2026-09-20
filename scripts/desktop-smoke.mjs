import { _electron as electron } from '@playwright/test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
const profile = await mkdtemp(path.join(tmpdir(), 'last-train-desktop-'));
const saveFile = path.join(profile, 'exported-case.json');
const errors = [];
let desktop;
async function launch() {
  desktop = await electron.launch({
    ...(process.env.DESKTOP_EXECUTABLE ? { executablePath: process.env.DESKTOP_EXECUTABLE } : {}),
    args: [
      ...(process.env.DESKTOP_EXECUTABLE ? [] : ['electron/main.cjs']),
      ...(process.platform === 'linux'
        ? [
            '--no-sandbox',
            '--use-gl=angle',
            '--use-angle=swiftshader',
            '--enable-unsafe-swiftshader',
          ]
        : []),
    ],
    env: { ...process.env, LAST_TRAIN_USER_DATA: profile },
    timeout: 120000,
  });
  const page = await desktop.firstWindow();
  page.setDefaultTimeout(120000);
  page.on('pageerror', (error) => errors.push(error.message));
  await page.waitForFunction(() => window.__LAST_TRAIN__);
  return page;
}
try {
  let page = await launch();
  assert.equal(page.url(), 'app://game/');
  assert.equal(await page.evaluate(() => typeof window.require), 'undefined');
  const preferences = await desktop.evaluate(({ BrowserWindow }) =>
    BrowserWindow.getAllWindows()[0].webContents.getLastWebPreferences(),
  );
  assert.equal(preferences.sandbox, true);
  assert.equal(preferences.nodeIntegration, false);
  assert.equal(preferences.contextIsolation, true);
  assert.ok(await page.evaluate(() => window.__LAST_TRAIN__.renderStats.triangles > 0));
  await page.evaluate(() => document.fonts.ready.then(() => true));
  assert.equal(await page.evaluate(() => document.fonts.check('16px "Barlow Condensed"')), true);
  await page.click('[data-action="begin"]');
  await page.click('[data-action="skip"]');
  await page.keyboard.down('KeyW');
  await page.waitForTimeout(1000);
  await page.keyboard.up('KeyW');
  assert.ok(await page.evaluate(() => window.__LAST_TRAIN__.position.z < 4.5));
  await page.click('[data-action="notebook"]');
  await page.click('[data-tab="notes"]');
  await page.fill('#notes', 'A saved desktop investigation.');
  await page.click('[data-action="close"]');
  await page.click('[data-action="settings"]');
  await desktop.evaluate(({ session }, filename) => {
    session.defaultSession.once('will-download', (_event, item) => item.setSavePath(filename));
  }, saveFile);
  await page.click('[data-action="export"]');
  let exported;
  for (let i = 0; i < 100; i++) {
    try {
      exported = JSON.parse(await readFile(saveFile, 'utf8'));
      break;
    } catch {
      await page.waitForTimeout(100);
    }
  }
  assert.equal(exported?.notes, 'A saved desktop investigation.');
  exported.notes = 'Imported and persisted in the desktop application.';
  await page.locator('#import-file').setInputFiles({
    name: 'case.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(exported)),
  });
  await page.waitForFunction(() => window.__LAST_TRAIN__.state.notes.startsWith('Imported'));
  await desktop.close();
  desktop = null;
  page = await launch();
  assert.equal(await page.evaluate(() => window.__LAST_TRAIN__.state.notes), exported.notes);
  assert.deepEqual(errors, []);
  console.log(
    'PASS: packaged desktop startup, WebGL, sandbox, local fonts, movement, save export/import and persistence across restarts.',
  );
} finally {
  if (desktop) await desktop.close();
  await rm(profile, { recursive: true, force: true });
}
