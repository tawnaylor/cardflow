import { uid, fileToDataUrl } from "./utils.js";
import { addCard } from "./storage.js";
import { fetchBrandSeries, fetchMarketSample, getBrandOptions, getSeriesForBrand, getBrandName } from "./data.js";
import { setSelectOptions } from "./ui.js";

const els = {
  form: document.getElementById("cardForm"),
  cardName: document.getElementById("cardName"),
  brand: document.getElementById("brand"),
  series: document.getElementById("series"),
  expansion: document.getElementById("expansion"),
  setCode: document.getElementById("setCode"),
  ptcgSearch: document.getElementById("ptcgSearch"),
  ptcgSearchBtn: document.getElementById("ptcgSearchBtn"),
  ptcgResults: document.getElementById("ptcgResults"),
  marketValue: document.getElementById("marketValue"),
  cardDetails: document.getElementById("cardDetails"),
  imageFile: document.getElementById("imageFile"),
  imgPreview: document.getElementById("imgPreview"),
  resetBtn: document.getElementById("resetBtn")
};

let brandData = null;
let marketSample = {};
let expansions = [];

init().catch(console.error);

async function init() {
  brandData = await fetchBrandSeries();
  marketSample = await fetchMarketSample();

  // load expansions list
  try {
    const res = await fetch("../data/pokemon-tcg-sets.json");
    if (res.ok) {
      expansions = await res.json();
      const opts = (expansions ?? []).map((s) => ({ id: s.id, name: s.name }));
      setSelectOptions(els.expansion, opts, "Select expansion…");
      // populate setCode dropdown (use id as short code)
      const setOpts = (expansions ?? []).map((s) => ({ id: s.id, name: s.id + ' — ' + s.name }));
      setSelectOptions(els.setCode, setOpts, "Select set code…");
    }
  } catch (err) {
    console.warn("Failed to load pokemon expansions", err);
  }

  // When a set code is selected, auto-fill brand, series, expansion
  els.setCode.addEventListener('change', () => {
    const code = els.setCode.value;
    if (!code) return;

    // Find expansion entry
    const setEntry = (expansions ?? []).find((s) => s.id === code);
    if (!setEntry) return;

    // Ensure brand is Pokemon
    try { els.brand.value = 'pokemon'; } catch (e) {}

    // Set expansion select to the set id
    try { els.expansion.value = setEntry.id; } catch (e) {}

    // Attempt to set series: use expansion name as fallback
    const derivedSeries = deriveSeriesFromExpansion(setEntry.name);
    // If a series option matching derivedSeries exists, set it; otherwise add it
    if (derivedSeries) {
      const opt = Array.from(els.series.options).find(o => o.value === derivedSeries || o.text === derivedSeries);
      if (opt) {
        els.series.value = opt.value;
      } else {
        const option = document.createElement('option');
        option.value = derivedSeries;
        option.text = derivedSeries;
        els.series.appendChild(option);
        els.series.value = derivedSeries;
      }
    }
  });

  function deriveSeriesFromExpansion(name) {
    if (!name) return '';
    const n = name.toLowerCase();
    if (n.includes('base set') || n.includes('base')) return 'Base Set';
    if (n.includes('jungle')) return 'Jungle';
    if (n.includes('fossil')) return 'Fossil';
    if (n.includes('neo')) return 'Neo';
    if (n.includes('ex ') || n.startsWith('ex') ) return 'EX';
    if (n.includes('diamond') || n.includes('pearl') || n.includes('platinum')) return 'Diamond & Pearl';
    if (n.includes('xy') || n.includes('primal') || n.includes('roaring')) return 'XY';
    if (n.includes('sun') || n.includes('moon')) return 'Sun & Moon';
    if (n.includes('sword') || n.includes('shield')) return 'Sword & Shield';
    if (n.includes('scarlet') || n.includes('violet')) return 'Scarlet & Violet';
    return name; // fallback
  }

  setSelectOptions(els.brand, getBrandOptions(brandData), "Select…");

  els.brand.addEventListener("change", () => {
    const b = els.brand.value;
    const options = getSeriesForBrand(brandData, b);
    setSelectOptions(els.series, options, "Select…");
  });

  els.imageFile.addEventListener("change", async () => {
    const file = els.imageFile.files?.[0];
    if (!file) {
      els.imgPreview.textContent = "Image preview";
      return;
    }
    const url = await fileToDataUrl(file);
    els.imgPreview.innerHTML = `<img alt="Preview" src="${url}" />`;
  });

  els.resetBtn.addEventListener("click", () => {
    els.form.reset();
    els.imgPreview.textContent = "Image preview";
    clearErrors();
    setSelectOptions(els.series, [], "Select brand first…");
  });

  els.form.addEventListener("submit", onSubmit);

  // PTCG search
  els.ptcgSearchBtn.addEventListener('click', async () => {
    const q = els.ptcgSearch.value.trim();
    if (!q) return;
    await searchPtcg(q);
  });
}

