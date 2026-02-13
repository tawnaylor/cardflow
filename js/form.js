import { uid, fileToDataUrl } from "./utils.js";
import { addCard } from "./storage.js";
import { fetchBrandSeries, fetchMarketSample, getBrandOptions, getSeriesForBrand, getBrandName } from "./data.js";
import { setSelectOptions } from "./ui.js";

const els = {
  form: document.getElementById("cardForm"),
  cardName: document.getElementById("cardName"),
  brand: document.getElementById("brand"),
  series: document.getElementById("series"),
  expansion: document.getElementById("expansion"),
  setCode: document.getElementById("setCode"),
  ptcgSearch: document.getElementById("ptcgSearch"),
  ptcgSearchBtn: document.getElementById("ptcgSearchBtn"),
  ptcgResults: document.getElementById("ptcgResults"),
  marketValue: document.getElementById("marketValue"),
  cardDetailsFields: document.getElementById("cardDetailsFields"),
  cardDetails: document.getElementById("cardDetails"),
  imageFile: document.getElementById("imageFile"),
  imgPreview: document.getElementById("imgPreview"),
  resetBtn: document.getElementById("resetBtn")
};

// Definitions for brand-specific detail dropdowns
const detailFieldDefs = {
  pokemon: [
    { id: 'rarity', label: 'Rarity', options: ['Common','Uncommon','Rare','Holo Rare','Ultra Rare','Secret Rare','Promo'] },
    { id: 'card_type', label: 'Card Type', options: ['Pokémon','Trainer','Energy'] }
  ],
  mtg: [
    { id: 'rarity', label: 'Rarity', options: ['Basic','Common','Uncommon','Rare','Mythic Rare'] },
    { id: 'color', label: 'Color', options: ['White','Blue','Black','Red','Green','Colorless','Multicolor'] }
  ],
  yugioh: [
    { id: 'rarity', label: 'Rarity', options: ['Common','Rare','Super Rare','Ultra Rare','Secret Rare'] },
    { id: 'attribute', label: 'Attribute', options: ['Light','Dark','Earth','Water','Fire','Wind'] }
  ],
  onepiece: [
    { id: 'rarity', label: 'Rarity', options: ['Common','Uncommon','Rare','Super Rare'] },
    { id: 'card_class', label: 'Card Class', options: ['Character','Event','Stage','Other'] }
  ],
  dragonball: [
    { id: 'rarity', label: 'Rarity', options: ['Common','Uncommon','Rare','Super Rare','Secret Rare'] },
    { id: 'card_type', label: 'Type', options: ['Leader','Battle','Extra','Unison','Other'] }
  ],
  lorcana: [
    { id: 'rarity', label: 'Rarity', options: ['Common','Uncommon','Rare','Legendary'] },
    { id: 'card_type', label: 'Type', options: ['Character','Item','Action','Other'] }
  ]
};

let brandData = null;
let marketSample = {};
let expansions = [];
let currentSearchPage = 1;
let lastSearchQuery = '';

init().catch(console.error);

