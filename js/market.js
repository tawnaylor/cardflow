import { money, escapeHtml } from "./utils.js";

export function renderMarket({ countEl, totalEl, listEl, cards }) {
  const count = cards.length;
  const total = cards.reduce((sum, c) => sum + Number(c.marketValue || 0), 0);

  countEl.textContent = String(count);
  totalEl.textContent = money(total);

  listEl.innerHTML = "";
  if (!count) {
    listEl.innerHTML = `<p class="muted">No cards yet.</p>`;
    return;
  }

  for (const c of cards) {
    const div = document.createElement("div");
    div.className = "mv-item";
    div.innerHTML = `
      <div class="mv-top">
        <div class="mv-name">${escapeHtml(c.name)}</div>
        <div class="badge">${money(c.marketValue || 0)}</div>
      </div>
      <div class="mv-sub">${escapeHtml(c.brandLabel ?? c.brand)} • ${escapeHtml(c.series)}</div>
    `;
    listEl.appendChild(div);
  }
}
