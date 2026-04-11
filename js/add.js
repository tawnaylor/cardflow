import { upsertCard, fileToDataUrl } from "./storage.js";
import { fetchTcgdexCard, fetchTcgdexCardCatalog } from "./tcgdex.js";

const form = document.getElementById("cardForm");
const status = document.getElementById("status");
const imageInput = document.getElementById("imageInput");
const imageUrlInput = document.getElementById("imageUrl");
const seedBtn = document.getElementById("seedDemo");
const cardNameInput = form?.elements?.name || null;
const pokemonNameOptions = document.getElementById('pokemonNameOptions');
const pokemonNameHint = document.getElementById('pokemonNameHint');
const seriesSelect = document.getElementById('seriesSelect');
const expansionSelect = document.getElementById('expansionSelect');
const binderSelect = document.getElementById('binderSelect'); // CRITICAL: Added for Binder Link
const tcgdexCardSearchInput = document.getElementById('tcgdexCardSearch');
const tcgdexCardOptions = document.getElementById('tcgdexCardOptions');
const tcgdexCatalogHint = document.getElementById('tcgdexCatalogHint');
const tcgdexCardIdInput = document.getElementById('tcgdexCardId');
const lookupTcgdexBtn = document.getElementById('lookupTcgdexBtn');
const CARD_NUMBER_PATTERN = /^[A-Za-z0-9/-]{1,20}$/;
const tcgdexCardSearchMap = new Map();

function setStatus(msg) {
  if (status) status.textContent = msg;
}

function setTcgdexCatalogHint(msg) {
  if (tcgdexCatalogHint) tcgdexCatalogHint.textContent = msg;
}

function setPokemonNameHint(msg) {
  if (pokemonNameHint) pokemonNameHint.textContent = msg;
}

function formatTcgdexCardChoice(card) {
  const cardNumber = card.localId ? `#${card.localId}` : 'No number';
  return `${card.name} (${cardNumber}) - ${card.id}`;
}

function populatePokemonNamePicker(cards) {
  if (!cardNameInput || !pokemonNameOptions) return;

  const names = Array.from(
    new Set(cards.map(card => String(card.name || '').trim()).filter(Boolean))
  ).sort((left, right) => left.localeCompare(right));

  const fragment = document.createDocumentFragment();
  pokemonNameOptions.innerHTML = '';

  for (const name of names) {
    const option = document.createElement('option');
    option.value = name;
    fragment.appendChild(option);
  }

  pokemonNameOptions.appendChild(fragment);
  setPokemonNameHint(`Loaded ${names.length.toLocaleString()} Pokemon names for quick search.`);
}

async function populateTcgdexCardPicker() {
  if (!tcgdexCardSearchInput || !tcgdexCardOptions) return;

  setTcgdexCatalogHint('Loading TCGdex card list...');
  setPokemonNameHint('Loading Pokemon names...');

  try {
    const cards = await fetchTcgdexCardCatalog();
    const fragment = document.createDocumentFragment();

    tcgdexCardSearchMap.clear();
    tcgdexCardOptions.innerHTML = '';

    for (const card of cards) {
      const choice = formatTcgdexCardChoice(card);
      const option = document.createElement('option');
      option.value = choice;
      fragment.appendChild(option);
      tcgdexCardSearchMap.set(choice, card.id);
    }

    tcgdexCardOptions.appendChild(fragment);
    populatePokemonNamePicker(cards);
    setTcgdexCatalogHint(`Loaded ${cards.length.toLocaleString()} TCGdex cards. Pick one to autofill the form.`);
  } catch (error) {
    console.warn('Failed to load TCGdex catalog:', error);
    setTcgdexCatalogHint('Could not load the TCGdex card list. You can still enter a card ID manually.');
    setPokemonNameHint('Could not load Pokemon names. You can still type a name manually.');
  }
}

async function applyTcgdexPickerSelection() {
  if (!tcgdexCardSearchInput || !tcgdexCardIdInput) return;

  const selectedCardId = tcgdexCardSearchMap.get(tcgdexCardSearchInput.value.trim());
  if (!selectedCardId) return;

  tcgdexCardIdInput.value = selectedCardId;
  await autofillFromTcgdex();
}

/**
 * NEW FUNCTION: Loads binders from IndexedDB so you can select one.
 * This is necessary to link the card to a binder ID for the count to work.
 */
