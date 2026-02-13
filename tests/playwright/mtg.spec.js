const { test, expect } = require('@playwright/test');

test('MTG flow adds card', async ({ page }) => {
  await page.goto('/cardflow/form.html');
  await page.waitForFunction(() => window.__cardflow_ready === true);
  const brandValues = await page.$$eval('#brand option', (opts) => Array.from(opts).map(o => o.value.trim()));
  const brandValue = brandValues.find(v => v.toLowerCase().includes('mtg') || v.toLowerCase().includes('magic')) || brandValues[1];
  await page.selectOption('#brand', brandValue);
  await page.fill('#cardName', 'PW MTG Card');
  await page.fill('#marketValue', '3.21');
  await page.fill('#cardDetails', 'Playwright MTG test');
  await page.fill('#ptcgSearch', 'Lightning Bolt');
  await page.click('#ptcgSearchBtn');
  await page.waitForSelector('.ptcg-result button');
  await page.click('.ptcg-result button');
  await page.waitForSelector('#imgPreview img').catch(() => {});
  await page.click('button[type="submit"]');
  // wait for short time to allow storage update
  await page.waitForTimeout(800);
  const raw = await page.evaluate(() => localStorage.getItem('binder.cards.v1'));
  const cards = raw ? JSON.parse(raw) : [];
  expect(cards.length).toBeGreaterThan(0);
});
