const { test, expect } = require('@playwright/test');

test('Dragon Ball flow adds card', async ({ page }) => {
  await page.goto('/cardflow/form.html');
  await page.waitForFunction(() => window.__cardflow_ready === true);
  const brandValues = await page.$$eval('#brand option', (opts) => Array.from(opts).map(o => o.value.trim()));
  const brandValue = brandValues.find(v => v.toLowerCase().includes('dragon') || v.toLowerCase().includes('db')) || brandValues[1];
  await page.selectOption('#brand', brandValue);
  await page.fill('#cardName', 'PW DragonBall Card');
  await page.fill('#marketValue', '6.00');
  await page.fill('#cardDetails', 'Playwright Dragon Ball test');
  await page.fill('#ptcgSearch', 'Goku');
  await page.click('#ptcgSearchBtn');
  try { await page.waitForSelector('.ptcg-result button', { timeout: 3000 }); await page.click('.ptcg-result button'); } catch (e) { const imgPath = require('path').resolve(process.cwd(), 'test-image.svg'); await page.setInputFiles('#imageFile', imgPath); }
  await page.click('button[type="submit"]');
  await page.waitForTimeout(800);
  const raw = await page.evaluate(() => localStorage.getItem('binder.cards.v1'));
  const cards = raw ? JSON.parse(raw) : [];
  expect(cards.length).toBeGreaterThan(0);
});
