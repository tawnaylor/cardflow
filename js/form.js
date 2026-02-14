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
  const seriesArr = dataset[game]?.series ?? [];

  // NEW: Sort series with current=true first, then alpha by name
  const sortedSeries = [...seriesArr].sort((a, b) => {
    const ac = a.current ? 1 : 0;
    const bc = b.current ? 1 : 0;
    if (bc !== ac) return bc - ac;
    return (a.name || "").localeCompare(b.name || "");
  });

  seriesSel.innerHTML =
    `<option value="">Choose…</option>` +
    sortedSeries.map(s => {
      const tag = s.current ? " (Current)" : "";
      return `<option value="${escapeAttr(s.name)}">${s.name}${tag}</option>`;
    }).join("");

  expSel.innerHTML = `<option value="">Choose a series first…</option>`;

  seriesSel.addEventListener("change", ()=>{
    const pick = sortedSeries.find(s => s.name === seriesSel.value);
    const rawExps = pick?.expansions ?? [];

    // Backward compatible: allow expansions to be strings OR objects
    const exps = rawExps.map(x => {
      if (typeof x === "string") {
        return { name: x, code: x, year: 0, rarities: [] };
      }
      return {
        name: x.name || "",
        code: x.code || x.name || "",
        year: Number(x.year || 0),
        rarities: Array.isArray(x.rarities) ? x.rarities : []
      };
    });

    // NEW: Sort newest-first (year desc, then name)
    exps.sort((a, b) => {
      if ((b.year || 0) !== (a.year || 0)) return (b.year || 0) - (a.year || 0);
      return (a.name || "").localeCompare(b.name || "");
    });

    expSel.innerHTML =
      `<option value="">Choose…</option>` +
      exps.map(e => {
        const yearTag = e.year ? ` • ${e.year}` : "";
        return `<option value="${escapeAttr(e.code)}" data-name="${escapeAttr(e.name)}" data-year="${e.year}">${e.name}${yearTag}</option>`;
      }).join("");

    // Optional: auto-select first expansion after series pick
    if (exps.length) expSel.value = exps[0].code;
  });
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

  const selectedOpt = expSel.selectedOptions?.[0];
  const expansionCode = expSel.value;
  const expansionName = selectedOpt?.dataset?.name || selectedOpt?.textContent?.split("•")[0]?.trim() || "";
  const expansionYear = Number(selectedOpt?.dataset?.year || 0);

  return {
    id: crypto.randomUUID?.() || `${Date.now()}_${Math.random().toString(16).slice(2)}`,
    binderId,
    game,
    series: seriesSel.value,

    // NEW: expansion fields
    expansionCode,
    expansionName,
    expansionYear,

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
