const { test, expect } = require('@playwright/test');

// Seeds the app's localStorage with cards from the "Base Set" series.
// Adjust `SEED_COUNT` to change how many cards are added.
const SEED_COUNT = 20;
const STORAGE_KEY = 'pokemon.binder.v1';

test('seed base set into binder', async ({ page }) => {
  // Ensure the app origin is available
  await page.goto('http://localhost:8000');

  // Fetch cards from PokéTCG API using Playwright's APIRequest
  const q = 'set.name:"Base Set"';
  const url = `https://api.pokemontcg.io/v2/cards?q=${encodeURIComponent(q)}&pageSize=${SEED_COUNT}`;
  // try to fetch in browser context with a short timeout; fall back to generated placeholders
  const data = await page.evaluate(async ({ u, t }) => {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), t);
    try {
      const r = await fetch(u, { signal: controller.signal });
      clearTimeout(id);
      if (!r.ok) return { error: `Fetch failed: ${r.status}` };
      return await r.json();
    } catch (err) {
      return { error: err?.name === 'AbortError' ? 'timeout' : (err?.message || 'fetch error') };
    }
  }, { u: url, t: 6000 });
  let cards = [];
  if (!data || data.error) {
    // fallback: generate placeholder cards with a tiny transparent PNG
    const tiny = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGNgYAAAAAMAASsJTYQAAAAASUVORK5CYII=';
    cards = Array.from({ length: SEED_COUNT }).map((_, i) => ({
      id: `seed_placeholder_${Date.now()}_${i}`,
      name: `Base Set Placeholder ${i + 1}`,
      series: 'Base Set',
      details: 'Placeholder card (no API access)',
      marketValue: Math.floor(Math.random() * 30) + 1,
      imageDataUrl: tiny,
      createdAt: Date.now() - i * 1000
    }));
  } else {
    cards = (data.data || []).slice(0, SEED_COUNT).map((c, i) => ({
      id: c.id || `seed_${Date.now()}_${i}`,
      name: c.name || 'Unknown',
      series: c.set?.name || 'Base Set',
      details: [c.rarity, c.supertype, c.subtype].filter(Boolean).join(' • '),
      marketValue: Math.floor(Math.random() * 30) + 1,
      imageDataUrl: c.images?.large || c.images?.small || '',
      createdAt: Date.now() - i * 1000
    }));
  }

  // Save into localStorage under the app origin
  await page.evaluate(({ key, cards }) => {
    localStorage.setItem(key, JSON.stringify(cards));
  }, { key: STORAGE_KEY, cards });

  // Navigate to index and check grid shows seeded cards
  await page.goto('http://localhost:8000/index.html');
  await page.waitForSelector('#grid .card');
  const savedCount = await page.$$eval('#grid .card', els => els.length);
  expect(savedCount).toBeGreaterThanOrEqual(cards.length);
});