function loadBindersIntoSelect() {
  if (!binderSelect) return;

  const request = indexedDB.open(DB_NAME, 2);
  request.onerror = () => {
    setStatus('Unable to load binders. Open the Binders page and create one first.');
  };
  request.onsuccess = (e) => {
    const db = e.target.result;
    if (!db.objectStoreNames.contains("binders")) {
      binderSelect.innerHTML = '<option value="" disabled selected>Create a binder first...</option>';
      return;
    }
    
    const transaction = db.transaction(["binders"], "readonly");
    const store = transaction.objectStore("binders");
    const getAll = store.getAll();

    getAll.onsuccess = () => {
      const binders = getAll.result;
      const selectedBinderId = binderSelect.value;
      binderSelect.innerHTML = '<option value="" disabled selected>Choose a binder...</option>';

      if (!binders.length) {
        binderSelect.innerHTML = '<option value="" disabled selected>Create a binder first...</option>';
        return;
      }

      binders.forEach(binder => {
        const opt = document.createElement('option');
        opt.value = String(binder.id);
        opt.textContent = binder.name;
        binderSelect.appendChild(opt);
      });

      if (selectedBinderId) {
        binderSelect.value = selectedBinderId;
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
  const nameField = formEl.elements.name;
  const seriesField = formEl.elements.series;
  const expansionField = formEl.elements.expansion;
  const rarityField = formEl.elements.rarity;
  const numberField = formEl.elements.number;

  if (binderSelect && !binderSelect.value) problems.push("You must select a binder.");
  if (!nameField.value.trim() || nameField.value.trim().length < 2) problems.push("Card name is required (min 2 chars).");
  if (!seriesField.value.trim()) problems.push("Series is required.");
  if (!expansionField.value.trim()) problems.push("Series expansion is required.");
  if (!rarityField.value) problems.push("Rarity is required.");
  if (!CARD_NUMBER_PATTERN.test(numberField.value.trim())) problems.push("Card number must be 1-20 characters using letters, numbers, /, or -.");

  return problems;
}

form?.addEventListener("submit", async (e) => {
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

  const selectedBinderId = binderSelect?.value || "";

  const payload = {
    binderId: selectedBinderId,
    name: form.elements.name.value,
    series: form.elements.series.value,
    expansion: form.elements.expansion.value,
    rarity: form.elements.rarity.value,
    condition: form.elements.condition.value,
    number: form.elements.number.value,
    quantity: Number(form.elements.quantity.value) || 1,
    imageDataUrl
  };

  const result = upsertCard(payload);

  if (result.merged) {
    setStatus(`Merged quantity! Now x${result.card.quantity} for #${result.card.number}.`);
  } else {
    setStatus(`Added! "${result.card.name}" saved to your binder.`);
  }

  form.reset();
  form.elements.quantity.value = 1;
  if (binderSelect) binderSelect.value = selectedBinderId;
  loadBindersIntoSelect();
});

seedBtn?.addEventListener("click", () => {
  if (!binderSelect?.value) {
    setStatus("Select a binder first to add demo cards to it!");
    return;
  }

  const demo = [
    { name:"Pikachu", series:"Scarlet & Violet", expansion:"Paldea Evolved", rarity:"Rare", condition:"NM", number:"1", quantity:2, imageDataUrl:"", binderId: binderSelect.value },
    { name:"Charizard", series:"Scarlet & Violet", expansion:"Obsidian Flames", rarity:"Ultra Rare", condition:"NM", number:"2", quantity:2, imageDataUrl:"", binderId: binderSelect.value },
    { name:"Gengar", series:"Sword & Shield", expansion:"Lost Origin", rarity:"Holo Rare", condition:"LP", number:"3", quantity:1, imageDataUrl:"", binderId: binderSelect.value },
    { name:"Mewtwo", series:"Sun & Moon", expansion:"Unified Minds", rarity:"Rare", condition:"NM", number:"4", quantity:1, imageDataUrl:"", binderId: binderSelect.value },
    { name:"Eevee", series:"Sword & Shield", expansion:"Evolving Skies", rarity:"Uncommon", condition:"NM", number:"5", quantity:1, imageDataUrl:"", binderId: binderSelect.value },
    { name:"Snorlax", series:"Sun & Moon", expansion:"Team Up", rarity:"Rare", condition:"MP", number:"6", quantity:1, imageDataUrl:"", binderId: binderSelect.value },
    { name:"Lucario", series:"Diamond & Pearl", expansion:"Majestic Dawn", rarity:"Holo Rare", condition:"LP", number:"7", quantity:1, imageDataUrl:"", binderId: binderSelect.value },
    { name:"Infernape", series:"Diamond & Pearl", expansion:"Stormfront", rarity:"Rare", condition:"NM", number:"8", quantity:1, imageDataUrl:"", binderId: binderSelect.value },
    { name:"Blastoise", series:"Base Set", expansion:"Base Set", rarity:"Rare Holo", condition:"HP", number:"9", quantity:1, imageDataUrl:"", binderId: binderSelect.value },
    { name:"Venusaur", series:"Base Set", expansion:"Base Set", rarity:"Rare Holo", condition:"DMG", number:"10", quantity:1, imageDataUrl:"", binderId: binderSelect.value },
  ];
  for (const c of demo) upsertCard(c);
  setStatus("Demo seeded! Check your Binders page to see the cards.");
});

lookupTcgdexBtn?.addEventListener('click', autofillFromTcgdex);
tcgdexCardSearchInput?.addEventListener('change', () => {
  void applyTcgdexPickerSelection();
});

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
populateTcgdexCardPicker();