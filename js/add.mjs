import { getBinders, createBinder, addCard } from "./storage.mjs";
import { initThemeSwitch, fillSelect } from "./ui.mjs";
import { loadSets, flattenSets } from "./data.mjs";
import { startCamera, stopCamera, captureAndWarp } from "./scan.mjs";
import { ocrImageDataUrl } from "./ocr.mjs";
import { recognizeCardFromText } from "./recognize.mjs";
import { pokemontcgFetch } from "./api.mjs";
import { POKEMON_TYPES, RARITIES, SET_SYMBOL_PRESETS } from "./symbols.mjs";

const themeSwitch = document.querySelector("#themeSwitch");

const form = document.querySelector("#cardForm");
const binderSelect = document.querySelector("#binderSelect");
const newBinderName = document.querySelector("#newBinderName");
const createBinderBtn = document.querySelector("#createBinderBtn");

const gameSelect = document.querySelector("#gameSelect");
const rarity = document.querySelector("#rarity");
const setSelect = document.querySelector("#setSelect");
const setError = document.querySelector("#setError");

const imageInput = document.querySelector("#cardImage");
const imagePreview = document.querySelector("#imagePreview");
const saveHint = document.querySelector("#saveHint");

// Scan UI elements
const startScanBtn = document.querySelector("#startScanBtn");
const stopScanBtn = document.querySelector("#stopScanBtn");
const captureBtn = document.querySelector("#captureBtn");
const useScanBtn = document.querySelector("#useScanBtn");
const scanVideo = document.querySelector("#scanVideo");
const scanCanvas = document.querySelector("#scanCanvas");
const autoFillBtn = document.querySelector("#autoFillBtn");
// Search UI (search by name / number)
const pSearchInput = document.querySelector("#p_search");
const pSearchBtn = document.querySelector("#p_searchBtn");
const pResultsEl = document.querySelector("#p_searchResults");

// New selects
const pTypeSelect = document.querySelector("#p_type");
const pSetSymbolSelect = document.querySelector("#p_setSymbol");
const pRaritySymbolSelect = document.querySelector("#p_raritySymbol");
const mRaritySymbolSelect = document.querySelector("#m_raritySymbol");

let lastScanDataUrl = null;

const pokemonFields = document.querySelector("#pokemonFields");
const mtgFields = document.querySelector("#mtgFields");

let setCache = { pokemon: null, mtg: null };

function fillBinders(){
  const binders = getBinders();
  binderSelect.innerHTML = "";
  for (const b of binders){
    const opt = document.createElement("option");
    opt.value = b.id;
    opt.textContent = b.name;
    binderSelect.appendChild(opt);
  }
}

function showGameFields(){
  const g = gameSelect.value;
  pokemonFields.classList.toggle("hidden", g !== "pokemon");
  mtgFields.classList.toggle("hidden", g !== "mtg");

  // required name field toggles
  document.querySelector("#p_name").required = g === "pokemon";
  document.querySelector("#m_name").required = g === "mtg";
}

function getSelectedSetMeta(){
  const val = setSelect.value; // code::name
  if (!val) return null;
  const [code, name] = val.split("::");
  return { code, name };
}

function fillSimpleSelect(selectEl, items, { placeholder = "Select…" } = {}) {
  if (!selectEl) return;
  selectEl.innerHTML = "";
  const opt0 = document.createElement("option");
  opt0.value = "";
  opt0.textContent = placeholder;
  selectEl.appendChild(opt0);

  for (const it of items) {
    const opt = document.createElement("option");
    opt.value = it.key ?? it.value ?? it.label;
    opt.textContent = it.label;
    selectEl.appendChild(opt);
  }
}

async function loadAndPopulateSets(){
  try{
    const { pokemon, mtg } = await loadSets();
    setCache = { pokemon, mtg };
    populateSetDropdown();
  }catch(err){
    setSelect.innerHTML = `<option value="">Failed to load sets</option>`;
    setError.textContent = String(err.message || err);
  }
}

