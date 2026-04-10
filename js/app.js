import { loadCards, saveCards, STORAGE_KEY } from './storage.js';
import { createId, escapeHtml, escapeAttribute, formatCurrency, pushUnique, readFileAsDataUrl } from './utils.js';

const DEFAULT_SETS = {
  pokemon: ['Base Set', 'Jungle', 'Fossil', '151', 'Paldean Fates', 'Surging Sparks'],
  mtg: ['Alpha', 'Beta', 'Unlimited', 'Modern Horizons 3', 'Foundations'],
  onepiece: ['Romance Dawn', 'Paramount War', 'Pillars of Strength', 'Awakening of the New Era'],
};

const GAME_LABELS = {
  pokemon: 'Pokemon',
  mtg: 'Magic: The Gathering',
  onepiece: 'One Piece',
};

const state = {
  cards: loadCards(),
  filtersOpen: true,
  editingId: '',
  uploadedImageDataUrl: '',
  setOptions: {
    pokemon: [...DEFAULT_SETS.pokemon],
    mtg: [...DEFAULT_SETS.mtg],
    onepiece: [...DEFAULT_SETS.onepiece],
  },
};

const elements = {
  addCardBtn: document.getElementById('addCardBtn'),
  emptyAddBtn: document.getElementById('emptyAddBtn'),
  toggleFiltersBtn: document.getElementById('toggleFiltersBtn'),
  clearFiltersBtn: document.getElementById('clearFiltersBtn'),
  searchInput: document.getElementById('searchInput'),
  gameFilter: document.getElementById('gameFilter'),
  setFilter: document.getElementById('setFilter'),
  conditionFilter: document.getElementById('conditionFilter'),
  sortSelect: document.getElementById('sortSelect'),
  totalCards: document.getElementById('totalCards'),
  totalValue: document.getElementById('totalValue'),
  filters: document.getElementById('filters'),
  emptyState: document.getElementById('emptyState'),
  binderGrid: document.getElementById('binderGrid'),
  modalOverlay: document.getElementById('modalOverlay'),
  modalTitle: document.getElementById('modalTitle'),
  closeModalBtn: document.getElementById('closeModalBtn'),
  cardForm: document.getElementById('cardForm'),
  cardId: document.getElementById('cardId'),
  deleteBtn: document.getElementById('deleteBtn'),
  cancelBtn: document.getElementById('cancelBtn'),
  game: document.getElementById('game'),
  name: document.getElementById('name'),
  setId: document.getElementById('setId'),
  cardNumber: document.getElementById('cardNumber'),
  condition: document.getElementById('condition'),
  quantity: document.getElementById('quantity'),
  foil: document.getElementById('foil'),
  purchasePrice: document.getElementById('purchasePrice'),
  currentValue: document.getElementById('currentValue'),
  imageUrl: document.getElementById('imageUrl'),
  imageFile: document.getElementById('imageFile'),
  imagePreviewImg: document.getElementById('imagePreviewImg'),
  imagePreviewPlaceholder: document.getElementById('imagePreviewPlaceholder'),
  notes: document.getElementById('notes'),
  toast: document.getElementById('toast'),
};

const errorNodes = new Map(
  Array.from(document.querySelectorAll('.error[data-for]')).map((node) => [node.dataset.for, node])
);

bindEvents();
hydrateSetOptions().finally(() => {
  populateSetSelect(elements.game.value);
  populateFilterSets();
  render();
});

// Check for ?edit=id URL param on load — open modal for that card
const editParam = new URLSearchParams(window.location.search).get('edit');
if (editParam) {
  window.addEventListener('DOMContentLoaded', () => openModal(editParam));
  openModal(editParam);
}

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
  elements.modalOverlay?.addEventListener('click', (e) => { if (e.target === elements.modalOverlay) closeModal(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !elements.modalOverlay?.hidden) closeModal(); });
  window.addEventListener('storage', (e) => {
    if (e.key !== STORAGE_KEY) return;
    state.cards = loadCards();
    populateFilterSets();
    render();
  });
}

