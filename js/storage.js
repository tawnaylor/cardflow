const KEY = "cardflow_cards_v1";

function uid() {
  return crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(16).slice(2);
}

export function getCards() {
  try {
    const raw = localStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function setCards(cards) {
  localStorage.setItem(KEY, JSON.stringify(cards));
}

export function findCardById(id) {
  return getCards().find(c => c.id === id) || null;
}

/**
 * Merge rule (per your earlier preference):
 * Merge quantities ONLY if same series + expansion + number + rarity.
 * (So different series/expansions never merge.)
 */
export function upsertCard(newCard) {
  const cards = getCards();

  const seriesKey = (newCard.series || "").trim().toLowerCase();
  const expKey = (newCard.expansion || "").trim().toLowerCase();
  const rarityKey = (newCard.rarity || "").trim().toLowerCase();
  const numberKey = String(newCard.number || "").trim();

  const matchIndex = cards.findIndex(c =>
    (c.series || "").trim().toLowerCase() === seriesKey &&
    (c.expansion || "").trim().toLowerCase() === expKey &&
    (c.rarity || "").trim().toLowerCase() === rarityKey &&
    String(c.number || "").trim() === numberKey
  );

  if (matchIndex >= 0) {
    const existing = cards[matchIndex];
    existing.qty = Math.max(1, Number(existing.qty || 1) + Number(newCard.qty || 1));
    existing.updatedAt = Date.now();
    // keep existing image if new one missing; otherwise update
    if (newCard.imageDataUrl) existing.imageDataUrl = newCard.imageDataUrl;
    // keep name if new one provided
    if (newCard.name && newCard.name.trim()) existing.name = newCard.name.trim();
    cards[matchIndex] = existing;
    setCards(cards);
    return { merged: true, card: existing };
  }

  const card = {
    id: uid(),
    name: (newCard.name || "").trim(),
    series: (newCard.series || "").trim(),
    expansion: (newCard.expansion || "").trim(),
    rarity: (newCard.rarity || "").trim(),
    number: String(newCard.number || "").trim(),
    qty: Math.max(1, Number(newCard.qty || 1)),
    imageDataUrl: newCard.imageDataUrl || "",
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  cards.unshift(card); // newest first
  setCards(cards);
  return { merged: false, card };
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
  // group by series -> expansion
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
