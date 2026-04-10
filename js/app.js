// app.js — home page: card grid, filters, add/edit modal
import { getCards, setCards, findCardById, saveCard, deleteCard, createId, fileToDataUrl } from './storage.js';
import { escapeHtml, escapeAttr, formatCurrency, getParam, showToast, initNav } from './utils.js';

initNav();

const STORAGE_KEY = 'cardflow_cards_v1';

const DEFAULT_SETS = {
  pokemon: ['Base Set', 'Jungle', 'Fossil', '151', 'Paldean Fates', 'Surging Sparks'],
  mtg: ['Alpha', 'Beta', 'Unlimited', 'Modern Horizons 3', 'Foundations'],
  onepiece: ['Romance Dawn', 'Paramount War', 'Pillars of Strength', 'Awakening of the New Era'],
};

const GAME_LABELS = {
  pokemon: 'Pokémon',
  mtg: 'Magic: The Gathering',
  onepiece: 'One Piece',
};

const state = {
  filtersOpen: true,
  editingId: '',
  uploadedImageDataUrl: '',
  setOptions: {
    pokemon: [...DEFAULT_SETS.pokemon],
    mtg: [...DEFAULT_SETS.mtg],
    onepiece: [...DEFAULT_SETS.onepiece],
  },
};

const el = id => document.getElementById(id);
const elements = {
  addCardBtn: el('addCardBtn'),
  emptyAddBtn: el('emptyAddBtn'),
  toggleFiltersBtn: el('toggleFiltersBtn'),
  clearFiltersBtn: el('clearFiltersBtn'),
  searchInput: el('searchInput'),
  gameFilter: el('gameFilter'),
  setFilter: el('setFilter'),
  conditionFilter: el('conditionFilter'),
  sortSelect: el('sortSelect'),
  totalCards: el('totalCards'),
  totalValue: el('totalValue'),
  filters: el('filters'),
  emptyState: el('emptyState'),
  binderGrid: el('binderGrid'),
  modalOverlay: el('modalOverlay'),
  modalTitle: el('modalTitle'),
  closeModalBtn: el('closeModalBtn'),
  cardForm: el('cardForm'),
  cardId: el('cardId'),
  deleteBtn: el('deleteBtn'),
  cancelBtn: el('cancelBtn'),
  game: el('game'),
  name: el('name'),
  setId: el('setId'),
  cardNumber: el('cardNumber'),
  condition: el('condition'),
  quantity: el('quantity'),
  foil: el('foil'),
  purchasePrice: el('purchasePrice'),
  currentValue: el('currentValue'),
  imageUrl: el('imageUrl'),
  imageFile: el('imageFile'),
  imagePreviewImg: el('imagePreviewImg'),
  imagePreviewPlaceholder: el('imagePreviewPlaceholder'),
  notes: el('notes'),
};

const errorNodes = new Map(
  Array.from(document.querySelectorAll('.error[data-for]')).map(n => [n.dataset.for, n])
);

// ── URL param: open edit modal for ?edit=id ────────────────────────────
const editParam = getParam('edit');

bindEvents();
hydrateSetOptions().finally(() => {
  populateSetSelect(elements.game?.value || '');
  populateFilterSets();
  render();
  if (editParam) openModal(editParam);
});

function bindEvents() {
  elements.addCardBtn?.addEventListener('click', () => openModal());
  elements.emptyAddBtn?.addEventListener('click', () => openModal());
  elements.closeModalBtn?.addEventListener('click', closeModal);
  elements.cancelBtn?.addEventListener('click', closeModal);
  elements.deleteBtn?.addEventListener('click', deleteCurrentCard);
  elements.cardForm?.addEventListener('submit', handleSubmit);
  elements.game?.addEventListener('change', () => populateSetSelect(elements.game.value));
  elements.imageUrl?.addEventListener('input', syncPreviewFromUrl);
  elements.imageFile?.addEventListener('change', syncPreviewFromFile);
  elements.searchInput?.addEventListener('input', render);
  elements.gameFilter?.addEventListener('change', () => { populateFilterSets(); render(); });
  elements.setFilter?.addEventListener('change', render);
  elements.conditionFilter?.addEventListener('change', render);
  elements.sortSelect?.addEventListener('change', render);
  elements.clearFiltersBtn?.addEventListener('click', clearFilters);
  elements.toggleFiltersBtn?.addEventListener('click', toggleFilters);
  elements.modalOverlay?.addEventListener('click', e => { if (e.target === elements.modalOverlay) closeModal(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !elements.modalOverlay?.hidden) closeModal(); });
  window.addEventListener('storage', e => {
    if (e.key !== STORAGE_KEY) return;
    populateFilterSets();
    render();
  });
}

