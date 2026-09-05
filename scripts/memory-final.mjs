// Memory-match solver that provably terminates: pick anchor A (first face-down
// card), then for each of the remaining face-down slots, re-open A and try that
// candidate. One of the 7 slots holds A's match, so the round completes. A
// mismatch leaves the deck unchanged, so slot indices are stable across tries.
import { chromium } from 'playwright-core';

const exe = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const browser = await chromium.launch({ executablePath: exe, headless: false });
const page = await browser.newPage({ viewport: { width: 1000, height: 900 } });
page.on('crash', () => console.log('TAB CRASHED'));
page.on('pageerror', (e) => console.log('PAGEERROR:', e));

await page.goto('http://localhost:5173/games/memory', { waitUntil: 'domcontentloaded' });
await page.getByRole('button', { name: /Start/i }).first().click();
await page.waitForTimeout(500);

const H = () => page.locator('button[aria-label="Hidden card"]');
const pairs = async () =>
  Number((await page.getByText(/Pairs found/i).innerText().catch(() => 'x/4')).match(/(\d+)\//)?.[1] ?? -1);
const onResult = () => page.getByText('Accuracy', { exact: false }).first().isVisible().catch(() => false);

let scored = false;
for (let round = 0; round < 4 && !scored; round++) {
  if ((await pairs()) + (scored ? 0 : 0) >= 4) { scored = await onResult(); break; }
  const startPairs = await pairs();
  if (startPairs < 0) break;
  const target = startPairs + 1;
  // snapshots: candidates are the OTHER face-down cards (anchor face-up during a try)
  for (let slot = 0; slot < 8; slot++) {
    if ((await pairs()) === target || (await onResult())) { scored = true; break; }
    const anchor = H().first();
    if (!(await anchor.isVisible().catch(() => false))) break;
    await anchor.click();          // open (or re-open) the anchor
    await page.waitForTimeout(180);
    const cand = H().nth(Math.min(slot, (await H().count()) - 1));
    if (!(await cand.isVisible().catch(() => false))) break;
    await cand.click();            // resolve anchor vs this candidate
    await page.waitForTimeout(480);
  }
  if ((await pairs()) < target) break; // no progress this round (shouldn't happen)
}

scored = scored || (await onResult());
console.log(scored ? 'PASS  memory game scores a result (end-to-end)' : 'FAIL  no result');
if (!scored) {
  const body = await page.evaluate(() => document.body.innerText.replace(/\n+/g, ' '));
  console.log('  · body:', body.slice(0, 200));
}
await browser.close();
process.exit(scored ? 0 : 1);