async function init() {
  brandData = await fetchBrandSeries();
  marketSample = await fetchMarketSample();

  // load expansions list
  try {
    const res = await fetch("../data/pokemon-tcg-sets.json");
    if (res.ok) {
      expansions = await res.json();
      const opts = (expansions ?? []).map((s) => ({ id: s.id, name: s.name }));
      setSelectOptions(els.expansion, opts, "Select expansion…");
      // populate setCode dropdown (use id as short code)
      const setOpts = (expansions ?? []).map((s) => ({ id: s.id, name: s.id + ' — ' + s.name }));
      setSelectOptions(els.setCode, setOpts, "Select set code…");
      // attempt to fetch official PTCG set ids at runtime and merge (browser will have network)
      (async () => {
        try {
          const controller = new AbortController();
          const to = setTimeout(() => controller.abort(), 2000);
          const apiRes = await fetch('https://api.pokemontcg.io/v2/sets?pageSize=500', { signal: controller.signal });
          clearTimeout(to);
          if (apiRes.ok) {
            const apiJson = await apiRes.json();
            const apiSets = apiJson.data ?? [];
            const normalize = (s) => (s || '').toString().toLowerCase().replace(/[:\-–—\s]+/g, ' ').trim();
            const apiMap = new Map(apiSets.map(s => [normalize(s.name), s]));
            for (const e of expansions) {
              const found = apiMap.get(normalize(e.name)) || apiSets.find(s => normalize(s.name).includes(normalize(e.name)) || normalize(e.name).includes(normalize(s.name)));
              if (found) e.ptcgId = found.id;
            }
            // rebuild setCode options to use ptcgId when available
            const setOpts2 = (expansions ?? []).map((s) => ({ id: s.ptcgId || s.id, name: (s.ptcgId ? s.ptcgId : s.id) + ' — ' + s.name }));
            setSelectOptions(els.setCode, setOpts2, "Select set code…");
          }
        } catch (e) {
          // ignore network errors/timeouts here; fallback uses local ids
        }
      })();
    }
  } catch (err) {
    console.warn("Failed to load pokemon expansions", err);
  }

  // When a set code is selected, auto-fill brand, series, expansion
  els.setCode.addEventListener('change', () => {
    const code = els.setCode.value;
    if (!code) return;

    // Find expansion entry
    const setEntry = (expansions ?? []).find((s) => s.id === code);
    if (!setEntry) return;

    // Ensure brand is Pokemon
    try { els.brand.value = 'pokemon'; els.brand.dispatchEvent(new Event('change')); } catch (e) {}

    // Set expansion select to the set id
    try { els.expansion.value = setEntry.id; } catch (e) {}

    // Attempt to set series: use expansion name as fallback
    const derivedSeries = deriveSeriesFromExpansion(setEntry.name);
    // If a series option matching derivedSeries exists, set it; otherwise add it
    if (derivedSeries) {
      const opt = Array.from(els.series.options).find(o => o.value === derivedSeries || o.text === derivedSeries);
      if (opt) {
        els.series.value = opt.value;
      } else {
        const option = document.createElement('option');
        option.value = derivedSeries;
        option.text = derivedSeries;
        els.series.appendChild(option);
        els.series.value = derivedSeries;
      }
    }
  });

  function deriveSeriesFromExpansion(name) {
    if (!name) return '';
    const n = name.toLowerCase();
    if (n.includes('base set') || n.includes('base')) return 'Base Set';
    if (n.includes('jungle')) return 'Jungle';
    if (n.includes('fossil')) return 'Fossil';
    if (n.includes('neo')) return 'Neo';
    if (n.includes('ex ') || n.startsWith('ex') ) return 'EX';
    if (n.includes('diamond') || n.includes('pearl') || n.includes('platinum')) return 'Diamond & Pearl';
    if (n.includes('xy') || n.includes('primal') || n.includes('roaring')) return 'XY';
    if (n.includes('sun') || n.includes('moon')) return 'Sun & Moon';
    if (n.includes('sword') || n.includes('shield')) return 'Sword & Shield';
    if (n.includes('scarlet') || n.includes('violet')) return 'Scarlet & Violet';
    return name; // fallback
  }

  setSelectOptions(els.brand, getBrandOptions(brandData), "Select…");

  els.brand.addEventListener("change", () => {
    const b = els.brand.value;
    const options = getSeriesForBrand(brandData, b);
    setSelectOptions(els.series, options, "Select…");
    renderDetailFieldsForBrand(b);
  });

  els.imageFile.addEventListener("change", async () => {
    const file = els.imageFile.files?.[0];
    if (!file) {
      els.imgPreview.textContent = "Image preview";
      return;
    }
    const url = await fileToDataUrl(file);
    els.imgPreview.innerHTML = `<img alt="Preview" src="${url}" />`;
  });

  els.resetBtn.addEventListener("click", () => {
    els.form.reset();
    els.imgPreview.textContent = "Image preview";
    clearErrors();
    setSelectOptions(els.series, [], "Select brand first…");
    // clear dynamic detail fields and show fallback textarea
    if (els.cardDetailsFields) els.cardDetailsFields.innerHTML = '';
    if (els.cardDetails) els.cardDetails.style.display = '';
  });

  els.form.addEventListener("submit", onSubmit);

  // Brand-aware search button
  els.ptcgSearchBtn.addEventListener('click', async () => {
    const q = els.ptcgSearch.value.trim();
    if (!q) return;
    currentSearchPage = 1;
    lastSearchQuery = q;
    await searchByBrand(q, currentSearchPage);
  });

  // Signal that client-side form initialization is complete
  try {
    window.__cardflow_ready = true;
    window.dispatchEvent(new Event('cardflow-ready'));
  } catch (e) {}
}

function renderDetailFieldsForBrand(brand) {
  const key = (brand || '').toLowerCase();
  const defs = detailFieldDefs[key] || [];
  if (!els.cardDetailsFields) return;
  els.cardDetailsFields.innerHTML = '';
  if (!defs.length) {
    // show fallback textarea
    if (els.cardDetails) els.cardDetails.style.display = '';
    return;
  }
  // hide fallback textarea
  if (els.cardDetails) els.cardDetails.style.display = 'none';

  for (const def of defs) {
    const wrapper = document.createElement('div');
    wrapper.className = 'field';
    const label = document.createElement('label');
    label.textContent = def.label;
    label.style.fontWeight = '600';
    const select = document.createElement('select');
    select.className = 'select';
    select.id = `detail_${def.id}`;
    const opts = def.options.map(o => ({ id: o, name: o }));
    setSelectOptions(select, opts, `Select ${def.label}…`);
    wrapper.appendChild(label);
    wrapper.appendChild(select);
    els.cardDetailsFields.appendChild(wrapper);
  }
}

