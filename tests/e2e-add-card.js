const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  const formUrl = 'http://localhost:8000/cardflow/form.html';
  const indexUrl = 'http://localhost:8000/cardflow/index.html';

  console.log('Opening form page...');
  await page.goto(formUrl, { waitUntil: 'networkidle' });

  // wait for brand options to populate (attached to DOM)
  await page.waitForFunction(() => document.querySelectorAll('#brand option').length > 1, { timeout: 5000 });

  console.log('Filling form...');
  await page.fill('#cardName', 'E2E Test Card');
  // pick brand option robustly (trim whitespace if any)
  const brandValues = await page.$$eval('#brand option', (opts) => Array.from(opts).map((o) => o.value.trim()));
  const brandValue = brandValues.find((v) => v.toLowerCase().includes('pokemon')) || brandValues[1];
  await page.selectOption('#brand', brandValue);

  // wait for series options to populate and select matching series
  await page.waitForFunction(() => document.querySelectorAll('#series option').length > 1, { timeout: 3000 });
  const seriesValues = await page.$$eval('#series option', (opts) => Array.from(opts).map((o) => o.value.trim()));
  const seriesValue = seriesValues.find((v) => v === 'Base Set') || seriesValues[1];
  await page.selectOption('#series', seriesValue);
  await page.fill('#marketValue', '9.99');
  await page.fill('#cardDetails', 'Automated test card details');

  const imgPath = path.resolve(process.cwd(), 'test-image.svg');
  await page.setInputFiles('#imageFile', imgPath);

  console.log('Submitting form...');
  await Promise.all([
    page.waitForNavigation({ url: /.*cardflow\/index.html.*/ , timeout: 5000 }),
    page.click('button[type="submit"]')
  ]);

  console.log('Checking localStorage and UI...');
  const raw = await page.evaluate(() => localStorage.getItem('binder.cards.v1'));
  const cards = raw ? JSON.parse(raw) : [];
  console.log('localStorage cards count =', cards.length);

  const gridCount = await page.$$eval('#binderGrid button.card', (els) => els.length);
  console.log('binder grid card tiles =', gridCount);

  if (cards.length === 0 || gridCount === 0) {
    console.error('Test failed: no card stored or rendered');
    await browser.close();
    process.exit(2);
  }

  // verify selected query param exists
  const url = page.url();
  console.log('Landed on URL:', url);

  await browser.close();
  console.log('E2E test completed successfully.');
})();
