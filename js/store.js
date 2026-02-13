const KEY = "cardflow.cards.v2";       // bumped key because structure evolved
const PAGE_KEY = "cardflow.page.v1";   // remember last page

export function loadCards() {
  try {
    const raw = localStorage.getItem(KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

export function saveCards(cards) {
  localStorage.setItem(KEY, JSON.stringify(cards));
}

export function loadPageIndex() {
  const raw = localStorage.getItem(PAGE_KEY);
  const n = Number(raw);
  return Number.isInteger(n) && n >= 0 ? n : 0;
}

export function savePageIndex(i) {
  localStorage.setItem(PAGE_KEY, String(i));
}
