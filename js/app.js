import { getCards, findCardById, saveCard, deleteCard, createId, fileToDataUrl } from './storage.js';
import { escapeHtml, escapeAttr, formatCurrency, getParam, showToast, initNav } from './utils.js';

initNav();

const STORAGE_KEY = 'cardflow_cards_v1';
const DEFAULT_SETS = {
  pokemon: ['Base Set','Jungle','Fossil','151','Paldean Fates','Surging Sparks'],
  mtg: ['Alpha','Beta','Unlimited','Modern Horizons 3','Foundations'],
  onepiece: ['Romance Dawn','Paramount War','Pillars of Strength','Awakening of the New Era'],
};
const GAME_LABELS = { pokemon:'PokÃ©mon', mtg:'Magic: The Gathering', onepiece:'One Piece' };

const state = {
  filtersOpen: true, editingId: '', uploadedImageDataUrl: '',
  setOptions: {
    pokemon: [...DEFAULT_SETS.pokemon],
    mtg: [...DEFAULT_SETS.mtg],
    onepiece: [...DEFAULT_SETS.onepiece],
  },
};

const g = id => document.getElementById(id);
const els = {
  addCardBtn: g('addCardBtn'), emptyAddBtn: g('emptyAddBtn'),
  toggleFiltersBtn: g('toggleFiltersBtn'), clearFiltersBtn: g('clearFiltersBtn'),
  searchInput: g('searchInput'), gameFilter: g('gameFilter'),
  setFilter: g('setFilter'), conditionFilter: g('conditionFilter'),
  sortSelect: g('sortSelect'), totalCards: g('totalCards'), totalValue: g('totalValue'),
  filters: g('filters'), emptyState: g('emptyState'), binderGrid: g('binderGrid'),
  modalOverlay: g('modalOverlay'), modalTitle: g('modalTitle'),
  closeModalBtn: g('closeModalBtn'), cardForm: g('cardForm'), cardId: g('cardId'),
  deleteBtn: g('deleteBtn'), cancelBtn: g('cancelBtn'),
  game: g('game'), name: g('name'), setId: g('setId'), cardNumber: g('cardNumber'),
  condition: g('condition'), quantity: g('quantity'), foil: g('foil'),
  purchasePrice: g('purchasePrice'), currentValue: g('currentValue'),
  imageUrl: g('imageUrl'), imageFile: g('imageFile'),
  imagePreviewImg: g('imagePreviewImg'), imagePreviewPlaceholder: g('imagePreviewPlaceholder'),
  notes: g('notes'),
};

const errorNodes = new Map(
  Array.from(document.querySelectorAll('.error[data-for]')).map(n => [n.dataset.for, n])
);

bindEvents();
hydrateSetOptions().finally(() => {
  populateSetSelect(els.game?.value || '');
  populateFilterSets();
  render();
  const editParam = getParam('edit');
  if (editParam) openModal(editParam);
});

function bindEvents() {
  els.addCardBtn?.addEventListener('click', () => openModal());
  els.emptyAddBtn?.addEventListener('click', () => openModal());
  els.closeModalBtn?.addEventListener('click', closeModal);
  els.cancelBtn?.addEventListener('click', closeModal);
  els.deleteBtn?.addEventListener('click', deleteCurrentCard);
  els.cardForm?.addEventListener('submit', handleSubmit);
  els.game?.addEventListener('change', () => populateSetSelect(els.game.value));
  els.imageUrl?.addEventListener('input', syncPreviewFromUrl);
  els.imageFile?.addEventListener('change', syncPreviewFromFile);
  els.searchInput?.addEventListener('input', render);
  els.gameFilter?.addEventListener('change', () => { populateFilterSets(); render(); });
  els.setFilter?.addEventListener('change', render);
  els.conditionFilter?.addEventListener('change', render);
  els.sortSelect?.addEventListener('change', render);
  els.clearFiltersBtn?.addEventListener('click', clearFilters);
  els.toggleFiltersBtn?.addEventListener('click', toggleFilters);
  els.modalOverlay?.addEventListener('click', e => { if (e.target === els.modalOverlay) closeModal(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !els.modalOverlay?.hidden) closeModal(); });
  window.addEventListener('storage', e => { if (e.key === STORAGE_KEY) { populateFilterSets(); render(); } });
}

