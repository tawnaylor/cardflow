import { getCard } from "./storage.js";
import { getParam, escapeHtml, money } from "./shared.js";

const view = document.getElementById("view");
const id = getParam("id");

if (!id) renderNotFound();
else {
  const card = getCard(id);
  if (!card) renderNotFound();
  else renderCard(card);
}

function renderCard(c) {
  view.innerHTML = `
    <div class="dp-img">
      ${c.imageDataUrl ? `<img alt="${escapeHtml(c.name)}" src="${escapeHtml(c.imageDataUrl)}" />` : "No image"}
    </div>
    <div class="dp-body">
      <h2 style="margin:0;">${escapeHtml(c.name)}</h2>
      <div class="muted">Series: ${escapeHtml(c.series)}</div>

      <div class="kv"><div class="k">Market Value</div><div class="v">${money(c.marketValue || 0)}</div></div>
      <div class="kv"><div class="k">Details</div><div class="v">${escapeHtml(c.details)}</div></div>
    </div>
  `;
}

function renderNotFound() {
  view.innerHTML = `
    <h2>Card not found</h2>
    <p class="muted">Missing or invalid <code>?id</code>.</p>
  `;
}
