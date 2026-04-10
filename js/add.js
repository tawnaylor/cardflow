import { upsertCard, fileToDataUrl, getCards } from "./storage.js";
import { fetchTcgdexCard } from "./tcgdex.js";

const form = document.getElementById("cardForm");
const status = document.getElementById("status");
const imageInput = document.getElementById("imageInput");
const imageUrlInput = document.getElementById("imageUrl");
const seedBtn = document.getElementById("seedDemo");
const seriesSelect = document.getElementById('seriesSelect');
const expansionSelect = document.getElementById('expansionSelect');
const binderSelect = document.getElementById('binderSelect'); // CRITICAL: Added for Binder Link
const tcgdexCardIdInput = document.getElementById('tcgdexCardId');
const lookupTcgdexBtn = document.getElementById('lookupTcgdexBtn');
const CARD_NUMBER_PATTERN = /^[A-Za-z0-9/-]{1,20}$/;

function setStatus(msg) {
  status.textContent = msg;
}

/**
 * NEW FUNCTION: Loads binders from IndexedDB so you can select one.
 * This is necessary to link the card to a binder ID for the count to work.
 */
function loadBindersIntoSelect() {
  const request = indexedDB.open("CardFlowDB", 1);
  request.onsuccess = (e) => {
    const db = e.target.result;
    if (!db.objectStoreNames.contains("binders")) return;
    
    const transaction = db.transaction(["binders"], "readonly");
    const store = transaction.objectStore("binders");
    const getAll = store.getAll();

    getAll.onsuccess = () => {
      const binders = getAll.result;
      if (binderSelect) {
        binderSelect.innerHTML = '<option value="" disabled selected>Choose a binder...</option>';
        binders.forEach(binder => {
          const opt = document.createElement('option');
          opt.value = binder.id; 
          opt.textContent = binder.name;
          binderSelect.appendChild(opt);
        });
      }
    };
  };
}

function ensureSelectOption(selectEl, value) {
  if (!selectEl || !value) return;
  const existing = Array.from(selectEl.options).find(option => option.value === value);
  if (existing) return;

  const option = document.createElement('option');
  option.value = value;
  option.textContent = value;
  selectEl.appendChild(option);
}

function updateExpansionOptions(selectedSeries, selectedExpansion = '') {
  if (!seriesSelect || !expansionSelect) return;
  expansionSelect.querySelectorAll('option:not([disabled])')?.forEach(option => option.remove());

  const expansions = _seriesMap[selectedSeries]
    ? Array.from(_seriesMap[selectedSeries]).sort((a, b) => a.localeCompare(b))
    : [];

  for (const expansion of expansions) {
    const option = document.createElement('option');
    option.value = expansion;
    option.textContent = expansion;
    expansionSelect.appendChild(option);
  }

  if (selectedExpansion) {
    ensureSelectOption(expansionSelect, selectedExpansion);
    expansionSelect.value = selectedExpansion;
  }
}

async function autofillFromTcgdex() {
  if (!tcgdexCardIdInput || !lookupTcgdexBtn) return;
  const cardId = tcgdexCardIdInput.value.trim();
  if (!cardId) {
    setStatus('Enter a TCGdex card ID to autofill the form.');
    return;
  }
  lookupTcgdexBtn.disabled = true;
  setStatus('Looking up card details from TCGdex...');
  try {
    const card = await fetchTcgdexCard(cardId);
    form.elements.name.value = card.name || form.elements.name.value;
    form.elements.number.value = card.number || form.elements.number.value;
    if (card.series) {
      ensureSelectOption(seriesSelect, card.series);
      seriesSelect.value = card.series;
      updateExpansionOptions(card.series, card.expansion);
    }
    if (card.rarity) {
      ensureSelectOption(form.elements.rarity, card.rarity);
      form.elements.rarity.value = card.rarity;
    }
    if (card.imageUrl && !imageUrlInput.value.trim()) {
      imageUrlInput.value = card.imageUrl;
    }
    setStatus(`Loaded ${card.name || card.id} from TCGdex.`);
  } catch (error) {
    setStatus(error instanceof Error ? error.message : 'Unable to fetch card details from TCGdex.');
  } finally {
    lookupTcgdexBtn.disabled = false;
  }
}

