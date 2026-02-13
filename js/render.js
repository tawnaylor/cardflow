import { esc, money } from "./utils.js";

export function totals(cards) {
  const count = cards.reduce((s, c) => s + (Number(c.qty) || 0), 0);
  const total = cards.reduce((s, c) => s + (Number(c.value) || 0) * (Number(c.qty) || 0), 0);
  return { count, total };
}

function pocketEmptyHTML(slotNumber) {
  return `
    <div class="pocket" role="listitem" aria-label="Empty pocket ${slotNumber}">
      <div class="pocket__empty">
        Empty Pocket<br><span style="opacity:.7;">Slot ${slotNumber}</span>
      </div>
    </div>
  `;
}

export function pocketFilledHTML(card) {
  const img = card.img
    ? `<img src="${esc(card.img)}" alt="${esc(card.name)} card image" loading="lazy">`
    : `<div class="muted" style="padding:12px;text-align:center;">No image</div>`;

  const valueTotal = money((Number(card.value) || 0) * (Number(card.qty) || 0));

  return `
    <article class="pocket pocket--filled" role="listitem" data-id="${esc(card.id)}" aria-label="${esc(card.name)}">
      <div class="pocket__media">${img}</div>
      <div class="pocket__body">
        <div class="pocket__title">
          <h3>${esc(card.name)}</h3>
          <span class="badge">x${esc(card.qty)}</span>
        </div>
        <div class="pocket__meta">
          <div><strong>Game:</strong> ${esc(card.gameName)}</div>
          <div><strong>Set:</strong> ${esc(card.setName)}</div>
          <div><strong>Value:</strong> ${valueTotal}</div>
        </div>
        <div class="pocket__actions">
          <!-- URL parameter requirement -->
          <a class="btn" href="./details.html?id=${encodeURIComponent(card.id)}">Details</a>
          <button class="btn" type="button" data-action="edit">Edit</button>
        </div>
      </div>
    </article>
  `;
}

export function pocketsHTML(cardsOnPage) {
  // Always render 9 pockets (filled first, then empty placeholders)
  const filled = cardsOnPage.map(pocketFilledHTML);
  const emptiesNeeded = Math.max(0, 9 - filled.length);
  const empties = Array.from({ length: emptiesNeeded }, (_, i) => pocketEmptyHTML(filled.length + i + 1));
  return [...filled, ...empties].join("");
}
