// details.js — page logic for details.html (stub)
import { fetchCards } from './api.js';

document.addEventListener('DOMContentLoaded', async () => {
  const app = document.getElementById('app');
  if (!app) return;
  const params = new URLSearchParams(location.search);
  const setAbb = params.get('set');
  try{
    const data = await fetchCards();
    const found = (data.expansions||[]).find(e=>e.set_abb===setAbb);
    if (!found) app.textContent = 'Set not found';
    else app.innerHTML = `<h2>${found.name}</h2><p class="muted">${found.series} — ${found.release_date}</p>`;
  }catch(err){
    app.textContent = 'Failed to load details';
  }
});
