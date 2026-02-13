import { addCard } from "./storage.js";
import { addCard, getCard, updateCard } from "./storage.js";
import { uid, fileToDataUrl, fetchPokemonSeries, getParam } from "./shared.js";

const f = document.getElementById("f");
const nameEl = document.getElementById("name");
const seriesEl = document.getElementById("series");
const valueEl = document.getElementById("value");
const detailsEl = document.getElementById("details");
const imgEl = document.getElementById("img");
const preview = document.getElementById("p");
const resetBtn = document.getElementById("reset");

init().catch(console.error);

const editId = getParam("id");
let editing = false;
let existingCard = null;

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
  if (!file) {
    // we'll try to auto-fetch an image if the user didn't upload one
    // keep validation deferred until after fetch attempt
  }
  if (!Number.isFinite(mv) || mv < 0) errs.value = "Must be ≥ 0.";

  if (Object.keys(errs).length) {

  // If editing, load card and populate fields
  if (editId) {
    const card = getCard(editId);
    if (card) {
      editing = true;
      existingCard = card;
      nameEl.value = card.name || "";
      seriesEl.value = card.series || "";
      valueEl.value = card.marketValue ?? "";
      detailsEl.value = card.details || "";
      // allow leaving image empty when editing
      imgEl.removeAttribute("required");
      if (card.imageDataUrl) preview.innerHTML = `<img alt="Preview" src="${card.imageDataUrl}" />`;
      // update submit button text
      const submitBtn = f.querySelector('button[type="submit"]');
      if (submitBtn) submitBtn.textContent = 'Save Changes';
    }
  }
    for (const [k, msg] of Object.entries(errs)) setError(k, msg);
    return;
  }

  let imageDataUrl = null;
  if (file) {
    imageDataUrl = await fileToDataUrl(file);
  } else {
    // attempt to fetch from PokéTCG API using the provided name and series
    try {
      imageDataUrl = await fetchImageFromPokeTcg(nameEl.value.trim(), seriesEl.value);
      if (!imageDataUrl) {
        setError("img", "Could not find image for this card.");
        return;
      }
      // show fetched image in the preview so the user can confirm
      try {
        preview.innerHTML = `<img alt="Preview" src="${imageDataUrl}" />`;
      } catch (err) {
        console.warn("Could not render preview image:", err);
      }
    } catch (err) {
      console.error("Image fetch failed:", err);
      setError("img", "Image lookup failed. Try uploading one.");
      return;
    }
  }

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

    id: editing && existingCard ? existingCard.id : uid(),
  if (!name) return null;
  const base = "https://api.pokemontcg.io/v2/cards";

  const qParts = [];
  if (name) qParts.push(`name:"${name}"`);
    createdAt: editing && existingCard ? existingCard.createdAt : Date.now()

  const tries = [qParts.join(" "), `name:"${name}"`].filter(Boolean);

  if (editing) {
    updateCard(card);
  } else {
    addCard(card);
  }
  for (const q of tries) {
    const url = `${base}?q=${encodeURIComponent(q)}&pageSize=1`;
    const res = await fetch(url);
    if (!res.ok) continue;
    const payload = await res.json();
    const card = payload?.data?.[0];
    if (!card) continue;
    const img = card.images?.large || card.images?.small || card.imageUrl || null;
    if (img) return img;
  }

  return null;
}
