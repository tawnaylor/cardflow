import { getParam, money, escapeHtml } from "./utils.js";
import { getCardById } from "./storage.js";

const view = document.getElementById("cardDetailsView");

init();

function init() {
  const id = getParam("id");
  if (!id) return notFound();

  const card = getCardById(id);
  if (!card) return notFound();

  view.innerHTML = `
    <div class="dp-img">
      ${card.imageDataUrl ? `<img alt="${escapeHtml(card.name)}" src="${escapeHtml(card.imageDataUrl)}" />` : "No image"}
    </div>
    <div class="dp-body">
      <h2 style="margin:0;">${escapeHtml(card.name)}</h2>
      <div class="muted">${escapeHtml(card.brandLabel ?? card.brand)} • ${escapeHtml(card.series)}</div>

      <div class="kv"><div class="k">Market Value</div><div class="v">${money(card.marketValue ?? 0)}</div></div>
      <div class="kv"><div class="k">Details</div><div class="v">${escapeHtml(card.details)}</div></div>

      <div class="muted">ID: <code>${escapeHtml(card.id)}</code></div>
    </div>
  `;
}

function notFound() {
  view.innerHTML = `
    <h2>Card not found</h2>
    <p class="muted">This card may have been deleted or the link is invalid.</p>
    <a class="btn" href="./index.html">Back to Binder</a>
  `;
}
