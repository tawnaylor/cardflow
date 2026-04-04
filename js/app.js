const STORAGE_KEY = 'cardflow_binder_cards_v1';
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
  imagePreview: document.getElementById('imagePreview'),
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
  elements.gameFilter?.addEventListener('change', () => {
    populateFilterSets();
    render();
  });
  elements.setFilter?.addEventListener('change', render);
  elements.conditionFilter?.addEventListener('change', render);
  elements.sortSelect?.addEventListener('change', render);
  elements.clearFiltersBtn?.addEventListener('click', clearFilters);
  elements.toggleFiltersBtn?.addEventListener('click', toggleFilters);

  elements.modalOverlay?.addEventListener('click', (event) => {
    if (event.target === elements.modalOverlay) closeModal();
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !elements.modalOverlay?.hidden) {
      closeModal();
    }
  });

  window.addEventListener('storage', (event) => {
    if (event.key !== STORAGE_KEY) return;
    state.cards = loadCards();
    populateFilterSets();
    render();
  });
}

async function hydrateSetOptions() {
  const requests = [
    fetch('../data/cards.json').then((response) => (response.ok ? response.json() : [])).catch(() => []),
    fetch('../database/cardflow-pokemon-dataset.json')
      .then((response) => (response.ok ? response.json() : null))
      .catch(() => null),
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

  Object.keys(state.setOptions).forEach((game) => {
    state.setOptions[game].sort((left, right) => left.localeCompare(right));
  });
}

function loadCards() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveCards() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.cards));
}

function render() {
  const cards = getFilteredCards();
  renderSummary(cards);
  renderGrid(cards);
}

function getFilteredCards() {
  const searchValue = elements.searchInput?.value.trim().toLowerCase() || '';
  const gameValue = elements.gameFilter?.value || '';
  const setValue = elements.setFilter?.value || '';
  const conditionValue = elements.conditionFilter?.value || '';
  const sortValue = elements.sortSelect?.value || 'recent';

  const filtered = state.cards.filter((card) => {
    if (searchValue && !`${card.name} ${card.notes || ''}`.toLowerCase().includes(searchValue)) return false;
    if (gameValue && card.game !== gameValue) return false;
    if (setValue && card.setId !== setValue) return false;
    if (conditionValue && card.condition !== conditionValue) return false;
    return true;
  });

  filtered.sort((left, right) => {
    if (sortValue === 'name') return left.name.localeCompare(right.name);
    if (sortValue === 'valueDesc') return totalCardValue(right) - totalCardValue(left);
    if (sortValue === 'qtyDesc') return Number(right.quantity || 0) - Number(left.quantity || 0);
    return Number(right.updatedAt || 0) - Number(left.updatedAt || 0);
  });

  return filtered;
}

function renderSummary(cards) {
  const totalCards = cards.reduce((sum, card) => sum + Number(card.quantity || 0), 0);
  const totalValue = cards.reduce((sum, card) => sum + totalCardValue(card), 0);

  if (elements.totalCards) elements.totalCards.textContent = String(totalCards);
  if (elements.totalValue) elements.totalValue.textContent = formatCurrency(totalValue);
}

function renderGrid(cards) {
  if (!elements.binderGrid || !elements.emptyState) return;

  elements.emptyState.hidden = cards.length > 0;
  elements.binderGrid.innerHTML = '';

  if (!cards.length) return;

  const fragment = document.createDocumentFragment();
  for (const card of cards) {
    const article = document.createElement('article');
    article.className = 'binder-card';
    article.tabIndex = 0;
    article.setAttribute('role', 'button');
    article.setAttribute('aria-label', `Edit ${card.name}`);

    const imageSource = card.imageUrl || card.externalImageUrl || '';
    const imageMarkup = imageSource
      ? `<img src="${escapeAttribute(imageSource)}" alt="${escapeAttribute(card.name)}" loading="lazy">`
      : '<div class="binder-card__placeholder">No image</div>';

    article.innerHTML = `
      <div class="binder-card__image">${imageMarkup}</div>
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
      </div>
    `;

    const open = () => openModal(card.id);
    article.addEventListener('click', open);
    article.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      event.preventDefault();
      open();
    });

    const image = article.querySelector('img');
    image?.addEventListener('error', () => {
      image.replaceWith(createPlaceholder());
    });

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
    const card = state.cards.find((entry) => entry.id === cardId);
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
  document.body.classList.add('modal-open');
  elements.name.focus();
}

function closeModal() {
  state.editingId = '';
  state.uploadedImageDataUrl = '';
  elements.modalOverlay.hidden = true;
  document.body.classList.remove('modal-open');
  clearErrors();
  setPreviewImage('');
}

