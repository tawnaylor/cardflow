// js/card-detail.js — Reads URL param ?id= and displays card
import { getCardById, deleteCard } from './storage.js';
import { getParam, showToast, initHamburgerNav } from './ui.js';

initHamburgerNav();

const container = document.getElementById('card-detail-container');
const id = getParam('id');   // ← URL parameter read here

if (!id) {
  container.innerHTML = '<p>No card ID provided. <a href="index.html">Go home</a></p>';
} else {
  const card = getCardById(id);
  if (!card) {
    container.innerHTML = `<p>Card not found. It may have been deleted. <a href="index.html">Go home</a></p>`;
  } else {
    container.innerHTML = `
      <article class="card-detail card-item" aria-label="Card: ${card.name}">
        ${card.image ? `<img src="${card.image}" alt="Image of ${card.name}" class="card-detail__img" />` : ''}
        <div class="card-detail__info">
          <h1>${card.name}</h1>
          <dl>
            <dt>Series</dt>    <dd>${card.series || '—'}</dd>
            <dt>Expansion</dt> <dd>${card.expansion || '—'}</dd>
            <dt>Rarity</dt>    <dd>${card.rarity || '—'}</dd>
            <dt>Number</dt>    <dd>${card.number || '—'}</dd>
            <dt>Quantity</dt>  <dd>${card.quantity}</dd>
            <dt>Added</dt>     <dd>${new Date(card.dateAdded).toLocaleDateString()}</dd>
          </dl>
          <div class="card-detail__actions">
            <a href="index.html" class="btn btn--secondary">View Collection</a>
            <button id="delete-card-btn" class="btn btn--danger">Delete Card</button>
          </div>
        </div>
      </article>`;

    document.getElementById('delete-card-btn').addEventListener('click', () => {
      if (confirm(`Delete "${card.name}" from your collection?`)) {
        deleteCard(id);
        showToast(`"${card.name}" deleted.`);
        setTimeout(() => window.location.href = 'index.html', 1000);
      }
    });
  }
}