async function hydrateSetOptions() {
  try {
    const [seedCards, pokemonData] = await Promise.all([
      fetch('data/cards.json').then(r => r.ok ? r.json() : []).catch(() => []),
      fetch('database/cardflow-pokemon-dataset.json').then(r => r.ok ? r.json() : null).catch(() => null),
    ]);

    if (Array.isArray(seedCards)) {
      for (const entry of seedCards) {
        const game = String(entry.game || '').trim().toLowerCase() === 'magic' ? 'mtg' : String(entry.game || '').trim().toLowerCase();
        const setName = String(entry.set || '').trim();
        if (state.setOptions[game] && setName) pushUnique(state.setOptions[game], setName);
      }
    }

    const expansions = Array.isArray(pokemonData?.expansions) ? pokemonData.expansions : [];
    for (const e of expansions) {
      const name = String(e.name || '').trim();
      if (name) pushUnique(state.setOptions.pokemon, name);
    }

    Object.keys(state.setOptions).forEach(g => state.setOptions[g].sort((a, b) => a.localeCompare(b)));
  } catch { /* silent — fallback to defaults */ }
}

function render() {
  const cards = getFilteredCards();
  renderSummary(cards);
  renderGrid(cards);
}

function getFilteredCards() {
  const search = elements.searchInput?.value.trim().toLowerCase() || '';
  const game = elements.gameFilter?.value || '';
  const set = elements.setFilter?.value || '';
  const condition = elements.conditionFilter?.value || '';
  const sort = elements.sortSelect?.value || 'recent';

  let cards = getCards().filter(c => {
    if (search && !`${c.name} ${c.notes || ''}`.toLowerCase().includes(search)) return false;
    if (game && c.game !== game) return false;
    if (set && c.setId !== set) return false;
    if (condition && c.condition !== condition) return false;
    return true;
  });

  cards.sort((a, b) => {
    if (sort === 'name') return a.name.localeCompare(b.name);
    if (sort === 'valueDesc') return cardValue(b) - cardValue(a);
    if (sort === 'qtyDesc') return Number(b.quantity || 0) - Number(a.quantity || 0);
    return Number(b.updatedAt || 0) - Number(a.updatedAt || 0);
  });

  return cards;
}

function renderSummary(cards) {
  const total = cards.reduce((s, c) => s + Number(c.quantity || 0), 0);
  const value = cards.reduce((s, c) => s + cardValue(c), 0);
  if (elements.totalCards) elements.totalCards.textContent = String(total);
  if (elements.totalValue) elements.totalValue.textContent = formatCurrency(value);
}

function renderGrid(cards) {
  if (!elements.binderGrid || !elements.emptyState) return;
  elements.emptyState.hidden = cards.length > 0;
  elements.binderGrid.innerHTML = '';
  if (!cards.length) return;

  const frag = document.createDocumentFragment();
  for (const card of cards) {
    const article = document.createElement('article');
    article.className = 'binder-card card-anim';
    article.tabIndex = 0;
    article.setAttribute('role', 'button');
    article.setAttribute('aria-label', `View or edit ${card.name}`);

    const imgSrc = card.imageUrl || card.externalImageUrl || '';
    const imgMarkup = imgSrc
      ? `<img src="${escapeAttr(imgSrc)}" alt="${escapeAttr(card.name)}" loading="lazy">`
      : '<div class="binder-card__placeholder">No image</div>';

    article.innerHTML = `
      <div class="binder-card__image">${imgMarkup}</div>
      <div class="binder-card__body">
        <div class="binder-card__topline">
          <span class="binder-card__game">${escapeHtml(GAME_LABELS[card.game] || card.game)}</span>
          <span class="qty-pill">x${Number(card.quantity || 0)}</span>
        </div>
        <h3>${escapeHtml(card.name)}</h3>
        <p class="binder-card__set">${escapeHtml(card.setId || '')}</p>
        <dl class="binder-card__meta">
          <div><dt>Condition</dt><dd>${escapeHtml(card.condition)}</dd></div>
          <div><dt>Number</dt><dd>${escapeHtml(card.cardNumber || 'N/A')}</dd></div>
          <div><dt>Value</dt><dd>${formatCurrency(Number(card.currentValue || 0))}</dd></div>
          <div><dt>Foil</dt><dd>${card.foil ? 'Yes' : 'No'}</dd></div>
        </dl>
        <div class="binder-card__actions">
          <a href="card-detail.html?id=${encodeURIComponent(card.id)}"
             class="btn" style="font-size:13px;padding:6px 14px;"
             aria-label="View detail for ${escapeAttr(card.name)}"
             onclick="event.stopPropagation()">View Detail</a>
        </div>
      </div>`;

    article.addEventListener('click', e => { if (!e.target.closest('a')) openModal(card.id); });
    article.addEventListener('keydown', e => {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      e.preventDefault();
      openModal(card.id);
    });
    article.querySelector('img')?.addEventListener('error', function () {
      this.replaceWith(Object.assign(document.createElement('div'), { className: 'binder-card__placeholder', textContent: 'No image' }));
    });

    frag.appendChild(article);
  }
  elements.binderGrid.appendChild(frag);
}

