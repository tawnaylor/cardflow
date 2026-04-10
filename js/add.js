import { upsertCard, fileToDataUrl } from "./storage.js";
import { fetchTcgdexCard } from "./tcgdex.js";

const form = document.getElementById("cardForm");
const status = document.getElementById("status");
const imageInput = document.getElementById("imageInput");
const imageUrlInput = document.getElementById("imageUrl");
const seriesSelect = document.getElementById('seriesSelect');
const expansionSelect = document.getElementById('expansionSelect');
const binderSelect = document.getElementById('binderSelect'); 
const tcgdexCardIdInput = document.getElementById('tcgdexCardId');
const lookupTcgdexBtn = document.getElementById('lookupTcgdexBtn');
const seedBtn = document.getElementById("seedDemo");

const CARD_NUMBER_PATTERN = /^[A-Za-z0-9/-]{1,20}$/;

function setStatus(msg) {
  status.textContent = msg;
}

// --- BINDER DROPDOWN LOGIC ---
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

// --- TCGDEX & DATASET LOGIC (Kept from previous versions) ---
let _seriesMap = {}; 
async function populateSeriesFromDataset() {
  try {
    const resp = await fetch('./database/cardflow-pokemon-dataset.json');
    if (!resp.ok) return;
    const data = await resp.json();
    _seriesMap = {};
    data.expansions.forEach(e => {
      if (!e.series) return;
      if (!_seriesMap[e.series]) _seriesMap[e.series] = new Set();
      _seriesMap[e.series].add(e.name || e.set_abb);
    });
    const seriesList = Object.keys(_seriesMap).sort();
    seriesSelect.querySelectorAll('option:not([disabled])')?.forEach(o => o.remove());
    seriesList.forEach(s => {
      const opt = document.createElement('option');
      opt.value = s; opt.textContent = s;
      seriesSelect.appendChild(opt);
    });
    seriesSelect.addEventListener('change', () => updateExpansionOptions(seriesSelect.value));
  } catch (err) { console.warn("Dataset load failed", err); }
}

function updateExpansionOptions(selectedSeries, selectedExpansion = '') {
  expansionSelect.querySelectorAll('option:not([disabled])')?.forEach(option => option.remove());
  const expansions = _seriesMap[selectedSeries] ? Array.from(_seriesMap[selectedSeries]).sort() : [];
  expansions.forEach(expansion => {
    const option = document.createElement('option');
    option.value = expansion; option.textContent = expansion;
    expansionSelect.appendChild(option);
  });
  if (selectedExpansion) expansionSelect.value = selectedExpansion;
}

async function autofillFromTcgdex() {
  const cardId = tcgdexCardIdInput.value.trim();
  if (!cardId) return setStatus('Enter a TCGdex card ID.');
  setStatus('Looking up...');
  try {
    const card = await fetchTcgdexCard(cardId);
    form.elements.name.value = card.name || "";
    form.elements.number.value = card.number || "";
    if (card.series) {
      seriesSelect.value = card.series;
      updateExpansionOptions(card.series, card.expansion);
    }
    if (card.imageUrl) imageUrlInput.value = card.imageUrl;
    setStatus(`Loaded ${card.name}.`);
  } catch (error) { setStatus('Error fetching card.'); }
}

// --- MAIN SUBMIT LOGIC ---
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!binderSelect.value) return setStatus("Please select a binder first!");

  const file = imageInput.files?.[0];
  let imageDataUrl = "";
  
  if (file) {
    imageDataUrl = await fileToDataUrl(file);
  } else if (imageUrlInput.value.trim()) {
    imageDataUrl = imageUrlInput.value.trim(); // Keeps your Image URL function
  }

  const payload = {
    binderId: String(binderSelect.value),
    name: form.elements.name.value,
    series: form.elements.series.value,
    expansion: form.elements.expansion.value,
    rarity: form.elements.rarity.value,
    number: form.elements.number.value,
    qty: parseInt(form.elements.qty.value) || 1, // Fix: Register quantity
    imageDataUrl
  };

  const result = upsertCard(payload);
  setStatus(result.merged ? `Updated quantity: x${result.card.qty}` : `Added ${payload.name}!`);
  
  form.reset();
  form.elements.qty.value = 1;
});

// --- INIT ---
loadBindersIntoSelect();
populateSeriesFromDataset();
lookupTcgdexBtn?.addEventListener('click', autofillFromTcgdex);