import { qs, toast, getQuery, formatGame } from "./modules/app.js";
import { getCards, setCards } from "./modules/storage.js";

const content = qs("#content");
const id = getQuery().get("id");

function escapeHtml(s){
  return String(s).replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;");
}

function renderCard(card){
  const image = card.imageDataUrl
    ? `<img src="${card.imageDataUrl}" alt="Card image for ${escapeHtml(card.fields?.name||"card")}" style="width:220px; max-width:100%; border-radius:16px; border:1px solid rgba(255,255,255,.16)">`
    : `<div class="empty"><p class="muted">No image uploaded.</p></div>`;

  const rows = Object.entries(card.fields || {})
    .filter(([k,v]) => String(v||"").trim().length)
    .map(([k,v]) => `<tr><th style="text-align:left; padding:8px 10px; border-top:1px solid rgba(255,255,255,.10)">${prettyKey(k)}</th><td style="padding:8px 10px; border-top:1px solid rgba(255,255,255,.10)">${escapeHtml(v)}</td></tr>`)
    .join("");

  content.innerHTML = `
    <div class="row space-between">
      <div>
        <h1 class="h2" style="margin-bottom:4px">${escapeHtml(card.fields?.name || "Card")}</h1>
        <div class="muted">${formatGame(card.game)} • ${escapeHtml(card.series)} • ${escapeHtml(card.expansion)}</div>
        <div class="muted small">ID: ${escapeHtml(card.id)}</div>
      </div>
      <button class="btn danger" id="deleteCard" type="button">Delete</button>
    </div>

    <div class="sep"></div>

    <div class="two-col" style="margin-top:0">
      <div>${image}</div>
      <div>
        <h2 class="h3">Details</h2>
        <table style="width:100%; border-collapse:collapse">
          <tbody>
            ${rows || `<tr><td class="muted">No extra details.</td></tr>`}
          </tbody>
        </table>
      </div>
    </div>
  `;

  qs("#deleteCard").addEventListener("click", ()=>{
    const ok = confirm("Delete this card?");
    if(!ok) return;
    const cards = getCards().filter(c => c.id !== card.id);
    setCards(cards);
    toast("Card deleted.");
    location.href = "binder.html";
  });
}

function prettyKey(k){
  return k.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/^./, c => c.toUpperCase());
}

(function init(){
  if(!id){
    content.innerHTML = `<h1 class="h2">Missing card id</h1><p class="muted">Open a card from the binder view.</p>`;
    return;
  }
  const card = getCards().find(c => c.id === id);
  if(!card){
    content.innerHTML = `<h1 class="h2">Card not found</h1><p class="muted">It may have been deleted, or the URL is incorrect.</p>`;
    return;
  }
  renderCard(card);
})();
