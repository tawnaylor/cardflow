// browse.js — page logic for browse.html
import { getExpansions } from './api.js';
import { renderExpansionsList, renderMessage } from './render.js';

document.addEventListener('DOMContentLoaded', async () => {
  const app = document.getElementById('app');
  if (!app) return;
  try{
    const expansions = await getExpansions();
    renderExpansionsList(app, expansions.slice(0, 30));
  }catch(e){
    renderMessage(app, 'Unable to load expansions: ' + e.message, 'error');
  }
});
