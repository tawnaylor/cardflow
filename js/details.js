import { getCard, removeCard } from "./storage.js";
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
  const date = c.createdAt ? new Date(c.createdAt) : null;
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