async function hydrateSetOptions() {
  try {
    const [seedCards, pokemonData] = await Promise.all([
      fetch('data/cards.json').then(r => r.ok ? r.json() : []).catch(() => []),
      fetch('database/cardflow-pokemon-dataset.json').then(r => r.ok ? r.json() : null).catch(() => null),
    ]);
    if (Array.isArray(seedCards)) {
      for (const e of seedCards) {
        const game = String(e.game||'').trim().toLowerCase() === 'magic' ? 'mtg' : String(e.game||'').trim().toLowerCase();
        const set = String(e.set||'').trim();
        if (state.setOptions[game] && set) pushUnique(state.setOptions[game], set);
      }
    }
    for (const e of (pokemonData?.expansions || [])) {
      const name = String(e.name||'').trim();
      if (name) pushUnique(state.setOptions.pokemon, name);
    }
    Object.keys(state.setOptions).forEach(g => state.setOptions[g].sort((a,b) => a.localeCompare(b)));
  } catch {}
}

function render() { const cards = getFiltered(); renderSummary(cards); renderGrid(cards); }

function getFiltered() {
  const search = els.searchInput?.value.trim().toLowerCase() || '';
  const game = els.gameFilter?.value || '';
  const set = els.setFilter?.value || '';
  const cond = els.conditionFilter?.value || '';
  const sort = els.sortSelect?.value || 'recent';
  let cards = getCards().filter(c => {
    if (search && !`${c.name} ${c.notes||''}`.toLowerCase().includes(search)) return false;
    if (game && c.game !== game) return false;
    if (set && c.setId !== set) return false;
    if (cond && c.condition !== cond) return false;
    return true;
  });
  cards.sort((a,b) => {
    if (sort==='name') return a.name.localeCompare(b.name);
    if (sort==='valueDesc') return cardVal(b)-cardVal(a);
    if (sort==='qtyDesc') return Number(b.quantity||0)-Number(a.quantity||0);
    return Number(b.updatedAt||0)-Number(a.updatedAt||0);
  });
  return cards;
}

function renderSummary(cards) {
  const total = cards.reduce((s,c) => s+Number(c.quantity||0), 0);
  const val = cards.reduce((s,c) => s+cardVal(c), 0);
  if (els.totalCards) els.totalCards.textContent = String(total);
  if (els.totalValue) els.totalValue.textContent = formatCurrency(val);
}

function renderGrid(cards) {
  if (!els.binderGrid || !els.emptyState) return;
  els.emptyState.hidden = cards.length > 0;
  els.binderGrid.innerHTML = '';
  if (!cards.length) return;
  const frag = document.createDocumentFragment();
  for (const card of cards) {
    const art = document.createElement('article');
    art.className = 'binder-card card-anim';
    art.tabIndex = 0;
    art.setAttribute('role','button');
    art.setAttribute('aria-label', `View or edit ${card.name}`);
    const imgSrc = card.imageUrl || card.externalImageUrl || '';
    art.innerHTML = `
      <div class="binder-card__image">${imgSrc
        ? `<img src="${escapeAttr(imgSrc)}" alt="${escapeAttr(card.name)}" loading="lazy">`
        : '<div class="binder-card__placeholder">No image</div>'}</div>
      <div class="binder-card__body">
        <div class="binder-card__topline">
          <span class="binder-card__game">${escapeHtml(GAME_LABELS[card.game]||card.game)}</span>
          <span class="qty-pill">x${Number(card.quantity||0)}</span>
        </div>
        <h3>${escapeHtml(card.name)}</h3>
        <p class="binder-card__set">${escapeHtml(card.setId||'')}</p>
        <dl class="binder-card__meta">
          <div><dt>Condition</dt><dd>${escapeHtml(card.condition)}</dd></div>
          <div><dt>Number</dt><dd>${escapeHtml(card.cardNumber||'N/A')}</dd></div>
          <div><dt>Value</dt><dd>${formatCurrency(Number(card.currentValue||0))}</dd></div>
          <div><dt>Foil</dt><dd>${card.foil?'Yes':'No'}</dd></div>
        </dl>
        <div class="binder-card__actions">
          <a href="card-detail.html?id=${encodeURIComponent(card.id)}" class="btn"
             style="font-size:13px;padding:6px 14px;" onclick="event.stopPropagation()">View Detail</a>
        </div>
      </div>`;
    art.addEventListener('click', e => { if (!e.target.closest('a')) openModal(card.id); });
    art.addEventListener('keydown', e => { if (e.key==='Enter'||e.key===' ') { e.preventDefault(); openModal(card.id); } });
    art.querySelector('img')?.addEventListener('error', function() {
      this.replaceWith(Object.assign(document.createElement('div'), {className:'binder-card__placeholder', textContent:'No image'}));
    });
    frag.appendChild(art);
  }
  els.binderGrid.appendChild(frag);
}

