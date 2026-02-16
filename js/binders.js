import { getCards, toGroupedBinders, clearAll } from "./storage.js";

const binderList = document.getElementById("binderList");
const clearBtn = document.getElementById("clearAll");

function render() {
  const cards = getCards();
  const groups = toGroupedBinders(cards);

  if (!cards.length) {
    binderList.innerHTML = `<p class="muted">No cards yet. Add some cards first.</p>`;
    return;
  }

  binderList.innerHTML = "";
  for (const g of groups) {
    const row = document.createElement("div");
    row.className = "binder-item";
    row.innerHTML = `
      <div>
        <strong>${escapeHtml(g.series)}</strong><br/>
        <small>${escapeHtml(g.expansion)} • ${g.count} unique • ${g.qtyTotal} total</small>
      </div>
      <a class="btn" href="./index.html">View</a>
    `;
    binderList.appendChild(row);
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