function collectDetailsValue() {
  // If dynamic fields present, build a semicolon-separated details string
  if (els.cardDetailsFields && els.cardDetailsFields.children.length) {
    const parts = [];
    const selects = els.cardDetailsFields.querySelectorAll('select');
    selects.forEach(s => {
      const lab = s.previousSibling && s.previousSibling.textContent ? s.previousSibling.textContent : s.id.replace(/^detail_/, '');
      if (s.value) parts.push(lab + ': ' + s.value);
    });
    return parts.join('; ');
  }
  return els.cardDetails ? els.cardDetails.value.trim() : '';
}

async function searchPtcg(q, page = 1) {
  els.ptcgResults.innerHTML = '';
  // Prefer local dataset copy
  const local = '../data/lorcana.json';
  try {
    const res = await fetch(local);
    if (res.ok) {
      const cards = await res.json();
      if (cards && cards.length) return renderGenericResults(cards, 'lorcana');
    }
  } catch (e) {}
  const candidates = [
    'https://raw.githubusercontent.com/search?l=&q=lorcana+cards+json',
    'https://raw.githubusercontent.com/lorecana/data/main/cards.json'
  ];
  for (const u of candidates) {
    try {
      const controller = new AbortController();
      const to = setTimeout(() => controller.abort(), 3000);
      const r = await fetch(u, { signal: controller.signal });
      clearTimeout(to);
      if (!r.ok) continue;
      const j = await r.json();
      const cards = j.data || j.cards || j;
      if (!cards || !cards.length) continue;
      return renderGenericResults(cards, 'lorcana');
    } catch (e) {}
  }
  const msg = document.createElement('div');
  msg.textContent = 'Lorcana search not available. Try manual entry or web search.';
  msg.style.padding = '8px';
  const web = document.createElement('a'); web.href = `https://www.google.com/search?q=${encodeURIComponent(q + ' Lorcana card')}`;
  web.target = '_blank'; web.textContent = 'Search web'; web.style.display = 'inline-block'; web.style.marginTop = '8px';
  msg.appendChild(document.createElement('br'));
  msg.appendChild(web);
  els.ptcgResults.appendChild(msg);
      const info = document.createElement('div');
      info.style.flex = '1';
      info.innerHTML = `<div style="font-weight:600">${c.name}</div><div style="font-size:12px;color:#666">${c.set?.name ?? ''}</div>`;

      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'btn';
      btn.textContent = 'Use';
      btn.addEventListener('click', async () => {
        await populateFromCard(c, 'pokemon');
        els.ptcgResults.innerHTML = '';
      });

      cardEl.appendChild(thumb);
      cardEl.appendChild(info);
      cardEl.appendChild(btn);
      grid.appendChild(cardEl);
    }
    els.ptcgResults.appendChild(grid);
    // keyboard navigation for results: arrow keys move focus, Enter activates "Use"
    grid.addEventListener('keydown', (ev) => {
      const focusable = Array.from(grid.querySelectorAll('.ptcg-result'));
      const idx = focusable.indexOf(document.activeElement);
      if (ev.key === 'ArrowDown') {
        ev.preventDefault();
        const next = focusable[Math.min(focusable.length - 1, Math.max(0, idx + 1))];
        if (next) next.focus();
      } else if (ev.key === 'ArrowUp') {
        ev.preventDefault();
        const prev = focusable[Math.min(focusable.length - 1, Math.max(0, idx - 1))];
        if (prev) prev.focus();
      } else if (ev.key === 'Enter') {
        ev.preventDefault();
        const useBtn = document.activeElement.querySelector('button');
        if (useBtn) useBtn.click();
      }
    });
  } catch (err) {
    els.ptcgResults.textContent = 'Search failed.';
    console.warn(err);
  }
}

