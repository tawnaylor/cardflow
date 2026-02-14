import { qs, toast, formatGame } from "./modules/app.js";
import { getBinders, getCards, setActiveBinderId, getActiveBinderId, deleteBinder } from "./modules/storage.js";

const binderSelect = qs("#binderSelect");
const pageEl = qs("#page");
const emptyEl = qs("#empty");
const frame = qs("#binderFrame");
const pageIndicator = qs("#pageIndicator");
const prevBtn = qs("#prevPage");
const nextBtn = qs("#nextPage");
const searchEl = qs("#search");
const sortEl = qs("#sort");
const deleteBtn = qs("#deleteBinder");

let pageIndex = 0;

function getActiveBinder(){
  const id = getActiveBinderId() || getBinders()[0]?.id || "";
  const binder = getBinders().find(b=>b.id===id);
  return binder || null;
}

function renderBinderSelect(){
  const binders = getBinders();
  if(!binders.length){
    binderSelect.innerHTML = `<option value="">No binders</option>`;
    return;
  }
  const active = getActiveBinder();
  binderSelect.innerHTML = binders.map(b => `
    <option value="${b.id}" ${active && b.id===active.id ? "selected" : ""}>
      ${b.name} (${formatGame(b.game)})
    </option>
  `).join("");

  binderSelect.addEventListener("change", ()=>{
    setActiveBinderId(binderSelect.value);
    pageIndex = 0;
    toast("Binder switched.");
    render();
  });
}

function applyBinderTheme(b){
  if(!b) return;
  frame.style.borderColor = "rgba(255,255,255,.18)";
  frame.style.background = `linear-gradient(180deg, rgba(0,0,0,.18), rgba(0,0,0,.22)), ${b.pageColor}`;
  document.documentElement.style.setProperty("--accent",
    b.accent === "neon" ? "#a78bfa" :
    b.accent === "vintage" ? "#fbbf24" :
    "#60a5fa"
  );
}

function filteredCards(b){
  const q = (searchEl.value || "").trim().toLowerCase();
  let cards = getCards().filter(c => c.binderId === b.id);

  if(q){
    cards = cards.filter(c => (c.fields?.name || "").toLowerCase().includes(q));
  }

  const sort = sortEl.value;
  cards.sort((a, b2)=>{
    if(sort === "name"){
      return (a.fields?.name||"").localeCompare(b2.fields?.name||"");
    }
    if(sort === "series"){
      return (a.series||"").localeCompare(b2.series||"");
    }
    if(sort === "expansion"){
      return (a.expansion||"").localeCompare(b2.expansion||"");
    }
    return (b2.createdAt||0) - (a.createdAt||0);
  });

  return cards;
}

function renderPageGrid(b, cards){
  const pockets = b.layout === 12 ? 12 : 9;
  const cols = b.layout === 12 ? 4 : 3;

  pageEl.style.gridTemplateColumns = `repeat(${cols}, minmax(0, 1fr))`;

  const start = pageIndex * pockets;
  const slice = cards.slice(start, start + pockets);

  pageIndicator.textContent = `Page ${pageIndex + 1}`;

  if(!cards.length){
    emptyEl.hidden = false;
    frame.hidden = true;
    return;
  }else{
    emptyEl.hidden = true;
    frame.hidden = false;
  }

  pageEl.innerHTML = "";
  for(let i=0; i<pockets; i++){
    const slot = document.createElement("div");
    slot.className = "slot";
    const card = slice[i];
    if(card){
      slot.appendChild(tileFor(card));
    }else{
      slot.innerHTML = `<div class="muted small">Empty</div>`;
    }
    pageEl.appendChild(slot);
  }

  prevBtn.disabled = pageIndex <= 0;
  nextBtn.disabled = (start + pockets) >= cards.length;
}

function tileFor(card){
  const btn = document.createElement("button");
  btn.className = "tile";
  btn.type = "button";
  btn.addEventListener("click", ()=>{
    location.href = `card.html?id=${encodeURIComponent(card.id)}`;
  });

  const thumb = document.createElement("div");
  thumb.className = "thumb";
  thumb.innerHTML = card.imageDataUrl
    ? `<img alt="Card image for ${escapeHtml(card.fields?.name||"card")}" src="${card.imageDataUrl}">`
    : `<div class="muted small">No image</div>`;

  const meta = document.createElement("div");
  meta.className = "meta";
  meta.innerHTML = `
    <h3>${escapeHtml(card.fields?.name || "Untitled")}</h3>
    <p>${escapeHtml(card.series || "—")} • ${escapeHtml(card.expansion || "—")}</p>
    <p class="muted small">${formatGame(card.game)}</p>
  `;

  btn.append(thumb, meta);
  return btn;
}

function escapeHtml(s){
  return String(s).replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;");
}

function render(){
  const b = getActiveBinder();
  if(!b){
    emptyEl.hidden = false;
    frame.hidden = true;
    toast("Create a binder to begin.");
    return;
  }

  applyBinderTheme(b);

  const cards = filteredCards(b);
  renderPageGrid(b, cards);
}

prevBtn?.addEventListener("click", ()=>{ pageIndex = Math.max(0, pageIndex-1); render(); });
nextBtn?.addEventListener("click", ()=>{ pageIndex += 1; render(); });

searchEl?.addEventListener("input", ()=>{ pageIndex = 0; render(); });
sortEl?.addEventListener("change", ()=>{ pageIndex = 0; render(); });

deleteBtn?.addEventListener("click", ()=>{
  const b = getActiveBinder();
  if(!b) return;
  const ok = confirm(`Delete binder "${b.name}" and all its cards?`);
  if(!ok) return;
  deleteBinder(b.id);
  toast("Binder deleted.");
  pageIndex = 0;
  renderBinderSelect();
  render();
});

renderBinderSelect();
render();
