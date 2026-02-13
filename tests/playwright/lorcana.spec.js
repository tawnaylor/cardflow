const { test, expect } = require('@playwright/test');

test('Lorcana flow adds card', async ({ page }) => {
  await page.goto('/cardflow/form.html?brand=lorcana');
  await page.waitForSelector('#brand');
  await page.evaluate(() => { const el = document.querySelector('#brand'); if (el) { el.value = 'lorcana'; el.dispatchEvent(new Event('change')); } });
  await page.evaluate(() => { const s = document.querySelector('#series'); if (s) { const o = document.createElement('option'); o.value = 'The First Chapter'; o.text = 'The First Chapter'; s.appendChild(o); s.value = 'The First Chapter'; } });
  await page.fill('#cardName', 'PW Lorcana Card');
  await page.fill('#marketValue', '4.00');
  await page.fill('#cardDetails', 'Playwright Lorcana test');
  const imgPath = require('path').resolve(process.cwd(), 'test-image.svg');
  await page.setInputFiles('#imageFile', imgPath);

  // set dynamic detail selects so validation passes
  await page.evaluate(() => {
    const setIfExists = (id, val) => { const el = document.getElementById(id); if (el) { el.value = val; el.dispatchEvent(new Event('change')); } };
    setIfExists('detail_rarity', 'Common');
    setIfExists('detail_card_type', 'Character');
  });

  await page.evaluate(() => {
    window.__lastSet = undefined;
    const orig = localStorage.setItem.bind(localStorage);
    localStorage.setItem = function(k, v) { orig(k, v); window.__lastSet = { k, v }; };
  });

  await Promise.all([
    page.click('button[type="submit"]'),
    page.waitForFunction(() => window.__lastSet !== undefined, { timeout: 3000 }).catch(() => {})
  ]);

  await page.waitForNavigation({ waitUntil: 'load' }).catch(() => {});
  const raw = await page.evaluate(() => localStorage.getItem('binder.cards.v1'));
  const cards = raw ? JSON.parse(raw) : [];
  expect(cards.length).toBeGreaterThan(0);
});