function openModal(cardId='') {
  clearErrors(); state.editingId=cardId; state.uploadedImageDataUrl='';
  els.cardForm?.reset();
  if (els.cardId) els.cardId.value = cardId;
  if (cardId) {
    const card = findCardById(cardId);
    if (!card) return;
    if (els.modalTitle) els.modalTitle.textContent = 'Edit Card';
    if (els.deleteBtn) els.deleteBtn.hidden = false;
    els.game.value = card.game; populateSetSelect(card.game, card.setId);
    els.name.value = card.name; els.cardNumber.value = card.cardNumber||'';
    els.condition.value = card.condition; els.quantity.value = String(card.quantity);
    els.foil.checked = Boolean(card.foil);
    els.purchasePrice.value = card.purchasePrice>0 ? String(card.purchasePrice) : '';
    els.currentValue.value = card.currentValue>0 ? String(card.currentValue) : '';
    els.imageUrl.value = card.externalImageUrl||card.imageUrl||'';
    els.notes.value = card.notes||'';
    setPreview(card.imageUrl||card.externalImageUrl||'');
  } else {
    if (els.modalTitle) els.modalTitle.textContent = 'Add Card';
    if (els.deleteBtn) els.deleteBtn.hidden = true;
    els.quantity.value = '1'; populateSetSelect(els.game?.value||''); setPreview('');
  }
  if (els.modalOverlay) { els.modalOverlay.hidden=false; els.modalOverlay.removeAttribute('aria-hidden'); }
  document.body.classList.add('modal-open');
  els.name?.focus();
}

function closeModal() {
  state.editingId=''; state.uploadedImageDataUrl='';
  if (els.modalOverlay) { els.modalOverlay.hidden=true; els.modalOverlay.setAttribute('aria-hidden','true'); }
  document.body.classList.remove('modal-open');
  clearErrors(); setPreview('');
}

async function handleSubmit(e) {
  e.preventDefault(); clearErrors();
  if (els.imageFile?.files?.[0]) {
    try { state.uploadedImageDataUrl = await fileToDataUrl(els.imageFile.files[0]); }
    catch { errorNodes.get('imageFile')?.replaceChildren('Could not read image.'); return; }
  }
  const card = {
    id: state.editingId || createId(),
    game: els.game.value, name: els.name.value.trim(), setId: els.setId.value,
    cardNumber: els.cardNumber.value.trim(), condition: els.condition.value,
    quantity: Number(els.quantity.value||0), foil: els.foil.checked,
    purchasePrice: Number(els.purchasePrice.value||0), currentValue: Number(els.currentValue.value||0),
    imageUrl: state.uploadedImageDataUrl||els.imageUrl.value.trim(),
    externalImageUrl: els.imageUrl.value.trim(), notes: els.notes.value.trim(),
  };
  const errors = validate(card);
  if (errors.length) { showErrors(errors); return; }
  saveCard(card);
  pushUnique(state.setOptions[card.game], card.setId);
  state.setOptions[card.game]?.sort((a,b)=>a.localeCompare(b));
  showToast(state.editingId ? 'Card updated.' : 'Card added!');
  populateFilterSets(); render(); closeModal();
}

function deleteCurrentCard() {
  if (!state.editingId) return;
  const card = findCardById(state.editingId);
  if (!confirm(`Delete "${card?.name}"?`)) return;
  deleteCard(state.editingId);
  showToast('Card removed.'); populateFilterSets(); render(); closeModal();
}

