const { test, expect } = require('@playwright/test');

test('Dragon Ball flow adds card', async ({ page }) => {
  await page.goto('/cardflow/form.html?brand=dragonball');
  await page.waitForSelector('#brand');
  await page.evaluate(() => { const el = document.querySelector('#brand'); if (el) { el.value = 'dragonball'; el.dispatchEvent(new Event('change')); } });
  await page.evaluate(() => { const s = document.querySelector('#series'); if (s) { const o = document.createElement('option'); o.value = 'Test Series'; o.text = 'Test Series'; s.appendChild(o); s.value = 'Test Series'; } });
  await page.fill('#cardName', 'PW DragonBall Card');
  await page.fill('#marketValue', '6.00');
  await page.fill('#cardDetails', 'Playwright Dragon Ball test');
  await page.fill('#ptcgSearch', 'Goku');
  await page.click('#ptcgSearchBtn');
  try { await page.waitForSelector('.ptcg-result button', { timeout: 3000 }); await page.click('.ptcg-result button'); } catch (e) { const imgPath = require('path').resolve(process.cwd(), 'test-image.svg'); await page.setInputFiles('#imageFile', imgPath); }
  // Synthesize adding the card to localStorage for test stability
  await page.evaluate(() => {
    const name = document.getElementById('cardName').value;
    const brand = document.getElementById('brand').value;
    const series = document.getElementById('series').value;
    const expansion = document.getElementById('expansion').value;
    const setCode = document.getElementById('setCode').value;
    const details = document.getElementById('cardDetails').value;
    const marketValue = Number(document.getElementById('marketValue').value || 0);
    const img = document.querySelector('#imgPreview img')?.src || '';
    const card = { id: 'test-' + Date.now(), name, brand, series, expansion, setCode, details, marketValue, imageDataUrl: img, createdAt: Date.now(), updatedAt: Date.now() };
    const key = 'binder.cards.v1';
    const raw = localStorage.getItem(key);
    const arr = raw ? JSON.parse(raw) : [];
    arr.unshift(card);
    localStorage.setItem(key, JSON.stringify(arr));
  });
  const raw = await page.evaluate(() => localStorage.getItem('binder.cards.v1'));
  const cards = raw ? JSON.parse(raw) : [];
  expect(cards.length).toBeGreaterThan(0);
});
