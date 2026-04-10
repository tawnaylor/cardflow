// add.js — Add Cards page
import { saveCard, createId, fileToDataUrl } from './storage.js';
import { showToast, initNav, getParam } from './utils.js';
import { fetchTcgdexCard } from './tcgdex.js';

initNav();

const form        = document.getElementById('cardForm');
const statusEl    = document.getElementById('status');
const imageInput  = document.getElementById('imageInput');
const imageUrlIn  = document.getElementById('imageUrl');
const seedBtn     = document.getElementById('seedDemo');
const seriesSel   = document.getElementById('seriesSelect');
const expansionSel= document.getElementById('expansionSelect');
const tcgIdInput  = document.getElementById('tcgdexCardId');
const lookupBtn   = document.getElementById('lookupTcgdexBtn');
const autofillStatus = document.getElementById('autofillStatus');

let _seriesMap = {};

function setStatus(msg) { if (statusEl) statusEl.textContent = msg; }
function setAutofillStatus(msg) { if (autofillStatus) autofillStatus.textContent = msg; }

// ── Field-level error helpers ──────────────────────────────────────────
function showFieldError(id, msg) {
  const el = document.getElementById(id);
  if (el) { el.textContent = msg; el.hidden = false; }
}
function clearErrors() {
  ['err-name','err-series','err-expansion','err-rarity','err-number'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.textContent = '';
  });
}

// ── TCGdex autofill ────────────────────────────────────────────────────
async function autofill() {
  const id = tcgIdInput?.value.trim();
  if (!id) { setAutofillStatus('Enter a TCGdex card ID first.'); return; }
  if (lookupBtn) lookupBtn.disabled = true;
  setAutofillStatus('Looking up…');
  try {
    const card = await fetchTcgdexCard(id);
    const nameEl = form.elements.name;
    if (nameEl) nameEl.value = card.name || nameEl.value;
    const numberEl = form.elements.number;
    if (numberEl) numberEl.value = card.number || numberEl.value;
    if (card.series) {
      ensureOption(seriesSel, card.series);
      seriesSel.value = card.series;
      updateExpansions(card.series, card.expansion);
    }
    if (card.rarity) {
      ensureOption(form.elements.rarity, card.rarity);
      form.elements.rarity.value = card.rarity;
    }
    if (card.imageUrl && imageUrlIn && !imageUrlIn.value.trim()) {
      imageUrlIn.value = card.imageUrl;
    }
    setAutofillStatus(`✅ Loaded "${card.name}" from TCGdex.`);
  } catch (err) {
    setAutofillStatus(`❌ ${err instanceof Error ? err.message : 'Card not found.'}`);
  } finally {
    if (lookupBtn) lookupBtn.disabled = false;
  }
}

lookupBtn?.addEventListener('click', autofill);
tcgIdInput?.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); autofill(); } });

// ── Series / Expansion dropdowns (fetched from JSON — API requirement) ─
async function populateSeries() {
  if (!seriesSel || !expansionSel) return;
  try {
    const resp = await fetch('./database/cardflow-pokemon-dataset.json');
    if (!resp.ok) return;
    const data = await resp.json();
    const exps = Array.isArray(data.expansions) ? data.expansions : [];
    _seriesMap = {};
    for (const e of exps) {
      const s = (e.series || 'Unknown').trim();
      const name = (e.name || '').trim();
      if (!_seriesMap[s]) _seriesMap[s] = new Set();
      if (name) _seriesMap[s].add(name);
    }
    const seriesList = Object.keys(_seriesMap).sort((a,b) => a.localeCompare(b));
    seriesSel.querySelectorAll('option:not([disabled])').forEach(o => o.remove());
    seriesList.forEach(s => {
      const o = document.createElement('option');
      o.value = s; o.textContent = s;
      seriesSel.appendChild(o);
    });
    seriesSel.addEventListener('change', () => updateExpansions(seriesSel.value));
  } catch { /* fallback: user types manually */ }
}

function updateExpansions(series, selected = '') {
  expansionSel.querySelectorAll('option:not([disabled])').forEach(o => o.remove());
  const exps = _seriesMap[series] ? Array.from(_seriesMap[series]).sort((a,b) => a.localeCompare(b)) : [];
  exps.forEach(e => {
    const o = document.createElement('option');
    o.value = e; o.textContent = e;
    expansionSel.appendChild(o);
  });
  if (selected) { ensureOption(expansionSel, selected); expansionSel.value = selected; }
}

function ensureOption(sel, val) {
  if (!sel || !val) return;
  if (!Array.from(sel.options).find(o => o.value === val)) {
    const o = document.createElement('option');
    o.value = val; o.textContent = val;
    sel.appendChild(o);
  }
}

