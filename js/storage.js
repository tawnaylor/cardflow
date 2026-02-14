import { STORAGE_KEY, demoCards } from "./data.js";

export function loadCards() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveCards(cards) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cards));
}

export function ensureDemoData() {
  const existing = loadCards();
  if (existing && existing.length) return existing;
  saveCards(demoCards);
  return demoCards;
}

export function resetToDemo() {
  saveCards(demoCards);
  return demoCards;
}