async function hydrateSetOptions() {
  const requests = [
    fetch('../data/cards.json').then(r => r.ok ? r.json() : []).catch(() => []),
    fetch('../database/cardflow-pokemon-dataset.json').then(r => r.ok ? r.json() : null).catch(() => null),
  ];
  const [seedCards, pokemonDataset] = await Promise.all(requests);

  if (Array.isArray(seedCards)) {
    for (const entry of seedCards) {
      const rawGame = String(entry.game || '').trim().toLowerCase();
      const game = rawGame === 'magic' ? 'mtg' : rawGame;
      const setName = String(entry.set || '').trim();
      if (!state.setOptions[game] || !setName) continue;
      pushUnique(state.setOptions[game], setName);
    }
  }

  const expansions = Array.isArray(pokemonDataset?.expansions) ? pokemonDataset.expansions : [];
  for (const expansion of expansions) {
    const setName = String(expansion.name || '').trim();
    if (setName) pushUnique(state.setOptions.pokemon, setName);
  }

  Object.keys(state.setOptions).forEach(game => {
    state.setOptions[game].sort((a, b) => a.localeCompare(b));
  });
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

  const filtered = state.cards.filter(card => {
    if (search && !`${card.name} ${card.notes || ''}`.toLowerCase().includes(search)) return false;
    if (game && card.game !== game) return false;
    if (set && card.setId !== set) return false;
    if (condition && card.condition !== condition) return false;
    return true;
  });

  filtered.sort((a, b) => {
    if (sort === 'name') return a.name.localeCompare(b.name);
    if (sort === 'valueDesc') return totalCardValue(b) - totalCardValue(a);
    if (sort === 'qtyDesc') return Number(b.quantity || 0) - Number(a.quantity || 0);
    return Number(b.updatedAt || 0) - Number(a.updatedAt || 0);
  });

  return filtered;
}

function renderSummary(cards) {
  const total = cards.reduce((sum, c) => sum + Number(c.quantity || 0), 0);
  const value = cards.reduce((sum, c) => sum + totalCardValue(c), 0);
  if (elements.totalCards) elements.totalCards.textContent = String(total);
  if (elements.totalValue) elements.totalValue.textContent = formatCurrency(value);
}

function renderGrid(cards) {
  if (!elements.binderGrid || !elements.emptyState) return;
  elements.emptyState.hidden = cards.length > 0;
  elements.binderGrid.innerHTML = '';
  if (!cards.length) return;

  const fragment = document.createDocumentFragment();
  for (const card of cards) {
    const article = document.createElement('article');
    article.className = 'binder-card card-item';
    article.tabIndex = 0;
    article.setAttribute('role', 'button');
    article.setAttribute('aria-label', `Edit ${card.name}`);

    const imgSrc = card.imageUrl || card.externalImageUrl || '';
    const imgMarkup = imgSrc
      ? `<img src="${escapeAttribute(imgSrc)}" alt="${escapeAttribute(card.name)}" loading="lazy">`
      : '<div class="binder-card__placeholder">No image</div>';

    article.innerHTML = `
      <div class="binder-card__image">${imgMarkup}</div>
      <div class="binder-card__body">
        <div class="binder-card__topline">
          <span class="binder-card__game">${escapeHtml(GAME_LABELS[card.game] || card.game)}</span>
          <span class="qty-pill">x${Number(card.quantity || 0)}</span>
        </div>
        <h3>${escapeHtml(card.name)}</h3>
        <p class="binder-card__set">${escapeHtml(card.setId)}</p>
        <dl class="binder-card__meta">
          <div><dt>Condition</dt><dd>${escapeHtml(card.condition)}</dd></div>
          <div><dt>Number</dt><dd>${escapeHtml(card.cardNumber || 'N/A')}</dd></div>
          <div><dt>Current</dt><dd>${formatCurrency(Number(card.currentValue || 0))}</dd></div>
          <div><dt>Foil</dt><dd>${card.foil ? 'Yes' : 'No'}</dd></div>
        </dl>
        <div class="binder-card__actions">
          <a href="card-detail.html?id=${encodeURIComponent(card.id)}" class="btn" aria-label="View details for ${escapeAttribute(card.name)}">View Detail</a>
        </div>
      </div>`;

    article.addEventListener('click', (e) => {
      if (e.target.closest('a')) return;
      openModal(card.id);
    });
    article.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      e.preventDefault();
      openModal(card.id);
    });

    const img = article.querySelector('img');
    img?.addEventListener('error', () => img.replaceWith(createPlaceholder()));
    fragment.appendChild(article);
  }

  elements.binderGrid.appendChild(fragment);
}

