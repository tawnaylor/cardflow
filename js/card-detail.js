import { findCardById, deleteCard, updateCard, fileToDataUrl } from './storage.js';
import { escapeHtml, formatCurrency, getParam, showToast, initNav } from './utils.js';

const GAME_LABELS = { pokemon: 'Pokémon', mtg: 'Magic: The Gathering', onepiece: 'One Piece' };
const CONDITION_LABELS = { NM: 'Near Mint (NM)', LP: 'Lightly Played (LP)', MP: 'Moderately Played (MP)', HP: 'Heavily Played (HP)', DMG: 'Damaged (DMG)' };

initNav();

const id = getParam('id');
const container = document.getElementById('cardDetailContainer');
const editForm = document.getElementById('cardEditForm');
const editStatus = document.getElementById('cardEditStatus');

function setStatus(message) {
  if (editStatus) editStatus.textContent = message;
}

function toggleEditMode(open) {
  if (!editForm) return;
  editForm.style.display = open ? '' : 'none';
  setStatus('');
}

function populateEditForm(card) {
  if (!editForm || !card) return;
  editForm.elements.game.value = card.game || 'pokemon';
  editForm.elements.name.value = card.name || '';
  editForm.elements.setId.value = card.setId || '';
  editForm.elements.cardNumber.value = card.cardNumber || '';
  editForm.elements.condition.value = card.condition || 'NM';
  editForm.elements.quantity.value = String(card.quantity || 1);
  editForm.elements.foil.checked = Boolean(card.foil);
  editForm.elements.purchasePrice.value = card.purchasePrice > 0 ? String(card.purchasePrice) : '';
  editForm.elements.currentValue.value = card.currentValue > 0 ? String(card.currentValue) : '';
  editForm.elements.imageUrl.value = card.externalImageUrl || card.imageUrl || '';
  editForm.elements.notes.value = card.notes || '';
  editForm.elements.imageFile.value = '';
}

function validate(card) {
  if (!card.game) return 'Choose a game.';
  if (!card.name || card.name.length < 2) return 'Name needs at least 2 characters.';
  if (!card.setId) return 'Set is required.';
  if (!card.cardNumber) return 'Card number is required.';
  if (!card.condition) return 'Condition is required.';
  if (!Number.isInteger(card.quantity) || card.quantity < 1) return 'Quantity must be at least 1.';
  if (card.purchasePrice < 0 || card.currentValue < 0) return 'Prices cannot be negative.';
  if (card.externalImageUrl) {
    try { new URL(card.externalImageUrl); }
    catch { return 'Image URL must be valid.'; }
  }
  return '';
}

async function readImageUpdate() {
  const file = editForm?.elements.imageFile?.files?.[0];
  const imageUrl = editForm?.elements.imageUrl?.value.trim() || '';
  if (file) {
    const dataUrl = await fileToDataUrl(file);
    return { imageUrl: dataUrl, externalImageUrl: '', imageDataUrl: dataUrl };
  }
  return { imageUrl, externalImageUrl: imageUrl, imageDataUrl: imageUrl };
}

function renderCard(card) {
  const imgSrc = card.imageUrl || card.imageDataUrl || card.externalImageUrl || '';
  const gameLabel = GAME_LABELS[card.game] || card.game || '—';
  const conditionLabel = CONDITION_LABELS[card.condition] || card.condition || '—';
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
          <div><dt>Game</dt><dd>${escapeHtml(gameLabel)}</dd></div>
          <div><dt>Set</dt><dd>${escapeHtml(card.setId||'—')}</dd></div>
          <div><dt>Card #</dt><dd>${escapeHtml(card.cardNumber||'—')}</dd></div>
          <div><dt>Condition</dt><dd>${escapeHtml(conditionLabel)}</dd></div>
          <div><dt>Foil</dt><dd>${card.foil?'Yes':'No'}</dd></div>
          <div><dt>Purchase</dt><dd>${formatCurrency(card.purchasePrice)}</dd></div>
          <div><dt>Value</dt><dd>${formatCurrency(card.currentValue)}</dd></div>
          ${card.notes?`<div><dt>Notes</dt><dd>${escapeHtml(card.notes)}</dd></div>`:''}
        </dl>
        <div class="details-actions">
          <button id="editCardBtn" class="btn primary" type="button">Edit Card</button>
          <a href="index.html" class="btn">← Collection</a>
          <button id="deleteCardBtn" class="btn danger" type="button">Delete</button>
        </div>
      </div>
    </div>`;

  document.getElementById('editCardBtn')?.addEventListener('click', () => {
    populateEditForm(card);
    toggleEditMode(true);
    editForm?.elements.name?.focus();
  });

  document.getElementById('deleteCardBtn')?.addEventListener('click', () => {
    if (!confirm(`Delete "${card.name}"?`)) return;
    deleteCard(id);
    showToast(`"${card.name}" deleted.`);
    setTimeout(() => { window.location.href = 'index.html'; }, 900);
  });
}

if (!id) {
  container.innerHTML = `<div class="empty-state"><h2>No card ID</h2><p><a href="index.html">Go back to collection.</a></p></div>`;
} else {
  const card = findCardById(id);
  if (!card) {
    container.innerHTML = `<div class="empty-state"><h2>Card not found</h2><p>It may have been deleted. <a href="index.html">Go back.</a></p></div>`;
  } else {
    renderCard(card);
    populateEditForm(card);
  }
}

editForm?.addEventListener('submit', async event => {
  event.preventDefault();
  const current = findCardById(id);
  if (!current) {
    setStatus('Card no longer exists.');
    return;
  }

  try {
    const imageUpdate = await readImageUpdate();
    const updates = {
      game: editForm.elements.game.value,
      name: editForm.elements.name.value.trim(),
      setId: editForm.elements.setId.value.trim(),
      cardNumber: editForm.elements.cardNumber.value.trim(),
      condition: editForm.elements.condition.value,
      quantity: Number(editForm.elements.quantity.value || 0),
      foil: editForm.elements.foil.checked,
      purchasePrice: Number(editForm.elements.purchasePrice.value || 0),
      currentValue: Number(editForm.elements.currentValue.value || 0),
      notes: editForm.elements.notes.value.trim(),
      ...imageUpdate,
    };

    const error = validate(updates);
    if (error) {
      setStatus(error);
      return;
    }

    const updated = updateCard(id, updates);
    if (!updated) {
      setStatus('Unable to save changes.');
      return;
    }

    renderCard(updated);
    populateEditForm(updated);
    toggleEditMode(false);
    showToast('Card updated.');
  } catch {
    setStatus('Could not read the selected image.');
  }
});

document.getElementById('cancelEditBtn')?.addEventListener('click', () => {
  const current = findCardById(id);
  if (current) populateEditForm(current);
  toggleEditMode(false);
});