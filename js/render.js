import { esc, money } from "./utils.js";

export function totals(cards) {
  const count = cards.reduce((s, c) => s + (Number(c.qty) || 0), 0);
  const total = cards.reduce((s, c) => s + (Number(c.value) || 0) * (Number(c.qty) || 0), 0);
  return { count, total };
}

export function cardHTML(card) {
  const img = card.img
    ? `<img src="${esc(card.img)}" alt="${esc(card.name)} card image" loading="lazy">`
    : `<div class="muted" style="padding:12px;text-align:center;">No image</div>`;

  const valueTotal = money((Number(card.value) || 0) * (Number(card.qty) || 0));

  return `
    <article class="card" role="listitem" data-id="${esc(card.id)}">
      <div class="card__media">${img}</div>
      <div class="card__body">
        <div class="card__title">
          <h3>${esc(card.name)}</h3>
          <span class="badge">x${esc(card.qty)}</span>
        </div>
        <div class="card__meta">
          <div><strong>Game:</strong> ${esc(card.gameName)}</div>
          <div><strong>Set:</strong> ${esc(card.setName)}</div>
          <div><strong>Value:</strong> ${valueTotal}</div>
        </div>
        <div class="card__actions">
          <!-- REQUIREMENT: URL parameters to details page -->
          <a class="btn" href="./details.html?id=${encodeURIComponent(card.id)}">Details</a>
          <button class="btn" type="button" data-action="edit">Edit</button>
        </div>
      </div>
    </article>
  `;
}
