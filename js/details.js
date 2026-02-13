import { loadCards } from "./store.js";
import { esc, money } from "./utils.js";

function getId() {
  const params = new URLSearchParams(location.search);
  return params.get("id");
}

function renderNotFound() {
  document.getElementById("details").innerHTML = `
    <div class="empty">
      <h2>Card not found</h2>
      <p class="muted">This card may have been deleted or the link is incorrect.</p>
      <a class="btn btn--primary" href="./index.html">Back</a>
    </div>
  `;
}

function renderCard(card) {
  const img = card.img
    ? `<img src="${esc(card.img)}" alt="${esc(card.name)} card image" style="width:min(360px,100%);border-radius:18px;border:1px solid rgba(255,255,255,.12);">`
    : "";

  const totalValue = money((Number(card.value) || 0) * (Number(card.qty) || 0));

  document.getElementById("details").innerHTML = `
    <h2 style="margin-top:0;">${esc(card.name)}</h2>
    <p class="muted" style="margin-top:4px;">${esc(card.gameName)} • ${esc(card.setName)}</p>
    <div style="display:grid;gap:12px;margin-top:14px;">
      ${img}
      <div class="panel" style="margin:0;">
        <p><strong>Card #:</strong> ${esc(card.number || "—")}</p>
        <p><strong>Quantity:</strong> ${esc(card.qty)}</p>
        <p><strong>Value each:</strong> ${money(card.value || 0)}</p>
        <p><strong>Total value:</strong> ${totalValue}</p>
      </div>
    </div>
  `;
}

const id = getId();
const cards = loadCards();
const card = cards.find(c => c.id === id);

if (!id || !card) renderNotFound();
else renderCard(card);
