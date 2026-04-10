import { getBinders, saveBinder, deleteBinder, createId, fileToDataUrl } from './storage.js';
import { escapeHtml, showToast, initNav } from './utils.js';

initNav();

const binderList   = document.getElementById('binderList');
const openBtn      = document.getElementById('openBinderModalBtn');
const closeBtn     = document.getElementById('closeBinderModalBtn');
const cancelBtn    = document.getElementById('cancelBinderBtn');
const clearAllBtn  = document.getElementById('clearAllBtn');
const modalOverlay = document.getElementById('binderModalOverlay');
const binderForm   = document.getElementById('binderForm');

function openModal() {
  modalOverlay.hidden = false;
  modalOverlay.removeAttribute('aria-hidden');
  document.body.classList.add('modal-open');
  document.getElementById('binderName')?.focus();
}

function closeModal() {
  modalOverlay.hidden = true;
  modalOverlay.setAttribute('aria-hidden','true');
  document.body.classList.remove('modal-open');
  binderForm?.reset();
  const err = document.getElementById('err-binder-name');
  if (err) err.textContent = '';
}

openBtn?.addEventListener('click', openModal);
closeBtn?.addEventListener('click', closeModal);
cancelBtn?.addEventListener('click', closeModal);
modalOverlay?.addEventListener('click', e => { if (e.target===modalOverlay) closeModal(); });
document.addEventListener('keydown', e => { if (e.key==='Escape'&&!modalOverlay?.hidden) closeModal(); });

function render() {
  const binders = getBinders();
  if (!binders.length) {
    binderList.innerHTML = `<div class="empty-state"><h2>No binders yet</h2><p>Create your first binder to organise your collection.</p></div>`;
    return;
  }
  binderList.innerHTML = `<div class="binder-list">${binders.map(b=>`
    <article class="binder-item card-anim">
      ${b.cover
        ? `<img src="${escapeHtml(b.cover)}" alt="Cover for ${escapeHtml(b.name)}" />`
        : `<div style="aspect-ratio:4/3;background:rgba(255,255,255,0.04);border-radius:8px;display:grid;place-items:center;color:var(--muted);font-size:13px;">No cover</div>`}
      <h3>${escapeHtml(b.name)}</h3>
      <p>${escapeHtml(b.description||'')}</p>
      <div class="binder-meta">
        <button class="btn danger del-btn" data-id="${escapeHtml(b.id)}" style="font-size:13px;padding:6px 12px;">Delete</button>
      </div>
    </article>`).join('')}</div>`;
  binderList.querySelectorAll('.del-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const b = getBinders().find(x=>x.id===btn.dataset.id);
      if (b&&confirm(`Delete binder "${b.name}"?`)) { deleteBinder(btn.dataset.id); showToast(`"${b.name}" deleted.`); render(); }
    });
  });
}

binderForm?.addEventListener('submit', async e => {
  e.preventDefault();
  const nameInput = document.getElementById('binderName');
  const errEl = document.getElementById('err-binder-name');
  if (!nameInput.value.trim()) { errEl.textContent='Binder name is required.'; nameInput.focus(); return; }
  errEl.textContent = '';
  const file = document.getElementById('binderImage')?.files?.[0];
  let cover = '';
  if (file) try { cover = await fileToDataUrl(file); } catch {}
  saveBinder({ id:createId(), name:nameInput.value.trim(), description:document.getElementById('binderDesc')?.value.trim()||'', cover });
  showToast('Binder created!');
  closeModal();
  render();
});

clearAllBtn?.addEventListener('click', () => {
  if (!getBinders().length) { showToast('No binders to clear.'); return; }
  if (confirm('Delete ALL binders?')) { getBinders().forEach(b=>deleteBinder(b.id)); showToast('All binders cleared.'); render(); }
});

render();