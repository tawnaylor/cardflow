import { getCards, deleteCard } from "./storage.mjs";
import { initThemeSwitch, escapeText } from "./ui.mjs";

const themeSwitch = document.querySelector("#themeSwitch");
initThemeSwitch(themeSwitch);

const panel = document.querySelector("#cardPanel");

function qs(name){
  return new URLSearchParams(location.search).get(name);
}

function row(label, value){
  if (!value) return "";
  return `
    <div class="field">
      <label>${escapeText(label)}</label>
      <div>${escapeText(value)}</div>
    </div>
  `;
}

function titleFor(card){
  return card.game === "pokemon" ? (card.pokemon?.name || "Pokémon Card") : (card.mtg?.name || "MTG Card");
}

function renderNotFound(){
  panel.innerHTML = `
    <h1 class="h1">Card not found</h1>
    <p class="hint">This card ID isn’t in your local storage.</p>
    <a class="btn btn-ghost" href="./index.html">Back to Home</a>
  `;
}

function renderCard(card){
  const img = card.imageDataUrl || "./assets/placeholder-card.png";

  const common = `
    ${row("Game", card.game)}
    ${row("Binder", card.binderName)}
    ${row("Set", card.setName)}
    ${row("Set Code", card.setCode)}
    ${row("Rarity", card.rarity)}
    ${row("Added", new Date(card.createdAt).toLocaleString())}
  `;

  let details = "";
  if (card.game === "pokemon"){
    const p = card.pokemon || {};
    details = `
      <h2 class="h2">Pokémon details</h2>
      <div class="grid-2">
        ${row("Name", p.name)}
        ${row("HP", p.hp)}
        ${row("Type", p.type)}
        ${row("Evolution Stage", p.evolutionStage)}
        ${row("Evolves From", p.evolvesFrom)}
        ${row("Ability", p.ability)}
        ${row("Weakness", p.weakness)}
        ${row("Resistance", p.resistance)}
        ${row("Retreat Cost", p.retreatCost)}
        ${row("Card Number", p.cardNumber)}
        ${row("Set Symbol", p.setSymbol)}
        ${row("Rarity Symbol", p.raritySymbol)}
        ${row("Regulation Mark", p.regulationMark)}
        ${row("Illustrator", p.illustrator)}
        <div class="field grid-span-2">
          <label>Attacks</label>
          <div>${escapeText(p.attacks || "")}</div>
        </div>
        <div class="field grid-span-2">
          <label>Pokédex / Flavor Text</label>
          <div>${escapeText(p.flavorText || "")}</div>
        </div>
        <div class="field grid-span-2">
          <label>Back notes</label>
          <div>${escapeText(p.backNotes || "")}</div>
        </div>
      </div>
    `;
  } else {
    const m = card.mtg || {};
    details = `
      <h2 class="h2">MTG details</h2>
      <div class="grid-2">
        ${row("Name", m.name)}
        ${row("Mana Cost", m.manaCost)}
        ${row("Card Type", m.cardType)}
        ${row("Subtype", m.subtype)}
        ${row("Set Symbol", m.setSymbol)}
        ${row("Rarity (printed)", m.rarity)}
        ${row("Power / Toughness", m.powerToughness)}
        ${row("Collector Number", m.collectorNumber)}
        ${row("Set Code (printed)", m.setCode)}
        ${row("Language", m.language)}
        ${row("Expansion Symbol", m.expansionSymbol)}
        ${row("Artist", m.artist)}
        <div class="field grid-span-2">
          <label>Rules Text</label>
          <div>${escapeText(m.rulesText || "")}</div>
        </div>
        <div class="field grid-span-2">
          <label>Flavor Text</label>
          <div>${escapeText(m.flavorText || "")}</div>
        </div>
        <div class="field grid-span-2">
          <label>Back notes</label>
          <div>${escapeText(m.backNotes || "")}</div>
        </div>
      </div>
    `;
  }

  panel.innerHTML = `
    <h1 class="h1">${escapeText(titleFor(card))}</h1>
    <div class="grid-2">
      <div class="preview">
        <img alt="Card image" src="${img}">
      </div>
      <div class="panel soft">
        <h2 class="h2">Card info</h2>
        <div class="grid-2">${common}</div>
        <div style="margin-top:12px; display:flex; gap:8px;">
          <button class="btn btn-danger" id="deleteCardBtn" type="button">Delete Card</button>
          <a class="btn btn-ghost" href="./index.html">Back to Home</a>
        </div>
      </div>
    </div>

    <hr class="sep" />
    ${details}
  `;
}

const id = qs("id");
if (!id) renderNotFound();
else {
  const card = getCards().find(c => c.id === id);
  if (!card) renderNotFound();
  else renderCard(card);
}

// Attach delete handler after initial render (delegated via event listener)
document.addEventListener('click', (e) => {
  const btn = e.target.closest && e.target.closest('#deleteCardBtn');
  if (!btn) return;
  const id = qs('id');
  if (!id) return;
  if (!confirm('Delete this card? This cannot be undone.')) return;
  const ok = deleteCard(id);
  if (ok) {
    alert('Card deleted. Returning to Home.');
    window.location.href = './index.html';
  } else {
    alert('Could not delete card. It may have already been removed.');
  }
});
