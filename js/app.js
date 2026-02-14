import { ensureDemoData, resetToDemo, loadCards } from "./storage.js";
import {
  buildFloaters,
  filterCards,
  sortCards,
  renderGrid9,
  openInspectModal,
  flipBinderAnimation,
  money,
  computeStats
} from "./ui.js";

const state = {
  cards: [],
  filter: "all",
  sort: "newest"
};

document.addEventListener("DOMContentLoaded", init);

function init() {
  const grid9 = document.getElementById("grid9");
  const filterSelect = document.getElementById("filterSelect");
  const sortSelect = document.getElementById("sortSelect");
  const resetDemoBtn = document.getElementById("resetDemoBtn");

  const modal = document.getElementById("inspectModal");
  const openBinderBtns = Array.from(document.querySelectorAll("#openBinderBtn, #openBinderBtn2"));
  const scanBtn = document.getElementById("scanBtn");

  const mockMarketBtn = document.getElementById("mockMarketBtn");
  const exportBtn = document.getElementById("exportBtn");
  const marketNote = document.getElementById("marketNote");

  const statCards = document.getElementById("statCards");
  const statValue = document.getElementById("statValue");
  const statNewest = document.getElementById("statNewest");

  // Year
  const yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());

  // Decorative floaters (if present)
  const floaters = document.getElementById("floaters");
  if (floaters) buildFloaters(floaters);

  // Load cards (demo if empty)
  state.cards = ensureDemoData();

  // Controls
  filterSelect?.addEventListener("change", () => {
    state.filter = filterSelect.value;
    refresh();
  });

  sortSelect?.addEventListener("change", () => {
    state.sort = sortSelect.value;
    refresh();
  });

  resetDemoBtn?.addEventListener("click", () => {
    state.cards = resetToDemo();
    refresh();
    if (marketNote) toast(marketNote, "Demo reset. Fresh Pulls updated.");
  });

  // Hero / Nav actions
  openBinderBtns.forEach((btn) => {
    btn?.addEventListener("click", () => {
      flipBinderAnimation();
      document.querySelector("#fresh-pulls")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });

  scanBtn?.addEventListener("click", () => {
    if (marketNote) toast(marketNote, "Scan not wired yet — connect this to add-card.html?mode=scan");
  });

  mockMarketBtn?.addEventListener("click", () => {
    const cards = loadCards() || [];
    const top = [...cards].sort((a, b) => (Number(b.value) || 0) - (Number(a.value) || 0)).slice(0, 3);
    if (!top.length) return marketNote && toast(marketNote, "No cards yet. Add some to see your top cards.");
    const msg = top.map((c, i) => `${i + 1}. ${c.name} — ${money(c.value)}`).join(" • ");
    if (marketNote) toast(marketNote, `Top cards: ${msg}`);
  });

  exportBtn?.addEventListener("click", () => {
    const blob = new Blob([JSON.stringify(state.cards, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "cardflow-export.json";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    if (marketNote) toast(marketNote, "Exported JSON snapshot. (Next: real .xlsx export.)");
  });

  refresh();

  function refresh() {
    if (!grid9) return;

    // Stats
    const s = computeStats(state.cards);
    if (statCards) statCards.textContent = String(s.count);
    if (statValue) statValue.textContent = money(s.totalValue);
    if (statNewest) statNewest.textContent = s.newestName;

    // Grid
    const filtered = filterCards(state.cards, state.filter);
    const sorted = sortCards(filtered, state.sort);
    renderGrid9(grid9, sorted, (card) => openInspectModal(modal, card));
  }

  function toast(el, text) {
    el.textContent = text;
    try {
      el.animate([{ opacity: 0, transform: "translateY(2px)" }, { opacity: 1, transform: "translateY(0)" }], { duration: 180, easing: "ease-out" });
    } catch (e) {
      // animation optional
    }
  }
}
