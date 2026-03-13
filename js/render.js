// render.js — small helpers to render lists/details
export function renderExpansionsList(container, expansions){
  container.innerHTML = '';
  expansions.forEach(exp => {
    const el = document.createElement('article');
    el.className = 'panel';
    el.innerHTML = `<h3>${exp.name}</h3><p class="muted">${exp.series} • ${exp.release_date || ''}</p>`;
    container.appendChild(el);
  });
}

export function renderMessage(container, msg, type='info'){
  const el = document.createElement('div');
  el.className = `form-status ${type}`;
  el.textContent = msg;
  container.appendChild(el);
}

export function renderCardGrid(container, cards){
  const grid = document.createElement('div');
  grid.className = 'cards-row';
  cards.forEach(c => {
    const card = document.createElement('article');
    card.className = 'card';
    card.innerHTML = `
      <div class="thumb"><img src="${c.image}" alt="${c.name}"></div>
      <div class="card-title">${c.name}</div>
      <div class="card-details"><span class="muted">${c.set} • ${c.number || ''}</span><span class="qty-pill">${c.rarity}</span></div>
    `;
    grid.appendChild(card);
  });
  container.appendChild(grid);
}