async function populateFromPtcg(card) {
  // Fill basic fields
  els.cardName.value = card.name ?? '';
  // set brand to pokemon
  els.brand.value = 'pokemon';
  try { els.brand.dispatchEvent(new Event('change')); } catch (e) {}

  // set series: use card.set.series or card.set.name
  const seriesName = card.set?.series ?? card.set?.name ?? '';
  if (seriesName) {
    const opt = Array.from(els.series.options).find(o => o.value === seriesName || o.text === seriesName);
    if (opt) els.series.value = opt.value;
    else {
      const option = document.createElement('option');
      option.value = seriesName;
      option.text = seriesName;
      els.series.appendChild(option);
      els.series.value = seriesName;
    }
  }

  // expansion & setCode
  if (card.set?.name) {
    const expId = card.set.id ?? card.set.name;
    const optE = Array.from(els.expansion.options).find(o => o.value === expId || o.text === card.set.name);
    if (optE) els.expansion.value = optE.value;
    else {
      const option = document.createElement('option');
      option.value = expId;
      option.text = card.set.name;
      els.expansion.appendChild(option);
      els.expansion.value = expId;
    }
    // set setCode
    try { els.setCode.value = card.set.id; } catch (e) { }
  }

  // market value: leave as-is (user may override)

  // fetch image and set preview + prepare file blob as data URL
  const imageUrl = card.images?.large || card.images?.small || null;
  if (imageUrl) {
    try {
      const dataUrl = await fetchImageAsDataUrl(imageUrl);
      els.imgPreview.innerHTML = `<img alt="Preview" src="${dataUrl}" />`;
      // set an internal 'imageFile' replacement by creating a Blob and storing in a hidden field
      // we store the data URL and later use fileToDataUrl logic; assign to a custom property used on submit
      els._fetchedImageDataUrl = dataUrl;
    } catch (e) {
      console.warn('Failed to fetch card image', e);
    }
  }
}

// Generic populate handler for multiple brands
async function populateFromCard(card, brand) {
  if (brand === 'pokemon') return populateFromPtcg(card);

  // MTG (Scryfall) mapping
  if (brand === 'mtg') {
    els.cardName.value = card.name ?? '';
    els.brand.value = 'mtg';
    try { els.brand.dispatchEvent(new Event('change')); } catch (e) {}
    const seriesName = card.set_name || card.set?.name || '';
    if (seriesName) {
      const opt = Array.from(els.series.options).find(o => o.value === seriesName || o.text === seriesName);
      if (opt) els.series.value = opt.value;
      else {
        const option = document.createElement('option');
        option.value = seriesName;
        option.text = seriesName;
        els.series.appendChild(option);
        els.series.value = seriesName;
      }
    }
    // set expansion/setCode
    try { els.expansion.value = card.set_name || ''; } catch (e) {}
    try { els.setCode.value = card.set?.code || card.set || ''; } catch (e) {}
    const imageUrl = card.image_uris?.large || card.image_uris?.normal || (card.card_faces && card.card_faces[0]?.image_uris?.large) || null;
    if (imageUrl) {
      try {
        const dataUrl = await fetchImageAsDataUrl(imageUrl);
        els.imgPreview.innerHTML = `<img alt="Preview" src="${dataUrl}" />`;
        els._fetchedImageDataUrl = dataUrl;
      } catch (e) { console.warn(e); }
    }
    return;
  }

  // Yu-Gi-Oh mapping (YGOPRODeck)
  if (brand === 'yugioh') {
    els.cardName.value = card.name ?? '';
    els.brand.value = 'yugioh';
    try { els.brand.dispatchEvent(new Event('change')); } catch (e) {}
    // card_sets may be present
    const setName = card.card_sets?.[0]?.set_name || '';
    if (setName) {
      const opt = Array.from(els.series.options).find(o => o.value === setName || o.text === setName);
      if (opt) els.series.value = opt.value;
      else {
        const option = document.createElement('option');
        option.value = setName;
        option.text = setName;
        els.series.appendChild(option);
        els.series.value = setName;
      }
    }
    try { els.expansion.value = setName; } catch (e) {}
    try { els.setCode.value = card.card_sets?.[0]?.set_code || ''; } catch (e) {}
    const imageUrl = card.card_images?.[0]?.image_url || null;
    let setAnyImage = false;
    if (imageUrl) {
      try {
        const dataUrl = await fetchImageAsDataUrl(imageUrl);
        els.imgPreview.innerHTML = `<img alt="Preview" src="${dataUrl}" />`;
        els._fetchedImageDataUrl = dataUrl;
        setAnyImage = true;
      } catch (e) { console.warn(e); }
    }
    if (!setAnyImage) {
      // fallback small SVG placeholder so validation accepts the card
      const placeholder = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="200" height="140"><rect width="100%" height="100%" fill="%23eee"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="%23666" font-size="12">No Image</text></svg>';
      try {
        els.imgPreview.innerHTML = `<img alt="Preview" src="${placeholder}" />`;
        els._fetchedImageDataUrl = placeholder;
      } catch (e) { /* ignore */ }
    }
    return;
  }

  // One Piece mapping
  if (brand === 'onepiece' || brand === 'one-piece' || brand === 'op') {
    els.cardName.value = card.name ?? card.title ?? '';
    els.brand.value = 'onepiece';
    try { els.brand.dispatchEvent(new Event('change')); } catch (e) {}
    const seriesName = card.set || card.series || card.card_set || '';
    if (seriesName) {
      const opt = Array.from(els.series.options).find(o => o.value === seriesName || o.text === seriesName);
      if (opt) els.series.value = opt.value;
      else {
        const option = document.createElement('option'); option.value = seriesName; option.text = seriesName; els.series.appendChild(option); els.series.value = seriesName;
      }
    }
    try { els.expansion.value = card.set || card.series || ''; } catch (e) {}
    try { els.setCode.value = card.set_code || card.code || card.id || ''; } catch (e) {}
    const imageUrl = card.image || card.image_url || card.images?.[0] || card.images?.[0]?.image || null;
    if (imageUrl) {
      try { const dataUrl = await fetchImageAsDataUrl(imageUrl); els.imgPreview.innerHTML = `<img alt="Preview" src="${dataUrl}" />`; els._fetchedImageDataUrl = dataUrl; } catch (e) { console.warn(e); }
    }
    return;
  }

  // Dragon Ball mapping
  if (brand === 'dragonball' || brand === 'db' || brand === 'dbscg' || brand === 'dragon-ball') {
    els.cardName.value = card.name ?? card.title ?? '';
    els.brand.value = 'dragonball';
    try { els.brand.dispatchEvent(new Event('change')); } catch (e) {}
    const seriesName = card.series || card.set || card.card_set || '';
    if (seriesName) {
      const opt = Array.from(els.series.options).find(o => o.value === seriesName || o.text === seriesName);
      if (opt) els.series.value = opt.value;
      else { const option = document.createElement('option'); option.value = seriesName; option.text = seriesName; els.series.appendChild(option); els.series.value = seriesName; }
    }
    try { els.expansion.value = card.series || card.set || ''; } catch (e) {}
    try { els.setCode.value = card.code || card.set_code || card.id || ''; } catch (e) {}
    const imageUrl = card.image || card.image_url || card.images?.[0]?.image || card.thumbnail || null;
    if (imageUrl) {
      try { const dataUrl = await fetchImageAsDataUrl(imageUrl); els.imgPreview.innerHTML = `<img alt="Preview" src="${dataUrl}" />`; els._fetchedImageDataUrl = dataUrl; } catch (e) { console.warn(e); }
    }
    return;
  }

  // Lorcana mapping
  if (brand === 'lorcana') {
    els.cardName.value = card.name ?? card.title ?? '';
    els.brand.value = 'lorcana';
    try { els.brand.dispatchEvent(new Event('change')); } catch (e) {}
    const seriesName = card.set || card.set_name || card.series || '';
    if (seriesName) {
      const opt = Array.from(els.series.options).find(o => o.value === seriesName || o.text === seriesName);
      if (opt) els.series.value = opt.value;
      else { const option = document.createElement('option'); option.value = seriesName; option.text = seriesName; els.series.appendChild(option); els.series.value = seriesName; }
    }
    try { els.expansion.value = card.set || card.set_name || ''; } catch (e) {}
    try { els.setCode.value = card.code || card.set_code || card.id || ''; } catch (e) {}
    const imageUrl = card.image || card.image_url || card.images?.[0] || null;
    if (imageUrl) {
      try { const dataUrl = await fetchImageAsDataUrl(imageUrl); els.imgPreview.innerHTML = `<img alt="Preview" src="${dataUrl}" />`; els._fetchedImageDataUrl = dataUrl; } catch (e) { console.warn(e); }
    }
    return;
  }

  // Fallback: try to map common fields
  els.cardName.value = card.name ?? card.title ?? '';
  if (!els.brand.value) els.brand.value = brand || '';
}

