import { getSets } from "./api.js";
import { loadCards, saveCards, loadPageIndex, savePageIndex } from "./store.js";
import { uid, money } from "./utils.js";
import { validate } from "./form.js";
import { totals, pocketsHTML } from "./render.js";
import { pageCount, clampPageIndex, slicePage } from "./binder.js";

let setsData = null;
let cards = [];
let pageIndex = 0; // 0-based

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
  $("gameFilter").innerHTML = `<option value="">All</option>` +
    setsData.games.map(g => `<option value="${g.id}">${g.name}</option>`).join("");

  $("game").innerHTML = `<option value="">Select…</option>` +
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

function updatePagerUI(totalPages) {
  $("pageNum").textContent = String(pageIndex + 1);
  $("pageTotal").textContent = String(totalPages);

  $("prevPage").disabled = pageIndex <= 0;
  $("nextPage").disabled = pageIndex >= totalPages - 1;
}

function flip(direction) {
  // direction: "next" | "prev"
  const pageEl = $("page");
  pageEl.dataset.flip = direction;
  window.setTimeout(() => { pageEl.dataset.flip = "none"; }, 430);
}

function render(direction = null) {
  const empty = $("empty");
  const pockets = $("pockets");

  const { count, total } = totals(cards);
  $("count").textContent = String(count);
  $("total").textContent = money(total);

  if (cards.length === 0) {
    empty.classList.remove("hidden");
    pockets.innerHTML = "";
    $("pageNum").textContent = "1";
    $("pageTotal").textContent = "1";
    $("prevPage").disabled = true;
    $("nextPage").disabled = true;
    return;
  }
  empty.classList.add("hidden");

  const list = filteredCards();
  const totalPages = pageCount(list);

  pageIndex = clampPageIndex(pageIndex, totalPages);
  savePageIndex(pageIndex);

  const onPage = slicePage(list, pageIndex);
  pockets.innerHTML = pocketsHTML(onPage);

  updatePagerUI(totalPages);

  if (direction) flip(direction);

  // Wire edit buttons only for filled pockets
  pockets.querySelectorAll('button[data-action="edit"]').forEach(btn => {
    btn.addEventListener("click", (e) => {
      const id = e.currentTarget.closest(".pocket")?.dataset?.id;
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

  // Form: update set dropdown when game changes
  $("game").addEventListener("change", () => {
    fillSetDropdown($("set"), $("game").value, false);
  });

  // Filters: update set filter when game filter changes
  $("gameFilter").addEventListener("change", () => {
    fillSetDropdown($("setFilter"), $("gameFilter").value, true);
    $("setFilter").value = "";
    pageIndex = 0;
    render();
  });

  ["search","setFilter","sort"].forEach(id => {
    $(id).addEventListener("input", () => { pageIndex = 0; render(); });
    $(id).addEventListener("change", () => { pageIndex = 0; render(); });
  });

  // Pager
  $("prevPage").addEventListener("click", () => {
    pageIndex = Math.max(0, pageIndex - 1);
    render("prev");
  });
  $("nextPage").addEventListener("click", () => {
    pageIndex = pageIndex + 1;
    render("next");
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

  // ESC close handling
  $("modal").addEventListener("close", () => {
    $("backdrop").classList.add("hidden");
    $("backdrop").setAttribute("aria-hidden", "true");
  });

  // Keyboard pager (nice UX)
  document.addEventListener("keydown", (e) => {
    if (e.key === "ArrowLeft" && !e.repeat && !$("modal").open) {
      if (!$("prevPage").disabled) { pageIndex = Math.max(0, pageIndex - 1); render("prev"); }
    }
    if (e.key === "ArrowRight" && !e.repeat && !$("modal").open) {
      // total pages depends on filtered list; render() clamps anyway
      pageIndex = pageIndex + 1;
      render("next");
    }
  });
}

async function init() {
  setsData = await getSets();          // fetch JSON requirement
  cards = loadCards();                // localStorage requirement
  pageIndex = loadPageIndex();

  fillGameDropdowns();
  attachEvents();
  render();
}

init().catch(err => {
  console.error(err);
  alert("App failed to start. Open the console for details.");
});
