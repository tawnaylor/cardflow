export const STORAGE_KEYS = {
  binders: "cardflow:binders:v1",
  cards: "cardflow:cards:v1",
  activeBinder: "cardflow:activeBinderId:v1"
};

export function qs(sel, el=document){ return el.querySelector(sel); }
export function qsa(sel, el=document){ return [...el.querySelectorAll(sel)]; }

export function uid(prefix="id"){
  return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`;
}

export function load(key, fallback){
  try{
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  }catch{
    return fallback;
  }
}
export function save(key, value){
  localStorage.setItem(key, JSON.stringify(value));
}

export function toast(msg){
  const el = qs("#toast");
  if(!el) return;
  el.textContent = msg;
  el.classList.add("show");
  window.clearTimeout(toast._t);
  toast._t = window.setTimeout(()=> el.classList.remove("show"), 2400);
}

export async function loadSets(){
  const res = await fetch("data/sets.json");
  if(!res.ok) throw new Error("Failed to load sets.json");
  return res.json();
}

export function getQuery(){
  return new URLSearchParams(location.search);
}

export function formatGame(game){
  return game === "pokemon" ? "Pokémon" : (game === "mtg" ? "Magic: The Gathering" : game);
}
