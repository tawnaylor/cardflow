const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  const formUrl = 'http://localhost:8000/cardflow/form.html';

  console.log('Opening form page (Yu-Gi-Oh)...');
  await page.goto(formUrl, { waitUntil: 'networkidle' });

  // wait for brand options
  await page.waitForFunction(() => document.querySelectorAll('#brand option').length > 1, { timeout: 5000 });

  console.log('Selecting Yu-Gi-Oh brand...');
  const brandValues = await page.$$eval('#brand option', (opts) => Array.from(opts).map((o) => o.value.trim()));
  const brandValue = brandValues.find((v) => v.toLowerCase().includes('yugioh') || v.toLowerCase().includes('ygo')) || brandValues[1];
  await page.selectOption('#brand', brandValue);

  // wait for series
  await page.waitForFunction(() => document.querySelectorAll('#series option').length > 1, { timeout: 3000 });

  console.log('Filling form fields...');
  await page.fill('#cardName', 'E2E YGO Card');
  await page.fill('#marketValue', '7.77');
  await page.fill('#cardDetails', 'E2E test YGO details');

  // perform search for a known Yu-Gi-Oh card
  await page.fill('#ptcgSearch', 'Blue-Eyes White Dragon');
  await page.click('#ptcgSearchBtn');

  // wait for results and click first Use button
  await page.waitForSelector('.ptcg-result button', { timeout: 7000 });
  await page.click('.ptcg-result button');

  // submit
  // wait for preview image to be set (some APIs fetch images asynchronously)
  try {
    await page.waitForSelector('#imgPreview img', { timeout: 10000 });
  } catch (err) {
    console.log('No preview image found (continuing to submit)');
  }
  // ensure series field has been populated by the picker (or continue)
  try {
    await page.waitForFunction(() => (document.getElementById('series').value || '').trim() !== '', { timeout: 5000 });
  } catch (err) {
    console.log('Series likely not populated yet (continuing)');
  }
  console.log('Submitting form...');
  await page.click('button[type="submit"]');
  await page.waitForTimeout(1200);

  // inspect potential validation errors and field states
  const errs = await page.$$eval('.error', (els) => els.map((e) => e.textContent.trim()));
  console.log('form errors:', errs);
  const seriesVal = await page.$eval('#series', (el) => el.value).catch(() => '<missing>');
  const hasPreview = await page.$eval('#imgPreview', (el) => !!el.querySelector('img')).catch(() => false);
  console.log('series value:', seriesVal, 'hasPreview:', hasPreview);

  // verify storage and UI
  const raw = await page.evaluate(() => localStorage.getItem('binder.cards.v1'));
  const cards = raw ? JSON.parse(raw) : [];
  console.log('localStorage cards count =', cards.length);
  const gridCount = await page.$$eval('#binderGrid button.card', (els) => els.length);
  console.log('binder grid card tiles =', gridCount);

  if (cards.length === 0 || gridCount === 0) {
    console.error('YGO Test failed: no card stored or rendered');
    await browser.close();
    process.exit(2);
  }

  await browser.close();
  console.log('YGO E2E test completed successfully.');
})();