// richer mappings for other brands
// One Piece
if (false) {}

// Brand dispatcher for search queries
async function searchByBrand(q, page = 1) {
  const b = (els.brand?.value || 'pokemon').toLowerCase();
  if (b === 'pokemon') return await searchPtcg(q, page);
  if (b === 'mtg') return await searchMtg(q, page);
  if (b === 'yugioh' || b === 'ygo') return await searchYugioh(q, page);
  // default to pokemon
  return await searchPtcg(q, page);
}

// MTG search via Scryfall
async function searchMtg(q, page = 1) {
  els.ptcgResults.textContent = 'Searching MTG…';
  try {
    const url = `https://api.scryfall.com/cards/search?q=${encodeURIComponent(q)}&page=${page}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Scryfall API error');
    const body = await res.json();
    const cards = body.data ?? [];
    if (!cards.length) { els.ptcgResults.textContent = 'No cards found.'; return; }
    els.ptcgResults.innerHTML = '';
    const grid = document.createElement('div');
    grid.style.display = 'grid';
    grid.style.gridTemplateColumns = 'repeat(auto-fill, minmax(160px, 1fr))';
    grid.style.gap = '8px';
    for (const c of cards.slice(0, 12)) {
      const cardEl = document.createElement('div');
      cardEl.className = 'ptcg-result';
      cardEl.tabIndex = 0;
      cardEl.style.border = '1px solid #ddd';
      cardEl.style.padding = '6px';
      cardEl.style.display = 'flex';
      cardEl.style.gap = '8px';
      cardEl.style.alignItems = 'center';
      const thumb = document.createElement('img');
      thumb.src = c.image_uris?.small || c.card_faces?.[0]?.image_uris?.small || '';
      thumb.alt = c.name;
      thumb.style.width = '56px';
      thumb.style.height = 'auto';
      const info = document.createElement('div');
      info.style.flex = '1';
      info.innerHTML = `<div style="font-weight:600">${c.name}</div><div style="font-size:12px;color:#666">${c.set_name ?? ''}</div>`;
      const btn = document.createElement('button');
      btn.type = 'button'; btn.className = 'btn'; btn.textContent = 'Use';
      btn.addEventListener('click', async () => { await populateFromCard(c, 'mtg'); els.ptcgResults.innerHTML = ''; });
      cardEl.appendChild(thumb); cardEl.appendChild(info); cardEl.appendChild(btn); grid.appendChild(cardEl);
    }
    els.ptcgResults.appendChild(grid);
  } catch (e) { els.ptcgResults.textContent = 'Search failed.'; console.warn(e); }
}

// Yu-Gi-Oh search via YGOPRODeck
async function searchYugioh(q) {
  els.ptcgResults.textContent = 'Searching Yu-Gi-Oh…';
  try {
    const url = `https://db.ygoprodeck.com/api/v7/cardinfo.php?fname=${encodeURIComponent(q)}`;
    const res = await fetch(url);
    if (!res.ok) { els.ptcgResults.textContent = 'No cards found.'; return; }
    const body = await res.json();
    const cards = body.data ?? [];
    if (!cards.length) { els.ptcgResults.textContent = 'No cards found.'; return; }
    els.ptcgResults.innerHTML = '';
    const grid = document.createElement('div');
    grid.style.display = 'grid';
    grid.style.gridTemplateColumns = 'repeat(auto-fill, minmax(160px, 1fr))';
    grid.style.gap = '8px';
    for (const c of cards.slice(0, 12)) {
      const cardEl = document.createElement('div');
      cardEl.className = 'ptcg-result';
      cardEl.tabIndex = 0;
      cardEl.style.border = '1px solid #ddd';
      cardEl.style.padding = '6px';
      cardEl.style.display = 'flex';
      cardEl.style.gap = '8px';
      cardEl.style.alignItems = 'center';
      const thumb = document.createElement('img');
      thumb.src = c.card_images?.[0]?.image_url_small || c.card_images?.[0]?.image_url || '';
      thumb.alt = c.name;
      thumb.style.width = '56px';
      thumb.style.height = 'auto';
      const info = document.createElement('div');
      info.style.flex = '1';
      info.innerHTML = `<div style="font-weight:600">${c.name}</div><div style="font-size:12px;color:#666">${c.card_sets?.[0]?.set_name ?? ''}</div>`;
      const btn = document.createElement('button');
      btn.type = 'button'; btn.className = 'btn'; btn.textContent = 'Use';
      btn.addEventListener('click', async () => { await populateFromCard(c, 'yugioh'); els.ptcgResults.innerHTML = ''; });
      cardEl.appendChild(thumb); cardEl.appendChild(info); cardEl.appendChild(btn); grid.appendChild(cardEl);
    }
    els.ptcgResults.appendChild(grid);
  } catch (e) { els.ptcgResults.textContent = 'Search failed.'; console.warn(e); }
}