async function handleSubmit(event) {
  event.preventDefault();
  clearErrors();

  if (elements.imageFile?.files?.[0]) {
    try {
      state.uploadedImageDataUrl = await readFileAsDataUrl(elements.imageFile.files[0]);
    } catch {
      showErrors([['imageFile', 'The selected image could not be read. Try a different file.']]);
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
  if (errors.length) {
    showErrors(errors);
    return;
  }

  if (state.editingId) {
    const existing = state.cards.find((card) => card.id === state.editingId);
    payload.createdAt = existing?.createdAt || payload.createdAt;
    state.cards = state.cards.map((card) => (card.id === state.editingId ? payload : card));
    showToast('Card updated.');
  } else {
    state.cards.unshift(payload);
    showToast('Card added to binder.');
  }

  pushUnique(state.setOptions[payload.game], payload.setId);
  state.setOptions[payload.game].sort((left, right) => left.localeCompare(right));
  saveCards();
  populateFilterSets();
  render();
  closeModal();
}

function deleteCurrentCard() {
  if (!state.editingId) return;
  state.cards = state.cards.filter((card) => card.id !== state.editingId);
  saveCards();
  populateFilterSets();
  render();
  closeModal();
  showToast('Card removed.');
}

function validate(card) {
  const issues = [];

  if (!card.game) issues.push(['game', 'Choose a game.']);
  if (!card.name || card.name.length < 2) issues.push(['name', 'Enter a card name with at least 2 characters.']);
  if (!card.setId) issues.push(['setId', 'Choose a set.']);
  if (!card.condition) issues.push(['condition', 'Choose a condition.']);
  if (!Number.isInteger(card.quantity) || card.quantity < 1) issues.push(['quantity', 'Quantity must be a whole number of at least 1.']);
  if (card.purchasePrice < 0) issues.push(['purchasePrice', 'Purchase price cannot be negative.']);
  if (card.currentValue < 0) issues.push(['currentValue', 'Current value cannot be negative.']);
  if (state.uploadedImageDataUrl && !state.uploadedImageDataUrl.startsWith('data:image/')) {
    issues.push(['imageFile', 'Uploaded file must be an image.']);
  }

  if (card.externalImageUrl) {
    try {
      new URL(card.externalImageUrl);
    } catch {
      issues.push(['imageUrl', 'Image URL must be a valid absolute URL.']);
    }
  }

  return issues;
}

function showErrors(errors) {
  const seen = new Set();
  for (const [field, message] of errors) {
    if (!seen.has(field)) {
      errorNodes.get(field)?.replaceChildren(message);
      seen.add(field);
    }
  }

  const firstField = errors[0]?.[0];
  if (firstField && elements[firstField]) {
    elements[firstField].focus();
  }
}

function clearErrors() {
  errorNodes.forEach((node) => {
    node.textContent = '';
  });
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
    const option = document.createElement('option');
    option.value = setName;
    option.textContent = setName;
    elements.setId.appendChild(option);
  }

  if (selectedValue && options.includes(selectedValue)) {
    elements.setId.value = selectedValue;
  } else if (selectedValue) {
    const customOption = document.createElement('option');
    customOption.value = selectedValue;
    customOption.textContent = selectedValue;
    elements.setId.appendChild(customOption);
    elements.setId.value = selectedValue;
  }
}

function populateFilterSets() {
  if (!elements.setFilter) return;

  const game = elements.gameFilter?.value || '';
  const sets = new Set();
  const addSet = (value) => {
    if (value) sets.add(value);
  };

  if (game) {
    (state.setOptions[game] || []).forEach(addSet);
    state.cards.filter((card) => card.game === game).forEach((card) => addSet(card.setId));
  } else {
    Object.values(state.setOptions).flat().forEach(addSet);
    state.cards.forEach((card) => addSet(card.setId));
  }

  const previous = elements.setFilter.value;
  elements.setFilter.innerHTML = '<option value="">All sets</option>';

  Array.from(sets)
    .sort((left, right) => left.localeCompare(right))
    .forEach((setName) => {
      const option = document.createElement('option');
      option.value = setName;
      option.textContent = setName;
      elements.setFilter.appendChild(option);
    });

  elements.setFilter.value = sets.has(previous) ? previous : '';
}

function totalCardValue(card) {
  return Number(card.currentValue || 0) * Number(card.quantity || 0);
}

function formatCurrency(value) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(Number(value || 0));
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
  if (!file) {
    state.uploadedImageDataUrl = '';
    syncPreviewFromUrl();
    return;
  }

  try {
    state.uploadedImageDataUrl = await readFileAsDataUrl(file);
    clearFieldError('imageFile');
    setPreviewImage(state.uploadedImageDataUrl);
  } catch {
    state.uploadedImageDataUrl = '';
    showErrors([['imageFile', 'The selected image could not be read. Try a different file.']]);
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
  const placeholder = document.createElement('div');
  placeholder.className = 'binder-card__placeholder';
  placeholder.textContent = 'No image';
  return placeholder;
}

function createId() {
  return crypto.randomUUID ? crypto.randomUUID() : `card-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function pushUnique(items, value) {
  if (!Array.isArray(items) || !value || items.includes(value)) return;
  items.push(value);
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener('load', () => resolve(String(reader.result || '')));
    reader.addEventListener('error', () => reject(reader.error));
    reader.readAsDataURL(file);
  });
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function escapeAttribute(value) {
  return escapeHtml(value).replaceAll('`', '&#096;');
}