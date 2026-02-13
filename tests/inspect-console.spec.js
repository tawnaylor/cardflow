const { test, expect } = require('@playwright/test');

test('inspect console across pages', async ({ page }) => {
  const logs = [];
  page.on('console', (msg) => logs.push({ type: msg.type(), text: msg.text() }));

  // Index
  await page.goto('http://localhost:8000/index.html');
  await page.waitForSelector('#grid', { timeout: 5000 });

  // open first card if present
  const firstId = await page.evaluate(() => {
    try {
      const raw = localStorage.getItem('pokemon.binder.v1');
      const arr = raw ? JSON.parse(raw) : [];
      return Array.isArray(arr) && arr[0] ? arr[0].id : null;
    } catch (e) {
      return null;
    }
  });

  if (firstId) {
    await page.goto(`http://localhost:8000/card.html?id=${firstId}`);
    await page.waitForSelector('#view', { timeout: 5000 });
  }

  // form
  await page.goto('http://localhost:8000/form.html');
  await page.waitForSelector('#f', { timeout: 5000 });

  // output captured console
  console.log('--- CAPTURED CONSOLE MESSAGES START ---');
  for (const l of logs) console.log(l.type.toUpperCase(), l.text);
  console.log('--- CAPTURED CONSOLE MESSAGES END ---');

  const errors = logs.filter(l => l.type === 'error');
  expect(errors.length).toBe(0);
});
