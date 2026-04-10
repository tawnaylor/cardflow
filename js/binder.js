// js/binders.js — Binders page logic
import { getBinders, saveBinder, deleteBinder } from './storage.js';
import { openModal, closeModal, initModalCloseHandlers, showToast, initHamburgerNav } from './ui.js';

initHamburgerNav();
initModalCloseHandlers();

function fileToBase64(file) {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload  = () => res(r.result);
    r.onerror = () => rej();
    r.readAsDataURL(file);
  });
}

function renderBinders() {
  const list    = document.getElementById('binders-list');
  const binders = getBinders();
  if (!binders.length) {
    list.innerHTML = '<p>No binders yet. Create one!</p>';
    return;
  }
  list.innerHTML = binders.map(b => `
    <article class="binder-card card-item" data-id="${b.id}">
      ${b.cover ? `<img src="${b.cover}" alt="Cover for ${b.name}" class="binder-card__cover"/>` : ''}
      <div class="binder-card__info">
        <h2>${b.name}</h2>
        <p>${b.description || ''}</p>
        <a href="index.html?binder=${b.id}" class="btn btn--secondary btn--sm">View Cards</a>
        <button class="btn btn--danger btn--sm delete-binder-btn" data-id="${b.id}">Delete</button>
      </div>
    </article>`).join('');

  list.querySelectorAll('.delete-binder-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const b = getBinders().find(x => x.id === btn.dataset.id);
      if (b && confirm(`Delete binder "${b.name}"?`)) {
        deleteBinder(btn.dataset.id);
        showToast(`Binder "${b.name}" deleted.`);
        renderBinders();
      }
    });
  });
}

// Open modal
document.getElementById('new-binder-btn').addEventListener('click', () => openModal('binder-modal'));

// Clear all
document.getElementById('clear-binders-btn').addEventListener('click', () => {
  if (confirm('Delete ALL binders?')) {
    getBinders().forEach(b => deleteBinder(b.id));
    showToast('All binders cleared.');
    renderBinders();
  }
});

// Binder form submit
document.getElementById('binder-form').addEventListener('submit', async function (e) {
  e.preventDefault();
  const nameInput = document.getElementById('binder-name');
  const errEl     = document.getElementById('binder-name-error');

  if (!nameInput.value.trim()) {
    errEl.textContent = 'Binder name is required.';
    nameInput.setAttribute('aria-invalid', 'true');
    return;
  }
  errEl.textContent = '';
  nameInput.removeAttribute('aria-invalid');

  const coverFile = document.getElementById('binder-cover').files[0];
  let cover = '';
  if (coverFile) try { cover = await fileToBase64(coverFile); } catch {}

  saveBinder({
    name:        nameInput.value.trim(),
    description: document.getElementById('binder-desc').value.trim(),
    cover,
  });

  showToast('Binder created!');
  closeModal('binder-modal');
  this.reset();
  renderBinders();
});

renderBinders();