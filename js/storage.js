const KEY = "binder.cards.v1";

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
  try {
    if (typeof window !== 'undefined') {
      window.__cardflow_saved = { id: card.id, time: Date.now() };
      try { window.dispatchEvent(new Event('cardflow-saved')); } catch (e) {}
      try { localStorage.setItem('__cardflow_saved', JSON.stringify(window.__cardflow_saved)); } catch (e) {}
    }
  } catch (e) {}
  return card;
}

export function deleteCardById(id) {
  const cards = loadCards();
  const next = cards.filter((c) => c.id !== id);
  saveCards(next);
  return next;
}

export function getCardById(id) {
  return loadCards().find((c) => c.id === id) ?? null;
}
