import { listCards, getOrderFor, saveOrderFor } from "./storage.mjs";

const PAGE_SIZE = 12;

function getParams() {
  const p = new URLSearchParams(location.search);
  return {
    series: p.get("series") || "",
    expansion: p.get("expansion") || "",
    page: Math.max(1, parseInt(p.get("page") || "1", 10))
  };
}

function setParams(params) {
  const p = new URLSearchParams();
  if (params.series) p.set("series", params.series);
  if (params.expansion) p.set("expansion", params.expansion);
  p.set("page", String(params.page));
  history.replaceState({}, "", `${location.pathname}?${p.toString()}`);
}

function unique(arr) {
  return [...new Set(arr)];
}

/**
 * Smart-ish card number parsing for sorting:
 * - "4/102" => [4, 102]
 * - "005"   => [5, Infinity]
 * - "TG12/TG30" => [12, 30]
 * - "SVP 005" => [5, Infinity]
 * - "SWSH123" => [123, Infinity]
 */
function parseNumberParts(numStr) {
  const s = (numStr || "").trim();
  if (!s) return [Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY];

  // grab last numeric chunk as main, and (optional) total after slash
  // examples: "SVP 005" -> 005
  // "TG12/TG30" -> 12 and 30
  const slashMatch = s.match(/(\d+)\s*\/\s*(\d+)/);
  if (slashMatch) return [parseInt(slashMatch[1], 10), parseInt(slashMatch[2], 10)];

  const lastNum = s.match(/(\d+)(?!.*\d)/); // last number in string
  if (lastNum) return [parseInt(lastNum[1], 10), Number.POSITIVE_INFINITY];

  return [Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY];
}

function defaultSort(a, b) {
  const [aMain, aTot] = parseNumberParts(a.number);
  const [bMain, bTot] = parseNumberParts(b.number);

  if (aMain !== bMain) return aMain - bMain;
  if (aTot !== bTot) return aTot - bTot;

  // tie-breakers
  return (a.name || "").localeCompare(b.name || "");
}

function applyOrder(series, expansion, cards) {
  const saved = getOrderFor(series, expansion);
  const byId = new Map(cards.map(c => [c.id, c]));

  const ordered = [];
  for (const id of saved) {
    const c = byId.get(id);
    if (c) ordered.push(c);
  }

  const remaining = cards
    .filter(c => !saved.includes(c.id))
    .sort(defaultSort);

  return [...ordered, ...remaining];
}