function populateSetDropdown(){
  setError.textContent = "";
  const g = gameSelect.value;
  const db = (g === "pokemon") ? setCache.pokemon : setCache.mtg;
  if (!db){
    setSelect.innerHTML = `<option value="">Loading sets…</option>`;
    return;
  }
  const flat = flattenSets(db).map(x => ({
    label: x.label,
    value: `${x.code}::${x.label.includes(": ") ? x.label.split(": ")[1].split(" (")[0] : x.label}`
  }));

  // Slightly cleaner label for dropdown
  const better = flattenSets(db).map(x => ({
    label: `${x.year} — ${x.series}: ${x.label.split(": ")[1] || x.label}`,
    value: `${x.code}::${x.label.includes(": ") ? x.label.split(": ")[1].split(" (")[0] : x.label}`
  }));

  fillSelect(setSelect, better, "Select a set / expansion…");
}

function clearErrors(){
  setError.textContent = "";
  document.querySelectorAll(".error[data-for]").forEach(p => p.textContent = "");
  saveHint.textContent = "";
}

function setFieldError(id, msg){
  const p = document.querySelector(`.error[data-for="${id}"]`);
  if (p) p.textContent = msg;
}

function validate(){
  clearErrors();

  let ok = true;

  if (!binderSelect.value){
    ok = false;
    document.querySelector("#binderError").textContent = "Choose a binder.";
  } else {
    document.querySelector("#binderError").textContent = "";
  }

  if (!rarity.value){
    ok = false;
    // basic prompt; rarity is already required
  }

  if (!setSelect.value){
    ok = false;
    setError.textContent = "Select a set / expansion from the dropdown.";
  }

  const g = gameSelect.value;
  if (g === "pokemon"){
    const name = document.querySelector("#p_name").value.trim();
    if (!name){ ok = false; setFieldError("p_name", "Name is required."); }
    const hp = document.querySelector("#p_hp").value.trim();
    if (hp && !/^[0-9]{1,4}$/.test(hp)){
      ok = false;
      setFieldError("p_hp", "HP must be numeric.");
    }
  } else {
    const name = document.querySelector("#m_name").value.trim();
    if (!name){ ok = false; setFieldError("m_name", "Name is required."); }
  }

  return ok;
}

