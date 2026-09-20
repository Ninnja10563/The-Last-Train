import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import { createState, SAVE_KEY } from '../src/systems/case.js';
const browser = await chromium.launch({
  headless: true,
  args: [
    '--no-sandbox',
    '--use-gl=angle',
    '--use-angle=swiftshader',
    '--enable-unsafe-swiftshader',
  ],
});
try {
  const page = await browser.newPage({ viewport: { width: 960, height: 600 } });
  page.setDefaultTimeout(60000);
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  console.log('Opening browser');
  await page.goto('http://localhost:5173');
  await page.waitForFunction(() => window.__LAST_TRAIN__);
  await page.screenshot({ path: '/tmp/last-train-title.png' });
  await page.click('[data-action="begin"]');
  await page.click('[data-action="skip"]');
  await page.keyboard.down('KeyW');
  await page.waitForTimeout(1100);
  await page.keyboard.up('KeyW');
  assert.ok((await page.evaluate(() => window.__LAST_TRAIN__.position.z)) < 4.5, 'movement works');
  await page.click('[data-action="notebook"]');
  await page.click('[data-tab="timeline"]');
  assert.match(await page.locator('.panel-body').innerText(), /23:47/);
  await page.click('[data-tab="notes"]');
  await page.fill('#notes', 'Browser smoke test note');
  await page.reload();
  await page.waitForFunction(() => window.__LAST_TRAIN__);
  assert.equal(
    await page.evaluate(() => window.__LAST_TRAIN__.state.notes),
    'Browser smoke test note',
  );
  console.log('Movement, notebook and persistence passed');
  // Save fixtures enter two physical locations, then exercise actual interaction and UI.
  let fixture = createState();
  fixture.started = true;
  fixture.player = { x: 0, y: 1.68, z: 2, yaw: Math.PI / 2, pitch: -0.85 };
  async function loadFixture(s) {
    const close = page.locator('[data-action="close"]');
    if (await close.count()) await close.click();
    await page.click('[data-action="settings"]');
    await page.locator('#import-file').setInputFiles({
      name: 'test-case.json',
      mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify(s)),
    });
    await page.waitForFunction(
      () => document.querySelector('.toast')?.textContent === 'Case imported.',
    );
    await page.click('[data-action="close"]');
    if (await page.locator('[data-action="begin"]').count())
      await page.click('[data-action="begin"]');
  }
  await loadFixture(fixture);
  await page.waitForFunction(
    () => document.querySelector('#interact') && !document.querySelector('#interact').hidden,
  );
  assert.match(await page.locator('#interact').innerText(), /watch/i);
  await page.keyboard.press('e');
  await page.click('[data-collect="watch"]');
  assert.ok(await page.evaluate(() => window.__LAST_TRAIN__.state.evidence.includes('watch')));
  await page.screenshot({ path: '/tmp/last-train-inspect.png' });
  console.log('Physical watch collected');
  fixture = createState();
  fixture.started = true;
  fixture.evidence = ['watch', 'glass', 'letter', 'ledger', 'ticket', 'photograph', 'key', 'note'];
  fixture.visited = ['private', 'dining', 'passenger', 'luggage', 'observation'];
  fixture.player = { x: 0, y: 1.68, z: 15, yaw: Math.PI / 2, pitch: -0.1 };
  await loadFixture(fixture);
  await page.waitForFunction(
    () => document.querySelector('#interact') && !document.querySelector('#interact').hidden,
  );
  await page.waitForFunction(() =>
    document.querySelector('#interact')?.textContent.includes('Marcus'),
  );
  assert.match(await page.locator('#interact').innerText(), /Marcus/);
  await page.keyboard.press('e');
  await page.selectOption('#present', 'ticket');
  await page.fill('#question', 'You said you were in dining. Is that really true?');
  await page.click('#ask-form button');
  await page.waitForFunction(() =>
    window.__LAST_TRAIN__.state.contradictions.includes('marcus-alibi'),
  );
  assert.match(await page.locator('#dialogue-log').innerText(), /left dining/i);
  await page.click('[data-action="close"]');
  await page.waitForFunction(() =>
    document.querySelector('#interact')?.textContent.includes('Marcus'),
  );
  await page.keyboard.press('e');
  assert.match(await page.locator('#dialogue-log').innerText(), /left dining/i);
  await page.screenshot({ path: '/tmp/last-train-dialogue.png' });
  await page.click('[data-action="close"]');
  await page.click('[data-action="notebook"]');
  await page.click('[data-tab="board"]');
  await page.click('[data-clue="glass"]');
  await page.click('[data-clue="ledger"]');
  await page.waitForFunction(() => document.querySelectorAll('.lines line').length === 1);
  assert.equal(await page.locator('.lines line').count(), 1);
  await page.click('[data-tab="theory"]');
  await page.selectOption('#accused', 'marcus');
  await page.fill('#motive', 'He wanted to conceal embezzlement and avoid police exposure.');
  await page.fill('#method', 'He poisoned the whisky glass with an overdose of cardiac drops.');
  await page.fill(
    '#timeline-theory',
    'At 23:30 Marcus used the service key to attend the meeting in the private compartment. Daniel collapsed at 23:42.',
  );
  await page.click('#theory-form [type="submit"]');
  assert.equal(await page.evaluate(() => window.__LAST_TRAIN__.state.ending.score), 100);
  await page.screenshot({ path: '/tmp/last-train-ending.png' });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.click('[data-action="resume"]');
  await page.click('[data-action="notebook"]');
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  await page.screenshot({ path: '/tmp/last-train-mobile.png' });
  assert.deepEqual(errors, []);
  console.log(
    'PASS: rendering, movement, notebook, persistence, 3D clue collection, interrogation, contradiction, interview memory, board, written 100% solution, mobile layout; no browser errors.',
  );
  console.log('Render stats:', await page.evaluate(() => window.__LAST_TRAIN__.renderStats));
} finally {
  await browser.close();
}
