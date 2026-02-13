// REQUIREMENT: Modules for organization (main is just orchestration)

import { getSets } from "./api.js";
import { loadCards, saveCards } from "./store.js";
import { uid, money } from "./utils.js";
import { validate } from "./form.js";
import { cardHTML, totals } from "./render.js";

let setsData = null;
let cards = [];

const $ = (id) => document.getElementById(id);

function toast(msg) {
  const t = $("toast");
  t.textContent = msg;
  t.classList.remove("hidden");
  clearTimeout(toast._t);
  toast._t = setTimeout(() => t.classList.add("hidden"), 2200);
}

function setErr(field, msg="") {
  const el = $(`err-${field}`);
  if (el) el.textContent = msg;
}

function clearErrs() {
  ["game","name","set","qty","value","img"].forEach(f => setErr(f, ""));
}

function gameMeta(gameId) {
  return setsData.games.find(g => g.id === gameId);
}
function setMeta(gameId, setId) {
  const g = gameMeta(gameId);
  return g?.sets?.find(s => s.id === setId);
}

function fillGameDropdowns() {
  const gameFilter = $("gameFilter");
  const game = $("game");

  // Filter dropdown
  gameFilter.innerHTML = `<option value="">All</option>` +
    setsData.games.map(g => `<option value="${g.id}">${g.name}</option>`).join("");

  // Form dropdown
  game.innerHTML = `<option value="">Select…</option>` +
    setsData.games.map(g => `<option value="${g.id}">${g.name}</option>`).join("");
}

function fillSetDropdown(selectEl, gameId, includeAll=false) {
  const g = setsData.games.find(x => x.id === gameId);
  if (!g) {
    selectEl.innerHTML = includeAll ? `<option value="">All</option>` : `<option value="">Select game first…</option>`;
    selectEl.disabled = true;
    return;
  }
  selectEl.disabled = false;
  selectEl.innerHTML =
    (includeAll ? `<option value="">All</option>` : `<option value="">Select…</option>`) +
    g.sets.map(s => `<option value="${s.id}">${s.name}</option>`).join("");
}

function openModal(mode, card=null) {
  $("modalTitle").textContent = mode === "edit" ? "Edit Card" : "Add Card";
  $("deleteBtn").classList.toggle("hidden", mode !== "edit");

  clearErrs();

  $("id").value = card?.id ?? "";
  $("game").value = card?.game ?? "";
  fillSetDropdown($("set"), $("game").value, false);
  $("set").value = card?.set ?? "";
  $("name").value = card?.name ?? "";
  $("number").value = card?.number ?? "";
  $("qty").value = card?.qty ?? 1;
  $("value").value = card?.value ?? "";
  $("img").value = card?.img ?? "";

  $("backdrop").classList.remove("hidden");
  $("backdrop").setAttribute("aria-hidden", "false");
  $("modal").showModal();
  setTimeout(() => $("game").focus(), 0);
}

function closeModal() {
  $("modal").close();
  $("backdrop").classList.add("hidden");
  $("backdrop").setAttribute("aria-hidden", "true");
}

function currentFilters() {
  return {
    search: $("search").value.trim().toLowerCase(),
    game: $("gameFilter").value,
    set: $("setFilter").value,
    sort: $("sort").value
  };
}

function filteredCards() {
  const f = currentFilters();
  let list = [...cards];

  if (f.search) list = list.filter(c => c.name.toLowerCase().includes(f.search));
  if (f.game) list = list.filter(c => c.game === f.game);
  if (f.set) list = list.filter(c => c.set === f.set);

  if (f.sort === "recent") list.sort((a,b) => (b.updatedAt || 0) - (a.updatedAt || 0));
  if (f.sort === "name") list.sort((a,b) => a.name.localeCompare(b.name));
  if (f.sort === "value") {
    list.sort((a,b) =>
      ((Number(b.value)||0)*(Number(b.qty)||0)) - ((Number(a.value)||0)*(Number(a.qty)||0))
    );
  }

  return list;
}

