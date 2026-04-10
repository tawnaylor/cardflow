// storage.js — tiny wrapper around localStorage
export function save(key, value){
  localStorage.setItem(key, JSON.stringify(value));
}

export function load(key, fallback=null){
  try{ return JSON.parse(localStorage.getItem(key)) ?? fallback; }
  catch{ return fallback; }
}

export function remove(key){ localStorage.removeItem(key); }
const KEY = "cardflow_cards_v1";

function inferGame(card = {}) {
  if (card.game) return String(card.game).trim().toLowerCase();
  const series = String(card.series || '').toLowerCase();
  const setName = String(card.expansion || card.setId || '').toLowerCase();
  if (series.includes('magic') || setName.includes('modern horizons') || setName.includes('alpha')) return 'mtg';
  if (series.includes('one piece') || setName.includes('romance dawn')) return 'onepiece';
  return 'pokemon';
}

function normalizeCard(card = {}) {
  const quantity = Math.max(1, Number(card.quantity ?? card.qty ?? 1) || 1);
  const setId = String(card.setId ?? card.expansion ?? '').trim();
  const cardNumber = String(card.cardNumber ?? card.number ?? '').trim();
  const imageUrl = String(card.imageUrl ?? card.externalImageUrl ?? card.imageDataUrl ?? '').trim();
  const normalized = {
    id: card.id || uid(),
    binderId: card.binderId ?? '',
    game: inferGame(card),
    name: String(card.name || '').trim(),
    setId,
    cardNumber,
    condition: String(card.condition || 'Near Mint').trim(),
    quantity,
    foil: typeof card.foil === 'boolean' ? card.foil : /holo|foil/i.test(String(card.rarity || '')),
    purchasePrice: Number(card.purchasePrice || 0),
    currentValue: Number(card.currentValue || 0),
    imageUrl,
    externalImageUrl: String(card.externalImageUrl ?? '').trim(),
    notes: String(card.notes || '').trim(),
    series: String(card.series || 'Pokémon').trim(),
    expansion: setId,
    rarity: String(card.rarity || '').trim(),
    number: cardNumber,
    qty: quantity,
    imageDataUrl: String(card.imageDataUrl ?? imageUrl).trim(),
    createdAt: Number(card.createdAt || Date.now()),
    updatedAt: Number(card.updatedAt || Date.now()),
  };

  if (!normalized.externalImageUrl && normalized.imageUrl === normalized.imageDataUrl) {
    normalized.externalImageUrl = '';
  }

  return normalized;
}

function uid() {
  return crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(16).slice(2);
}

export function createId() {
  return uid();
}

export function getCards() {
  try {
    const raw = localStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.map(normalizeCard) : [];
  } catch {
    return [];
  }
}

export function setCards(cards) {
  localStorage.setItem(KEY, JSON.stringify((cards || []).map(normalizeCard)));
}

export function findCardById(id) {
  return getCards().find(c => c.id === id) || null;
}

export function saveCard(card) {
  const cards = getCards();
  const normalized = normalizeCard(card);
  const index = cards.findIndex(existing => existing.id === normalized.id);
  if (index >= 0) cards[index] = normalized;
  else cards.unshift(normalized);
  setCards(cards);
  return normalized.id;
}

/**
 * Merge rule:
 * Merge quantities ONLY if same series + expansion + number + rarity.
 */
export function upsertCard(newCard) {
  const cards = getCards();
  const normalized = normalizeCard(newCard);

  const seriesKey = normalized.series.trim().toLowerCase();
  const expKey = normalized.expansion.trim().toLowerCase();
  const rarityKey = normalized.rarity.trim().toLowerCase();
  const numberKey = normalized.number;
  const binderKey = String(normalized.binderId || '');

  const matchIndex = cards.findIndex(c =>
    String(c.binderId || '') === binderKey &&
    (c.series || "").trim().toLowerCase() === seriesKey &&
    (c.expansion || "").trim().toLowerCase() === expKey &&
    (c.rarity || "").trim().toLowerCase() === rarityKey &&
    String(c.number || "").trim() === numberKey
  );

  if (matchIndex >= 0) {
    const existing = normalizeCard(cards[matchIndex]);
    existing.quantity = Math.max(1, Number(existing.quantity || 1) + Number(normalized.quantity || 1));
    existing.qty = existing.quantity;
    existing.updatedAt = Date.now();
    if (normalized.imageDataUrl) {
      existing.imageDataUrl = normalized.imageDataUrl;
      existing.imageUrl = normalized.imageUrl || normalized.imageDataUrl;
    }
    if (normalized.externalImageUrl) existing.externalImageUrl = normalized.externalImageUrl;
    if (normalized.name) existing.name = normalized.name;
    if (normalized.setId) { existing.setId = normalized.setId; existing.expansion = normalized.setId; }
    if (normalized.cardNumber) { existing.cardNumber = normalized.cardNumber; existing.number = normalized.cardNumber; }
    if (normalized.rarity) existing.rarity = normalized.rarity;
    if (normalized.series) existing.series = normalized.series;
    cards[matchIndex] = normalizeCard(existing);
    setCards(cards);
    return { merged: true, card: cards[matchIndex] };
  }

  cards.unshift(normalized);
  setCards(cards);
  return { merged: false, card: normalized };
}

export function deleteCard(id) {
  const cards = getCards().filter(c => c.id !== id);
  setCards(cards);
}

export function updateCard(id, updates = {}) {
  const cards = getCards();
  const idx = cards.findIndex(c => c.id === id);
  if (idx === -1) return null;
  const updated = Object.assign({}, cards[idx], updates, { updatedAt: Date.now() });
  cards[idx] = updated;
  setCards(cards);
  return updated;
}

export function clearAll() {
  localStorage.removeItem(KEY);
}

export function toGroupedBinders(cards = getCards()) {
  const map = new Map();
  for (const c of cards) {
    const s = c.series || "Unknown Series";
    const e = c.expansion || "Unknown Expansion";
    const key = `${s}|||${e}`;
    if (!map.has(key)) map.set(key, { series: s, expansion: e, count: 0, qtyTotal: 0 });
    const item = map.get(key);
    item.count += 1;
    item.qtyTotal += Number(c.qty || 1);
  }
  return Array.from(map.values())
    .sort((a, b) => (a.series + a.expansion).localeCompare(b.series + b.expansion));
}

export async function fileToDataUrl(file) {
  if (!file) return "";
  return await new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result || ""));
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}