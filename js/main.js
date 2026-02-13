import { loadCards, saveCards, removeCard } from "./storage.js";
import { escapeHtml, money, getParam } from "./shared.js";

// glare toggle with small-screen confirmation and animation
const glareToggle = document.getElementById('glare-toggle');
function animateGlareToggle() {
  document.documentElement.classList.add('glare-toggle-anim');
  setTimeout(() => document.documentElement.classList.remove('glare-toggle-anim'), 420);
}
function applyGlareSetting() {
  const off = localStorage.getItem('glare') === 'off';
  if (off) document.documentElement.classList.add('glare-off');
  else document.documentElement.classList.remove('glare-off');
  if (glareToggle) glareToggle.textContent = off ? 'Glare Off' : 'Glare';
}
if (glareToggle) {
  glareToggle.addEventListener('click', () => {
    // small screen confirmation
    if (window.innerWidth <= 600) {
      const ok = confirm('Toggle sleeve glare? This will change the page appearance.');
      if (!ok) return;
    }
    const off = document.documentElement.classList.toggle('glare-off');
    localStorage.setItem('glare', off ? 'off' : 'on');
    animateGlareToggle();
    applyGlareSetting();
  });
}
applyGlareSetting();

const grid = document.getElementById("grid");
const empty = document.getElementById("empty");
const search = document.getElementById("search");

const dImg = document.getElementById("dImg");
const dFields = document.getElementById("dFields");
const open = document.getElementById("open");
const del = document.getElementById("del");

let cards = [];
let selectedId = null;

init();

function init() {
  cards = loadCards();
  selectedId = getParam("selected");

  search.addEventListener("input", render);

  grid.addEventListener("click", (e) => {
    const btn = e.target.closest("button.card");
    if (!btn) return;
    selectedId = btn.dataset.id;

    const url = new URL(location.href);
    url.searchParams.set("selected", selectedId);
    history.replaceState({}, "", url.toString());

    render();
  });

  del.addEventListener("click", () => {
    if (!selectedId) return;
    cards = removeCard(selectedId);
    saveCards(cards);
    selectedId = null;

    const url = new URL(location.href);
    url.searchParams.delete("selected");
    history.replaceState({}, "", url.toString());

    render();
  });

  render();
}

function render() {
  const q = search.value.trim().toLowerCase();
  const filtered = cards.filter((c) => !q || c.name.toLowerCase().includes(q));

  empty.hidden = filtered.length !== 0;

  // Grid
  grid.innerHTML = "";
  for (const c of filtered) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = `card${c.id === selectedId ? " selected" : ""}`;
    btn.dataset.id = c.id;
    btn.setAttribute("role", "listitem");
    btn.setAttribute("aria-label", `Select ${c.name}`);

    btn.innerHTML = `
      <div class="card-img">
        ${c.imageDataUrl ? `<img alt="${escapeHtml(c.name)}" src="${escapeHtml(c.imageDataUrl)}" />` : "No image"}
      </div>
      <div class="meta">
        <p class="name">${escapeHtml(c.name)}</p>
        <div class="sub">
          <span>${escapeHtml(c.series)}</span>
          <span>${money(c.marketValue || 0)}</span>
        </div>
      </div>
    `;
    grid.appendChild(btn);
  }

  // Details
  const card = cards.find((c) => c.id === selectedId) ?? null;
  renderDetails(card);
}

function renderDetails(card) {
  if (!card) {
    dImg.textContent = "Select a card";
    dFields.querySelectorAll(".v").forEach((v) => (v.textContent = "—"));
    open.setAttribute("aria-disabled", "true");
    open.href = "./card.html";
    del.disabled = true;
    return;
  }

  dImg.innerHTML = card.imageDataUrl
    ? `<img alt="${escapeHtml(card.name)}" src="${escapeHtml(card.imageDataUrl)}" />`
    : "No image";

  const vals = [card.name, card.series, card.details, money(card.marketValue || 0)];
  dFields.querySelectorAll(".v").forEach((v, i) => (v.textContent = vals[i] ?? "—"));

  open.setAttribute("aria-disabled", "false");
  open.href = `./card.html?id=${encodeURIComponent(card.id)}`;
  del.disabled = false;
}
