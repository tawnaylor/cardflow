// js/add-card.js — Logic for add-card.html
import { saveCard, getBinders } from './storage.js';
import { fetchCardById, fetchSeries, fetchSetsBySeries } from './api.js';
import { showToast, initHamburgerNav } from './ui.js';

initHamburgerNav();

// ── Populate Binder dropdown ──────────────────────────────────────────
function loadBinders() {
  const select = document.getElementById('binder-select');
  const binders = getBinders();
  binders.forEach(b => {
    const opt = document.createElement('option');
    opt.value = b.id;
    opt.textContent = b.name;
    select.appendChild(opt);
  });
}

// ── Populate Series dropdown from TCGdex ─────────────────────────────
async function loadSeries() {
  try {
    const series = await fetchSeries();
    const select = document.getElementById('series');
    series.forEach(s => {
      const opt = document.createElement('option');
      opt.value = s.id;
      opt.textContent = s.name;
      select.appendChild(opt);
    });
  } catch {
    // Silent fail — user can still type manually
  }
}

document.getElementById('series').addEventListener('change', async function () {
  const expansionSelect = document.getElementById('expansion');
  expansionSelect.innerHTML = '<option value="">Loading…</option>';
  try {
    const sets = await fetchSetsBySeries(this.value);
    expansionSelect.innerHTML = '<option value="">Select an expansion…</option>';
    sets.forEach(s => {
      const opt = document.createElement('option');
      opt.value = s.id;
      opt.textContent = s.name;
      expansionSelect.appendChild(opt);
    });
  } catch {
    expansionSelect.innerHTML = '<option value="">Could not load expansions</option>';
  }
});

// ── Autofill from TCGdex ──────────────────────────────────────────────
document.getElementById('autofill-btn').addEventListener('click', async () => {
  const id = document.getElementById('tcgdex-id').value.trim();
  const status = document.getElementById('autofill-status');
  if (!id) { showToast('Enter a TCGdex Card ID first.', 'error'); return; }

  status.innerHTML = '<span class="spinner"></span> Fetching…';
  try {
    const card = await fetchCardById(id);
    document.getElementById('card-name').value   = card.name || '';
    document.getElementById('card-number').value = card.localId || '';
    document.getElementById('rarity').value      = card.rarity || '';
    if (card.image) document.getElementById('image-url').value = card.image + '/high.png';
    status.textContent = '✅ Card autofilled!';
    showToast('Card autofilled from TCGdex!');
  } catch {
    status.textContent = '❌ Card not found. Check the ID and try again.';
    showToast('Card not found on TCGdex.', 'error');
  }
});

// ── Form Validation ───────────────────────────────────────────────────
function validateForm() {
  let valid = true;
  const fields = [
    { id: 'card-name',   errId: 'card-name-error',   msg: 'Card name must be at least 2 characters.' },
    { id: 'series',      errId: 'series-error',       msg: 'Please select a series.' },
    { id: 'expansion',   errId: 'expansion-error',    msg: 'Please select an expansion.' },
    { id: 'rarity',      errId: 'rarity-error',       msg: 'Please select a rarity.' },
    { id: 'card-number', errId: 'card-number-error',  msg: 'Card number is required (1–20 chars).' },
  ];

  fields.forEach(({ id, errId, msg }) => {
    const input = document.getElementById(id);
    const err   = document.getElementById(errId);
    if (!input.value.trim() || !input.checkValidity()) {
      err.textContent = msg;
      input.setAttribute('aria-invalid', 'true');
      valid = false;
    } else {
      err.textContent = '';
      input.removeAttribute('aria-invalid');
    }
  });
  return valid;
}

// ── Image helpers ─────────────────────────────────────────────────────
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload  = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('File read failed'));
    reader.readAsDataURL(file);
  });
}

async function urlToBase64(url) {
  const res = await fetch(url);
  const blob = await res.blob();
  return fileToBase64(blob);
}

// ── Form Submit ───────────────────────────────────────────────────────
document.getElementById('add-card-form').addEventListener('submit', async function (e) {
  e.preventDefault();
  if (!validateForm()) return;

  const form    = this;
  const fileIn  = document.getElementById('image-file');
  const urlIn   = document.getElementById('image-url');
  let imageData = '';

  try {
    if (fileIn.files[0]) {
      imageData = await fileToBase64(fileIn.files[0]);
    } else if (urlIn.value.trim()) {
      try { imageData = await urlToBase64(urlIn.value.trim()); } catch { imageData = urlIn.value.trim(); }
    }
  } catch { /* image optional */ }

  const card = {
    name:      document.getElementById('card-name').value.trim(),
    series:    document.getElementById('series').value,
    expansion: document.getElementById('expansion').value,
    rarity:    document.getElementById('rarity').value,
    number:    document.getElementById('card-number').value.trim(),
    quantity:  parseInt(document.getElementById('quantity').value) || 1,
    binderId:  document.getElementById('binder-select').value,
    image:     imageData,
  };

  const newId = saveCard(card);
  form.classList.add('form--saved');
  setTimeout(() => form.classList.remove('form--saved'), 1000);

  showToast(`"${card.name}" added to your collection!`);

  // ✅ URL PARAMETER — pass card ID to detail page
  setTimeout(() => {
    window.location.href = `card-detail.html?id=${newId}`;
  }, 1200);
});

// ── Demo cards ────────────────────────────────────────────────────────
document.getElementById('demo-btn').addEventListener('click', () => {
  const demos = [
    { name: 'Charizard', series: 'base', expansion: 'base1', rarity: 'Holo Rare', number: '4/102', quantity: 1, image: '', binderId: '' },
    { name: 'Pikachu',   series: 'base', expansion: 'base1', rarity: 'Common',    number: '58/102', quantity: 3, image: '', binderId: '' },
    { name: 'Mewtwo',    series: 'base', expansion: 'base1', rarity: 'Holo Rare', number: '10/102', quantity: 1, image: '', binderId: '' },
  ];
  demos.forEach(saveCard);
  showToast('3 demo cards added!');
  setTimeout(() => window.location.href = 'index.html', 1200);
});

// ── Init ──────────────────────────────────────────────────────────────
loadBinders();
loadSeries();