import { upsertCard, fileToDataUrl, getCards } from "./storage.js";

const form = document.getElementById("cardForm");
const status = document.getElementById("status");
const imageInput = document.getElementById("imageInput");
const imageUrlInput = document.getElementById("imageUrl");
const seedBtn = document.getElementById("seedDemo");
const seedDatasetBtn = document.getElementById("seedDataset");
const importLocalImagesBtn = document.getElementById("importLocalImages");
const seriesSelect = document.getElementById('seriesSelect');
const expansionSelect = document.getElementById('expansionSelect');

function setStatus(msg) {
  status.textContent = msg;
}

function validate(formEl) {
  const name = formEl.elements.name;
  const series = formEl.elements.series;
  const expansion = formEl.elements.expansion;
  const rarity = formEl.elements.rarity;
  const number = formEl.elements.number;

  const problems = [];

  if (!name.value.trim() || name.value.trim().length < 2) problems.push("Card name is required (min 2 chars).");
  if (!series.value.trim()) problems.push("Series is required.");
  if (!expansion.value.trim()) problems.push("Series expansion is required.");
  if (!rarity.value) problems.push("Rarity is required.");
  if (!/^[0-9]{1,4}$/.test(number.value.trim())) problems.push("Card number must be 1–4 digits.");

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
      if (!resp.ok) throw new Error('Network response not ok');
      const blob = await resp.blob();
      // ensure it's an image
      if (blob.type && blob.type.startsWith('image/')) {
        imageDataUrl = await fileToDataUrl(blob);
      } else {
        setStatus('Fetched resource is not an image; ignoring.');
      }
    } catch (err) {
      console.warn('Failed to fetch image URL:', err);
      setStatus('Unable to fetch image URL — it may be blocked by CORS. Upload a file instead.');
    }
  }

  const payload = {
    name: form.elements.name.value,
    series: form.elements.series.value,
    expansion: form.elements.expansion.value,
    rarity: form.elements.rarity.value,
    number: form.elements.number.value,
    qty: form.elements.qty.value,
    imageDataUrl
  };

  const result = upsertCard(payload);

  if (result.merged) {
    setStatus(`Merged quantity! Now x${result.card.qty} for #${result.card.number} (${result.card.series} → ${result.card.expansion}).`);
  } else {
    setStatus(`Added! "${result.card.name}" saved to your binder.`);
  }

  form.reset();
  form.elements.qty.value = 1;
});

seedBtn.addEventListener("click", () => {
  const existing = getCards();
  if (existing.length > 0) {
    setStatus("You already have cards. Clear them on the Binders page if you want a fresh demo.");
    return;
  }

  const demo = [
    { name:"Pikachu", series:"Scarlet & Violet", expansion:"Paldea Evolved", rarity:"Rare", number:"1", qty:2, imageDataUrl:"" },
    { name:"Charizard", series:"Scarlet & Violet", expansion:"Obsidian Flames", rarity:"Ultra Rare", number:"2", qty:2, imageDataUrl:"" },
    { name:"Gengar", series:"Sword & Shield", expansion:"Lost Origin", rarity:"Holo Rare", number:"3", qty:1, imageDataUrl:"" },
    { name:"Mewtwo", series:"Sun & Moon", expansion:"Unified Minds", rarity:"Rare", number:"4", qty:1, imageDataUrl:"" },
    { name:"Eevee", series:"Sword & Shield", expansion:"Evolving Skies", rarity:"Uncommon", number:"5", qty:1, imageDataUrl:"" },
    { name:"Snorlax", series:"Sun & Moon", expansion:"Team Up", rarity:"Rare", number:"6", qty:1, imageDataUrl:"" },
    { name:"Lucario", series:"Diamond & Pearl", expansion:"Majestic Dawn", rarity:"Holo Rare", number:"7", qty:1, imageDataUrl:"" },
    { name:"Infernape", series:"Diamond & Pearl", expansion:"Stormfront", rarity:"Rare", number:"8", qty:1, imageDataUrl:"" },
    { name:"Blastoise", series:"Base Set", expansion:"Base Set", rarity:"Rare Holo", number:"9", qty:1, imageDataUrl:"" },
    { name:"Venusaur", series:"Base Set", expansion:"Base Set", rarity:"Rare Holo", number:"10", qty:1, imageDataUrl:"" },
  ];

  for (const c of demo) upsertCard(c);
  setStatus("Demo seeded! Check your Binders page to see the cards.");
});

