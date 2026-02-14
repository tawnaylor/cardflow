import { getBinders, createBinder, getCards, addCard } from "./storage.mjs";
import { initThemeSwitch } from "./ui.mjs";
import { renderBinder } from "./binder.mjs";

const binderEl = document.querySelector("#binder");
const binderSelect = document.querySelector("#binderSelect");
const newBinderName = document.querySelector("#newBinderName");
const createBinderBtn = document.querySelector("#createBinderBtn");
const searchInput = document.querySelector("#searchInput");
const prevPageBtn = document.querySelector("#prevPageBtn");
const nextPageBtn = document.querySelector("#nextPageBtn");
const pageLabel = document.querySelector("#pageLabel");
const themeSwitch = document.querySelector("#themeSwitch");

let state = {
  binderId: "",
  pageIndex: 0,
  totalPages: 1,
  query: ""
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
  const inBinder = all.filter(c => c.binderId === state.binderId);

  const q = state.query.trim().toLowerCase();
  if (!q) return inBinder;

  return inBinder.filter(c => {
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
    const existing = getCards();
    if (existing.length > 0) return;

    const res = await fetch("./data/demo_cards.json");
    if (!res.ok) return;
    const demo = await res.json();
    if (!Array.isArray(demo) || demo.length === 0) return;

    const binders = getBinders();
    const targetBinderId = binders[0]?.id || "";

    for (const c of demo){
      // ensure binderId exists
      const card = { ...c, binderId: c.binderId || targetBinderId };
      addCard(card);
    }

    // refresh UI
    fillBinders();
    render();
  }catch(err){
    // ignore failures — demo is optional
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
