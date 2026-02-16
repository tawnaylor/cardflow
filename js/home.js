import { getCards } from "./storage.js";

const cardsRow = document.getElementById("cardsRow");
const dotsWrap = document.getElementById("dots");
const pageIndicator = document.getElementById("pageIndicator");

const carouselPrev = document.getElementById("carouselPrev");
const carouselNext = document.getElementById("carouselNext");
const pagePrev = document.getElementById("pagePrev");
const pageNext = document.getElementById("pageNext");

const PAGE_SIZE = 5;
let pageIndex = 0;

function formatNum(numStr) {
  const n = String(numStr || "").padStart(3, "0");
  return `#${n}`;
}

function renderEmpty() {
  cardsRow.innerHTML = `
    <div class="card" style="grid-column: 1 / -1; cursor: default;">
      <div class="card-num">#---</div>
      <div class="thumb"><div class="ph">No cards yet</div></div>
      <div class="card-title">Add your first card</div>
      <div class="card-details">
        <span>Go to “Add Cards”</span>
        <span class="qty-pill">x0</span>
      </div>
    </div>
  `;
  dotsWrap.innerHTML = "";
  pageIndicator.textContent = "Page 1 of 1";
  carouselPrev.disabled = true;
  carouselNext.disabled = true;
  pagePrev.disabled = true;
  pageNext.disabled = true;
}

function renderDots(totalPages) {
  dotsWrap.innerHTML = "";
  for (let i = 0; i < totalPages; i++) {
    const d = document.createElement("button");
    d.className = `dot ${i === pageIndex ? "active" : ""}`;
    d.type = "button";
    d.setAttribute("aria-label", `Go to page ${i + 1}`);
    d.addEventListener("click", () => {
      pageIndex = i;
      render();
    });
    dotsWrap.appendChild(d);
  }
}

function render() {
  const cards = getCards();

  if (!cards.length) {
    renderEmpty();
    return;
  }

  const totalPages = Math.max(1, Math.ceil(cards.length / PAGE_SIZE));
  pageIndex = Math.min(Math.max(0, pageIndex), totalPages - 1);

  const start = pageIndex * PAGE_SIZE;
  const slice = cards.slice(start, start + PAGE_SIZE);

  cardsRow.innerHTML = "";
  for (const c of slice) {
    const tile = document.createElement("article");
    tile.className = "card";
    tile.setAttribute("role", "listitem");
    tile.tabIndex = 0;

    const imgHtml = c.imageDataUrl
      ? `<img src="${c.imageDataUrl}" alt="${escapeHtml(c.name || "Card image")}" />`
      : `<div class="ph">Image</div>`;

    tile.innerHTML = `
      <div class="card-num">${formatNum(c.number)}</div>
      <div class="thumb">${imgHtml}</div>
      <div class="card-title">${escapeHtml(c.name || "Title")}</div>
      <div class="card-details">
        <span>Details</span>
        <span class="qty-pill">x${Number(c.qty || 1)}</span>
      </div>
    `;

    const go = () => (location.href = `./card.html?id=${encodeURIComponent(c.id)}`);
    tile.addEventListener("click", go);
    tile.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") go();
    });

    cardsRow.appendChild(tile);
  }

  renderDots(totalPages);
  pageIndicator.textContent = `Page ${pageIndex + 1} of ${totalPages}`;

  const atStart = pageIndex === 0;
  const atEnd = pageIndex === totalPages - 1;

  carouselPrev.disabled = atStart;
  carouselNext.disabled = atEnd;
  pagePrev.disabled = atStart;
  pageNext.disabled = atEnd;
}

function escapeHtml(str) {
  return String(str ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

carouselPrev.addEventListener("click", () => { pageIndex--; render(); });
carouselNext.addEventListener("click", () => { pageIndex++; render(); });
pagePrev.addEventListener("click", () => { pageIndex--; render(); });
pageNext.addEventListener("click", () => { pageIndex++; render(); });

window.addEventListener("storage", render);
render();
