const { test, expect } = require('@playwright/test');

const SEED_COUNT = 5;
const STORAGE_KEY = 'pokemon.binder.v1';

test('seed five cards for visuals', async ({ page }) => {
  await page.goto('http://localhost:8000');

  const q = 'set.name:"Base Set"';
  const url = `https://api.pokemontcg.io/v2/cards?q=${encodeURIComponent(q)}&pageSize=${SEED_COUNT}`;

  const data = await page.evaluate(async ({ u, t }) => {
    try {
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), t);
      const r = await fetch(u, { signal: controller.signal });
      clearTimeout(id);
      if (!r.ok) return { error: `Fetch failed: ${r.status}` };
      return await r.json();
    } catch (err) {
      return { error: err?.name === 'AbortError' ? 'timeout' : (err?.message || 'fetch error') };
    }
  }, { u: url, t: 5000 });

  let cards = [];
  if (!data || data.error) {
    // fallback placeholders with small transparent png
    const tiny = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGNgYAAAAAMAASsJTYQAAAAASUVORK5CYII=';
    cards = Array.from({ length: SEED_COUNT }).map((_, i) => ({
      id: `seed_vis_${Date.now()}_${i}`,
      name: `BaseSet Card ${i + 1}`,
      series: 'Base Set',
      details: 'Placeholder card',
      marketValue: Math.floor(Math.random() * 30) + 1,
      imageDataUrl: tiny,
      createdAt: Date.now() - i * 1000
    }));
  } else {
    cards = (data.data || []).slice(0, SEED_COUNT).map((c, i) => ({
      id: c.id || `seed_vis_${Date.now()}_${i}`,
      name: c.name || `Card ${i + 1}`,
      series: c.set?.name || 'Base Set',
      details: [c.rarity, c.supertype, c.subtype].filter(Boolean).join(' • '),
      marketValue: Math.floor(Math.random() * 30) + 1,
      imageDataUrl: c.images?.large || c.images?.small || '',
      createdAt: Date.now() - i * 1000
    }));
  }

  await page.evaluate(({ key, cards }) => {
    localStorage.setItem(key, JSON.stringify(cards));
  }, { key: STORAGE_KEY, cards });

  await page.goto('http://localhost:8000/index.html');
  await page.waitForSelector('#grid .card');
  const count = await page.$$eval('#grid .card', els => els.length);
  expect(count).toBeGreaterThanOrEqual(cards.length);
});
