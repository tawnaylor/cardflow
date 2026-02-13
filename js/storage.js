const KEY = "pokemon.binder.v1";

export function loadCards() {
  try {
    const raw = localStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveCards(cards) {
  localStorage.setItem(KEY, JSON.stringify(cards));
}

export function addCard(card) {
  const cards = loadCards();
  cards.unshift(card);
  saveCards(cards);
  return card;
}

export function getCard(id) {
  return loadCards().find((c) => c.id === id) ?? null;
}

export function removeCard(id) {
  const next = loadCards().filter((c) => c.id !== id);
  saveCards(next);
  return next;
}

export function updateCard(card) {
  const cards = loadCards();
  const idx = cards.findIndex((c) => c.id === card.id);
  if (idx >= 0) {
    cards[idx] = card;
  } else {
    cards.unshift(card);
  }
  saveCards(cards);
  return card;
}