// Dragon Ball / One Piece / Lorcana handlers - graceful fallback
async function searchDragonBall(q) {
  els.ptcgResults.innerHTML = '';
  // Prefer local dataset copy when available
  const local = '../data/dragonball.json';
  try {
    const res = await fetch(local);
    if (res.ok) {
      const cards = await res.json();
      if (cards && cards.length) return renderGenericResults(cards, 'dragonball');
    }
  } catch (e) {}
  // Try known community raw JSON datasets (GitHub raw URLs)
  const candidates = [
    'https://raw.githubusercontent.com/teoisnotdead/api-dbscg-fw/main/data/cards.json',
    'https://raw.githubusercontent.com/fchavonet/full_stack-db_visual_adventure_cards_api/main/data/cards.json'
  ];
  for (const u of candidates) {
    try {
      const controller = new AbortController();
      const to = setTimeout(() => controller.abort(), 3000);
      const r = await fetch(u, { signal: controller.signal });
      clearTimeout(to);
      if (!r.ok) continue;
      const j = await r.json();
      const cards = j.data || j.cards || j;
      if (!cards || !cards.length) continue;
      return renderGenericResults(cards, 'dragonball');
    } catch (e) {}
  }
  const msg = document.createElement('div');
  msg.textContent = 'Dragon Ball search not available. Try manual entry or web search.';
  msg.style.padding = '8px';
  const web = document.createElement('a');
  web.href = `https://www.google.com/search?q=${encodeURIComponent(q + ' Dragon Ball card')}`;
  web.target = '_blank'; web.textContent = 'Search web'; web.style.display = 'inline-block'; web.style.marginTop = '8px';
  msg.appendChild(document.createElement('br'));
  msg.appendChild(web);
  els.ptcgResults.appendChild(msg);
}

