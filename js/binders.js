import { getBinders, saveBinder, deleteBinder } from './storage.js';
import { getParam } from './utils.js';

// ── Hamburger nav ──────────────────────────────────────────────────────
const navToggle = document.querySelector('.nav-toggle');
const navLinks  = document.querySelector('#main-nav .nav-links');
navToggle?.addEventListener('click', () => {
  const open = navToggle.getAttribute('aria-expanded') === 'true';
  navToggle.setAttribute('aria-expanded', String(!open));
  navLinks?.classList.toggle('nav-links--open');
});

// ── Toast ──────────────────────────────────────────────────────────────
function showToast(message) {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = message;
  toast.hidden = false;
  toast.classList.add('is-visible');
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => {
    toast.classList.remove('is-visible');
    toast.hidden = true;
  }, 2200);
}

// ── Modal helpers ──────────────────────────────────────────────────────
const modal = document.getElementById('binder-modal');

function openModal() {
  modal.hidden = false;
  modal.removeAttribute('aria-hidden');
  document.body.classList.add('modal-open');
  document.getElementById('binder-name').focus();
}

function closeModal() {
  modal.hidden = true;
  modal.setAttribute('aria-hidden', 'true');
  document.body.classList.remove('modal-open');
  document.getElementById('binder-form').reset();
  document.getElementById('err-binder-name').textContent = '';
}

document.getElementById('new-binder-btn').addEventListener('click', openModal);
document.getElementById('close-binder-modal').addEventListener('click', closeModal);
document.getElementById('cancel-binder-btn').addEventListener('click', closeModal);
modal.addEventListener('click', e => { if (e.target === modal) closeModal(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape' && !modal.hidden) closeModal(); });

// ── File to base64 ─────────────────────────────────────────────────────
function fileToBase64(file) {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload  = () => res(r.result);
    r.onerror = () => rej();
    r.readAsDataURL(file);
  });
}

// ── Render binders ─────────────────────────────────────────────────────
function renderBinders() {
  const list    = document.getElementById('binders-list');
  const binders = getBinders();

  if (!binders.length) {
    list.innerHTML = `
      <div class="empty-state">
        <h2>No binders yet</h2>
        <p>Create your first binder to organise your collection.</p>
      </div>`;
    return;
  }

  list.innerHTML = `
    <div class="binder-list">
      ${binders.map(b => `
        <article class="binder-item card-item" data-id="${b.id}">
          ${b.cover
            ? `<img src="${b.cover}" alt="Cover for ${b.name}" />`
            : '<div style="aspect-ratio:4/3;background:rgba(255,255,255,0.04);border-radius:8px;display:grid;place-items:center;color:var(--muted);">No cover</div>'}
          <h3>${b.name}</h3>
          <p>${b.description || ''}</p>
          <div class="binder-meta">
            <a href="index.html?binder=${b.id}" class="btn" style="font-size:13px;padding:6px 12px;">View Cards</a>
            <button class="btn danger delete-binder-btn" data-id="${b.id}" style="font-size:13px;padding:6px 12px;">Delete</button>
          </div>
        </article>`).join('')}
    </div>`;

  list.querySelectorAll('.delete-binder-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const b = getBinders().find(x => x.id === btn.dataset.id);
      if (b && confirm(`Delete binder "${b.name}"?`)) {
        deleteBinder(btn.dataset.id);
        showToast(`"${b.name}" deleted.`);
        renderBinders();
      }
    });
  });
}

// ── Form submit ────────────────────────────────────────────────────────
document.getElementById('binder-form').addEventListener('submit', async function (e) {
  e.preventDefault();
  const nameInput = document.getElementById('binder-name');
  const errEl     = document.getElementById('err-binder-name');

  if (!nameInput.value.trim()) {
    errEl.textContent = 'Binder name is required.';
    nameInput.setAttribute('aria-invalid', 'true');
    nameInput.focus();
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
  closeModal();
  renderBinders();
});

// ── Clear all ──────────────────────────────────────────────────────────
document.getElementById('clear-binders-btn').addEventListener('click', () => {
  if (!getBinders().length) { showToast('No binders to clear.'); return; }
  if (confirm('Delete ALL binders? This cannot be undone.')) {
    getBinders().forEach(b => deleteBinder(b.id));
    showToast('All binders cleared.');
    renderBinders();
  }
});

// ── Init ───────────────────────────────────────────────────────────────
renderBinders();