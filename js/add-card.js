import { SETS } from "./sets.js";
import { loadCards, saveCards } from "./storage.js";

const form = document.getElementById("addCardForm");
const statusEl = document.getElementById("formStatus");
const saveAndAddAnotherBtn = document.getElementById("saveAndAddAnotherBtn");

const gameEl = document.getElementById("game");
const setEl = document.getElementById("set");
const setCodeEl = document.getElementById("setCode");
const nameEl = document.getElementById("name");
const numberEl = document.getElementById("number");
const rarityEl = document.getElementById("rarity");
const valueEl = document.getElementById("value");
const notesEl = document.getElementById("notes");

init();

function init() {
  document.getElementById("year").textContent = String(new Date().getFullYear());

  // If user came from "Scan", preselect mode (future hook)
  const mode = new URLSearchParams(location.search).get("mode");
  if (mode === "scan") {
    toast("Scan mode placeholder: wire camera capture here.");
  }

  gameEl.addEventListener("change", () => {
    populateSets(gameEl.value);
    clearError(gameEl);
  });

  setEl.addEventListener("change", () => {
    const chosen = getSelectedSet();
    if (chosen) {
      setCodeEl.value = chosen.setCode;
      clearError(setEl);
      clearError(setCodeEl);
    }
  });

  // Live field validation
  [setCodeEl, nameEl, numberEl, rarityEl].forEach((el) => {
    el.addEventListener("input", () => clearError(el));
    el.addEventListener("change", () => clearError(el));
  });

  valueEl.addEventListener("input", () => clearError(valueEl));

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    handleSubmit({ redirect: true });
  });

  saveAndAddAnotherBtn.addEventListener("click", () => {
    handleSubmit({ redirect: false });
  });
}

function populateSets(game) {
  setEl.innerHTML = "";
  const placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.disabled = true;
  placeholder.selected = true;
  placeholder.textContent = "Choose a set…";
  setEl.appendChild(placeholder);

  const list = SETS[game] || [];
  list.forEach((s) => {
    const opt = document.createElement("option");
    opt.value = s.set;
    opt.textContent = s.set;
    opt.dataset.setCode = s.setCode;
    setEl.appendChild(opt);
  });

  // Clear set+code when switching games
  setCodeEl.value = "";
}

function getSelectedSet() {
  const opt = setEl.options[setEl.selectedIndex];
  if (!opt || !opt.value) return null;
  return { set: opt.value, setCode: opt.dataset.setCode || "" };
}

function handleSubmit({ redirect }) {
  statusEl.textContent = "";

  const ok = validateForm();
  if (!ok) {
    toast("Fix the highlighted fields and try again.");
    return;
  }

  const cards = loadCards() || [];
  const card = buildCardFromForm();
  cards.unshift(card);
  saveCards(cards);

  toast(`Saved: ${card.name} (${card.setCode} #${card.number})`);

  if (redirect) {
    // Send the id via URL parameters (requirement)
    location.href = `binder.html?id=${encodeURIComponent(card.id)}`;
  } else {
    // keep game + set selected, clear the rest
    nameEl.value = "";
    numberEl.value = "";
    rarityEl.value = "";
    valueEl.value = "";
    notesEl.value = "";
    nameEl.focus();
  }
}

function buildCardFromForm() {
  const selected = getSelectedSet();
  const id = makeId(gameEl.value);

  return {
    id,
    game: gameEl.value,
    name: nameEl.value.trim(),
    set: selected?.set || setEl.value,
    setCode: setCodeEl.value.trim().toUpperCase(),
    number: numberEl.value.trim(),
    rarity: rarityEl.value,
    value: valueEl.value === "" ? 0 : Number(valueEl.value),
    notes: notesEl.value.trim(),
    addedAt: Date.now()
  };
}

function validateForm() {
  let ok = true;

  // Required fields
  ok = req(gameEl, "Choose a game.") && ok;
  ok = req(setEl, "Choose a set.") && ok;
  ok = req(nameEl, "Enter a card name.") && ok;
  ok = req(numberEl, "Enter a card number.") && ok;
  ok = req(rarityEl, "Choose a rarity.") && ok;
  ok = req(setCodeEl, "Enter a set code.") && ok;

  // Pattern checks
  ok = pattern(setCodeEl, "Set code must be 2–6 letters/numbers.") && ok;
  ok = pattern(numberEl, "Use 233 or 4/102 format.") && ok;

  // Value check (optional)
  if (valueEl.value !== "" && Number(valueEl.value) < 0) {
    setError(valueEl, "Value can’t be negative.");
    ok = false;
  }

  return ok;
}

function req(el, message) {
  if (!el.value) {
    setError(el, message);
    return false;
  }
  return true;
}

function pattern(el, message) {
  if (el.value && el.pattern) {
    const re = new RegExp(el.pattern);
    if (!re.test(el.value)) {
      setError(el, message);
      return false;
    }
  }
  return true;
}

function setError(el, message) {
  el.classList.add("is-invalid");
  const err = document.getElementById(`err-${el.id}`);
  if (err) err.textContent = message;
}

function clearError(el) {
  el.classList.remove("is-invalid");
  const err = document.getElementById(`err-${el.id}`);
  if (err) err.textContent = "";
}

function toast(msg) {
  statusEl.textContent = msg;
  statusEl.animate(
    [{ opacity: 0, transform: "translateY(2px)" }, { opacity: 1, transform: "translateY(0)" }],
    { duration: 180, easing: "ease-out" }
  );
}

function makeId(prefix) {
  // Simple unique id
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}