function render() {
  const grid = $("grid");
  const empty = $("empty");

  const { count, total } = totals(cards);
  $("count").textContent = String(count);
  $("total").textContent = money(total);

  if (cards.length === 0) {
    empty.classList.remove("hidden");
    grid.innerHTML = "";
    return;
  }
  empty.classList.add("hidden");

  const list = filteredCards();
  grid.innerHTML = list.map(cardHTML).join("");

  grid.querySelectorAll('button[data-action="edit"]').forEach(btn => {
    btn.addEventListener("click", (e) => {
      const id = e.currentTarget.closest(".card")?.dataset?.id;
      const card = cards.find(c => c.id === id);
      if (card) openModal("edit", card);
    });
  });
}

function upsert(card) {
  const i = cards.findIndex(c => c.id === card.id);
  if (i >= 0) cards[i] = card;
  else cards.push(card);
  saveCards(cards);
}

function remove(id) {
  cards = cards.filter(c => c.id !== id);
  saveCards(cards);
}

function readFormValues() {
  return {
    id: $("id").value || uid(),
    game: $("game").value,
    set: $("set").value,
    name: $("name").value.trim(),
    number: $("number").value.trim(),
    qty: $("qty").value,
    value: $("value").value.trim(),
    img: $("img").value.trim()
  };
}

function attachEvents() {
  $("openAdd").addEventListener("click", () => openModal("add"));
  $("openAdd2").addEventListener("click", () => openModal("add"));

  $("closeModal").addEventListener("click", closeModal);
  $("cancel").addEventListener("click", closeModal);
  $("backdrop").addEventListener("click", closeModal);

  // When game changes in form, update set dropdown
  $("game").addEventListener("change", () => {
    fillSetDropdown($("set"), $("game").value, false);
  });

  // Filters
  $("gameFilter").addEventListener("change", () => {
    fillSetDropdown($("setFilter"), $("gameFilter").value, true);
    $("setFilter").value = "";
    render();
  });

  ["search","setFilter","sort"].forEach(id => {
    $(id).addEventListener("input", render);
    $(id).addEventListener("change", render);
  });

  // Save form with validation
  $("cardForm").addEventListener("submit", (e) => {
    e.preventDefault();
    clearErrs();

    const raw = readFormValues();
    const result = validate(raw);

    if (!result.ok) {
      for (const [k, msg] of Object.entries(result.errors)) setErr(k, msg);
      const first = Object.keys(result.errors)[0];
      $(first)?.focus?.();
      return;
    }

    // Build final normalized card object
    const g = gameMeta(raw.game);
    const s = setMeta(raw.game, raw.set);

    const normalized = {
      id: raw.id,
      game: raw.game,
      gameName: g?.name ?? raw.game,
      set: raw.set,
      setName: s?.name ?? raw.set,
      name: raw.name,
      number: raw.number,
      qty: Number(raw.qty),
      value: raw.value === "" ? 0 : Number(raw.value),
      img: raw.img,
      updatedAt: Date.now()
    };

    upsert(normalized);
    closeModal();
    toast("Saved!");
    render();
  });

  // Delete in edit mode
  $("deleteBtn").addEventListener("click", () => {
    const id = $("id").value;
    if (!id) return;
    if (!confirm("Delete this card?")) return;
    remove(id);
    closeModal();
    toast("Deleted.");
    render();
  });

  // Ensure backdrop hides when dialog closes (ESC)
  $("modal").addEventListener("close", () => {
    $("backdrop").classList.add("hidden");
    $("backdrop").setAttribute("aria-hidden", "true");
  });
}

async function init() {
  // REQUIREMENT: Fetching data from JSON
  setsData = await getSets();

  // REQUIREMENT: localStorage persistence
  cards = loadCards();

  fillGameDropdowns();
  attachEvents();
  render();
}

init().catch(err => {
  console.error(err);
  alert("App failed to start. Open the console for details.");
});
