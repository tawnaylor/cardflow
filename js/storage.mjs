export const storage = {
  get(key){ try { return JSON.parse(localStorage.getItem(key)); } catch { return null } },
  set(key,val){ localStorage.setItem(key, JSON.stringify(val)); },
  remove(key){ localStorage.removeItem(key); }
};
const KEY = "cardflow_v2";

function uid() {
  return "cf_" + Math.random().toString(16).slice(2) + "_" + Date.now().toString(16);
}

function defaultState() {
  return {
    cards: [],
    // cardOrders is per "series||expansion" filter view
    // { "Base||Base Set": ["cardId1","cardId2",...], ... }
    cardOrders: {}
  };
}

export function loadState() {
  const raw = localStorage.getItem(KEY);
  if (!raw) return defaultState();
  try {
    return { ...defaultState(), ...JSON.parse(raw) };
  } catch {
    return defaultState();
  }
}

export function saveState(state) {
  localStorage.setItem(KEY, JSON.stringify(state));
}

function norm(s) {
  return (s || "").toLowerCase().trim();
}

function sameBucket(a, b) {
  return (
    norm(a.series) === norm(b.series) &&
    norm(a.expansion) === norm(b.expansion) &&
    norm(a.name) === norm(b.name) &&
    norm(a.number) === norm(b.number)
  );
}

export function createOrIncrementCard(card) {
  const state = loadState();

  const existing = state.cards.find(c => sameBucket(c, card));
  if (existing) {
    existing.qty = (existing.qty || 1) + 1;
    existing.updatedAt = Date.now();

    if (!existing.imageDataUrl && card.imageDataUrl) existing.imageDataUrl = card.imageDataUrl;
    if (!existing.imageUrl && card.imageUrl) existing.imageUrl = card.imageUrl;

    saveState(state);
    return { merged: true, card: existing };
  }

  const newCard = {
    id: uid(),
    qty: 1,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    ...card
  };

  state.cards.unshift(newCard);
  saveState(state);
  return { merged: false, card: newCard };
}

export function listCards() {
  return loadState().cards;
}

export function getCard(id) {
  return loadState().cards.find(c => c.id === id) || null;
}

export function updateCard(id, patch) {
  const state = loadState();
  const idx = state.cards.findIndex(c => c.id === id);
  if (idx === -1) return null;
  state.cards[idx] = { ...state.cards[idx], ...patch, updatedAt: Date.now() };
  saveState(state);
  return state.cards[idx];
}

export function deleteCard(id) {
  const state = loadState();
  const before = state.cards.length;
  state.cards = state.cards.filter(c => c.id !== id);

  // Also remove from any saved orders
  for (const key of Object.keys(state.cardOrders)) {
    state.cardOrders[key] = (state.cardOrders[key] || []).filter(cid => cid !== id);
  }

  saveState(state);
  return state.cards.length !== before;
}

function orderKey(series, expansion) {
  return `${series || ""}||${expansion || ""}`;
}

export function getOrderFor(series, expansion) {
  const state = loadState();
  const key = orderKey(series, expansion);
  return state.cardOrders[key] || [];
}

export function saveOrderFor(series, expansion, orderedIds) {
  const state = loadState();
  const key = orderKey(series, expansion);
  state.cardOrders[key] = [...orderedIds];
  saveState(state);
}
