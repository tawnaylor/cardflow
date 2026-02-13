import { addCard } from "./storage.js";
import { uid, fileToDataUrl, fetchPokemonSeries } from "./shared.js";

const f = document.getElementById("f");
const nameEl = document.getElementById("name");
const seriesEl = document.getElementById("series");
const valueEl = document.getElementById("value");
const detailsEl = document.getElementById("details");
const imgEl = document.getElementById("img");
const preview = document.getElementById("p");
const resetBtn = document.getElementById("reset");

init().catch(console.error);

async function init() {
  // Populate series dropdown from JSON (fetch requirement)
  const data = await fetchPokemonSeries();
  seriesEl.innerHTML =
    `<option value="">Select…</option>` +
    (data.series ?? []).map((s) => `<option value="${s}">${s}</option>`).join("");

  imgEl.addEventListener("change", async () => {
    const file = imgEl.files?.[0];
    if (!file) return (preview.textContent = "Preview");
    const url = await fileToDataUrl(file);
    preview.innerHTML = `<img alt="Preview" src="${url}" />`;
  });

  resetBtn.addEventListener("click", () => {
    f.reset();
    preview.textContent = "Preview";
    clearErrors();
  });

  f.addEventListener("submit", onSubmit);
}

async function onSubmit(e) {
  e.preventDefault();
  clearErrors();

  const file = imgEl.files?.[0] ?? null;
  const mv = valueEl.value === "" ? 0 : Number(valueEl.value);

  const errs = {};
  if (!nameEl.value.trim()) errs.name = "Required.";
  if (!seriesEl.value) errs.series = "Required.";
  if (!detailsEl.value.trim()) errs.details = "Required.";
  if (!file) errs.img = "Required.";
  if (!Number.isFinite(mv) || mv < 0) errs.value = "Must be ≥ 0.";

  if (Object.keys(errs).length) {
    for (const [k, msg] of Object.entries(errs)) setError(k, msg);
    return;
  }

  const imageDataUrl = await fileToDataUrl(file);

  const card = {
    id: uid(),
    name: nameEl.value.trim(),
    series: seriesEl.value,
    details: detailsEl.value.trim(),
    marketValue: mv,
    imageDataUrl,
    createdAt: Date.now()
  };

  addCard(card);

  location.href = `./index.html?selected=${encodeURIComponent(card.id)}`;
}

function clearErrors() {
  document.querySelectorAll(".error").forEach((e) => (e.textContent = ""));
}

function setError(key, msg) {
  const el = document.querySelector(`.error[data-for="${key}"]`);
  if (el) el.textContent = msg;
}
