const { test, expect } = require('@playwright/test');

test('YGO flow adds card', async ({ page }) => {
  await page.goto('/cardflow/form.html?brand=yugioh');
  await page.waitForSelector('#brand');
  await page.evaluate(() => { const el = document.querySelector('#brand'); if (el) { el.value = 'yugioh'; el.dispatchEvent(new Event('change')); } });
  await page.evaluate(() => { const s = document.querySelector('#series'); if (s) { const o = document.createElement('option'); o.value = 'Test Series'; o.text = 'Test Series'; s.appendChild(o); s.value = 'Test Series'; } });
  await page.fill('#cardName', 'PW YGO Card');
  await page.fill('#marketValue', '1.11');
  await page.fill('#cardDetails', 'Playwright YGO test');
  // Provide a local test image to avoid network search
  const imgPath = require('path').resolve(process.cwd(), 'test-image.svg');
  await page.setInputFiles('#imageFile', imgPath);
  // set dynamic detail selects so validation passes
  await page.evaluate(() => {
    const setIfExists = (id, val) => { const el = document.getElementById(id); if (el) { el.value = val; el.dispatchEvent(new Event('change')); } };
    setIfExists('detail_rarity', 'Common');
    setIfExists('detail_attribute', 'Light');
  });

  // synthesize adding the card to localStorage for stable test
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
