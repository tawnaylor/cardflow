import { getCards, unassignBinderCards } from './storage.js';
import { escapeAttr, escapeHtml, initNav, getParam, formatCurrency } from './utils.js';

const DB_NAME = 'CardFlowDB';
const STORE_NAME = 'binders';
const GAME_LABELS = { pokemon: 'Pokémon', mtg: 'Magic: The Gathering', onepiece: 'One Piece' };
const CONDITION_LABELS = { NM: 'Near Mint (NM)', LP: 'Lightly Played (LP)', MP: 'Moderately Played (MP)', HP: 'Heavily Played (HP)', DMG: 'Damaged (DMG)' };

const hero = document.getElementById('binderDetailHero');
const cardsGrid = document.getElementById('binderCardsGrid');
const emptyState = document.getElementById('binderCardsEmpty');
const binderId = getParam('id');
let activeDb = null;

initNav();

if (!binderId) {
  hero.innerHTML = '<div class="empty-state"><div><h2>Binder not found</h2><p>Pick a binder from the Binders page.</p></div></div>';
} else {
  loadBinderDetail(binderId);
}

function loadBinderDetail(id) {
  const request = indexedDB.open(DB_NAME, 1);

  request.onerror = () => {
    hero.innerHTML = '<div class="empty-state"><div><h2>Could not load binder</h2><p>Refresh the page and try again.</p></div></div>';
  };

  request.onsuccess = event => {
    const db = event.target.result;
    activeDb = db;
    if (!db.objectStoreNames.contains(STORE_NAME)) {
      hero.innerHTML = '<div class="empty-state"><div><h2>No binders found</h2><p>Create a binder first.</p></div></div>';
      return;
    }

    const tx = db.transaction([STORE_NAME], 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const getRequest = store.get(Number(id));

    getRequest.onsuccess = () => {
      const binder = getRequest.result;
      if (!binder) {
        hero.innerHTML = '<div class="empty-state"><div><h2>Binder not found</h2><p>It may have been deleted.</p></div></div>';
        return;
      }
      renderBinderDetail(binder);
    };
  };
}

function renderBinderDetail(binder) {
  const binderCards = getCards().filter(card => String(card.binderId) === String(binder.id));
  const totalCards = binderCards.reduce((sum, card) => sum + Number(card.quantity || 1), 0);
  const totalValue = binderCards.reduce((sum, card) => sum + (Number(card.currentValue || 0) * Number(card.quantity || 1)), 0);
  const coverImage = binderCards[0]?.imageUrl || binderCards[0]?.imageDataUrl || (binder.image ? URL.createObjectURL(binder.image) : './images/cardflow%20logo.jpeg');

  hero.innerHTML = `
    <div class="binder-detail-hero">
      <div class="binder-detail-cover">
        <span class="binder-detail-cover__spine"></span>
        <img src="${escapeAttr(coverImage)}" alt="${escapeAttr(binder.name)} cover image">
      </div>
      <div class="binder-detail-meta">
        <div>
          <p class="summary-label">Binder</p>
          <h1 class="binder-detail-title">${escapeHtml(binder.name)}</h1>
        </div>
        <div class="binder-detail-actions">
          <button id="deleteBinderBtn" class="btn danger" type="button">Delete Binder</button>
        </div>
        <p class="binder-detail-copy">${escapeHtml(binder.description || 'A custom binder for your collection. Open any card below to view its full detail page.')}</p>
        <div class="binder-detail-stats">
          <div class="binder-detail-stat">
            <span>Unique cards</span>
            <strong>${binderCards.length}</strong>
          </div>
          <div class="binder-detail-stat">
            <span>Total quantity</span>
            <strong>${totalCards}</strong>
          </div>
          <div class="binder-detail-stat">
            <span>Estimated value</span>
            <strong>${escapeHtml(formatCurrency(totalValue))}</strong>
          </div>
        </div>
      </div>
    </div>`;

  const deleteBtn = document.getElementById('deleteBinderBtn');
  deleteBtn?.addEventListener('click', () => {
    deleteBinder(binder);
  });

  cardsGrid.innerHTML = '';
  emptyState.hidden = binderCards.length > 0;
  if (!binderCards.length) return;

  const fragment = document.createDocumentFragment();
  for (const card of binderCards) {
    const link = document.createElement('a');
    link.className = 'binder-card binder-card-link card-anim';
    link.href = `card-detail.html?id=${encodeURIComponent(card.id)}`;
    const imgSrc = card.imageUrl || card.imageDataUrl || card.externalImageUrl || '';
    const gameLabel = GAME_LABELS[card.game] || card.game || 'Pokémon';
    const conditionLabel = CONDITION_LABELS[card.condition] || card.condition || 'Near Mint (NM)';
    link.innerHTML = `
      <div class="binder-card__image">${imgSrc
        ? `<img src="${escapeAttr(imgSrc)}" alt="${escapeAttr(card.name)}" loading="lazy">`
        : '<div class="binder-card__placeholder">No image</div>'}
      </div>
      <div class="binder-card__body">
        <div class="binder-card__topline">
          <span class="binder-card__game">${escapeHtml(gameLabel)}</span>
          <span class="qty-pill">x${Number(card.quantity || 1)}</span>
        </div>
        <h3>${escapeHtml(card.name)}</h3>
        <p class="binder-card__set">${escapeHtml(card.setId || card.expansion || 'No set')}</p>
        <dl class="binder-card__meta">
          <div><dt>Condition</dt><dd>${escapeHtml(conditionLabel)}</dd></div>
          <div><dt>Number</dt><dd>${escapeHtml(card.cardNumber || card.number || 'N/A')}</dd></div>
          <div><dt>Value</dt><dd>${escapeHtml(formatCurrency(Number(card.currentValue || 0)))}</dd></div>
          <div><dt>Foil</dt><dd>${card.foil ? 'Yes' : 'No'}</dd></div>
        </dl>
        <div class="binder-card__actions">View card details →</div>
      </div>`;
    fragment.appendChild(link);
  }
  cardsGrid.appendChild(fragment);
}

function deleteBinder(binder) {
  if (!activeDb || !binder) return;

  const confirmed = confirm(`Delete the binder "${binder.name}" permanently?\n\nThis cannot be undone. Cards in this binder will stay in your collection, but they will be removed from the binder.`);
  if (!confirmed) return;

  const tx = activeDb.transaction([STORE_NAME], 'readwrite');
  const store = tx.objectStore(STORE_NAME);
  const deleteRequest = store.delete(Number(binder.id));

  deleteRequest.onsuccess = () => {
    unassignBinderCards(binder.id);
    window.location.href = './binders.html';
  };
}