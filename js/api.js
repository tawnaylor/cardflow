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
