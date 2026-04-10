import { findCardById, deleteCard } from './storage.js';
import { escapeHtml, formatCurrency, getParam, showToast, initNav } from './utils.js';

initNav();

const id = getParam('id');
const container = document.getElementById('cardDetailContainer');

if (!id) {
  container.innerHTML = `<div class="empty-state"><h2>No card ID</h2><p><a href="index.html">Go back to collection.</a></p></div>`;
} else {
  const card = findCardById(id);
  if (!card) {
    container.innerHTML = `<div class="empty-state"><h2>Card not found</h2><p>It may have been deleted. <a href="index.html">Go back.</a></p></div>`;
  } else {
    const imgSrc = card.imageUrl || card.externalImageUrl || '';
    container.innerHTML = `
      <div class="details card-anim">
        <div class="details-image">
          ${imgSrc ? `<img src="${escapeHtml(imgSrc)}" alt="${escapeHtml(card.name)}" />` : '<div class="ph">No image</div>'}
        </div>
        <div class="details-info">
          <div class="details-row">
            <h2 style="margin:0 0 4px;">${escapeHtml(card.name)}</h2>
            <span class="qty-pill">x${card.quantity}</span>
          </div>
          <dl class="dl">
            <div><dt>Game</dt><dd>${escapeHtml(card.game||'—')}</dd></div>
            <div><dt>Set</dt><dd>${escapeHtml(card.setId||'—')}</dd></div>
            <div><dt>Card #</dt><dd>${escapeHtml(card.cardNumber||'—')}</dd></div>
            <div><dt>Condition</dt><dd>${escapeHtml(card.condition||'—')}</dd></div>
            <div><dt>Foil</dt><dd>${card.foil?'Yes':'No'}</dd></div>
            <div><dt>Purchase</dt><dd>${formatCurrency(card.purchasePrice)}</dd></div>
            <div><dt>Value</dt><dd>${formatCurrency(card.currentValue)}</dd></div>
            ${card.notes?`<div><dt>Notes</dt><dd>${escapeHtml(card.notes)}</dd></div>`:''}
          </dl>
          <div class="details-actions">
            <a href="index.html?edit=${encodeURIComponent(id)}" class="btn primary">Edit Card</a>
            <a href="index.html" class="btn">← Collection</a>
            <button id="deleteCardBtn" class="btn danger">Delete</button>
          </div>
        </div>
      </div>`;
    document.getElementById('deleteCardBtn')?.addEventListener('click', () => {
      if (!confirm(`Delete "${card.name}"?`)) return;
      deleteCard(id);
      showToast(`"${card.name}" deleted.`);
      setTimeout(() => { window.location.href = 'index.html'; }, 900);
    });
  }
}