function openModal(cardId = '') {
  clearErrors();
  state.editingId = cardId;
  state.uploadedImageDataUrl = '';
  elements.cardForm?.reset();
  if (elements.cardId) elements.cardId.value = cardId;

  if (cardId) {
    const card = findCardById(cardId);
    if (!card) return;
    if (elements.modalTitle) elements.modalTitle.textContent = 'Edit Card';
    if (elements.deleteBtn) elements.deleteBtn.hidden = false;
    elements.game.value = card.game;
    populateSetSelect(card.game, card.setId);
    elements.name.value = card.name;
    elements.cardNumber.value = card.cardNumber || '';
    elements.condition.value = card.condition;
    elements.quantity.value = String(card.quantity);
    elements.foil.checked = Boolean(card.foil);
    elements.purchasePrice.value = card.purchasePrice > 0 ? String(card.purchasePrice) : '';
    elements.currentValue.value = card.currentValue > 0 ? String(card.currentValue) : '';
    elements.imageUrl.value = card.externalImageUrl || card.imageUrl || '';
    elements.notes.value = card.notes || '';
    setPreview(card.imageUrl || card.externalImageUrl || '');
  } else {
    if (elements.modalTitle) elements.modalTitle.textContent = 'Add Card';
    if (elements.deleteBtn) elements.deleteBtn.hidden = true;
    elements.quantity.value = '1';
    populateSetSelect(elements.game?.value || '');
    setPreview('');
  }

  if (elements.modalOverlay) {
    elements.modalOverlay.hidden = false;
    elements.modalOverlay.removeAttribute('aria-hidden');
  }
  document.body.classList.add('modal-open');
  elements.name?.focus();
}

function closeModal() {
  state.editingId = '';
  state.uploadedImageDataUrl = '';
  if (elements.modalOverlay) {
    elements.modalOverlay.hidden = true;
    elements.modalOverlay.setAttribute('aria-hidden', 'true');
  }
  document.body.classList.remove('modal-open');
  clearErrors();
  setPreview('');
}

async function handleSubmit(e) {
  e.preventDefault();
  clearErrors();

  if (elements.imageFile?.files?.[0]) {
    try { state.uploadedImageDataUrl = await fileToDataUrl(elements.imageFile.files[0]); }
    catch { showFieldError('imageFile', 'Could not read image.'); return; }
  }

  const card = {
    id: state.editingId || createId(),
    game: elements.game.value,
    name: elements.name.value.trim(),
    setId: elements.setId.value,
    cardNumber: elements.cardNumber.value.trim(),
    condition: elements.condition.value,
    quantity: Number(elements.quantity.value || 0),
    foil: elements.foil.checked,
    purchasePrice: Number(elements.purchasePrice.value || 0),
    currentValue: Number(elements.currentValue.value || 0),
    imageUrl: state.uploadedImageDataUrl || elements.imageUrl.value.trim(),
    externalImageUrl: elements.imageUrl.value.trim(),
    notes: elements.notes.value.trim(),
  };

  const errors = validate(card);
  if (errors.length) { showErrors(errors); return; }

  saveCard(card);
  pushUnique(state.setOptions[card.game], card.setId);
  state.setOptions[card.game]?.sort((a, b) => a.localeCompare(b));
  showToast(state.editingId ? 'Card updated.' : 'Card added!');
  populateFilterSets();
  render();
  closeModal();
}

function deleteCurrentCard() {
  if (!state.editingId) return;
  const card = findCardById(state.editingId);
  if (!confirm(`Delete "${card?.name}"?`)) return;
  deleteCard(state.editingId);
  showToast('Card removed.');
  populateFilterSets();
  render();
  closeModal();
}