async function searchPtcg(q) {
  els.ptcgResults.textContent = 'Searching…';
  try {
    const pageSize = 8;
    const filters = [];
    if (els.setCode && els.setCode.value) {
      // filter by set id (pokemontcg set id)
      filters.push(`set.id:${els.setCode.value}`);
    }
    // search name (use wildcard-ish match)
    const queryParts = [`name:"${q}"`].concat(filters);
    const qs = queryParts.join(' ');
    const url = `https://api.pokemontcg.io/v2/cards?q=${encodeURIComponent(qs)}&page=${currentSearchPage}&pageSize=${pageSize}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('PTCG API error');
    const body = await res.json();
    const cards = body.data ?? [];
    if (!cards.length) {
      els.ptcgResults.textContent = 'No cards found.';
      return;
    }

    // render clickable results
    els.ptcgResults.innerHTML = '';
    const grid = document.createElement('div');
    grid.style.display = 'grid';
    grid.style.gridTemplateColumns = 'repeat(auto-fill, minmax(160px, 1fr))';
    grid.style.gap = '8px';
    for (const c of cards) {
      const cardEl = document.createElement('div');
      cardEl.className = 'ptcg-result';
      cardEl.style.border = '1px solid #ddd';
      cardEl.style.padding = '6px';
      cardEl.style.display = 'flex';
      cardEl.style.gap = '8px';
      cardEl.style.alignItems = 'center';

      const thumb = document.createElement('img');
      thumb.src = c.images?.small || c.images?.large || '';
      thumb.alt = c.name;
      thumb.style.width = '56px';
      thumb.style.height = 'auto';

      const info = document.createElement('div');
      info.style.flex = '1';
      info.innerHTML = `<div style="font-weight:600">${c.name}</div><div style="font-size:12px;color:#666">${c.set?.name ?? ''}</div>`;

      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'btn';
      btn.textContent = 'Use';
      btn.addEventListener('click', async () => {
        await populateFromPtcg(c);
        els.ptcgResults.innerHTML = '';
      });

      cardEl.appendChild(thumb);
      cardEl.appendChild(info);
      cardEl.appendChild(btn);
      grid.appendChild(cardEl);
    }
    els.ptcgResults.appendChild(grid);
  } catch (err) {
    els.ptcgResults.textContent = 'Search failed.';
    console.warn(err);
  }
}

async function populateFromPtcg(card) {
  // Fill basic fields
  els.cardName.value = card.name ?? '';
  // set brand to pokemon
  els.brand.value = 'pokemon';

  // set series: use card.set.series or card.set.name
  const seriesName = card.set?.series ?? card.set?.name ?? '';
  if (seriesName) {
    const opt = Array.from(els.series.options).find(o => o.value === seriesName || o.text === seriesName);
    if (opt) els.series.value = opt.value;
    else {
      const option = document.createElement('option');
      option.value = seriesName;
      option.text = seriesName;
      els.series.appendChild(option);
      els.series.value = seriesName;
    }
  }

  // expansion & setCode
  if (card.set?.name) {
    const expId = card.set.id ?? card.set.name;
    const optE = Array.from(els.expansion.options).find(o => o.value === expId || o.text === card.set.name);
    if (optE) els.expansion.value = optE.value;
    else {
      const option = document.createElement('option');
      option.value = expId;
      option.text = card.set.name;
      els.expansion.appendChild(option);
      els.expansion.value = expId;
    }
    // set setCode
    try { els.setCode.value = card.set.id; } catch (e) { }
  }

  // market value: leave as-is (user may override)

  // fetch image and set preview + prepare file blob as data URL
  const imageUrl = card.images?.large || card.images?.small || null;
  if (imageUrl) {
    try {
      const dataUrl = await fetchImageAsDataUrl(imageUrl);
      els.imgPreview.innerHTML = `<img alt="Preview" src="${dataUrl}" />`;
      // set an internal 'imageFile' replacement by creating a Blob and storing in a hidden field
      // we store the data URL and later use fileToDataUrl logic; assign to a custom property used on submit
      els._fetchedImageDataUrl = dataUrl;
    } catch (e) {
      console.warn('Failed to fetch card image', e);
    }
  }
}

async function fetchImageAsDataUrl(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error('Image fetch failed');
  const blob = await res.blob();
  return await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result.toString());
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

async function onSubmit(e) {
  e.preventDefault();
  clearErrors();

  const file = els.imageFile.files?.[0] ?? null;

  const data = {
    name: els.cardName.value.trim(),
    brand: els.brand.value,
    series: els.series.value,
    expansion: els.expansion?.value || "",
    setCode: els.setCode?.value || "",
    details: els.cardDetails.value.trim(),
    marketValue: els.marketValue.value === "" ? "" : Number(els.marketValue.value),
    imageFile: file
  };

  const errors = validate(data);
  if (Object.keys(errors).length) {
    for (const [k, msg] of Object.entries(errors)) showError(k, msg);
    return;
  }

  // prepare image data URL: prefer uploaded file, otherwise use fetched image if available
  let imageDataUrl = null;
  if (file) {
    imageDataUrl = await fileToDataUrl(file);
  } else if (els._fetchedImageDataUrl) {
    imageDataUrl = els._fetchedImageDataUrl;
  } else {
    showError('imageFile', 'An image is required.');
    return;
  }

  // Market value: use entered value if provided; otherwise try JSON lookup
  const brandLabel = getBrandName(brandData, data.brand);
  const key = `${data.brand}|${data.series}|${data.name}`;
  const lookup = Number(marketSample[key]);
  const finalMarketValue =
    data.marketValue !== "" && Number.isFinite(data.marketValue)
      ? data.marketValue
      : (Number.isFinite(lookup) ? lookup : 0);

  const card = {
    id: uid(),
    name: data.name,
    brand: data.brand,
    brandLabel,
    series: data.series,
    expansion: data.expansion,
    setCode: data.setCode,
    details: data.details,
    marketValue: finalMarketValue,
    imageDataUrl,
    createdAt: Date.now(),
    updatedAt: Date.now()
  };

  addCard(card);

  // Go back to binder and auto-select the new card
  window.location.href = `./index.html?selected=${encodeURIComponent(card.id)}`;
}

function validate(d) {
  const errs = {};
  if (!d.name) errs.cardName = "Card name is required.";
  if (!d.brand) errs.brand = "Brand is required.";
  if (!d.series) errs.series = "Series is required.";
  if (!d.details) errs.cardDetails = "Card details are required.";
  if (!d.imageFile) errs.imageFile = "An image is required.";

  if (d.marketValue !== "" && (!Number.isFinite(d.marketValue) || d.marketValue < 0)) {
    errs.marketValue = "Market value must be a number ≥ 0.";
  }
  return errs;
}

function clearErrors() {
  document.querySelectorAll(".error").forEach((e) => (e.textContent = ""));
}

function showError(fieldId, msg) {
  const el = document.querySelector(`.error[data-for="${fieldId}"]`);
  if (el) el.textContent = msg;
}