function validate(c) {
  const e=[];
  if (!c.game) e.push(['game','Choose a game.']);
  if (!c.name||c.name.length<2) e.push(['name','Name needs at least 2 characters.']);
  if (!c.setId) e.push(['setId','Choose a set.']);
  if (!c.condition) e.push(['condition','Choose a condition.']);
  if (!Number.isInteger(c.quantity)||c.quantity<1) e.push(['quantity','Quantity must be at least 1.']);
  if (c.purchasePrice<0) e.push(['purchasePrice','Cannot be negative.']);
  if (c.currentValue<0) e.push(['currentValue','Cannot be negative.']);
  if (c.externalImageUrl) { try { new URL(c.externalImageUrl); } catch { e.push(['imageUrl','Must be a valid URL.']); } }
  return e;
}

function showErrors(errors) {
  const seen=new Set();
  for (const [f,m] of errors) { if (!seen.has(f)) { errorNodes.get(f)?.replaceChildren(m); seen.add(f); } }
  const first=errors[0]?.[0];
  if (first&&els[first]) els[first].focus();
}

function clearErrors() { errorNodes.forEach(n => { n.textContent=''; }); }
function clearFilters() { els.searchInput.value=''; els.gameFilter.value=''; els.conditionFilter.value=''; els.sortSelect.value='recent'; populateFilterSets(); render(); }
function toggleFilters() { state.filtersOpen=!state.filtersOpen; els.filters?.classList.toggle('is-collapsed',!state.filtersOpen); els.toggleFiltersBtn?.setAttribute('aria-expanded',String(state.filtersOpen)); }

function populateSetSelect(game, selected='') {
  if (!els.setId) return;
  const opts = state.setOptions[game]||[];
  els.setId.innerHTML='<option value="">Select a setâ€¦</option>';
  opts.forEach(s => { const o=document.createElement('option'); o.value=s; o.textContent=s; els.setId.appendChild(o); });
  if (selected) {
    if (!opts.includes(selected)) { const o=document.createElement('option'); o.value=selected; o.textContent=selected; els.setId.appendChild(o); }
    els.setId.value=selected;
  }
}

function populateFilterSets() {
  if (!els.setFilter) return;
  const game=els.gameFilter?.value||'';
  const sets=new Set();
  if (game) { (state.setOptions[game]||[]).forEach(s=>sets.add(s)); getCards().filter(c=>c.game===game).forEach(c=>c.setId&&sets.add(c.setId)); }
  else { Object.values(state.setOptions).flat().forEach(s=>sets.add(s)); getCards().forEach(c=>c.setId&&sets.add(c.setId)); }
  const prev=els.setFilter.value;
  els.setFilter.innerHTML='<option value="">All sets</option>';
  Array.from(sets).sort((a,b)=>a.localeCompare(b)).forEach(s=>{ const o=document.createElement('option'); o.value=s; o.textContent=s; els.setFilter.appendChild(o); });
  els.setFilter.value=sets.has(prev)?prev:'';
}

function syncPreviewFromUrl() { if (els.imageFile?.files?.length) return; setPreview(els.imageUrl?.value.trim()||''); }
async function syncPreviewFromFile() {
  const file=els.imageFile?.files?.[0];
  if (!file) { state.uploadedImageDataUrl=''; syncPreviewFromUrl(); return; }
  try { state.uploadedImageDataUrl=await fileToDataUrl(file); setPreview(state.uploadedImageDataUrl); }
  catch { state.uploadedImageDataUrl=''; errorNodes.get('imageFile')?.replaceChildren('Could not read image.'); setPreview(''); }
}

function setPreview(src) {
  if (!els.imagePreviewImg||!els.imagePreviewPlaceholder) return;
  if (!src) { els.imagePreviewImg.hidden=true; els.imagePreviewImg.removeAttribute('src'); els.imagePreviewPlaceholder.hidden=false; }
  else { els.imagePreviewImg.src=src; els.imagePreviewImg.hidden=false; els.imagePreviewPlaceholder.hidden=true; }
}

function cardVal(c) { return Number(c.currentValue||0)*Number(c.quantity||0); }
function pushUnique(arr,val) { if (Array.isArray(arr)&&val&&!arr.includes(val)) arr.push(val); }