// Helper to render generic results
function renderGenericResults(cards, brand) {
  els.ptcgResults.innerHTML = '';
  const grid = document.createElement('div');
  grid.style.display = 'grid';
  grid.style.gridTemplateColumns = 'repeat(auto-fill, minmax(160px, 1fr))';
  grid.style.gap = '8px';
  for (const c of (cards || []).slice(0, 24)) {
    if (!c || !c.name) continue;
    const cardEl = document.createElement('div');
    cardEl.className = 'ptcg-result'; cardEl.tabIndex = 0;
    cardEl.style.border = '1px solid #ddd'; cardEl.style.padding = '6px'; cardEl.style.display = 'flex'; cardEl.style.gap = '8px';
    cardEl.style.alignItems = 'center';
    const thumb = document.createElement('img'); thumb.src = c.image || c.image_url || c.images?.[0] || '';
    thumb.alt = c.name; thumb.style.width = '56px'; thumb.style.height = 'auto';
    const info = document.createElement('div'); info.style.flex = '1';
    info.innerHTML = `<div style="font-weight:600">${c.name}</div><div style="font-size:12px;color:#666">${c.set || ''}</div>`;
    const btn = document.createElement('button'); btn.type = 'button'; btn.className = 'btn'; btn.textContent = 'Use';
    btn.addEventListener('click', async () => { await populateFromCard(c, brand); els.ptcgResults.innerHTML = ''; });
    cardEl.appendChild(thumb); cardEl.appendChild(info); cardEl.appendChild(btn); grid.appendChild(cardEl);
  }
  els.ptcgResults.appendChild(grid);
}

async function searchOnePiece(q) {
  els.ptcgResults.innerHTML = '';
  // Prefer local dataset copy
  const local = '../data/onepiece.json';
  try {
    const res = await fetch(local);
    if (res.ok) {
      const cards = await res.json();
      if (cards && cards.length) return renderGenericResults(cards, 'onepiece');
    }
  } catch (e) {}
  const candidates = [
    'https://raw.githubusercontent.com/apitcg/one-piece-tcg-data/main/cards.json',
    'https://raw.githubusercontent.com/ramiccodes/op_tcg_api/main/data/cards.json'
  ];
  for (const u of candidates) {
    try {
      const controller = new AbortController();
      const to = setTimeout(() => controller.abort(), 3000);
      const r = await fetch(u, { signal: controller.signal });
      clearTimeout(to);
      if (!r.ok) continue;
      const j = await r.json();
      const cards = j.data || j.cards || j;
      if (!cards || !cards.length) continue;
      return renderGenericResults(cards, 'onepiece');
    } catch (e) {}
  }
  const msg = document.createElement('div');
  msg.textContent = 'One Piece search not available. Try manual entry or web search.';
  msg.style.padding = '8px';
  const web = document.createElement('a'); web.href = `https://www.google.com/search?q=${encodeURIComponent(q + ' One Piece card')}`;
  web.target = '_blank'; web.textContent = 'Search web'; web.style.display = 'inline-block'; web.style.marginTop = '8px';
  msg.appendChild(document.createElement('br'));
  msg.appendChild(web);
  els.ptcgResults.appendChild(msg);
}