function validate(formEl) {
  const problems = [];

  // NEW VALIDATION: User MUST select a binder
  if (binderSelect && !binderSelect.value) problems.push("You must select a binder.");
  if (!name.value.trim() || name.value.trim().length < 2) problems.push("Card name is required (min 2 chars).");
  if (!series.value.trim()) problems.push("Series is required.");
  if (!expansion.value.trim()) problems.push("Series expansion is required.");
  if (!rarity.value) problems.push("Rarity is required.");
  if (!CARD_NUMBER_PATTERN.test(number.value.trim())) problems.push("Card number must be 1-20 characters using letters, numbers, /, or -.");

  return problems;
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  setStatus("");
  const problems = validate(form);
  if (problems.length) {
    setStatus(problems.join(" "));
    return;
  }

  // Priority: file input (local upload) -> image URL (fetch & convert) -> empty
  const file = imageInput.files?.[0] || null;
  let imageDataUrl = "";
  if (file) {
    imageDataUrl = await fileToDataUrl(file);
  } else if (imageUrlInput && imageUrlInput.value.trim()) {
    const url = imageUrlInput.value.trim();
    try {
      const resp = await fetch(url, { mode: 'cors' });
      const blob = await resp.blob();
      if (blob.type && blob.type.startsWith('image/')) {
        imageDataUrl = await fileToDataUrl(blob);
      } else {
        setStatus('Fetched resource is not an image; ignoring.');
      }
    } catch (err) {
      console.warn('Image fetch failed');
    }
  }

  const payload = {
    binderId: binderSelect.value, // FIXED: Links the card to the specific binder ID
    name: form.elements.name.value,
    series: form.elements.series.value,
    expansion: form.elements.expansion.value,
    rarity: form.elements.rarity.value,
    number: form.elements.number.value,
    qty: Number(form.elements.qty.value) || 1, 
    imageDataUrl
  };

  const result = upsertCard(payload);

  if (result.merged) {
    setStatus(`Merged quantity! Now x${result.card.qty} for #${result.card.number}.`);
  } else {
    setStatus(`Added! "${result.card.name}" saved to your binder.`);
  }

  form.reset();
  form.elements.qty.value = 1;
  loadBindersIntoSelect(); // Refresh dropdown
});

seedBtn.addEventListener("click", () => {
  if (!binderSelect.value) {
    setStatus("Select a binder first to add demo cards to it!");
    return;
  }
  const bId = Number(binderSelect.value); 
  const demo = [
    { name:"Pikachu", series:"Scarlet & Violet", expansion:"Paldea Evolved", rarity:"Rare", number:"1", qty:2, imageDataUrl:"", binderId: binderSelect.value },
    { name:"Charizard", series:"Scarlet & Violet", expansion:"Obsidian Flames", rarity:"Ultra Rare", number:"2", qty:2, imageDataUrl:"", binderId: binderSelect.value },
    { name:"Gengar", series:"Sword & Shield", expansion:"Lost Origin", rarity:"Holo Rare", number:"3", qty:1, imageDataUrl:"", binderId: binderSelect.value },
    { name:"Mewtwo", series:"Sun & Moon", expansion:"Unified Minds", rarity:"Rare", number:"4", qty:1, imageDataUrl:"", binderId: binderSelect.value },
    { name:"Eevee", series:"Sword & Shield", expansion:"Evolving Skies", rarity:"Uncommon", number:"5", qty:1, imageDataUrl:"", binderId: binderSelect.value },
    { name:"Snorlax", series:"Sun & Moon", expansion:"Team Up", rarity:"Rare", number:"6", qty:1, imageDataUrl:"", binderId: binderSelect.value },
    { name:"Lucario", series:"Diamond & Pearl", expansion:"Majestic Dawn", rarity:"Holo Rare", number:"7", qty:1, imageDataUrl:"", binderId: binderSelect.value },
    { name:"Infernape", series:"Diamond & Pearl", expansion:"Stormfront", rarity:"Rare", number:"8", qty:1, imageDataUrl:"", binderId: binderSelect.value },
    { name:"Blastoise", series:"Base Set", expansion:"Base Set", rarity:"Rare Holo", number:"9", qty:1, imageDataUrl:"", binderId: binderSelect.value },
    { name:"Venusaur", series:"Base Set", expansion:"Base Set", rarity:"Rare Holo", number:"10", qty:1, imageDataUrl:"", binderId: binderSelect.value },
  ];
  for (const c of demo) upsertCard(c);
  setStatus("Demo seeded! Check your Binders page to see the cards.");
});

lookupTcgdexBtn?.addEventListener('click', autofillFromTcgdex);

// (dataset seeding and local image import buttons removed)

// Populate series & expansions selects from dataset JSON
let _seriesMap = {}; // series -> Set of expansions
async function populateSeriesFromDataset() {
  if (!seriesSelect || !expansionSelect) return;
  try {
    const resp = await fetch('./database/cardflow-pokemon-dataset.json');
    if (!resp.ok) return;
    const data = await resp.json();
    const exps = Array.isArray(data.expansions) ? data.expansions : [];
    _seriesMap = {};
    for (const e of exps) {
      const s = (e.series || 'Unknown').trim();
      const name = (e.name || e.set_abb || '').trim();
      if (!s) continue;
      if (!_seriesMap[s]) _seriesMap[s] = new Set();
      if (name) _seriesMap[s].add(name);
    }

    const seriesList = Object.keys(_seriesMap).sort((a,b)=>a.localeCompare(b));
    const selectedSeries = seriesSelect.value;
    const selectedExpansion = expansionSelect.value;
    
    seriesSelect.querySelectorAll('option:not([disabled])')?.forEach(o=>o.remove());
    for (const s of seriesList) {
      const opt = document.createElement('option');
      opt.value = s; opt.textContent = s;
      seriesSelect.appendChild(opt);
    }

    if (selectedSeries) {
      ensureSelectOption(seriesSelect, selectedSeries);
      seriesSelect.value = selectedSeries;
      updateExpansionOptions(selectedSeries, selectedExpansion);
    }

    seriesSelect.addEventListener('change', () => {
      updateExpansionOptions(seriesSelect.value);
    });
  } catch (err) {
    console.warn('Failed to load dataset for series/expansions:', err);
  }
}

// Initialization
loadBindersIntoSelect();
populateSeriesFromDataset();