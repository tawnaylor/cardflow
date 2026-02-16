import { findCardById, deleteCard } from "./storage.js";

const params = new URLSearchParams(location.search);
const id = params.get("id");

const bigImg = document.getElementById("bigImg");
const dName = document.getElementById("dName");
const dMeta = document.getElementById("dMeta");
const dQty = document.getElementById("dQty");
const dSeries = document.getElementById("dSeries");
const dExpansion = document.getElementById("dExpansion");
const dRarity = document.getElementById("dRarity");
const dNumber = document.getElementById("dNumber");
const status = document.getElementById("status");

const backBtn = document.getElementById("back");
const deleteBtn = document.getElementById("delete");

if (backBtn) backBtn.addEventListener("click", () => history.back());
if (deleteBtn) deleteBtn.addEventListener("click", () => {
  if (!confirm("Delete this card entry?")) return;
  deleteCard(id);
  location.href = "./index.html";
});

function formatNum(numStr) {
  const n = String(numStr || "").padStart(3, "0");
  return `#${n}`;
}

function escapeHtml(str) {
  return String(str ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function render() {
  if (!status) return;

  if (!id) {
    status.textContent = "Missing id in the URL. Example: card.html?id=...";
    return;
  }

  const card = findCardById(id);
  if (!card) {
    status.textContent = "Card not found. It may have been deleted.";
    return;
  }

  status.textContent = "";

  if (bigImg) {
    // ensure container (parent) is available for placeholder fallbacks
    const container = bigImg.parentElement || bigImg;
    // remove any existing placeholders added previously
    const existingPh = container.querySelector('.ph');
    if (existingPh) existingPh.remove();

    if (card.imageDataUrl) {
      bigImg.style.display = '';
      bigImg.src = card.imageDataUrl;
      bigImg.alt = escapeHtml(card.name || 'Card image');
      bigImg.loading = 'lazy';
      bigImg.onerror = function () {
        this.style.display = 'none';
        const d = document.createElement('div');
        d.className = 'ph';
        d.textContent = 'Image';
        container.appendChild(d);
      };
    } else {
      bigImg.style.display = 'none';
      const d = document.createElement('div');
      d.className = 'ph';
      d.textContent = 'Image';
      container.appendChild(d);
    }
  }

  if (dName) dName.innerHTML = escapeHtml(card.name || "Untitled");

  const metaParts = [];
  if (card.series) metaParts.push(escapeHtml(card.series));
  if (card.expansion) metaParts.push(escapeHtml(card.expansion));
  if (card.rarity) metaParts.push(escapeHtml(card.rarity));
  if (card.number) metaParts.push(formatNum(card.number));
  if (dMeta) dMeta.innerHTML = metaParts.join(" • ");

  if (dQty) dQty.textContent = `Quantity: x${Number(card.qty || 1)}`;
  if (dSeries) dSeries.textContent = card.series || "";
  if (dExpansion) dExpansion.textContent = card.expansion || "";
  if (dRarity) dRarity.textContent = card.rarity || "";
  if (dNumber) dNumber.textContent = card.number ? formatNum(card.number) : "";
}

window.addEventListener("storage", render);
render();
