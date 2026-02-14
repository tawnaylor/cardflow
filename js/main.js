import { qs, toast, formatGame } from "./modules/app.js";
import { getCards } from "./modules/storage.js";

const stage = qs("#recentStage");
const empty = qs("#recentEmpty");
const stats = qs("#stats");
const toggleMotionBtn = qs("#toggleMotion");

function escapeHtml(s){
  return String(s ?? "")
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;");
}

function setMotionState(running){
  document.documentElement.style.setProperty("--motion", running ? "running" : "paused");
  toggleMotionBtn.textContent = running ? "Pause motion" : "Resume motion";
  localStorage.setItem("cardflow:motion", running ? "running" : "paused");
}

function restoreMotionState(){
  const saved = localStorage.getItem("cardflow:motion");
  setMotionState(saved !== "paused");
}

function renderStats(cards){
  const total = cards.length;
  const pk = cards.filter(c => c.game === "pokemon").length;
  const mtg = cards.filter(c => c.game === "mtg").length;

  stats.innerHTML = `
    <div class="stat"><div class="num">${total}</div><div class="lab">Total cards</div></div>
    <div class="stat"><div class="num">${pk}</div><div class="lab">Pokémon</div></div>
    <div class="stat"><div class="num">${mtg}</div><div class="lab">MTG</div></div>
  `;
}

function cardLabel(card){
  const series = card.series || "—";
  const exp = card.expansionName || card.expansion || card.expansionCode || "—";
  const year = card.expansionYear ? ` • ${card.expansionYear}` : "";
  return `${series} • ${exp}${year}`;
}

function makeFloatCard(card, variant="a", delaySec=0){
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = `float-card ${variant}`;
  btn.style.animationDelay = `${delaySec}s`;
  btn.setAttribute("aria-label", `Open ${card.fields?.name || "card"} details`);
  btn.addEventListener("click", () => {
    location.href = `card.html?id=${encodeURIComponent(card.id)}`;
  });

  const tagClass = card.game === "pokemon" ? "pk" : "mtg";
  const tagText = card.game === "pokemon" ? "POKÉMON" : "MTG";

  const img = card.imageDataUrl
    ? `<img alt="Card image for ${escapeHtml(card.fields?.name || "card")}" src="${card.imageDataUrl}">`
    : `<div class="muted small">No image</div>`;

  btn.innerHTML = `
    <div class="topbar">
      <span class="tag ${tagClass}">${tagText}</span>
      <span class="muted small">${escapeHtml(formatGame(card.game))}</span>
    </div>
    <div class="thumb">${img}</div>
    <div class="meta">
      <p class="name">${escapeHtml(card.fields?.name || "Untitled")}</p>
      <p class="sub">${escapeHtml(cardLabel(card))}</p>
    </div>
  `;

  return btn;
}

function renderRecent(){
  const cards = getCards();
  renderStats(cards);

  const recent = cards
    .slice()
    .sort((a,b) => (b.createdAt || 0) - (a.createdAt || 0))
    .slice(0, 8);

  if(!recent.length){
    empty.hidden = false;
    stage.style.display = "none";
    return;
  }
  empty.hidden = true;
  stage.style.display = "block";
  stage.innerHTML = "";

  // Two lanes of drift, staggered delays
  recent.forEach((c, i) => {
    const variant = i % 2 === 0 ? "a" : "b";
    const delay = (i * 1.7) % 10;
    const el = makeFloatCard(c, variant, delay);
    stage.appendChild(el);
  });
}

toggleMotionBtn?.addEventListener("click", () => {
  const current = getComputedStyle(document.documentElement).getPropertyValue("--motion").trim();
  setMotionState(current !== "running");
});

restoreMotionState();
renderRecent();
toast("Welcome to the shop.");
