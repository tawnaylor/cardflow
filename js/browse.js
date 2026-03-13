// browse.js — page logic for browse.html
import { getExpansions, getCards } from './api.js';
import { renderExpansionsList, renderMessage, renderCardGrid } from './render.js';

document.addEventListener('DOMContentLoaded', async () => {
  const app = document.getElementById('app');
  if (!app) return;
  try{
    const expansions = await getExpansions();
    renderExpansionsList(app, expansions.slice(0, 30));
    // also show user/sample cards if available
    try{
      const cards = await getCards();
      if (cards && cards.length){
        const heading = document.createElement('h2');
        heading.className = 'page-title';
        heading.textContent = 'Sample Cards';
        app.appendChild(heading);
        renderCardGrid(app, cards);
      }
    }catch(cardErr){
      console.warn('cards load failed', cardErr);
    }
  }catch(e){
    renderMessage(app, 'Unable to load expansions: ' + e.message, 'error');
  }
});
