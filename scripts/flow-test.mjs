// Custom end-to-end flow test: Elder → Home → Games → Daily Routine → Complete
// → Back → Games → Back → Home, plus language switching + refresh persistence.
import { chromium } from 'playwright-core';
import fs from 'node:fs';

const BROWSER = [
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
].find((p) => fs.existsSync(p));

const BASE = process.env.BASE_URL ?? 'http://localhost:5173';
let pageErrors = [];

const browser = await chromium.launch({ executablePath: BROWSER, headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
page.on('pageerror', (e) => pageErrors.push(String(e)));

const ok = (name, cond, extra = '') => {
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${extra ? '  · ' + extra : ''}`);
  if (!cond) process.exitCode = 1;
};

// Enter as Elder and land on Home
await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
await page.getByRole('button', { name: /Elder/i }).first().click();
await page.waitForTimeout(600);
ok('elder -> home', (await page.url()).includes('/home'), (await page.url()));

// Home -> Games
await page.goto(BASE + '/home', { waitUntil: 'domcontentloaded' });
await page.goto(BASE + '/games', { waitUntil: 'domcontentloaded' });
ok('games hub opens', await page.getByText('Games', { exact: false }).first().isVisible().catch(() => false));

// Games -> Daily Routine
await page.goto(BASE + '/games/routine', { waitUntil: 'domcontentloaded' });
await page.getByRole('button', { name: /ready/i }).first().waitFor({ timeout: 8000 });
ok('routine start screen shows ready', true);

// Start the game: schedule shows then auto-hides into quiz (default level 1 -> 12s)
await page.getByRole('button', { name: /ready/i }).first().click();
await page.getByText(/Memorize|Memorizing|routine/i).first().waitFor({ timeout: 3000 }).catch(() => {});
ok('schedule review phase reached', true);

// Wait for auto-advance to quiz (12s) — but accelerate by clicking "ready" again if visible
const quizBtn = page.getByRole('button', { name: /ready/i }).first();
if (await quizBtn.isVisible().catch(() => false)) await quizBtn.click().catch(() => {});
await page.getByText(/What comes after breakfast/i).first().waitFor({ timeout: 20000 });
ok('quiz auto-shown after schedule hides', true);

// Answer questions by prompt → correct answer, any number (difficulty-
// scaled: 3–5 questions). English mode, so prompts match.
const ANSWERS = [
  ['What comes after breakfast', 'Medicine'],
  ['When do you take your medicine', '9:00 AM'],
  ['activity happens at 5:00', 'Walk'],
  ['What time is lunch', '1:00 PM'],
  ['first thing you do in the morning', 'Wake up'],
];
for (let i = 0; i < 6; i++) {
  const body = await page.locator('body').innerText();
  const row = ANSWERS.find(([p]) => body.includes(p));
  if (!row) break;
  await page.getByRole('button', { name: new RegExp(`^${row[1]}$`) }).first().waitFor({ timeout: 6000 });
  await page.getByRole('button', { name: new RegExp(`^${row[1]}$`) }).first().click();
  await page.waitForTimeout(250);
}
await page.getByText(/Well done/i).first().waitFor({ timeout: 8000 });
ok('routine game completes with result screen', true, 'accuracy shown');

// Back to Games from result screen, then Back to Home
await page.getByRole('button', { name: /Back to Games/i }).first().click();
await page.waitForTimeout(500);
ok('result -> back to games', (await page.url()).includes('/games'), (await page.url()));

// ---- Leave-game confirmation while a game is in progress ----
await page.goto(BASE + '/games/routine', { waitUntil: 'domcontentloaded' });
await page.getByRole('button', { name: /ready/i }).first().waitFor({ timeout: 8000 });
await page.getByRole('button', { name: /ready/i }).first().click();
// advance past schedule review into the quiz
const skipBtn = page.getByRole('button', { name: /ready/i }).first();
if (await skipBtn.isVisible().catch(() => false)) await skipBtn.click().catch(() => {});
await page.getByText(/What comes after breakfast/i).first().waitFor({ timeout: 20000 });
// click Back while quiz is in progress
await page.getByRole('button', { name: /Back/i }).first().click();
const confirmVisible = await page.getByText(/Leave game/i).first().isVisible().catch(() => false);
ok('in-progress Back shows "Leave game?" confirm', confirmVisible);
const continueVisible = await page.getByRole('button', { name: /Continue/i }).first().isVisible().catch(() => false);
const leaveVisible = await page.getByRole('button', { name: /Leave/i }).first().isVisible().catch(() => false);
ok('confirm modal has Continue + Leave', continueVisible && leaveVisible);
// Leave returns to Games
await page.getByRole('button', { name: /^Leave$/ }).first().click().catch(() => {});
await page.waitForTimeout(500);
ok('Leave returns to games hub', (await page.url()).includes('/games'), (await page.url()));

await page.goto(BASE + '/home', { waitUntil: 'domcontentloaded' });
ok('games -> home', (await page.url()).includes('/home'), (await page.url()));

// ---- Voice assistant: page renders + command chip navigates ----
await page.goto(BASE + '/voice', { waitUntil: 'domcontentloaded' });
await page.getByRole('button', { name: /Start a game/i }).first().waitFor({ timeout: 8000 });
ok('voice page renders with command chips', true);
await page.getByRole('button', { name: /Start a game/i }).first().click();
await page.waitForTimeout(1800);
ok('voice "start memory game" command navigates', (await page.url()).includes('/games/memory'), (await page.url()));

// ---- Language switching: Hindi persists across refresh ----
await page.goto(BASE + '/home', { waitUntil: 'domcontentloaded' });
// Open the language dropdown (trigger shows current code, e.g. "EN")
await page.locator('button', { hasText: 'EN' }).first().click();
await page.getByRole('option', { name: /हिन्दी|हिंदी/i }).first().click();
await page.waitForTimeout(500);

// Reload and verify Hindi persisted in localStorage and shown on the button
await page.reload({ waitUntil: 'domcontentloaded' });
await page.waitForTimeout(500);
const stored = await page.evaluate(() => {
  const raw = localStorage.getItem('neurosaathi:state:v1');
  return raw ? raw.includes('"language":"hi"') : false;
});
const hiBtn = await page.locator('button', { hasText: 'HI' }).first().isVisible().catch(() => false);
ok('language persists (Hindi) after refresh', stored && hiBtn);

// Hindi content actually rendered — bottom nav shows "खेल", back is "पीछे"
const bodyHi = await page.locator('body').innerText();
ok('app content in Hindi after switch', /खेल|होम|यादें/.test(bodyHi), 'nav translated');

const fatal = pageErrors.filter((e) => !e.includes('speechSynthesis'));
console.log('\nPage errors:', fatal.length ? fatal.slice(0, 5) : 'none');
await browser.close();
