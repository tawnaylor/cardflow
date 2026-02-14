import { getBinders, createBinder, addCard } from "./storage.mjs";
import { initThemeSwitch, fillSelect } from "./ui.mjs";
import { loadSets, flattenSets } from "./data.mjs";

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

initThemeSwitch(themeSwitch);
fillBinders();
showGameFields();
await loadAndPopulateSets();

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!validate()) return;

  const binderId = binderSelect.value;
  const binderName = binderSelect.options[binderSelect.selectedIndex]?.textContent || "";

  const g = gameSelect.value;
  const setMeta = getSelectedSetMeta();

  const file = imageInput.files?.[0] || null;
  const imageDataUrl = file ? await fileToDataUrl(file) : null;

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
});