async function searchLorcana(q) {
  els.ptcgResults.innerHTML = '';
  const candidates = [
    'https://raw.githubusercontent.com/search?l=&q=lorcana+cards+json',
    'https://raw.githubusercontent.com/lorecana/data/main/cards.json'
  ];
  for (const u of candidates) {
    try {
      const controller = new AbortController();
      const to = setTimeout(() => controller.abort(), 3000);
      const r = await fetch(u, { signal: controller.signal });
      clearTimeout(to);
      if (!r.ok) continue;
      const j = await r.json();
      const cards = j.data || j.cards || j;
      if (!cards || !cards.length) continue;
      els.ptcgResults.innerHTML = '';
      const grid = document.createElement('div');
      grid.style.display = 'grid';
      grid.style.gridTemplateColumns = 'repeat(auto-fill, minmax(160px, 1fr))';
      grid.style.gap = '8px';
      for (const c of cards.slice(0, 24)) {
        if (!c.name) continue;
        const cardEl = document.createElement('div');
        cardEl.className = 'ptcg-result'; cardEl.tabIndex = 0;
        cardEl.style.border = '1px solid #ddd'; cardEl.style.padding = '6px'; cardEl.style.display = 'flex'; cardEl.style.gap = '8px';
        cardEl.style.alignItems = 'center';
        const thumb = document.createElement('img'); thumb.src = c.image || c.image_url || '';
        thumb.alt = c.name; thumb.style.width = '56px'; thumb.style.height = 'auto';
        const info = document.createElement('div'); info.style.flex = '1';
        info.innerHTML = `<div style="font-weight:600">${c.name}</div><div style="font-size:12px;color:#666">${c.set || ''}</div>`;
        const btn = document.createElement('button'); btn.type = 'button'; btn.className = 'btn'; btn.textContent = 'Use';
        btn.addEventListener('click', async () => { await populateFromCard(c, 'lorcana'); els.ptcgResults.innerHTML = ''; });
        cardEl.appendChild(thumb); cardEl.appendChild(info); cardEl.appendChild(btn); grid.appendChild(cardEl);
      }
      els.ptcgResults.appendChild(grid);
      return;
    } catch (e) {}
  }
  const msg = document.createElement('div');
  msg.textContent = 'Lorcana search not available. Try manual entry or web search.';
  msg.style.padding = '8px';
  const web = document.createElement('a'); web.href = `https://www.google.com/search?q=${encodeURIComponent(q + ' Lorcana card')}`;
  web.target = '_blank'; web.textContent = 'Search web'; web.style.display = 'inline-block'; web.style.marginTop = '8px';
  msg.appendChild(document.createElement('br'));
  msg.appendChild(web);
  els.ptcgResults.appendChild(msg);
}

async function fetchImageAsDataUrl(url) {
  // Use localStorage cache keyed by URL when possible
  try {
    const key = `ptcg.image.${encodeURIComponent(url)}`;
    const cached = localStorage.getItem(key);
    if (cached) return cached;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Image fetch failed');
    const blob = await res.blob();
    const dataUrl = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result.toString());
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
    // store cache if not too large (avoid exceeding localStorage limits)
    try {
      if (dataUrl.length < 1024 * 1024) {
        localStorage.setItem(key, dataUrl);
      }
    } catch (e) {
      // ignore quota errors
    }
    return dataUrl;
  } catch (e) {
    throw e;
  }
}

async function onSubmit(e) {
  e.preventDefault();
  clearErrors();

  const file = els.imageFile.files?.[0] ?? null;

  const data = {
    name: els.cardName.value.trim(),
    brand: els.brand.value,
    series: els.series.value,
    expansion: els.expansion?.value || "",
    setCode: els.setCode?.value || "",
    details: collectDetailsValue(),
    marketValue: els.marketValue.value === "" ? "" : Number(els.marketValue.value),
    imageFile: file
  };

  const errors = validate(data);
  if (Object.keys(errors).length) {
    for (const [k, msg] of Object.entries(errors)) showError(k, msg);
    return;
  }

  // prepare image data URL: prefer uploaded file, otherwise use fetched image if available
  let imageDataUrl = null;
  if (file) {
    imageDataUrl = await fileToDataUrl(file);
  } else if (els._fetchedImageDataUrl) {
    imageDataUrl = els._fetchedImageDataUrl;
  } else {
    showError('imageFile', 'An image is required.');
    return;
  }

  // Market value: use entered value if provided; otherwise try JSON lookup
  const brandLabel = getBrandName(brandData, data.brand);
  const key = `${data.brand}|${data.series}|${data.name}`;
  const lookup = Number(marketSample[key]);
  const finalMarketValue =
    data.marketValue !== "" && Number.isFinite(data.marketValue)
      ? data.marketValue
      : (Number.isFinite(lookup) ? lookup : 0);

  const card = {
    id: uid(),
    name: data.name,
    brand: data.brand,
    brandLabel,
    series: data.series,
    expansion: data.expansion,
    setCode: data.setCode,
    details: data.details,
    marketValue: finalMarketValue,
    imageDataUrl,
    createdAt: Date.now(),
    updatedAt: Date.now()
  };

  addCard(card);

  // Go back to binder and auto-select the new card
  window.location.href = `./index.html?selected=${encodeURIComponent(card.id)}`;
}

function validate(d) {
  const errs = {};
  if (!d.name) errs.cardName = "Card name is required.";
  if (!d.brand) errs.brand = "Brand is required.";
  if (!d.series) errs.series = "Series is required.";
  if (!d.details) errs.cardDetails = "Card details are required.";
  if (!d.imageFile && !(els._fetchedImageDataUrl)) errs.imageFile = "An image is required.";

  if (d.marketValue !== "" && (!Number.isFinite(d.marketValue) || d.marketValue < 0)) {
    errs.marketValue = "Market value must be a number ≥ 0.";
  }
  return errs;
}

function clearErrors() {
  document.querySelectorAll(".error").forEach((e) => (e.textContent = ""));
}

function showError(fieldId, msg) {
  const el = document.querySelector(`.error[data-for="${fieldId}"]`);
  if (el) el.textContent = msg;
}
