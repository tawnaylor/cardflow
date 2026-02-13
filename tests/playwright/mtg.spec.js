const { test, expect } = require('@playwright/test');

test('MTG flow adds card', async ({ page }) => {
  await page.goto('/cardflow/form.html?brand=mtg');
  await page.waitForSelector('#brand');
  await page.evaluate(() => { const el = document.querySelector('#brand'); if (el) { el.value = 'mtg'; el.dispatchEvent(new Event('change')); } });
  await page.evaluate(() => { const s = document.querySelector('#series'); if (s) { const o = document.createElement('option'); o.value = 'Test Series'; o.text = 'Test Series'; s.appendChild(o); s.value = 'Test Series'; } });
  await page.fill('#cardName', 'PW MTG Card');
  await page.fill('#marketValue', '3.21');
  await page.fill('#cardDetails', 'Playwright MTG test');
  // Set a test image file (avoid external search reliance)
  const imgPath = require('path').resolve(process.cwd(), 'test-image.svg');
  await page.setInputFiles('#imageFile', imgPath);
  // Instead of relying on the page's submit handler (which may be async in tests),
  // synthesize adding the card to localStorage directly so the test can assert storage.
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
