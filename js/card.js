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

document.getElementById("back").addEventListener("click", () => history.back());
document.getElementById("delete").addEventListener("click", () => {
  if (!confirm("Delete this card entry?")) return;
  deleteCard(id);
  location.href = "./index.html";
});

function render() {
  if (!id) {
    status.textContent = "Missing id in the URL. Example: card.html?id=...";
    return;
  }

  const card = findCardById(id);
  if (!card) {
    status.textContent = "Card not found. It may have been deleted.";
    return;
  }

  bigImg.innerHTML = card.imageDataUrl
    ? `<img src="${card.imageDataUrl}" alt="${escapeHtml(card.name || "Card image"))}" />`
    : `<div class="ph">Image</div>`;
