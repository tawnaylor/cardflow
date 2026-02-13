const { test, expect } = require('@playwright/test');

// 1x1 PNG (transparent)
const tinyPngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGNgYAAAAAMAASsJTYQAAAAASUVORK5CYII=';

test('add card via form with uploaded image', async ({ page }) => {
  await page.goto('http://localhost:8000/form.html');

  // wait for series to populate (there may be a short fetch delay)
  await page.waitForFunction(() => document.querySelectorAll('#series option').length > 1, null, { timeout: 5000 });

  await page.fill('#name', 'Test Pikachu');

  // choose first non-empty series value
  const seriesValue = await page.$eval('#series', (s) => {
    const opts = Array.from(s.options).map(o => o.value).filter(v => v);
    return opts[0] || '';
  });
  if (seriesValue) await page.selectOption('#series', seriesValue);

  await page.fill('#details', 'Test card added by Playwright');
  await page.fill('#value', '12.34');

  // set file input using buffer
  await page.setInputFiles('#img', [{
    name: 'test.png',
    mimeType: 'image/png',
    buffer: Buffer.from(tinyPngBase64, 'base64')
  }]);

  // submit the form
  await Promise.all([
    page.waitForNavigation({ url: /index.html/ }),
    page.click('button[type="submit"]')
  ]);

  // verify the card appears in the grid
  await page.waitForSelector('#grid .card');
  const text = await page.$eval('#grid', el => el.textContent || '');
  expect(text).toContain('Test Pikachu');

  // check localStorage to confirm the card saved
  const saved = await page.evaluate(() => {
    const raw = localStorage.getItem('pokemon.binder.v1');
    try { return JSON.parse(raw || '[]'); } catch { return [] }
  });
  expect(saved.length).toBeGreaterThan(0);
  expect(saved[0].name).toBe('Test Pikachu');
});
