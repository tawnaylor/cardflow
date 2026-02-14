import { STORAGE_KEYS, load, save, uid } from "./app.js";

export function getBinders(){
  return load(STORAGE_KEYS.binders, []);
}
export function setBinders(binders){
  save(STORAGE_KEYS.binders, binders);
}
export function getCards(){
  return load(STORAGE_KEYS.cards, []);
}
export function setCards(cards){
  save(STORAGE_KEYS.cards, cards);
}

export function getActiveBinderId(){
  return localStorage.getItem(STORAGE_KEYS.activeBinder) || "";
}
export function setActiveBinderId(id){
  localStorage.setItem(STORAGE_KEYS.activeBinder, id);
}

export function ensureDefaultBinder(game){
  const binders = getBinders();
  const existing = binders.find(b => b.game === game);
  if(existing) return existing;

  const binder = {
    id: uid("binder"),
    game,
    name: game === "pokemon" ? "Pokémon Binder" : "MTG Binder",
    layout: 9,
    accent: "classic",
    coverColor: "#1f2937",
    pageColor: "#0b1020",
    createdAt: Date.now()
  };
  binders.push(binder);
  setBinders(binders);
  setActiveBinderId(binder.id);
  return binder;
}

export function createBinder({game, name, layout, accent, coverColor, pageColor}){
  const binders = getBinders();
  const binder = {
    id: uid("binder"),
    game,
    name,
    layout: Number(layout),
    accent,
    coverColor,
    pageColor,
    createdAt: Date.now()
  };
  binders.push(binder);
  setBinders(binders);
  setActiveBinderId(binder.id);
  return binder;
}

export function deleteBinder(binderId){
  const binders = getBinders().filter(b => b.id !== binderId);
  const cards = getCards().filter(c => c.binderId !== binderId);
  setBinders(binders);
  setCards(cards);

  const active = getActiveBinderId();
  if(active === binderId){
    setActiveBinderId(binders[0]?.id || "");
  }
}
