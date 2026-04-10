import { getCardById, deleteCardById } from './storage.js';
import { escapeHtml, formatCurrency, getParam } from './utils.js';

const id = getParam('id');
const container = document.getElementById('card-detail-container');

if (!id) {
  container.innerHTML = '<p>No card ID provided. <a href="index.html">Go home</a></p>';
} else {
  const card = getCardById(id);
  if (!card) {
    container.innerHTML = '<p>Card not found. <a href="index.html">Go home</a></p>';
  } else {
    const imgSrc = card.imageUrl || card.externalImageUrl || '';
    container.innerHTML = `
      <article class="card-detail card-item">
        <div class="details">
          <div class="details-image">
            ${imgSrc
              ? `<img src="${imgSrc}" alt="Image of ${escapeHtml(card.name)}" />`
              : '<div class="ph">No image</div>'}
          </div>
          <div class="details-info">
            <div class="details-row">
              <h1>${escapeHtml(card.name)}</h1>
            </div>
            <dl class="dl">
              <div><dt>Game</dt><dd>${escapeHtml(card.game)}</dd></div>
              <div><dt>Set</dt><dd>${escapeHtml(card.setId)}</dd></div>
              <div><dt>Condition</dt><dd>${escapeHtml(card.condition)}</dd></div>
              <div><dt>Card #</dt><dd>${escapeHtml(card.cardNumber || '—')}</dd></div>
              <div><dt>Quantity</dt><dd>${card.quantity}</dd></div>
              <div><dt>Foil</dt><dd>${card.foil ? 'Yes' : 'No'}</dd></div>
              <div><dt>Purchase</dt><dd>${formatCurrency(card.purchasePrice)}</dd></div>
              <div><dt>Value</dt><dd>${formatCurrency(card.currentValue)}</dd></div>
              ${card.notes ? `<div><dt>Notes</dt><dd>${escapeHtml(card.notes)}</dd></div>` : ''}
            </dl>
            <div class="details-actions">
              <a href="index.html?edit=${encodeURIComponent(id)}" class="btn primary">Edit Card</a>
              <a href="index.html" class="btn">← Collection</a>
              <button id="deleteCardBtn" class="btn danger">Delete</button>
            </div>
          </div>
        </div>
      </article>`;

    document.getElementById('deleteCardBtn').addEventListener('click', () => {
      if (confirm(`Delete "${card.name}"?`)) {
        deleteCardById(id);
        window.location.href = 'index.html';
      }
    });
  }
}