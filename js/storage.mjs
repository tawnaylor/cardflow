const KEYS = {
  theme: "cardflow.theme",
  binders: "cardflow.binders",
  cards: "cardflow.cards"
};

function uid(prefix="id"){
  return `${prefix}_${crypto.randomUUID()}`;
}

function readJSON(key, fallback){
  try{
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  }catch{
    return fallback;
  }
}

function writeJSON(key, value){
  localStorage.setItem(key, JSON.stringify(value));
}

export function getTheme(){
  return localStorage.getItem(KEYS.theme) || "neon";
}
export function setTheme(theme){
  localStorage.setItem(KEYS.theme, theme);
}

export function getBinders(){
  const binders = readJSON(KEYS.binders, []);
  if (!Array.isArray(binders) || binders.length === 0){
    const starter = [{ id: uid("binder"), name: "Main Binder", createdAt: Date.now() }];
    writeJSON(KEYS.binders, starter);
    return starter;
  }
  return binders;
}

export function createBinder(name){
  const binders = getBinders();
  const trimmed = String(name || "").trim();
  if (!trimmed) return { ok:false, error:"Binder name is required." };

  const exists = binders.some(b => b.name.toLowerCase() === trimmed.toLowerCase());
  if (exists) return { ok:false, error:"Binder name already exists." };

  const binder = { id: uid("binder"), name: trimmed, createdAt: Date.now() };
  binders.unshift(binder);
  writeJSON(KEYS.binders, binders);
  return { ok:true, binder };
}

export function getCards(){
  const cards = readJSON(KEYS.cards, []);
  return Array.isArray(cards) ? cards : [];
}

export function addCard(card){
  const cards = getCards();
  cards.unshift(card);
  writeJSON(KEYS.cards, cards);
}

export function updateCard(cardId, patch){
  const cards = getCards();
  const idx = cards.findIndex(c => c.id === cardId);
  if (idx === -1) return false;
  cards[idx] = { ...cards[idx], ...patch };
  writeJSON(KEYS.cards, cards);
  return true;
}

export function deleteCard(cardId){
  const cards = getCards();
  const idx = cards.findIndex(c => c.id === cardId);
  if (idx === -1) return false;
  cards.splice(idx, 1);
  writeJSON(KEYS.cards, cards);
  return true;
}