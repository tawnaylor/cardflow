// storage.js — single source of truth for all localStorage operations

const CARDS_KEY = 'cardflow_cards_v1';
const BINDERS_KEY = 'cardflow_binders_v1';

// ── Cards ──────────────────────────────────────────────────────────────

export function getCards() {
  try {
    const raw = localStorage.getItem(CARDS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch { return []; }
}

export function setCards(cards) {
  localStorage.setItem(CARDS_KEY, JSON.stringify(cards));
}

export function findCardById(id) {
  return getCards().find(c => c.id === id) || null;
}

export function saveCard(card) {
  const cards = getCards();
  const existing = cards.findIndex(c => c.id === card.id);
  if (existing >= 0) {
    cards[existing] = { ...cards[existing], ...card, updatedAt: Date.now() };
  } else {
    cards.unshift({ ...card, createdAt: Date.now(), updatedAt: Date.now() });
  }
  setCards(cards);
}

export function deleteCard(id) {
  setCards(getCards().filter(c => c.id !== id));
}

export function clearAllCards() {
  localStorage.removeItem(CARDS_KEY);
}

// ── Binders ────────────────────────────────────────────────────────────

export function getBinders() {
  try {
    const raw = localStorage.getItem(BINDERS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch { return []; }
}

export function saveBinder(binder) {
  const binders = getBinders();
  const existing = binders.findIndex(b => b.id === binder.id);
  if (existing >= 0) {
    binders[existing] = { ...binders[existing], ...binder, updatedAt: Date.now() };
  } else {
    binders.push({ ...binder, createdAt: Date.now(), updatedAt: Date.now() });
  }
  localStorage.setItem(BINDERS_KEY, JSON.stringify(binders));
}

export function deleteBinder(id) {
  const binders = getBinders().filter(b => b.id !== id);
  localStorage.setItem(BINDERS_KEY, JSON.stringify(binders));
}

export function clearAllBinders() {
  localStorage.removeItem(BINDERS_KEY);
}

// ── Helpers ────────────────────────────────────────────────────────────

export function createId() {
  return crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export async function fileToDataUrl(file) {
  if (!file) return '';
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result || ''));
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}