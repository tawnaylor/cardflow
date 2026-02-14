import { loadCards } from "./storage.js";
import { groupBySet } from "./sets.js";

function renderSets(container) {
  const cards = loadCards() || [];
  const groups = groupBySet(cards);
  if (!cards.length) {
    container.innerHTML = `<p class="card">No cards yet. <a href="add-card.html">Add a card</a>.</p>`;
    return;
  }

  container.innerHTML = Object.keys(groups).map(setName => {
    const items = groups[setName].map(c => `<li>${c.name} — ${c.number} (${c.rarity})</li>`).join('\n');
    return `<section class="card"><h2>${setName}</h2><ul>${items}</ul></section>`;
  }).join('\n');
}

document.addEventListener('DOMContentLoaded', () => {
  const shell = document.getElementById('setsShell') || document.getElementById('app');
  renderSets(shell);
});
