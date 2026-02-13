const { test, expect } = require('@playwright/test');

test('YGO flow adds card', async ({ page }) => {
  await page.goto('/cardflow/form.html');
  await page.waitForFunction(() => window.__cardflow_ready === true);
  const brandValues = await page.$$eval('#brand option', (opts) => Array.from(opts).map(o => o.value.trim()));
  const brandValue = brandValues.find(v => v.toLowerCase().includes('yugioh') || v.toLowerCase().includes('ygo')) || brandValues[1];
  await page.selectOption('#brand', brandValue);
  await page.fill('#cardName', 'PW YGO Card');
  await page.fill('#marketValue', '1.11');
  await page.fill('#cardDetails', 'Playwright YGO test');
  await page.fill('#ptcgSearch', 'Blue-Eyes White Dragon');
  await page.click('#ptcgSearchBtn');
  await page.waitForSelector('.ptcg-result button');
  await page.click('.ptcg-result button');
  await page.waitForSelector('#imgPreview img').catch(() => {});
  await page.click('button[type="submit"]');
  await page.waitForTimeout(800);
  const raw = await page.evaluate(() => localStorage.getItem('binder.cards.v1'));
  const cards = raw ? JSON.parse(raw) : [];
  expect(cards.length).toBeGreaterThan(0);
});