// Seed from dataset JSON (database/cardflow-pokemon-dataset.json)
if (seedDatasetBtn) {
  seedDatasetBtn.addEventListener('click', async () => {
    const existing = getCards();
    if (existing.length > 0) {
      setStatus('You already have cards. Clear them on the Binders page if you want a fresh import.');
      return;
    }

    setStatus('Fetching dataset...');
    try {
      const resp = await fetch('./database/cardflow-pokemon-dataset.json');
      if (!resp.ok) throw new Error('Network response not ok');
      const data = await resp.json();
      const exps = Array.isArray(data.expansions) ? data.expansions : [];

      if (!exps.length) {
        setStatus('No expansions found in dataset.');
        return;
      }

      // Create a compact sample card per expansion
      let count = 0;
      for (const e of exps) {
        const card = {
          name: e.name || (`${e.series} ${e.name || ''}`).trim(),
          series: e.series || 'Unknown Series',
          expansion: e.name || e.set_abb || '',
          rarity: 'Common',
          number: e.set_abb || String(e.set_no || ''),
          qty: 1,
          imageDataUrl: ''
        };
        upsertCard(card);
        count++;
      }

      setStatus(`Imported ${count} expansions as sample cards.`);
    } catch (err) {
      console.error('Failed to import dataset:', err);
      setStatus('Failed to fetch dataset. If you opened the page via file://, run a local server (e.g., `python -m http.server`).');
    }
  });
}

// Import local images previously downloaded with the Python tool.
if (importLocalImagesBtn) {
  importLocalImagesBtn.addEventListener('click', async () => {
    setStatus('Looking for local images index...');
    try {
      const resp = await fetch('./database/pkmn-images/index.json');
      if (!resp.ok) throw new Error('index.json not found');
      const index = await resp.json();

      const cards = getCards();
      if (!cards.length) {
        setStatus('No cards in your binder — seed or add cards first.');
        return;
      }

      // helper to slugify expansion to match folder keys
      const slugify = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

      let imported = 0;
      for (const c of cards) {
        const candidates = [slugify(c.expansion), slugify(c.series + '-' + c.expansion), slugify(c.series)];
        let found = null;
        for (const key of candidates) {
          if (index[key] && index[key][String(c.number || '')]) {
            found = index[key][String(c.number || '')];
            break;
          }
        }
        if (!found) continue;

        try {
          const imgResp = await fetch(found);
          if (!imgResp.ok) continue;
          const blob = await imgResp.blob();
          if (!blob.type.startsWith('image/')) continue;
          const dataUrl = await fileToDataUrl(blob);
          // update card with image
          upsertCard({ ...c, imageDataUrl: dataUrl });
          imported++;
        } catch (err) {
          console.warn('failed to import image for', c, err);
        }
      }

      setStatus(`Imported ${imported} images from local dataset.`);
    } catch (err) {
      console.error(err);
      setStatus('Could not load local images index. Run the downloader script to populate `database/pkmn-images` and serve the site via HTTP.');
    }
  });
}

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

    // sort series
    const seriesList = Object.keys(_seriesMap).sort((a,b)=>a.localeCompare(b));
    // clear existing options except the placeholder
    seriesSelect.querySelectorAll('option:not([disabled])')?.forEach(o=>o.remove());
    for (const s of seriesList) {
      const opt = document.createElement('option');
      opt.value = s;
      opt.textContent = s;
      seriesSelect.appendChild(opt);
    }

    // when series changes, populate expansions
    seriesSelect.addEventListener('change', () => {
      const sel = seriesSelect.value;
      expansionSelect.querySelectorAll('option:not([disabled])')?.forEach(o=>o.remove());
      const set = _seriesMap[sel] ? Array.from(_seriesMap[sel]).sort((a,b)=>a.localeCompare(b)) : [];
      for (const ex of set) {
        const opt = document.createElement('option');
        opt.value = ex;
        opt.textContent = ex;
        expansionSelect.appendChild(opt);
      }
    });
  } catch (err) {
    console.warn('Failed to load dataset for series/expansions:', err);
  }
}

// initialize selects on load
populateSeriesFromDataset();