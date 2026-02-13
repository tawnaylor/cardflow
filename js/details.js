import { getCard, removeCard, loadCards } from "./storage.js";
import { getParam, money } from "./shared.js";

const view = document.getElementById("view");
const id = getParam("id");

if (!view) throw new Error("Missing #view element");

if (!id) {
  renderNotFound();
} else {
  const card = getCard(id);
  if (!card) renderNotFound();
  else renderCard(card);
}

function clearView() {
  view.textContent = "";
}

function makeKv(keyText, valueText) {
  const wrap = document.createElement("div");
  wrap.className = "kv";

  const k = document.createElement("div");
  k.className = "k";
  k.textContent = keyText;

  const v = document.createElement("div");
  v.className = "v";
  v.textContent = valueText;

  wrap.append(k, v);
  return wrap;
}

function renderCard(c) {
  clearView();
  // image column
  const imgWrap = document.createElement("div");
  imgWrap.className = "dp-img";
  const imgInner = document.createElement("div");
  imgInner.className = "dp-img-inner";
  if (c.imageDataUrl) {
    const img = document.createElement("img");
    img.alt = c.name ?? "";
    img.src = c.imageDataUrl;
    img.style.cursor = "zoom-in";
    img.addEventListener("click", () => openImageModal(c.imageDataUrl, c.name));
    imgInner.appendChild(img);
  } else {
    imgInner.textContent = "No image";
  }
  imgWrap.appendChild(imgInner);

  // details column
  const body = document.createElement("div");
  body.className = "dp-body";

  const h2 = document.createElement("h2");
  h2.textContent = c.name ?? "";

  const series = document.createElement("div");
  series.className = "muted";
  series.textContent = `Series: ${c.series ?? ""}`;

  const metaWrap = document.createElement("div");
  metaWrap.className = "dp-meta";
  metaWrap.append(makeKv("Market", money(c.marketValue || 0)));
  metaWrap.append(makeKv("Details", c.details ?? ""));

  const created = document.createElement("div");
  created.className = "muted";

  const downloadBtn = document.createElement("a");
  downloadBtn.className = "btn";
  downloadBtn.textContent = "Download Image";
  downloadBtn.href = c.imageDataUrl || "#";
  downloadBtn.download = (c.name || 'card-image') + '.png';

  const editBtn = document.createElement("a");
  editBtn.className = "btn";
  editBtn.textContent = "Edit Card";
  editBtn.href = `./form.html?id=${encodeURIComponent(c.id)}`;

  const date = c.createdAt ? new Date(c.createdAt) : null;
  actions.append(downloadBtn, editBtn);
  created.textContent = date ? `Added: ${date.toLocaleString()}` : "";

  const actions = document.createElement("div");
  actions.className = "dp-actions";
  const openBtn = document.createElement("a");
  openBtn.className = "btn light";
  openBtn.href = c.imageDataUrl || "#";
  openBtn.target = "_blank";
  openBtn.rel = "noopener noreferrer";
  openBtn.textContent = "Open Image";

  const delBtn = document.createElement("button");
  delBtn.className = "btn danger";
  delBtn.textContent = "Delete Card";
  delBtn.addEventListener("click", () => {
    if (!confirm("Delete this card?")) return;
    removeCard(c.id);
    location.href = "./index.html";
  });

  actions.append(openBtn, delBtn);

  body.append(h2, series, metaWrap, created, actions);
  view.append(imgWrap, body);

  // add visible prev/next buttons above the details body
  addPrevNextButtons(c.id, body);

  // setup keyboard nav for current card
  setupKeyboardNav(c.id);
}

function openImageModal(src, alt) {
  const modal = document.createElement("div");
  modal.className = "img-modal";
  modal.tabIndex = -1;
  const img = document.createElement("img");
  img.src = src;
  img.alt = alt ?? "";
  modal.appendChild(img);
  modal.addEventListener("click", () => modal.remove());
  document.body.appendChild(modal);
  modal.focus();
  const onKey = (e) => { if (e.key === "Escape") { modal.remove(); document.removeEventListener('keydown', onKey); } };
  document.addEventListener('keydown', onKey);


// keyboard navigation: left/right to go to previous/next card
function setupKeyboardNav(currentId) {
  const cards = loadCards();
  if (!cards.length) return;
  const idx = cards.findIndex((c) => c.id === currentId);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') {
      const prev = cards[(idx - 1 + cards.length) % cards.length];
      if (prev) location.href = `./card.html?id=${encodeURIComponent(prev.id)}`;
    } else if (e.key === 'ArrowRight') {
      const next = cards[(idx + 1) % cards.length];
      if (next) location.href = `./card.html?id=${encodeURIComponent(next.id)}`;
    }
  });
}

// glare toggle wiring for details page
const glareToggle = document.getElementById('glare-toggle');
function applyGlareSetting() {
  const off = localStorage.getItem('glare') === 'off';
  if (off) document.documentElement.classList.add('glare-off');
  else document.documentElement.classList.remove('glare-off');
  if (glareToggle) glareToggle.textContent = off ? 'Glare Off' : 'Glare';
}
if (glareToggle) {
  glareToggle.addEventListener('click', () => {
    const off = document.documentElement.classList.toggle('glare-off');
    localStorage.setItem('glare', off ? 'off' : 'on');
    applyGlareSetting();
  });
}
applyGlareSetting();

// create visible prev/next buttons in the details view
function createPrevNext(currentId) {
  const cards = loadCards();
  if (!cards.length) return { prev: null, next: null };
  const idx = cards.findIndex((c) => c.id === currentId);
  const prev = cards[(idx - 1 + cards.length) % cards.length];
  const next = cards[(idx + 1) % cards.length];
  return { prev, next };
}

function addPrevNextButtons(currentId, container) {
  const { prev, next } = createPrevNext(currentId);
  const navWrap = document.createElement('div');
  navWrap.style.display = 'flex';
  navWrap.style.gap = '8px';

  const prevBtn = document.createElement('button');
  prevBtn.className = 'btn';
  prevBtn.textContent = '← Prev';
  prevBtn.disabled = !prev;
  prevBtn.addEventListener('click', () => { if (prev) location.href = `./card.html?id=${encodeURIComponent(prev.id)}`; });

  const nextBtn = document.createElement('button');
  nextBtn.className = 'btn';
  nextBtn.textContent = 'Next →';
  nextBtn.disabled = !next;
  nextBtn.addEventListener('click', () => { if (next) location.href = `./card.html?id=${encodeURIComponent(next.id)}`; });

  navWrap.append(prevBtn, nextBtn);
  container.prepend(navWrap);
}
function renderNotFound() {
  clearView();
  const h2 = document.createElement("h2");
  h2.textContent = "Card not found";

  const p = document.createElement("p");
  p.className = "muted";
  const code = document.createElement("code");
  code.textContent = "?id";
  p.append("Missing or invalid ", code, ".");

  view.append(h2, p);
}