function fileToDataUrl(file){
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

imageInput.addEventListener("change", async () => {
  const file = imageInput.files?.[0];
  if (!file) return;
  if (!file.type.startsWith("image/")){
    alert("Please choose an image file.");
    imageInput.value = "";
    return;
  }
  const dataUrl = await fileToDataUrl(file);
  imagePreview.src = dataUrl;
  // Offer to auto-fill the form from the uploaded image
  try{
    const want = confirm('Auto-fill form from this uploaded image?');
    if (want){
      await autoFillFromDataUrl(dataUrl);
    }
  }catch(e){
    console.error(e);
  }
});

startScanBtn?.addEventListener("click", async () => {
  try{
    scanVideo.classList.remove("hidden");
    scanCanvas.classList.add("hidden");
    imagePreview.classList.add("hidden");

    await startCamera(scanVideo);
    captureBtn.disabled = false;
    stopScanBtn.disabled = false;
    startScanBtn.disabled = true;
  }catch(err){
    alert("Camera permission denied or unavailable.");
  }
});

stopScanBtn?.addEventListener("click", () => {
  stopCamera(scanVideo);
  scanVideo.classList.add("hidden");
  scanCanvas.classList.add("hidden");
  imagePreview.classList.remove("hidden");

  captureBtn.disabled = true;
  useScanBtn.disabled = true;
  stopScanBtn.disabled = true;
  startScanBtn.disabled = false;
});

captureBtn?.addEventListener("click", () => {
  try{
    const { dataUrl } = captureAndWarp(scanVideo, scanCanvas);
    lastScanDataUrl = dataUrl;

    scanCanvas.classList.remove("hidden");
    scanVideo.classList.add("hidden");
    useScanBtn.disabled = false;
  }catch(err){
    alert("Could not capture. Try better lighting and keep the card fully in frame.");
  }
});

useScanBtn?.addEventListener("click", () => {
  if (!lastScanDataUrl) return;
  imagePreview.src = lastScanDataUrl;

  scanCanvas.classList.add("hidden");
  imagePreview.classList.remove("hidden");

  imageInput.value = "";
  useScanBtn.disabled = true;
});

autoFillBtn?.addEventListener("click", async () => {
  try {
    autoFillBtn.disabled = true;
    saveHint.textContent = "Reading card…";

    // Allow Auto-Fill from either an uploaded file or the last scanned capture
    // Determine an image to use and delegate to the shared auto-fill function
    let imgDataUrl = null;
    const file = imageInput.files?.[0] || null;
    if (lastScanDataUrl) imgDataUrl = lastScanDataUrl;
    else if (file) imgDataUrl = await fileToDataUrl(file);
    else {
      alert("Please upload an image or capture a scan first for Auto-Fill.");
      return;
    }

    await autoFillFromDataUrl(imgDataUrl);
  } catch (e) {
    console.error(e);
    alert("Auto-fill failed. Try a cleaner scan with better lighting.");
  } finally {
    autoFillBtn.disabled = false;
  }
});

// Shared auto-fill routine used by button, scan and upload
async function autoFillFromDataUrl(imgDataUrl){
  try{
    saveHint.textContent = "Reading card…";
    const text = await ocrImageDataUrl(imgDataUrl);
    const result = await recognizeCardFromText(text, { allowOnlineLookup: true });

    // Set game and show fields
    gameSelect.value = result.game;
    showGameFields();
    populateSetDropdown();

    if (result.game === "mtg") {
      const r = result.resolved || result.extracted;
      document.querySelector("#m_name").value = r.name || "";
      document.querySelector("#m_manaCost").value = r.manaCost || "";
      document.querySelector("#m_cardType").value = r.cardType || "";
      document.querySelector("#m_rulesText").value = r.rulesText || "";
      document.querySelector("#m_flavorText").value = r.flavorText || "";
      document.querySelector("#m_powerToughness").value = r.powerToughness || "";
      document.querySelector("#m_artist").value = r.artist || "";
      document.querySelector("#m_collectorNumber").value = r.collectorNumber || "";
      document.querySelector("#m_setCode").value = r.setCode || "";

      if (r.setCode) {
        const opt = [...setSelect.options].find(o => o.value.startsWith(`${r.setCode}::`));
        if (opt) setSelect.value = opt.value;
      }

    } else {
      const r = result.resolved || result.extracted;
      document.querySelector("#p_name").value = r.name || "";
      document.querySelector("#p_hp").value = r.hp || "";
      document.querySelector("#p_cardNumber").value = r.cardNumber || "";
      // Match Pokémon type case-insensitively against the select options
      if (r.type && pTypeSelect) {
        const want = String(r.type).toLowerCase();
        const opt = [...pTypeSelect.options].find(o => (o.value||"").toLowerCase() === want || (o.textContent||"").toLowerCase().includes(want));
        if (opt) pTypeSelect.value = opt.value;
        else pTypeSelect.value = "";
      } else {
        document.querySelector("#p_type").value = r.type || "";
      }
      document.querySelector("#p_illustrator").value = r.illustrator || "";

      if (r.setCode) {
        const opt = [...setSelect.options].find(o => o.value.startsWith(`${r.setCode}::`));
        if (opt) setSelect.value = opt.value;
      }
    }

    // update preview image if possible
    try{
      // If OCR/lookup returned an image URL, prefer it
      const poke = result.resolved || null;
      const img = poke?.images?.large || poke?.images?.small || imgDataUrl;
      if (img) imagePreview.src = img;
    }catch(e){ /* ignore */ }

    saveHint.textContent = "Auto-fill complete. Please review fields for accuracy.";
  }catch(e){
    console.error(e);
    alert("Auto-fill failed. Try a cleaner scan with better lighting.");
  }
}

  async function fillPokemonFromApi(card) {
    if (!card) return;
    // card is an API card object
    document.querySelector("#p_name").value = card.name || "";
    document.querySelector("#p_hp").value = card.hp || "";
    document.querySelector("#p_cardNumber").value = card.number ? `${card.number}/${card.set?.printedTotal || ""}`.replace(/\/$/, "") : "";
    document.querySelector("#p_illustrator").value = card.artist || "";
    // set type
    if (card.types && card.types.length && pTypeSelect) {
      const want = (card.types[0] || "").toLowerCase();
      const opt = [...pTypeSelect.options].find(o => (o.value||"").toLowerCase() === want || (o.textContent||"").toLowerCase().includes(want));
      if (opt) pTypeSelect.value = opt.value;
    }
    // set set dropdown if possible
    if (card.set && card.set.id) {
      const wantCode = (card.set.ptcgoCode || card.set.id || "").toUpperCase();
      const opt = [...setSelect.options].find(o => o.value.startsWith(`${wantCode}::`));
      if (opt) setSelect.value = opt.value;
    }
    // set image preview
    const img = card.images?.large || card.images?.small || null;
    if (img) imagePreview.src = img;
  }

async function searchPokemonAndFill(query){
  if (!query || !query.trim()) return null;
  const clean = String(query || "").replaceAll('"','').trim();
  // perform search and auto-fill the best match (kept for backward compatibility)
  const candidates = await searchPokemonCandidates(clean);
  if (!candidates || candidates.length === 0){ saveHint.textContent = "No results found."; return null; }
  const best = candidates[0];
  gameSelect.value = "pokemon";
  showGameFields();
  populateSetDropdown();
  await fillPokemonFromApi(best);
  saveHint.textContent = "Found and filled from API. Review fields.";
  // clear results UI
  renderSearchResults([]);
  return best;
}

// Return an array of candidate cards (best first). Supports name and set+number queries.
async function searchPokemonCandidates(query){
  if (!query || !query.trim()) return [];
  saveHint.textContent = "Searching online…";
  const clean = String(query||"").replaceAll('"','').trim();
  function normalize(s){ return String(s||"").toLowerCase().replace(/[^a-z0-9]/g,""); }
  function levenshtein(a,b){
    a = String(a||""); b = String(b||"");
    const m = a.length, n = b.length;
    const d = Array.from({length: m+1}, () => new Array(n+1).fill(0));
    for(let i=0;i<=m;i++) d[i][0]=i;
    for(let j=0;j<=n;j++) d[0][j]=j;
    for(let i=1;i<=m;i++){
      for(let j=1;j<=n;j++){
        const cost = a[i-1] === b[j-1] ? 0 : 1;
        d[i][j] = Math.min(d[i-1][j]+1, d[i][j-1]+1, d[i-1][j-1]+cost);
      }
    }
    return d[m][n];
  }

  try{
    // Detect set+number patterns like "SV1 12", "SV1:12", "SV1-12/198" etc.
    const setNumMatch = clean.match(/^([A-Za-z0-9]{1,8})[\s:\-]?\s*(\d{1,4}(?:\/\d{1,4})?)$/);
    let res = null;
    let candidates = [];

    if (setNumMatch){
      const code = setNumMatch[1];
      const number = setNumMatch[2];
      // try ptcgoCode + number
      try{ res = await pokemontcgFetch(`cards?q=${encodeURIComponent(`set.ptcgoCode:"${code}" number:"${number.split('/')[0]}"`)}&pageSize=10`); }catch(e){ res = null; }
      if (!res?.data?.length){
        try{ res = await pokemontcgFetch(`cards?q=${encodeURIComponent(`set.id:"${code}" number:"${number.split('/')[0]}"`)}&pageSize=10`); }catch(e){ res = null; }
      }
      candidates = res?.data || [];
      // still try name fallback if none
      if (!candidates.length){
        // fallthrough to name-based search
      } else {
        return candidates.slice(0,10);
      }
    }

    // Name-based search: exact quoted name, wildcard contains
    let path = `cards?q=${encodeURIComponent(`name:"${clean}"`)}&orderBy=releasedAt&order=desc&pageSize=40`;
    try{ res = await pokemontcgFetch(path); }catch(e){ res = null; }
    if (!res?.data?.length){
      path = `cards?q=${encodeURIComponent(`name:*${clean}*`)}&orderBy=releasedAt&order=desc&pageSize=80`;
      try{ res = await pokemontcgFetch(path); }catch(e){ res = null; }
    }

    candidates = res?.data || [];
    if (!candidates.length) { saveHint.textContent = "No results found."; return []; }

    // Score and sort candidates by closeness
    const qNorm = normalize(clean);
    const scored = candidates.map(c => {
      const nNorm = normalize(c.name || "");
      let score = 1000;
      if (nNorm === qNorm) score = 0;
      else if (nNorm.includes(qNorm)) score = 10 + (nNorm.length - qNorm.length);
      else score = 200 + levenshtein(nNorm, qNorm);
      return { card: c, score };
    }).sort((a,b) => a.score - b.score);

    return scored.map(s => s.card).slice(0,10);
  }catch(err){
    console.error(err);
    saveHint.textContent = "Search failed.";
    return [];
  }
}

function renderSearchResults(candidates){
  if (!pResultsEl) return;
  pResultsEl.innerHTML = "";
  if (!candidates || candidates.length === 0){ pResultsEl.style.display = 'none'; return; }
  pResultsEl.style.display = 'block';
  for (const c of candidates){
    const div = document.createElement('div');
    div.style.display = 'flex';
    div.style.gap = '8px';
    div.style.alignItems = 'center';
    div.style.padding = '6px';
    div.style.borderRadius = '6px';
    div.style.cursor = 'pointer';
    div.style.border = '1px solid rgba(255,255,255,0.04)';
    div.dataset.cardJson = JSON.stringify(c);

    const img = document.createElement('img');
    img.src = c.images?.small || c.images?.large || './assets/placeholder-card.png';
    img.alt = c.name || '';
    img.style.width = '48px';
    img.style.height = 'auto';
    img.style.borderRadius = '6px';

    const meta = document.createElement('div');
    meta.style.flex = '1';
    meta.innerHTML = `<strong style="font-size:0.95rem">${escapeHtml(c.name)}</strong>
      <div style="font-size:0.85rem; color:var(--muted);">${escapeHtml(c.set?.name || '')} — ${escapeHtml(c.number || '')}</div>`;

    const btn = document.createElement('button');
    btn.className = 'btn btn-small btn-ghost';
    btn.type = 'button';
    btn.textContent = 'Select';
    btn.style.marginLeft = '8px';

    div.appendChild(img);
    div.appendChild(meta);
    div.appendChild(btn);

    // click on row or button selects the card
    div.addEventListener('click', async () => {
      pSearchInput.value = c.name || '';
      await fillPokemonFromApi(c);
      renderSearchResults([]);
      saveHint.textContent = 'Filled from selected match.';
    });

    pResultsEl.appendChild(div);
  }
}

function escapeHtml(s){ return String(s||'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;'); }

  pSearchBtn?.addEventListener('click', async () => {
    const q = pSearchInput?.value || "";
    if (!q.trim()) { alert('Enter a Pokémon name or card number to search.'); return; }
    pSearchBtn.disabled = true;
    const candidates = await searchPokemonCandidates(q.trim());
    if (!candidates || candidates.length === 0){ pSearchBtn.disabled = false; return; }
    if (candidates.length === 1){
      await searchPokemonAndFill(q.trim());
      pSearchBtn.disabled = false;
      return;
    }
    // show top matches for user to pick
    renderSearchResults(candidates);
    pSearchBtn.disabled = false;
  });

  // support Enter key in search input
  pSearchInput?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); pSearchBtn?.click(); }
  });

