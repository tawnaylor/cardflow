import { loadCards, saveCards, deleteCardById } from "./storage.js";
import { normalize } from "./utils.js";
import { fetchBrandSeries } from "./data.js";
import { renderGrid, renderEmpty, renderDetails, togglePanel, setSelectOptions } from "./ui.js";
import { renderMarket } from "./market.js";
import { getBrandOptions, getSeriesForBrand, getBrandName } from "./data.js";

const els = {
  grid: document.getElementById("binderGrid"),
  empty: document.getElementById("emptyState"),
  search: document.getElementById("searchInput"),

  detailsImage: document.getElementById("detailsImage"),
  detailsFields: document.getElementById("detailsFields"),
  openDetailsLink: document.getElementById("openDetailsLink"),
  deleteSelectedBtn: document.getElementById("deleteSelectedBtn"),

  // panels
  navMenu: document.getElementById("navMenu"),
  navMarket: document.getElementById("navMarket"),
  panelMenu: document.getElementById("panelMenu"),
  panelMarket: document.getElementById("panelMarket"),
  closeMenu: document.getElementById("closeMenu"),
  closeMarket: document.getElementById("closeMarket"),

  // filters inside menu panel
  brandFilter: document.getElementById("brandFilter"),
  seriesFilter: document.getElementById("seriesFilter"),
  clearFiltersBtn: document.getElementById("clearFiltersBtn"),

  // market panel fields
  mvCount: document.getElementById("mvCount"),
  mvTotal: document.getElementById("mvTotal"),
  mvList: document.getElementById("mvList")
};

let brandData = null;
let cards = [];
let selectedId = null;

init().catch(console.error);

async function init() {
  brandData = await fetchBrandSeries();
  cards = loadCards().map((c) => ({ ...c, brandLabel: c.brandLabel ?? getBrandName(brandData, c.brand) }));

  // Fill filters
  setSelectOptions(els.brandFilter, getBrandOptions(brandData), "All Brands");
  setSelectOptions(els.seriesFilter, [], "All Series");

  // Restore selection from URL param if present (nice UX)
  const url = new URL(window.location.href);
  const maybeSelected = url.searchParams.get("selected");
  if (maybeSelected && cards.some((c) => c.id === maybeSelected)) selectedId = maybeSelected;

  wireEvents();
  refresh();
}

function wireEvents() {
  // Search
  els.search.addEventListener("input", () => refresh());

  // Slide panels
  els.navMenu.addEventListener("click", () => openMenu());
  els.closeMenu.addEventListener("click", () => closeMenu());
  els.navMarket.addEventListener("click", () => openMarket());
  els.closeMarket.addEventListener("click", () => closeMarket());

  // Filter dropdowns
  els.brandFilter.addEventListener("change", () => {
    const brand = els.brandFilter.value;
    setSelectOptions(els.seriesFilter, getSeriesForBrand(brandData, brand), "All Series");
    els.seriesFilter.value = "";
    refresh();
  });
  els.seriesFilter.addEventListener("change", () => refresh());
  els.clearFiltersBtn.addEventListener("click", () => {
    els.brandFilter.value = "";
    setSelectOptions(els.seriesFilter, [], "All Series");
    els.seriesFilter.value = "";
    refresh();
  });

  // Click card tile -> populate right panel + update URL param
  els.grid.addEventListener("click", (e) => {
    const btn = e.target.closest("button.card");
    if (!btn) return;

    selectedId = btn.dataset.id;
    const url = new URL(window.location.href);
    url.searchParams.set("selected", selectedId);
    history.replaceState({}, "", url.toString());

    refreshDetails();
    refreshGrid(); // highlight selected tile
  });

  // Delete selected
  els.deleteSelectedBtn.addEventListener("click", () => {
    if (!selectedId) return;
    cards = deleteCardById(selectedId);
    saveCards(cards);
    selectedId = null;

    const url = new URL(window.location.href);
    url.searchParams.delete("selected");
    history.replaceState({}, "", url.toString());

    refresh();
  });

  // Close panels on Escape
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      closeMenu();
      closeMarket();
    }
  });
}

function openMenu() {
  togglePanel(els.panelMenu, true);
  els.navMenu.setAttribute("aria-expanded", "true");
  // focus first control
  els.brandFilter.focus();
}
function closeMenu() {
  togglePanel(els.panelMenu, false);
  els.navMenu.setAttribute("aria-expanded", "false");
}

function openMarket() {
  togglePanel(els.panelMarket, true);
  els.navMarket.setAttribute("aria-expanded", "true");
  renderMarket({ countEl: els.mvCount, totalEl: els.mvTotal, listEl: els.mvList, cards: getFilteredCards() });
}
function closeMarket() {
  togglePanel(els.panelMarket, false);
  els.navMarket.setAttribute("aria-expanded", "false");
}

function refresh() {
  refreshGrid();
  refreshDetails();

  renderEmpty(els.empty, cards.length === 0);

  // keep market panel live if open
  if (!els.panelMarket.hidden) {
    renderMarket({ countEl: els.mvCount, totalEl: els.mvTotal, listEl: els.mvList, cards: getFilteredCards() });
  }
}

function refreshGrid() {
  const list = getFilteredCards();
  renderGrid(els.grid, list, selectedId);
}

function refreshDetails() {
  const card = cards.find((c) => c.id === selectedId) ?? null;
  renderDetails({
    imageEl: els.detailsImage,
    fieldsEl: els.detailsFields,
    linkEl: els.openDetailsLink,
    deleteBtn: els.deleteSelectedBtn,
    card,
    brandData
  });
}

function getFilteredCards() {
  const q = normalize(els.search.value);
  const brand = els.brandFilter.value;
  const series = els.seriesFilter.value;

  return cards.filter((c) => {
    if (q && !normalize(c.name).includes(q)) return false;
    if (brand && c.brand !== brand) return false;
    if (series && c.series !== series) return false;
    return true;
  });
}
