import { qs, qsa, toast, loadSets, getQuery, formatGame } from "./modules/app.js";
import { getBinders, getCards, setCards, setActiveBinderId, ensureDefaultBinder } from "./modules/storage.js";
import { renderFields } from "./modules/fields.js";
import { validateRequired } from "./modules/validation.js";

const params = getQuery();
let game = params.get("game");
let binderId = params.get("binder");

const subtitle = qs("#subtitle");
const heading = qs("#heading");
const binderBanner = qs("#binderBanner");
const seriesSel = qs("#series");
const expSel = qs("#expansion");
const form = qs("#cardForm");
const resetBtn = qs("#resetBtn");

function activeBinder(){
  const binders = getBinders();
  return binders.find(b => b.id === binderId);
}

function ensureValidContext(){
  if(!game){
    const b = getBinders().find(x => x.id === binderId);
    if(b) game = b.game;
  }
  if(!game){
    const b = ensureDefaultBinder("pokemon");
    game = "pokemon";
    binderId = b.id;
  }
  if(!binderId){
    const b = ensureDefaultBinder(game);
    binderId = b.id;
  }
  setActiveBinderId(binderId);
}

function applyBinderTheme(){
  const b = activeBinder();
  if(!b) return;
  binderBanner.textContent = `Saving to: ${b.name} (${formatGame(b.game)})`;
  document.documentElement.style.setProperty("--accent",
    b.accent === "neon" ? "#a78bfa" :
    b.accent === "vintage" ? "#fbbf24" :
    "#60a5fa"
  );
}

function bindDependentDropdowns(dataset){
  const series = dataset[game]?.series ?? [];
// Auto pick first series & populate expansions
if (series.length) {
  seriesSel.value = series[0].name;
  seriesSel.dispatchEvent(new Event("change"));
}

  seriesSel.innerHTML = `<option value="">Choose…</option>` + series.map(s => `<option value="${escapeAttr(s.name)}">${s.name}</option>`).join("");
  expSel.innerHTML = `<option value="">Choose a series first…</option>`;

  seriesSel.addEventListener("change", ()=>{
    const pick = series.find(s => s.name === seriesSel.value);
    const exps = pick?.expansions ?? [];
    expSel.innerHTML = `<option value="">Choose…</option>` + exps.map(x => `<option value="${escapeAttr(x)}">${x}</option>`).join("");
  });
}

function buildCardObject(imageDataUrl){
  const data = {};
  qsa("#dynamicFields input, #dynamicFields textarea, #dynamicFields select").forEach(el=>{
    data[el.name] = el.value.trim();
  });

  return {
    id: crypto.randomUUID?.() || `${Date.now()}_${Math.random().toString(16).slice(2)}`,
    binderId,
    game,
    series: seriesSel.value,
    expansion: expSel.value,
    fields: data,
    imageDataUrl: imageDataUrl || "",
    createdAt: Date.now()
  };
}

async function fileToDataUrl(file){
  return new Promise((resolve, reject)=>{
    const fr = new FileReader();
    fr.onerror = ()=> reject(new Error("File read failed"));
    fr.onload = ()=> resolve(String(fr.result || ""));
    fr.readAsDataURL(file);
  });
}

form?.addEventListener("submit", async (e)=>{
  e.preventDefault();

  const okSeries = validateRequired(seriesSel);
  const okExp = validateRequired(expSel);

  const nameInput = qs("#name");
  const okName = nameInput ? validateRequired(nameInput) : true;

  if(!(okSeries && okExp && okName)){
    toast("Please fill the required fields.");
    form.reportValidity();
    return;
  }

  const file = qs("#image").files?.[0];
  let dataUrl = "";
  if(file){
    if(file.size > 1_800_000){
      toast("Image is large. Consider a smaller image for local storage.");
    }
    dataUrl = await fileToDataUrl(file);
  }

  const cards = getCards();
  cards.unshift(buildCardObject(dataUrl));
  setCards(cards);

  toast("Card saved!");
  form.reset();
  expSel.innerHTML = `<option value="">Choose a series first…</option>`;
});

resetBtn?.addEventListener("click", ()=>{
  form.reset();
  expSel.innerHTML = `<option value="">Choose a series first…</option>`;
  toast("Cleared.");
});

function escapeAttr(s){
  return String(s).replaceAll('"',"&quot;");
}

(async function init(){
  ensureValidContext();

  subtitle.textContent = `Add a ${formatGame(game)} card`;
  heading.textContent = `Add ${formatGame(game)} Card`;

  renderFields(game);
  applyBinderTheme();

  const sets = await loadSets();
  bindDependentDropdowns(sets);
})();
