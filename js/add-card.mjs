import { createOrIncrementCard } from "./storage.mjs";
import { loadSetsFromApi, buildSeriesMap, populateSeriesAndExpansions } from "./sets.mjs";

const API_KEY = "56915f12-a262-4f7d-92fc-e2fe08a918ac";

async function tcgSearch(query) {
  const q = query.trim();
  if (!q) return [];

  const sanitized = q.replaceAll('"', " ").trim();
  const tokens = sanitized.split(/\s+/).filter(Boolean);
  const looksNumeric = /^[0-9]+(\/[0-9]+)?$/.test(tokens[0] || "");

  const namePart = tokens.length ? `name:${encodeURIComponent(tokens.join(" "))}` : "";
  const numberPart = looksNumeric ? `number:${encodeURIComponent((tokens[0] || "").split("/")[0])}` : "";

  const lucene = numberPart && namePart
    ? `(${decodeURIComponent(namePart)} OR ${decodeURIComponent(numberPart)})`
    : (numberPart ? decodeURIComponent(numberPart) : decodeURIComponent(namePart));

  const url = `https://api.pokemontcg.io/v2/cards?q=${encodeURIComponent(lucene)}&pageSize=50&orderBy=set.releaseDate`;

  const res = await fetch(url, { headers: { "X-Api-Key": API_KEY } });
  if (!res.ok) throw new Error("API search failed");
  const data = await res.json();
  return data.data || [];
}

function toPayload(apiCard) {
  const printedTotal = apiCard.set?.printedTotal ?? apiCard.set?.total ?? "";
  const numberPretty = apiCard.number ? `${apiCard.number}${printedTotal ? "/" + printedTotal : ""}` : "";

  return {
    apiId: apiCard.id,
    name: apiCard.name || "",
    number: numberPretty,
    rarity: apiCard.rarity || "",
    series: apiCard.set?.series || "",
    expansion: apiCard.set?.name || "",
    imageUrl: apiCard.images?.large || apiCard.images?.small || ""
  };
}

async function urlToDataUrl(url) {
  const res = await fetch(url);
  const blob = await res.blob();
  return await new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.readAsDataURL(blob);
  });
}

export async function initAddCardPage() {
  const els = {
    apiQuery: document.getElementById("apiQuery"),
    btnApiSearch: document.getElementById("btnApiSearch"),
    apiResults: document.getElementById("apiResults"),
    name: document.getElementById("name"),
    number: document.getElementById("number"),
    rarity: document.getElementById("rarity"),
    series: document.getElementById("series"),
    expansion: document.getElementById("expansion"),
    imageUpload: document.getElementById("imageUpload"),
    cardPreview: document.getElementById("cardPreview"),
    btnSave: document.getElementById("btnSave"),
    btnClear: document.getElementById("btnClear"),
    status: document.getElementById("status")
  };

  try {
    const sets = await loadSetsFromApi();
    const seriesEntries = buildSeriesMap(sets);
    populateSeriesAndExpansions({
      seriesSelect: els.series,
      expansionSelect: els.expansion,
      seriesEntries
    });
    els.status.textContent = "Sets loaded.";
  } catch {
    els.series.innerHTML = `<option value="">(Failed to load series)</option>`;
    els.expansion.innerHTML = `<option value="">(Failed to load expansions)</option>`;
    els.status.textContent = "Could not load sets.";
  }

  let currentImageDataUrl = "";
  let currentApiImageUrl = "";

  els.imageUpload.addEventListener("change", () => {
    const file = els.imageUpload.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      currentImageDataUrl = String(reader.result);
      currentApiImageUrl = "";
      els.cardPreview.src = currentImageDataUrl;
      els.status.textContent = "Image loaded.";
    };
    reader.readAsDataURL(file);
  });

  els.btnApiSearch.addEventListener("click", async () => {
    els.status.textContent = "Searching...";
    els.apiResults.innerHTML = `<option value="">Searching...</option>`;
    try {
      const results = await tcgSearch(els.apiQuery.value);
      if (results.length === 0) {
        els.apiResults.innerHTML = `<option value="">No results found.</option>`;
        els.status.textContent = "No results.";
        return;
      }
      const payloads = results.map(toPayload);
      els.apiResults.innerHTML =
        `<option value="">Select a result...</option>` +
        payloads.map(p => {
          const safe = encodeURIComponent(JSON.stringify(p));
          return `<option value="${safe}">${p.name} • ${p.expansion || "Unknown set"} • #${p.number || "?"} • ${p.rarity || "?"}</option>`;
        }).join("");
      els.status.textContent = `Found ${results.length} results.`;
    } catch {
      els.apiResults.innerHTML = `<option value="">Search failed.</option>`;
      els.status.textContent = "Search failed.";
    }
  });

  els.apiResults.addEventListener("change", async () => {
    const v = els.apiResults.value;
    if (!v) return;
    const payload = JSON.parse(decodeURIComponent(v));

    els.name.value = payload.name || "";
    els.number.value = payload.number || "";
    els.rarity.value = payload.rarity || "";

    if (payload.series) els.series.value = payload.series;
    els.series.dispatchEvent(new Event("change"));
    if (payload.expansion) els.expansion.value = payload.expansion;

    currentApiImageUrl = payload.imageUrl || "";
    currentImageDataUrl = "";
    if (currentApiImageUrl) {
      els.cardPreview.src = currentApiImageUrl;
      try {
        currentImageDataUrl = await urlToDataUrl(currentApiImageUrl);
        els.cardPreview.src = currentImageDataUrl;
      } catch {
        // keep URL only
      }
    }
    els.status.textContent = "Auto-filled from API.";
  });

  function clearForm() {
    els.name.value = "";
    els.number.value = "";
    els.rarity.value = "";
    els.series.value = "";
    els.series.dispatchEvent(new Event("change"));
    els.expansion.value = "";
    els.imageUpload.value = "";
    currentImageDataUrl = "";
    currentApiImageUrl = "";
    els.cardPreview.src = "assets/placeholder-card.png";
    els.status.textContent = "Cleared.";
  }

  els.btnClear.addEventListener("click", clearForm);

  els.btnSave.addEventListener("click", () => {
    if (!els.name.value.trim() || !els.number.value.trim() || !els.series.value || !els.expansion.value || !els.rarity.value.trim()) {
      els.status.textContent = "Please complete: name, number, series, expansion, rarity.";
      return;
    }

    const result = createOrIncrementCard({
      name: els.name.value.trim(),
      number: els.number.value.trim(),
      rarity: els.rarity.value.trim(),
      series: els.series.value,
      expansion: els.expansion.value,
      imageDataUrl: currentImageDataUrl || "",
      imageUrl: currentImageDataUrl ? "" : currentApiImageUrl
    });

    els.status.textContent = result.merged
      ? `Merged! Quantity is now x${result.card.qty}.`
      : `Saved!`;

    clearForm();
  });
}
