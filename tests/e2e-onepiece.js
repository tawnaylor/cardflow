const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const formUrl = 'http://localhost:8000/cardflow/form.html';

  console.log('Opening form page (One Piece)...');
  await page.goto(formUrl, { waitUntil: 'networkidle' });

  await page.waitForFunction(() => document.querySelectorAll('#brand option').length > 1, { timeout: 5000 });
  const brandValues = await page.$$eval('#brand option', (opts) => Array.from(opts).map((o) => o.value.trim()));
  const brandValue = brandValues.find((v) => v.toLowerCase().includes('one') || v.toLowerCase().includes('onepiece')) || brandValues[1];
  await page.selectOption('#brand', brandValue);
  await page.waitForFunction(() => document.querySelectorAll('#series option').length > 1, { timeout: 3000 }).catch(() => {});

  console.log('Filling form fields...');
  await page.fill('#cardName', 'E2E OnePiece Card');
  await page.fill('#marketValue', '5.55');
  await page.fill('#cardDetails', 'E2E test One Piece details');

  // attempt search
  await page.fill('#ptcgSearch', 'Luffy');
  await page.click('#ptcgSearchBtn');

  // if results appear, use first; otherwise fallback to manual upload
  try {
    await page.waitForSelector('.ptcg-result button', { timeout: 7000 });
    await page.click('.ptcg-result button');
    await page.waitForSelector('#imgPreview img', { timeout: 7000 }).catch(() => {});
  } catch (e) {
    // fallback: upload local test image
    const imgPath = path.resolve(process.cwd(), 'test-image.svg');
    await page.setInputFiles('#imageFile', imgPath);
    // ensure series has a value (validation requires it)
    const hasSeries = await page.$eval('#series', (el) => !!(el.value && el.value.trim())).catch(() => false);
    if (!hasSeries) {
      // try select first option or add a manual one
      const firstOpt = await page.$$eval('#series option', (opts) => (opts[1] && opts[1].value) ? opts[1].value : 'Test Series');
      await page.selectOption('#series', firstOpt).catch(async () => {
        await page.evaluate(() => {
          const s = document.getElementById('series'); const o = document.createElement('option'); o.value = 'Test Series'; o.text = 'Test Series'; s.appendChild(o); s.value = 'Test Series';
        });
      });
    }
  }

  console.log('Submitting form...');
  await page.click('button[type="submit"]');
  await page.waitForTimeout(1200);

  // diagnostics
  const errs = await page.$$eval('.error', (els) => els.map((e) => e.textContent.trim()));
  console.log('form errors:', errs);
  const raw = await page.evaluate(() => localStorage.getItem('binder.cards.v1'));
  const cards = raw ? JSON.parse(raw) : [];
  console.log('localStorage cards count =', cards.length);
  const gridCount = await page.$$eval('#binderGrid button.card', (els) => els.length);
  console.log('binder grid card tiles =', gridCount);

  if (cards.length === 0 || gridCount === 0) {
    console.error('One Piece Test failed: no card stored or rendered');
    await browser.close();
    process.exit(2);
  }

  await browser.close();
  console.log('One Piece E2E test completed successfully.');
})();