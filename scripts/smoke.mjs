// Headless smoke test against the dev server (vite on :5173).
// Drives Edge/Chrome via playwright-core; reports page errors and asserts
// the Demo Mode sequence plus the main routes all render.
import { chromium } from 'playwright-core';
import fs from 'node:fs';

const BROWSER = [
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
].find((p) => fs.existsSync(p));

const BASE = process.env.BASE_URL ?? 'http://localhost:5173';

const results = [];
let pageErrors = [];
let consoleErrors = [];

function ok(name, cond, extra = '') {
  results.push({ name, pass: !!cond, extra });
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${extra ? '  · ' + extra : ''}`);
}

const browser = await chromium.launch({ executablePath: BROWSER, headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
page.on('pageerror', (e) => pageErrors.push(String(e)));
page.on('console', (m) => {
  if (m.type() === 'error') consoleErrors.push(m.text());
});

async function open(path, expectText, label) {
  await page.goto(BASE + path, { waitUntil: 'domcontentloaded' });
  try {
    await page.getByText(expectText, { exact: false }).first().waitFor({ timeout: 12000 });
    ok(label + ' renders "' + expectText + '"', true);
  } catch {
    ok(label + ' renders "' + expectText + '"', false, 'text not found on ' + path);
  }
  await page.evaluate(() => localStorage.clear()); // fresh demo state each route
  await page.reload({ waitUntil: 'domcontentloaded' });
}

// ---- 1. Landing + role entry ----
await open('/', 'NEUROSAATHI', 'Landing');
await open('/login', 'Elder', 'Role select');

// ---- 2. Demo mode full walkthrough ----
await page.goto(BASE + '/demo', { waitUntil: 'domcontentloaded' });
await page.getByText(/Demo Step/).first().waitFor({ timeout: 12000 });
ok('/demo opens', true);

const stepLabels = [
  'Patient onboarding', 'Voice interaction', 'Memory game', 'Performance calculation',
  'AI difficulty adaptation', 'Reminder completion', 'Family memory game',
  'Offline simulation', 'Data synchronization', 'Caregiver dashboard', 'AI insight',
  'Attention indicator',
];
for (let i = 0; i < stepLabels.length; i++) {
  try {
    await page.getByText(stepLabels[i], { exact: false }).first().waitFor({ timeout: 8000 });
    ok(`demo step ${i + 1}: ${stepLabels[i]}`, true);
  } catch {
    ok(`demo step ${i + 1}: ${stepLabels[i]}`, false, 'not visible');
  }
  // Trigger a step's interactive demo only via full, unambiguous button labels
  // (the header's step chips also contain emoji, which would re-route the demo).
  const triggers = ['Simulate Offline Mode', 'Attention Indicator Triggered'];
  for (const t of triggers) {
    const el = page.getByRole('button', { name: new RegExp(t) }).first();
    if (await el.isVisible().catch(() => false)) {
      await el.click().catch(() => {});
      break;
    }
  }
  const next = page.getByRole('button', { name: /Next Step|Finish Demo/ }).first();
  await next.scrollIntoViewIfNeeded().catch(() => {});
  await next.click().catch(() => {});
  await page.waitForTimeout(120);
}
await page.getByRole('button', { name: /Finish Demo/ }).isVisible().catch(() => {});
ok('demo sequence completed without crash', pageErrors.length === 0, pageErrors.slice(0, 2).join(' | '));

// ---- 3. Patient flow ----
await open('/home', 'Asha', 'Patient home');
await open('/games', 'Games', 'Games hub');
await open('/memories', 'Family', 'Memories');
await open('/progress', 'My Progress', 'Progress');
await open('/reminders', 'Adherence', 'Reminders');

// ---- 4. A game launches (full scoring verified separately) ----
// Winning a round → result screen needs careful card clicking (700ms mismatch
// lock + DOM re-indexing makes naive sweeps flaky), so the scoring round-trip is
// driven by scripts/memory-final.mjs, which provably resolves every pair.
await page.goto(BASE + '/games/memory', { waitUntil: 'domcontentloaded' });
await page.getByRole('button', { name: /Start/i }).first().waitFor({ timeout: 10000 });
ok('memory game launches (start screen)', true, 'end-to-end scoring: node scripts/memory-final.mjs');

// ---- 5. Caregiver flow (switch role first — routes are role-gated) ----
await page.goto(BASE + '/login', { waitUntil: 'domcontentloaded' });
await page.getByRole('button', { name: /Caregiver/i }).first().click();
await page.waitForTimeout(300);
ok('switched to caregiver role', true);
const cg = async (path, text, label) => {
  await page.goto(BASE + path, { waitUntil: 'domcontentloaded' });
  try {
    await page.getByText(text, { exact: false }).first().waitFor({ timeout: 12000 });
    ok(label, true);
  } catch {
    ok(label, false, 'text not found on ' + path);
  }
};
await cg('/caregiver', 'Asha Sharma', 'Caregiver overview');
await cg('/caregiver/patients', 'Rohan', 'Caregiver patients');
await cg('/caregiver/insights', 'not a medical diagnosis', 'Caregiver insights');
await cg('/caregiver/alerts', 'Attention Indicator', 'Caregiver alerts');
await cg('/caregiver/activity', 'Timeline', 'Caregiver activity');

// ---- 6. Privacy + Architecture ----
await open('/architecture', 'System Architecture', 'Architecture');
await open('/privacy', 'Privacy', 'Privacy');

// ---- summary ----
const failed = results.filter((r) => !r.pass).length;
const routePageErrors = pageErrors.filter((e) => !e.includes('speechSynthesis'));
console.log('\n=====================');
console.log(`${results.length - failed}/${results.length} checks passed`);
if (routePageErrors.length) {
  console.log('PAGE ERRORS:');
  routePageErrors.slice(0, 6).forEach((e) => console.log('  -', e));
}
if (consoleErrors.length) {
  console.log(`Console error messages: ${consoleErrors.length}`);
  consoleErrors.slice(0, 5).forEach((e) => console.log('  -', e));
}
await browser.close();
process.exit(failed > 0 ? 1 : 0);