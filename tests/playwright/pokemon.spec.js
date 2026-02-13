const { test, expect } = require('@playwright/test');

test('Pokémon flow adds card', async ({ page }) => {
  await page.goto('/cardflow/form.html?brand=pokemon');
  await page.waitForSelector('#brand');
  await page.evaluate(() => { const el = document.querySelector('#brand'); if (el) { el.value = 'pokemon'; el.dispatchEvent(new Event('change')); } });
  await page.evaluate(() => { const s = document.querySelector('#series'); if (s) { const o = document.createElement('option'); o.value = 'Base Set'; o.text = 'Base Set'; s.appendChild(o); s.value = 'Base Set'; } });
  await page.fill('#cardName', 'PW Pikachu');
  await page.fill('#marketValue', '2.22');
  await page.fill('#cardDetails', 'Playwright Pokémon test');
  // Avoid using file uploads in the E2E flow; inject a small data URL as the fetched image
  await page.evaluate(() => {
    const smallSvg = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16"><rect width="16" height="16" fill="#f4c2c2"/></svg>';
    const dataUrl = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(smallSvg)));
    const preview = document.getElementById('imgPreview');
    if (preview) preview.innerHTML = `<img alt="Preview" src="${dataUrl}" />`;
    window.__injected_test_image = dataUrl;
    const els = document.getElementById('cardForm') ? { _fetchedImageDataUrl: dataUrl } : null;
    if (els) { document.querySelector && (document.querySelector('#imgPreview').dataset.test = '1'); }
    // set internal pointer used by form.js
    window.__injected_fetched = dataUrl;
    try { window._fetchedImageDataUrl = dataUrl; } catch (e) {}
    try { document.getElementById('imgPreview').innerHTML = `<img src="${dataUrl}" alt="Preview"/>`; } catch (e) {}
  });
  // set dynamic detail selects so validation passes
  await page.evaluate(() => {
    const setIfExists = (id, val) => { const el = document.getElementById(id); if (el) { el.value = val; el.dispatchEvent(new Event('change')); } };
    setIfExists('detail_rarity', 'Common');
    setIfExists('detail_card_type', 'Pokémon');
  });

  // Submit, then open a new page and check persisted localStorage for the save flag
  await page.click('button[type="submit"]');
  const p2 = await page.context().newPage();
  await p2.goto('/cardflow/index.html');
  await p2.waitForFunction(() => !!localStorage.getItem('__cardflow_saved'), { timeout: 3000 }).catch(() => {});
  const raw = await p2.evaluate(() => localStorage.getItem('binder.cards.v1'));
  const cards = raw ? JSON.parse(raw) : [];
  expect(cards.length).toBeGreaterThan(0);
});
