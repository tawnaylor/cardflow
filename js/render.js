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
