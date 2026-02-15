import { getBinders, createBinder, getCards, addCard } from "./storage.mjs";
import { initThemeSwitch } from "./ui.mjs";
import { renderBinder } from "./binder.mjs";
import { iconForEnergy, iconForRarity } from "./symbols.mjs";

const binderEl = document.querySelector("#binder");
const binderSelect = document.querySelector("#binderSelect");
const newBinderName = document.querySelector("#newBinderName");
const createBinderBtn = document.querySelector("#createBinderBtn");
const searchInput = document.querySelector("#searchInput");
const prevPageBtn = document.querySelector("#prevPageBtn");
const nextPageBtn = document.querySelector("#nextPageBtn");
const pageLabel = document.querySelector("#pageLabel");
const themeSwitch = document.querySelector("#themeSwitch");
const rarityFilter = document.querySelector("#rarityFilter");
const energyFilter = document.querySelector("#energyFilter");

let state = {
  binderId: "",
  pageIndex: 0,
  totalPages: 1,
  query: "",
  rarity: "",
  energy: ""
};

function fillBinders(){
  const binders = getBinders();
  binderSelect.innerHTML = "";
  for (const b of binders){
    const opt = document.createElement("option");
    opt.value = b.id;
    opt.textContent = b.name;
    binderSelect.appendChild(opt);
  }
  if (!state.binderId) state.binderId = binders[0]?.id || "";
  binderSelect.value = state.binderId;
}

function activeBinderName(){
  const binders = getBinders();
  return binders.find(b => b.id === state.binderId)?.name || "Binder";
}

function filterCards(){
  const all = getCards();
  let list = all.filter(c => c.binderId === state.binderId);

  const q = state.query.trim().toLowerCase();
  if (q){
    list = list.filter(c => {
      const parts = [
        c.game,
        c.rarity,
        c.setName,
        c.setCode,
        c.pokemon?.name,
        c.pokemon?.type,
        c.pokemon?.cardNumber,
        c.mtg?.name,
        c.mtg?.cardType,
        c.mtg?.collectorNumber
      ].filter(Boolean).join(" ").toLowerCase();
      return parts.includes(q);
    });
  }

  if (state.rarity){
    list = list.filter(c => (c.rarity || "") === state.rarity);
  }

  if (state.energy){
    list = list.filter(c => {
      if (c.game !== "pokemon") return true;
      return (c.pokemon?.type || "").toLowerCase() === state.energy.toLowerCase();
    });
  }

  const rarityRank = { common: 1, uncommon: 2, rare: 3, holo: 4, ultra: 5, secret: 6 };
  list.sort((a,b) => {
    const ra = rarityRank[a.rarity] || 99;
    const rb = rarityRank[b.rarity] || 99;
    if (ra !== rb) return rb - ra;
    const ea = (a.pokemon?.type || "").toLowerCase();
    const eb = (b.pokemon?.type || "").toLowerCase();
    if (ea !== eb) return ea.localeCompare(eb);
    const na = (a.game === "pokemon" ? a.pokemon?.name : a.mtg?.name) || "";
    const nb = (b.game === "pokemon" ? b.pokemon?.name : b.mtg?.name) || "";
    return na.localeCompare(nb);
  });

  return list;
}

function render(flipDir){
  const cards = filterCards().map(c => ({ ...c, binderName: activeBinderName() }));
  const { totalPages } = renderBinder(binderEl, cards, state.pageIndex, flipDir);
  state.totalPages = totalPages;

  pageLabel.textContent = `Page ${state.pageIndex + 1} / ${state.totalPages}`;
  prevPageBtn.disabled = state.pageIndex <= 0;
  nextPageBtn.disabled = state.pageIndex >= (state.totalPages - 1);
}

function clampPage(){
  if (state.pageIndex < 0) state.pageIndex = 0;
  if (state.pageIndex > state.totalPages - 1) state.pageIndex = state.totalPages - 1;
}

initThemeSwitch(themeSwitch);
fillBinders();
render();

// If there are no cards yet, try to auto-seed a demo card from data/demo_cards.json
async function seedDemoIfEmpty(){
  try{
    // Do not auto-seed more than once.
    if (localStorage.getItem('cardflow.demoSeeded')) return;

    const existing = getCards();
    if (existing.length > 0) {
      localStorage.setItem('cardflow.demoSeeded', '1');
      return;
    }

    const res = await fetch("./data/demo_cards.json");
    if (!res.ok) return;
    const demo = await res.json();
    if (!Array.isArray(demo) || demo.length === 0) return;

    const binders = getBinders();
    const targetBinderId = binders[0]?.id || "";

    for (const c of demo){
      const card = { ...c, binderId: c.binderId || targetBinderId };
      addCard(card);
    }

    // Mark that demo data was seeded so we don't auto-seed again later
    localStorage.setItem('cardflow.demoSeeded', '1');

    // refresh UI
    fillBinders();
    render();
  }catch(err){
    console.warn("Demo seed failed:", err.message);
  }
}

seedDemoIfEmpty();

binderSelect.addEventListener("change", () => {
  state.binderId = binderSelect.value;
  state.pageIndex = 0;
  render();
});

createBinderBtn.addEventListener("click", () => {
  const res = createBinder(newBinderName.value);
      // Mark that demo data was seeded so we don't auto-seed again later
      localStorage.setItem('cardflow.demoSeeded', '1');
  if (!res.ok){
    alert(res.error);
    return;
  }
  newBinderName.value = "";
  state.binderId = res.binder.id;
  state.pageIndex = 0;
  fillBinders();
  render();
});

searchInput.addEventListener("input", () => {
  state.query = searchInput.value;
  state.pageIndex = 0;
  render();
});

rarityFilter?.addEventListener("change", () => {
  state.rarity = rarityFilter.value;
  state.pageIndex = 0;
  render();
});

energyFilter?.addEventListener("change", () => {
  state.energy = energyFilter.value;
  state.pageIndex = 0;
  render();
});

prevPageBtn.addEventListener("click", () => {
  state.pageIndex--;
  clampPage();
  render("left");
});

nextPageBtn.addEventListener("click", () => {
  state.pageIndex++;
  clampPage();
  render("right");
});
