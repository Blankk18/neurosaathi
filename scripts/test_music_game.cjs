const { chromium } = require('playwright-core');
const fs = require('fs');
const path = require('path');

async function runTest() {
  const exe = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
  const outDir = path.join(__dirname, '..', 'screenshots');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  console.log('Launching browser with:', exe);
  const browser = await chromium.launch({
    executablePath: exe,
    headless: true,
    args: ['--autoplay-policy=no-user-gesture-required'],
  });

  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
  });
  const page = await context.newPage();

  const results = [];

  try {
    // 1. Games Hub
    console.log('1. Navigating to Games Hub...');
    await page.goto('http://localhost:5173/games', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    const text = await page.content();
    const hasGuessLyric = text.includes('Guess the Next Lyric');
    const hasGentle = text.includes('Gentle');
    const hasPattern = text.includes('Pattern & Attention');

    console.log(`- "Guess the Next Lyric" visible: ${hasGuessLyric}`);
    console.log(`- "Gentle" badge visible: ${hasGentle}`);
    console.log(`- "Pattern & Attention" in visible hub cards: ${hasPattern}`);

    await page.screenshot({ path: path.join(outDir, '01_games_hub.png') });
    results.push({ test: 'GamesHub Card Replacement', pass: hasGuessLyric && !hasPattern && hasGentle });

    // 2. Open Game
    console.log('2. Opening Guess the Next Lyric...');
    const card = page.locator('text=Guess the Next Lyric').first();
    await card.click();
    await page.waitForURL('**/games/music-memory', { timeout: 5000 });
    await page.waitForTimeout(800);

    console.log('- Current URL:', page.url());
    await page.screenshot({ path: path.join(outDir, '02_game_intro_desktop.png') });
    results.push({ test: 'Route /games/music-memory', pass: page.url().includes('/games/music-memory') });

    // 3. Start Song 1
    console.log('3. Starting Song 1 (Zindagi Ek Safar)...');
    const startBtn = page.locator('button:has-text("Start")');
    await startBtn.click();
    await page.waitForTimeout(1500);

    // Check audio element
    const audioInfo = await page.evaluate(() => {
      const el = window.__activeAudio || document.querySelector('audio');
      return {
        exists: !!el,
        src: el ? el.src : '',
        currentTime: el ? el.currentTime : 0,
        paused: el ? el.paused : true,
      };
    });
    console.log('- Audio state on start:', audioInfo);
    await page.screenshot({ path: path.join(outDir, '03_song1_listening.png') });

    // Trigger clip completion
    console.log('4. Advancing clip to boundary to show question...');
    await page.evaluate(() => {
      const el = document.querySelector('audio');
      if (el) {
        // Advance past clip end time to trigger natural question transition
        el.currentTime += 25;
        el.dispatchEvent(new Event('timeupdate'));
      }
    });
    await page.waitForTimeout(1200);

    // Check Question & Choices
    const questionText = await page.getByRole('heading', { name: 'What comes next?' }).isVisible();
    const choiceButtons = page.locator('div[role="group"] button');
    const choiceCount = await choiceButtons.count();
    console.log(`- Question visible: ${questionText}`);
    console.log(`- Answer buttons count: ${choiceCount}`);

    await page.screenshot({ path: path.join(outDir, '04_song1_question.png') });
    results.push({ test: 'Question and 3 choices appear', pass: questionText && choiceCount === 3 });

    // Test Answer Choice
    console.log('5. Selecting answer...');
    await choiceButtons.first().click();
    await page.waitForTimeout(1000);

    const feedbackEl = page.locator('div.rounded-2xl p.font-extrabold').first();
    const feedbackText = await feedbackEl.textContent();
    const feedbackVisible = (feedbackText || '').includes('remembered') || (feedbackText || '').includes('okay');
    console.log(`- Feedback text: "${feedbackText}", valid: ${feedbackVisible}`);
    results.push({ test: 'Friendly feedback displays', pass: feedbackVisible });

    // Check Full Song Player
    console.log('6. Checking Full Song Player controls...');
    const fullPlayerVisible = await page.locator('text=Listen to the full song').isVisible();
    const playPauseBtn = page.locator('button[aria-label="Play song"], button[aria-label="Pause song"]');
    const restartBtn = page.locator('button[aria-label="Restart song from the beginning"]');
    const loopBtn = page.locator('button[aria-label="Loop song"]');
    const seekInput = page.locator('input[aria-label="Seek position in song"]');

    console.log(`- Full player visible: ${fullPlayerVisible}`);
    console.log(`- Play/Pause button exists: ${await playPauseBtn.count() > 0}`);
    console.log(`- Restart button exists: ${await restartBtn.count() > 0}`);
    console.log(`- Loop button exists: ${await loopBtn.count() > 0}`);
    console.log(`- Seek input exists: ${await seekInput.count() > 0}`);

    await page.screenshot({ path: path.join(outDir, '05_song1_full_player.png') });
    results.push({ test: 'Full Song Player controls', pass: fullPlayerVisible && (await playPauseBtn.count() > 0) });

    // Test Player Interaction
    console.log('7. Testing Full Song Play & Loop...');
    await playPauseBtn.first().click();
    await page.waitForTimeout(500);
    await loopBtn.first().click();
    await page.waitForTimeout(500);

    // 8. Next Song (Song 2)
    console.log('8. Advancing to Song 2 (Yeh Dosti)...');
    const nextBtn = page.locator('button:has-text("Next Song")');
    await nextBtn.click();
    await page.waitForTimeout(1000);

    const song2Intro = await page.locator('text=Yeh Dosti Hum Nahi Todenge').first().isVisible();
    console.log(`- Song 2 title visible: ${song2Intro}`);
    await page.screenshot({ path: path.join(outDir, '06_song2_intro.png') });
    results.push({ test: 'Song 2 Transition', pass: song2Intro });

    // Start Song 2
    const startBtn2 = page.locator('button:has-text("Start")');
    await startBtn2.click();
    await page.waitForTimeout(1000);

    // Advance Song 2 to question
    await page.evaluate(() => {
      const el = document.querySelector('audio');
      if (el) {
        el.currentTime += 25;
        el.dispatchEvent(new Event('timeupdate'));
      }
    });
    await page.waitForTimeout(1200);

    const song2Question = await page.getByRole('heading', { name: 'What comes next?' }).isVisible();
    const song2Choices = page.locator('div[role="group"] button');
    console.log(`- Song 2 question visible: ${song2Question}, choices: ${await song2Choices.count()}`);
    await page.screenshot({ path: path.join(outDir, '07_song2_question.png') });

    // Answer Song 2
    if (await song2Choices.count() > 0) {
      await song2Choices.first().click();
      await page.waitForTimeout(1000);
    }

    // Complete button
    console.log('9. Completing game...');
    const completeBtn = page.locator('button:has-text("Complete")');
    await completeBtn.click();
    await page.waitForTimeout(1000);

    const completionText = await page.getByRole('heading', { name: 'That was lovely! 🎵' }).isVisible();
    console.log(`- Completion screen visible: ${completionText}`);
    await page.screenshot({ path: path.join(outDir, '08_completion_screen.png') });
    results.push({ test: 'Game Completion Screen', pass: completionText });

    // 10. Mobile Viewport Test
    console.log('10. Testing Mobile Viewports (390x844)...');
    await page.setViewportSize({ width: 390, height: 844 });
    const playAgainBtn = page.locator('button:has-text("Play Again")');
    await playAgainBtn.click();
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(outDir, '09_mobile_intro_390px.png') });

    const startBtnMobile = page.locator('button:has-text("Start")');
    await startBtnMobile.click();
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(outDir, '10_mobile_quiz_390px.png') });

    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    const noHorizontalScroll = scrollWidth <= clientWidth;
    console.log(`- Mobile scroll check: scrollWidth=${scrollWidth}, clientWidth=${clientWidth}, valid=${noHorizontalScroll}`);
    results.push({ test: 'Mobile 390px No Horizontal Overflow', pass: noHorizontalScroll });

    // 11. Audio Cleanup on Navigate Away
    console.log('11. Testing Audio Cleanup on Navigation to /home...');
    await page.goto('http://localhost:5173/home');
    await page.waitForTimeout(1000);

    const audioAfterNav = await page.evaluate(() => {
      const el = document.querySelector('audio');
      return el ? { paused: el.paused, src: el.src } : { paused: true, src: '' };
    });
    console.log('- Audio after navigation:', audioAfterNav);
    results.push({ test: 'Audio stops completely on navigation', pass: audioAfterNav.paused });

  } catch (err) {
    console.error('Test error:', err);
    results.push({ test: 'Execution', pass: false, error: err.message });
  } finally {
    await browser.close();
  }

  console.log('\n========================================');
  console.log('TEST SUMMARY RESULTS:');
  console.log('========================================');
  let allPassed = true;
  for (const r of results) {
    console.log(`[${r.pass ? 'PASS' : 'FAIL'}] ${r.test}`);
    if (!r.pass) allPassed = false;
  }
  console.log(`\nOverall: ${allPassed ? 'ALL TESTS PASSED' : 'SOME TESTS FAILED'}`);

  fs.writeFileSync(
    path.join(outDir, 'test_results.json'),
    JSON.stringify({ passed: allPassed, results }, null, 2)
  );
}

runTest();
