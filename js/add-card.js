import { loadCards, saveCards } from "./storage.js";

function renderForm(container) {
  container.innerHTML = `
    <form id="addCardForm" class="card card--form">
      <label>Game <input name="game" required></label>
      <label>Name <input name="name" required></label>
      <label>Set <input name="set"></label>
      <label>Number <input name="number"></label>
      <label>Rarity <input name="rarity"></label>
      <label>Value <input name="value" type="number" step="0.01"></label>
      <div style="margin-top:8px"><button class="btn btn--primary" type="submit">Add Card</button></div>
    </form>
    <div id="addMsg" aria-live="polite"></div>
  `;

  const form = container.querySelector('#addCardForm');
  const msg = container.querySelector('#addMsg');
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    const card = {
      id: `${Date.now()}`,
      game: fd.get('game') || '',
      name: fd.get('name') || '',
      set: fd.get('set') || '',
      number: fd.get('number') || '',
      rarity: fd.get('rarity') || '',
      value: Number(fd.get('value')) || 0,
      addedAt: Date.now()
    };
    const existing = loadCards() || [];
    existing.unshift(card);
    saveCards(existing);
    msg.textContent = 'Card added — saved locally.';
    form.reset();
  });
}

document.addEventListener('DOMContentLoaded', () => {
  const shell = document.getElementById('formShell') || document.getElementById('app');
  renderForm(shell);
});