function openModal(cardId = '') {
  clearErrors();
  state.editingId = cardId;
  state.uploadedImageDataUrl = '';
  elements.cardForm?.reset();
  elements.cardId.value = cardId;

  if (cardId) {
    const card = state.cards.find(c => c.id === cardId);
    if (!card) return;
    elements.modalTitle.textContent = 'Edit Card';
    elements.deleteBtn.hidden = false;
    elements.game.value = card.game;
    populateSetSelect(card.game, card.setId);
    elements.name.value = card.name;
    elements.cardNumber.value = card.cardNumber || '';
    elements.condition.value = card.condition;
    elements.quantity.value = String(card.quantity);
    elements.foil.checked = Boolean(card.foil);
    elements.purchasePrice.value = formatNumberInput(card.purchasePrice);
    elements.currentValue.value = formatNumberInput(card.currentValue);
    elements.imageUrl.value = card.externalImageUrl || card.imageUrl || '';
    elements.notes.value = card.notes || '';
    setPreviewImage(card.imageUrl || card.externalImageUrl || '');
  } else {
    elements.modalTitle.textContent = 'Add Card';
    elements.deleteBtn.hidden = true;
    elements.quantity.value = '1';
    populateSetSelect(elements.game.value);
    setPreviewImage('');
  }

  elements.modalOverlay.hidden = false;
  elements.modalOverlay.removeAttribute('aria-hidden');
  document.body.classList.add('modal-open');
  elements.name.focus();
}

function closeModal() {
  state.editingId = '';
  state.uploadedImageDataUrl = '';
  elements.modalOverlay.hidden = true;
  elements.modalOverlay.setAttribute('aria-hidden', 'true');
  document.body.classList.remove('modal-open');
  clearErrors();
  setPreviewImage('');
}