export function initBinderPage() {
  const els = {
    grid: document.getElementById("binderGrid"),
    filterSeries: document.getElementById("filterSeries"),
    filterExpansion: document.getElementById("filterExpansion"),
    prev: document.getElementById("prevPage"),
    next: document.getElementById("nextPage"),
    pageInfo: document.getElementById("pageInfo")
  };

  const allCards = listCards();
  const params = getParams();

  const seriesList = unique(allCards.map(c => c.series)).filter(Boolean).sort((a,b)=>a.localeCompare(b));
  els.filterSeries.innerHTML = `<option value="">All Series</option>` + seriesList.map(s => `<option value="${s}">${s}</option>`).join("");
  els.filterSeries.value = params.series;

  function getExpansionsForSeries(series) {
    const list = allCards
      .filter(c => !series || c.series === series)
      .map(c => c.expansion)
      .filter(Boolean);
    return unique(list).sort((a,b)=>a.localeCompare(b));
  }

  function rebuildExpansionDropdown() {
    const exps = getExpansionsForSeries(params.series);
    els.filterExpansion.innerHTML = `<option value="">All Expansions</option>` + exps.map(e => `<option value="${e}">${e}</option>`).join("");
    // if current expansion no longer valid, clear it
    if (params.expansion && !exps.includes(params.expansion)) params.expansion = "";
    els.filterExpansion.value = params.expansion;
  }

  rebuildExpansionDropdown();

  function filteredCards() {
    return allCards.filter(c => {
      return (!params.series || c.series === params.series) &&
             (!params.expansion || c.expansion === params.expansion);
    });
  }

  function currentViewCardsOrdered() {
    const cards = filteredCards();
    return applyOrder(params.series, params.expansion, cards);
  }

  // --- Drag & Drop helpers (reorder within the current page) ---
  let dragFromIndexGlobal = null;

  function saveCurrentOrder(orderedCards) {
    // Store the full ordered list of IDs for this (series, expansion) view
    saveOrderFor(params.series, params.expansion, orderedCards.map(c => c.id));
  }

  function render() {
    const orderedCards = currentViewCardsOrdered();

    const totalPages = Math.max(1, Math.ceil(orderedCards.length / PAGE_SIZE));
    params.page = Math.min(params.page, totalPages);
    setParams(params);

    const start = (params.page - 1) * PAGE_SIZE;
    const pageCards = orderedCards.slice(start, start + PAGE_SIZE);

    els.grid.innerHTML = "";

    // Build 12 pockets always
    for (let i = 0; i < PAGE_SIZE; i++) {
      const card = pageCards[i];

      const pocket = document.createElement("div");
      pocket.className = "binder-pocket";
      pocket.dataset.pageIndex = String(i);
      pocket.dataset.globalIndex = String(start + i);

      if (card) {
        pocket.innerHTML = `
          <a href="card.html?id=${encodeURIComponent(card.id)}" draggable="false">
            <img src="${card.imageDataUrl || card.imageUrl || "assets/placeholder-card.png"}" alt="${card.name || "Card"}" draggable="false" />
          </a>
          <div class="drag-hint">Drag</div>
          <div class="pocket-qty">x${card.qty || 1}</div>
        `;

        // Make pocket draggable (the pocket, not the image)
        pocket.draggable = true;

        pocket.addEventListener("dragstart", (e) => {
          dragFromIndexGlobal = parseInt(pocket.dataset.globalIndex, 10);
          e.dataTransfer.effectAllowed = "move";
        });

        pocket.addEventListener("dragend", () => {
          dragFromIndexGlobal = null;
          pocket.classList.remove("drag-over");
        });

        pocket.addEventListener("dragover", (e) => {
          e.preventDefault();
          pocket.classList.add("drag-over");
          e.dataTransfer.dropEffect = "move";
        });

        pocket.addEventListener("dragleave", () => {
          pocket.classList.remove("drag-over");
        });

        pocket.addEventListener("drop", (e) => {
          e.preventDefault();
          pocket.classList.remove("drag-over");

          const dropToIndexGlobal = parseInt(pocket.dataset.globalIndex, 10);
          if (dragFromIndexGlobal == null) return;
          if (dropToIndexGlobal === dragFromIndexGlobal) return;

          // Reorder within the full ordered list
          const fresh = currentViewCardsOrdered(); // latest ordered list
          const moving = fresh.splice(dragFromIndexGlobal, 1)[0];

          // If item removed before target index, target shifts left by 1
          const adjustedTarget = dropToIndexGlobal > dragFromIndexGlobal ? dropToIndexGlobal - 1 : dropToIndexGlobal;
          fresh.splice(adjustedTarget, 0, moving);

          saveCurrentOrder(fresh);
          render();
        });
      }

      els.grid.appendChild(pocket);
    }

    els.pageInfo.textContent = `Page ${params.page} of ${totalPages}`;
    els.prev.disabled = params.page <= 1;
    els.next.disabled = params.page >= totalPages;
  }

  els.filterSeries.addEventListener("change", () => {
    params.series = els.filterSeries.value;
    params.page = 1;
    // clear expansion when series changes, then rebuild expansions from that series
    params.expansion = "";
    rebuildExpansionDropdown();
    render();
  });

  els.filterExpansion.addEventListener("change", () => {
    params.expansion = els.filterExpansion.value;
    params.page = 1;
    render();
  });

  els.prev.addEventListener("click", () => {
    params.page = Math.max(1, params.page - 1);
    render();
  });

  els.next.addEventListener("click", () => {
    params.page = params.page + 1;
    render();
  });

  render();
}
