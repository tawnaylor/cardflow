import { getCards, deleteCard } from "./storage.mjs";

function qs(name){
  return new URLSearchParams(location.search).get(name);
}

function renderCard(card){
  if (!card) return `<div class="panel"><p class="hint">Card not found.</p></div>`;
  const img = card.imageDataUrl || './assets/placeholder-card.png';
  const title = card.game === 'pokemon' ? (card.pokemon?.name || '') : (card.mtg?.name || '');
  return `
    <div class="panel">
      <div style="display:flex;gap:18px;flex-wrap:wrap;align-items:flex-start">
        <div style="min-width:240px;flex:0 0 240px">
          <div class="preview"><img alt="${title}" src="${img}" style="width:100%;border-radius:12px" /></div>
        </div>
        <div style="flex:1;min-width:220px">
          <h1 class="h1">${title}</h1>
          <p class="small">Binder: ${card.binderName || ''}</p>
          <p class="hint">Set: ${card.setName || card.setCode || ''} — Rarity: ${card.rarity || ''}</p>
          <div style="margin-top:12px">
            <pre style="white-space:pre-wrap">${JSON.stringify(card, null, 2)}</pre>
          </div>
          <div style="margin-top:12px;display:flex;gap:8px">
            <a class="btn btn-ghost" href="./index.html">Back</a>
            <button id="deleteBtn" class="btn btn-small">Delete</button>
          </div>
        </div>
      </div>
    </div>
  `;
}

function init(){
  const id = qs('id');
  const cards = getCards();
  const card = cards.find(c => c.id === id);
  const panel = document.querySelector('#cardPanel');
  panel.innerHTML = renderCard(card);

  const del = document.querySelector('#deleteBtn');
  if (del){
    del.addEventListener('click', () => {
      if (!confirm('Delete this card?')) return;
      deleteCard(id);
      window.location.href = './index.html';
    });
  }
}

init();
import { getCards } from "./storage.mjs";
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
