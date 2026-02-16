import { getCards, clearAll } from "./storage.js";

const binderList = document.getElementById("binderList");
const clearBtn = document.getElementById("clearAll");

function render() {
  const cards = getCards();

  if (!cards.length) {
    binderList.innerHTML = `<p class="muted">No cards yet. Add some cards first.</p>`;
    return;
  }

  // Group by series -> expansion -> stats
  const seriesMap = new Map();
  for (const c of cards) {
    const s = c.series || 'Unknown Series';
    const e = c.expansion || 'Unknown Expansion';
    if (!seriesMap.has(s)) seriesMap.set(s, { series: s, totalQty: 0, expansions: new Map() });
    const sItem = seriesMap.get(s);
    sItem.totalQty += Number(c.qty || 1);

    const key = e;
    if (!sItem.expansions.has(key)) sItem.expansions.set(key, { expansion: e, count: 0, qtyTotal: 0 });
    const ex = sItem.expansions.get(key);
    ex.count += 1;
    ex.qtyTotal += Number(c.qty || 1);
  }

  binderList.innerHTML = "";

  // Render each series as its own binder panel
  for (const [series, sItem] of Array.from(seriesMap.entries()).sort((a,b) => a[0].localeCompare(b[0]))) {
    const panel = document.createElement('section');
    panel.className = 'panel';
    panel.style.marginBottom = '18px';

    const head = document.createElement('div');
    head.className = 'panel-head';
    head.innerHTML = `<strong>${escapeHtml(series)}</strong><div class="muted">${sItem.totalQty} total</div>`;
    panel.appendChild(head);

    const list = document.createElement('div');
    list.className = 'binder-list';
    // expansions
    for (const ex of Array.from(sItem.expansions.values()).sort((a,b)=>a.expansion.localeCompare(b.expansion))) {
      const row = document.createElement('div');
      row.className = 'binder-item';
      row.innerHTML = `
        <div>
          <strong>${escapeHtml(ex.expansion)}</strong><br/>
          <small>${ex.count} unique • ${ex.qtyTotal} total</small>
        </div>
        <a class="btn" href="./index.html?series=${encodeURIComponent(series)}">View</a>
      `;
      list.appendChild(row);
    }

    panel.appendChild(list);
    binderList.appendChild(panel);
  }
}

function escapeHtml(str) {
  return String(str ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

clearBtn.addEventListener("click", () => {
  if (!confirm("Clear all saved cards from this browser?")) return;
  clearAll();
  render();
});

render();