function validate(card) {
  const e = [];
  if (!card.game) e.push(['game', 'Choose a game.']);
  if (!card.name || card.name.length < 2) e.push(['name', 'Name needs at least 2 characters.']);
  if (!card.setId) e.push(['setId', 'Choose a set.']);
  if (!card.condition) e.push(['condition', 'Choose a condition.']);
  if (!Number.isInteger(card.quantity) || card.quantity < 1) e.push(['quantity', 'Quantity must be at least 1.']);
  if (card.purchasePrice < 0) e.push(['purchasePrice', 'Cannot be negative.']);
  if (card.currentValue < 0) e.push(['currentValue', 'Cannot be negative.']);
  if (card.externalImageUrl) {
    try { new URL(card.externalImageUrl); } catch { e.push(['imageUrl', 'Must be a valid URL.']); }
  }
  return e;
}

function showErrors(errors) {
  const seen = new Set();
  for (const [field, msg] of errors) {
    if (!seen.has(field)) { errorNodes.get(field)?.replaceChildren(msg); seen.add(field); }
  }
  const first = errors[0]?.[0];
  if (first && elements[first]) elements[first].focus();
}

function showFieldError(field, msg) {
  errorNodes.get(field)?.replaceChildren(msg);
}

function clearErrors() {
  errorNodes.forEach(n => { n.textContent = ''; });
}

function clearFilters() {
  elements.searchInput.value = '';
  elements.gameFilter.value = '';
  elements.conditionFilter.value = '';
  elements.sortSelect.value = 'recent';
  populateFilterSets();
  render();
}

function toggleFilters() {
  state.filtersOpen = !state.filtersOpen;
  elements.filters?.classList.toggle('is-collapsed', !state.filtersOpen);
  elements.toggleFiltersBtn?.setAttribute('aria-expanded', String(state.filtersOpen));
}

function populateSetSelect(game, selected = '') {
  if (!elements.setId) return;
  const opts = state.setOptions[game] || [];
  elements.setId.innerHTML = '<option value="">Select a set…</option>';
  opts.forEach(s => {
    const o = document.createElement('option');
    o.value = s; o.textContent = s;
    elements.setId.appendChild(o);
  });
  if (selected) {
    if (!opts.includes(selected)) {
      const o = document.createElement('option');
      o.value = selected; o.textContent = selected;
      elements.setId.appendChild(o);
    }
    elements.setId.value = selected;
  }
}

function populateFilterSets() {
  if (!elements.setFilter) return;
  const game = elements.gameFilter?.value || '';
  const sets = new Set();
  if (game) {
    (state.setOptions[game] || []).forEach(s => sets.add(s));
    getCards().filter(c => c.game === game).forEach(c => c.setId && sets.add(c.setId));
  } else {
    Object.values(state.setOptions).flat().forEach(s => sets.add(s));
    getCards().forEach(c => c.setId && sets.add(c.setId));
  }
  const prev = elements.setFilter.value;
  elements.setFilter.innerHTML = '<option value="">All sets</option>';
  Array.from(sets).sort((a, b) => a.localeCompare(b)).forEach(s => {
    const o = document.createElement('option');
    o.value = s; o.textContent = s;
    elements.setFilter.appendChild(o);
  });
  elements.setFilter.value = sets.has(prev) ? prev : '';
}

function syncPreviewFromUrl() {
  if (elements.imageFile?.files?.length) return;
  setPreview(elements.imageUrl?.value.trim() || '');
}

async function syncPreviewFromFile() {
  const file = elements.imageFile?.files?.[0];
  if (!file) { state.uploadedImageDataUrl = ''; syncPreviewFromUrl(); return; }
  try {
    state.uploadedImageDataUrl = await fileToDataUrl(file);
    setPreview(state.uploadedImageDataUrl);
  } catch {
    state.uploadedImageDataUrl = '';
    showFieldError('imageFile', 'Could not read image.');
    setPreview('');
  }
}

function setPreview(src) {
  if (!elements.imagePreviewImg || !elements.imagePreviewPlaceholder) return;
  if (!src) {
    elements.imagePreviewImg.hidden = true;
    elements.imagePreviewImg.removeAttribute('src');
    elements.imagePreviewPlaceholder.hidden = false;
  } else {
    elements.imagePreviewImg.src = src;
    elements.imagePreviewImg.hidden = false;
    elements.imagePreviewPlaceholder.hidden = true;
  }
}

function cardValue(c) { return Number(c.currentValue || 0) * Number(c.quantity || 0); }
function pushUnique(arr, val) { if (Array.isArray(arr) && val && !arr.includes(val)) arr.push(val); }