createBinderBtn.addEventListener("click", () => {
  const res = createBinder(newBinderName.value);
  if (!res.ok){
    alert(res.error);
    return;
  }
  newBinderName.value = "";
  fillBinders();
  binderSelect.value = res.binder.id;
});

gameSelect.addEventListener("change", () => {
  showGameFields();
  populateSetDropdown();
});

// Auto-sync rarity symbol when main rarity changes
rarity?.addEventListener("change", () => {
  const map = {
    common: "●",
    uncommon: "◆",
    rare: "★",
    holo: "✦",
    ultra: "✷",
    secret: "✹"
  };
  const sym = map[rarity.value] || "";
  if (pRaritySymbolSelect) pRaritySymbolSelect.value = sym;
  if (mRaritySymbolSelect) mRaritySymbolSelect.value = sym;
});

initThemeSwitch(themeSwitch);
fillBinders();
showGameFields();
// Initialize simple selects before loading sets
fillSimpleSelect(
  pTypeSelect,
  POKEMON_TYPES.map(t => ({ key: t.key, label: t.label })),
  { placeholder: "Select a type…" }
);

fillSimpleSelect(
  pSetSymbolSelect,
  SET_SYMBOL_PRESETS.map(s => ({ key: s.key, label: s.label })),
  { placeholder: "Choose set symbol…" }
);