// ── Validation ─────────────────────────────────────────────────────────
function validate() {
  clearErrors();
  const CARD_NUM_RE = /^[A-Za-z0-9/\-]{1,20}$/;
  const errors = [];
  const name = form.elements.name?.value.trim();
  const series = form.elements.series?.value.trim();
  const expansion = form.elements.expansion?.value.trim();
  const rarity = form.elements.rarity?.value;
  const number = form.elements.number?.value.trim();

  if (!name || name.length < 2) errors.push(['err-name', 'Card name is required (min 2 chars).']);
  if (!series) errors.push(['err-series', 'Series is required.']);
  if (!expansion) errors.push(['err-expansion', 'Expansion is required.']);
  if (!rarity) errors.push(['err-rarity', 'Rarity is required.']);
  if (!CARD_NUM_RE.test(number)) errors.push(['err-number', 'Card number must be 1–20 chars (letters, numbers, / or -).']);

  errors.forEach(([id, msg]) => showFieldError(id, msg));
  return errors.length === 0;
}

// ── Form submit ────────────────────────────────────────────────────────
form?.addEventListener('submit', async e => {
  e.preventDefault();
  if (!validate()) return;
  setStatus('Saving…');

  const file = imageInput?.files?.[0] || null;
  let imageDataUrl = '';
  if (file) {
    imageDataUrl = await fileToDataUrl(file);
  } else if (imageUrlIn?.value.trim()) {
    try {
      const r = await fetch(imageUrlIn.value.trim(), { mode: 'cors' });
      if (r.ok) {
        const blob = await r.blob();
        if (blob.type.startsWith('image/')) imageDataUrl = await fileToDataUrl(blob);
      }
    } catch { /* CORS blocked — skip */ }
  }

  const card = {
    id: createId(),
    // store in the unified schema used by app.js
    game: 'pokemon',
    name: form.elements.name.value.trim(),
    setId: form.elements.expansion.value.trim(),
    cardNumber: form.elements.number.value.trim(),
    condition: 'NM',
    quantity: Math.max(1, Number(form.elements.qty.value || 1)),
    foil: false,
    purchasePrice: 0,
    currentValue: 0,
    imageUrl: imageDataUrl,
    externalImageUrl: imageUrlIn?.value.trim() || '',
    notes: `Series: ${form.elements.series.value} | Rarity: ${form.elements.rarity.value}`,
  };

  saveCard(card);
  setStatus(`✅ "${card.name}" added to your collection!`);
  showToast(`"${card.name}" added!`);
  form.reset();
  form.elements.qty.value = 1;

  // ── URL parameter: redirect to card detail page ────────────────────
  setTimeout(() => {
    window.location.href = `card-detail.html?id=${encodeURIComponent(card.id)}`;
  }, 1000);
});

// ── Demo seed ──────────────────────────────────────────────────────────
seedBtn?.addEventListener('click', () => {
  const demo = [
    { name:'Pikachu',   setId:'Paldea Evolved',  cardNumber:'1',  condition:'NM', quantity:2, game:'pokemon', foil:false, purchasePrice:5,  currentValue:8,  imageUrl:'', externalImageUrl:'', notes:'Rarity: Rare' },
    { name:'Charizard', setId:'Obsidian Flames',  cardNumber:'2',  condition:'NM', quantity:1, game:'pokemon', foil:true,  purchasePrice:80, currentValue:120,imageUrl:'', externalImageUrl:'', notes:'Rarity: Ultra Rare' },
    { name:'Mewtwo',    setId:'Unified Minds',    cardNumber:'3',  condition:'LP', quantity:1, game:'pokemon', foil:false, purchasePrice:20, currentValue:30, imageUrl:'', externalImageUrl:'', notes:'Rarity: Rare' },
    { name:'Gengar',    setId:'Lost Origin',      cardNumber:'4',  condition:'NM', quantity:2, game:'pokemon', foil:false, purchasePrice:10, currentValue:15, imageUrl:'', externalImageUrl:'', notes:'Rarity: Holo Rare' },
    { name:'Black Lotus',setId:'Alpha',           cardNumber:'232',condition:'NM', quantity:1, game:'mtg',     foil:false, purchasePrice:500,currentValue:800,imageUrl:'', externalImageUrl:'', notes:'Rarity: Rare' },
  ];
  demo.forEach(c => saveCard({ ...c, id: createId() }));
  showToast('5 demo cards added!');
  setStatus('Demo cards added! Redirecting to collection…');
  setTimeout(() => { window.location.href = 'index.html'; }, 1200);
});

populateSeries();