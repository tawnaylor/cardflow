// api.js — simple fetch wrapper for local dataset
export async function fetchCards(){
  const res = await fetch('./database/cards.json');
  if (!res.ok) throw new Error('Failed to load cards.json');
  return res.json();
}

export async function getExpansions(){
  const data = await fetchCards();
  return data.expansions || [];
}

export async function getPromoSets(){
  const data = await fetchCards();
  return data.promo_sets || [];
}

// Fetch user/sample cards stored under cardflow/data/cards.json
export async function getCards(){
  const res = await fetch('./data/cards.json');
  if (!res.ok) throw new Error('Failed to load data/cards.json');
  return res.json();
}
// js/api.js — Module for external API calls (TCGdex)

const TCGDEX_BASE = 'https://api.tcgdex.net/v2/en';

export async function fetchCardById(cardId) {
  const res = await fetch(`${TCGDEX_BASE}/cards/${cardId}`);
  if (!res.ok) throw new Error(`Card not found: ${cardId}`);
  return res.json();
}

export async function fetchSeries() {
  const res = await fetch(`${TCGDEX_BASE}/series`);
  if (!res.ok) throw new Error('Failed to fetch series');
  return res.json();
}

export async function fetchSetsBySeries(seriesId) {
  const res = await fetch(`${TCGDEX_BASE}/series/${seriesId}`);
  if (!res.ok) throw new Error('Failed to fetch sets');
  const data = await res.json();
  return data.sets || [];
}