async function handleSubmit(e) {
  e.preventDefault();
  clearErrors();

  if (elements.imageFile?.files?.[0]) {
    try {
      state.uploadedImageDataUrl = await readFileAsDataUrl(elements.imageFile.files[0]);
    } catch {
      showErrors([['imageFile', 'The selected image could not be read.']]);
      return;
    }
  }

  const payload = {
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
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  const errors = validate(payload);
  if (errors.length) { showErrors(errors); return; }

  if (state.editingId) {
    const existing = state.cards.find(c => c.id === state.editingId);
    payload.createdAt = existing?.createdAt || payload.createdAt;
    state.cards = state.cards.map(c => c.id === state.editingId ? payload : c);
    showToast('Card updated.');
  } else {
    state.cards.unshift(payload);
    showToast('Card added to binder.');
  }

  pushUnique(state.setOptions[payload.game], payload.setId);
  state.setOptions[payload.game].sort((a, b) => a.localeCompare(b));
  saveCards(state.cards);
  populateFilterSets();
  render();
  closeModal();
}

function deleteCurrentCard() {
  if (!state.editingId) return;
  state.cards = state.cards.filter(c => c.id !== state.editingId);
  saveCards(state.cards);
  populateFilterSets();
  render();
  closeModal();
  showToast('Card removed.');
}

function validate(card) {
  const issues = [];
  if (!card.game) issues.push(['game', 'Choose a game.']);
  if (!card.name || card.name.length < 2) issues.push(['name', 'Enter a card name (at least 2 characters).']);
  if (!card.setId) issues.push(['setId', 'Choose a set.']);
  if (!card.condition) issues.push(['condition', 'Choose a condition.']);
  if (!Number.isInteger(card.quantity) || card.quantity < 1) issues.push(['quantity', 'Quantity must be at least 1.']);
  if (card.purchasePrice < 0) issues.push(['purchasePrice', 'Cannot be negative.']);
  if (card.currentValue < 0) issues.push(['currentValue', 'Cannot be negative.']);
  if (state.uploadedImageDataUrl && !state.uploadedImageDataUrl.startsWith('data:image/')) {
    issues.push(['imageFile', 'Uploaded file must be an image.']);
  }
  if (card.externalImageUrl) {
    try { new URL(card.externalImageUrl); } catch { issues.push(['imageUrl', 'Must be a valid URL.']); }
  }
  return issues;
}

function showErrors(errors) {
  const seen = new Set();
  for (const [field, message] of errors) {
    if (!seen.has(field)) { errorNodes.get(field)?.replaceChildren(message); seen.add(field); }
  }
  const firstField = errors[0]?.[0];
  if (firstField && elements[firstField]) elements[firstField].focus();
}

function clearErrors() {
  errorNodes.forEach(node => { node.textContent = ''; });
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
  elements.filters.classList.toggle('is-collapsed', !state.filtersOpen);
  elements.toggleFiltersBtn.setAttribute('aria-expanded', String(state.filtersOpen));
}

function populateSetSelect(game, selectedValue = '') {
  if (!elements.setId) return;
  const options = state.setOptions[game] || [];
  elements.setId.innerHTML = '<option value="">Select a set…</option>';
  for (const setName of options) {
    const opt = document.createElement('option');
    opt.value = setName;
    opt.textContent = setName;
    elements.setId.appendChild(opt);
  }
  if (selectedValue && options.includes(selectedValue)) {
    elements.setId.value = selectedValue;
  } else if (selectedValue) {
    const opt = document.createElement('option');
    opt.value = selectedValue;
    opt.textContent = selectedValue;
    elements.setId.appendChild(opt);
    elements.setId.value = selectedValue;
  }
}

function populateFilterSets() {
  if (!elements.setFilter) return;
  const game = elements.gameFilter?.value || '';
  const sets = new Set();
  if (game) {
    (state.setOptions[game] || []).forEach(s => sets.add(s));
    state.cards.filter(c => c.game === game).forEach(c => sets.add(c.setId));
  } else {
    Object.values(state.setOptions).flat().forEach(s => sets.add(s));
    state.cards.forEach(c => sets.add(c.setId));
  }
  const previous = elements.setFilter.value;
  elements.setFilter.innerHTML = '<option value="">All sets</option>';
  Array.from(sets).sort((a, b) => a.localeCompare(b)).forEach(setName => {
    const opt = document.createElement('option');
    opt.value = setName;
    opt.textContent = setName;
    elements.setFilter.appendChild(opt);
  });
  elements.setFilter.value = sets.has(previous) ? previous : '';
}

function totalCardValue(card) {
  return Number(card.currentValue || 0) * Number(card.quantity || 0);
}

function formatNumberInput(value) {
  return Number(value || 0) > 0 ? String(value) : '';
}

function showToast(message) {
  if (!elements.toast) return;
  elements.toast.textContent = message;
  elements.toast.hidden = false;
  elements.toast.classList.add('is-visible');
  window.clearTimeout(showToast.timeoutId);
  showToast.timeoutId = window.setTimeout(() => {
    elements.toast.classList.remove('is-visible');
    elements.toast.hidden = true;
  }, 2200);
}

function syncPreviewFromUrl() {
  if (elements.imageFile?.files?.length) return;
  setPreviewImage(elements.imageUrl?.value.trim() || '');
}

async function syncPreviewFromFile() {
  const file = elements.imageFile?.files?.[0];
  if (!file) { state.uploadedImageDataUrl = ''; syncPreviewFromUrl(); return; }
  try {
    state.uploadedImageDataUrl = await readFileAsDataUrl(file);
    clearFieldError('imageFile');
    setPreviewImage(state.uploadedImageDataUrl);
  } catch {
    state.uploadedImageDataUrl = '';
    showErrors([['imageFile', 'Could not read the selected image.']]);
    setPreviewImage('');
  }
}

function setPreviewImage(source) {
  if (!elements.imagePreviewImg || !elements.imagePreviewPlaceholder) return;
  if (!source) {
    elements.imagePreviewImg.hidden = true;
    elements.imagePreviewImg.removeAttribute('src');
    elements.imagePreviewPlaceholder.hidden = false;
    return;
  }
  elements.imagePreviewImg.src = source;
  elements.imagePreviewImg.hidden = false;
  elements.imagePreviewPlaceholder.hidden = true;
}

function clearFieldError(field) {
  const node = errorNodes.get(field);
  if (node) node.textContent = '';
}

function createPlaceholder() {
  const div = document.createElement('div');
  div.className = 'binder-card__placeholder';
  div.textContent = 'No image';
  return div;
}