fillSimpleSelect(
  pRaritySymbolSelect,
  RARITIES.map(r => ({ key: r.symbol, label: `${r.label} (${r.symbol})` })),
  { placeholder: "Choose rarity symbol…" }
);

fillSimpleSelect(
  mRaritySymbolSelect,
  RARITIES.map(r => ({ key: r.symbol, label: `${r.label} (${r.symbol})` })),
  { placeholder: "Choose rarity symbol…" }
);

await loadAndPopulateSets();

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!validate()) return;

  const binderId = binderSelect.value;
  const binderName = binderSelect.options[binderSelect.selectedIndex]?.textContent || "";

  const g = gameSelect.value;
  const setMeta = getSelectedSetMeta();

  const file = imageInput.files?.[0] || null;
  const imageDataUrl =
    lastScanDataUrl ? lastScanDataUrl :
    (file ? await fileToDataUrl(file) : null);

  const base = {
    id: `card_${crypto.randomUUID()}`,
    createdAt: Date.now(),
    binderId,
    binderName,
    game: g,
    rarity: rarity.value,
    setCode: setMeta?.code || "",
    setName: setMeta?.name || "",
    imageDataUrl
  };

  const pokemon = (g === "pokemon") ? {
    name: document.querySelector("#p_name").value.trim(),
    hp: document.querySelector("#p_hp").value.trim(),
    type: document.querySelector("#p_type").value.trim(),
    evolutionStage: document.querySelector("#p_evoStage").value.trim(),
    evolvesFrom: document.querySelector("#p_evolvesFrom").value.trim(),
    ability: document.querySelector("#p_ability").value.trim(),
    attacks: document.querySelector("#p_attacks").value.trim(),
    weakness: document.querySelector("#p_weakness").value.trim(),
    resistance: document.querySelector("#p_resistance").value.trim(),
    retreatCost: document.querySelector("#p_retreat").value.trim(),
    flavorText: document.querySelector("#p_flavor").value.trim(),
    cardNumber: document.querySelector("#p_cardNumber").value.trim(),
    setSymbol: document.querySelector("#p_setSymbol").value.trim(),
    raritySymbol: document.querySelector("#p_raritySymbol").value.trim(),
    regulationMark: document.querySelector("#p_regMark").value.trim(),
    illustrator: document.querySelector("#p_illustrator").value.trim(),
    backNotes: document.querySelector("#p_backNotes").value.trim()
  } : null;

  const mtg = (g === "mtg") ? {
    name: document.querySelector("#m_name").value.trim(),
    manaCost: document.querySelector("#m_manaCost").value.trim(),
    cardType: document.querySelector("#m_cardType").value.trim(),
    subtype: document.querySelector("#m_subtype").value.trim(),
    setSymbol: document.querySelector("#m_setSymbol").value.trim(),
    rarity: document.querySelector("#m_rarity").value.trim(),
    powerToughness: document.querySelector("#m_powerToughness").value.trim(),
    rulesText: document.querySelector("#m_rulesText").value.trim(),
    flavorText: document.querySelector("#m_flavorText").value.trim(),
    artist: document.querySelector("#m_artist").value.trim(),
    collectorNumber: document.querySelector("#m_collectorNumber").value.trim(),
    setCode: document.querySelector("#m_setCode").value.trim(),
    language: document.querySelector("#m_language").value.trim(),
    expansionSymbol: document.querySelector("#m_expansionSymbol").value.trim(),
    raritySymbol: document.querySelector("#m_raritySymbol")?.value.trim() || "",
    backNotes: document.querySelector("#m_backNotes").value.trim()
  } : null;

  addCard({ ...base, pokemon, mtg });

  // UX: quick feedback + reset (keep binder selection)
  saveHint.textContent = "Saved! Returning you to Home…";
  form.reset();
  fillBinders();
  binderSelect.value = binderId;
  imagePreview.src = "./assets/placeholder-card.png";
  showGameFields();
  populateSetDropdown();

  setTimeout(() => {
    window.location.href = "./index.html";
  }, 400);
  // reset scan state
  lastScanDataUrl = null;
});
