import { qs, qsa, toast, formatGame } from "./modules/app.js";
import { getBinders, createBinder, setActiveBinderId, ensureDefaultBinder } from "./modules/storage.js";

const binderList = qs("#binderList");
const newBinderForm = qs("#newBinderForm");

function renderBinderList(){
  const binders = getBinders();
  if(!binders.length){
    binderList.innerHTML = `<p class="muted">No binders yet. Create one on the right.</p>`;
    return;
  }
  binderList.innerHTML = binders.map(b => `
    <div class="mini" style="margin-bottom:10px">
      <div class="row space-between">
        <div>
          <div style="font-weight:800">${b.name}</div>
          <div class="muted small">${formatGame(b.game)} • ${b.layout}-pocket • ${b.accent}</div>
        </div>
        <div class="row">
          <button class="btn" data-open="${b.id}">Use</button>
        </div>
      </div>
    </div>
  `).join("");

  qsa("[data-open]").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      const id = btn.getAttribute("data-open");
      setActiveBinderId(id);
      toast("Binder selected.");
      const b = getBinders().find(x=>x.id===id);
      location.href = `form.html?game=${encodeURIComponent(b.game)}&binder=${encodeURIComponent(id)}`;
    });
  });
}

qsa(".pick").forEach(btn=>{
  btn.addEventListener("click", ()=>{
    const game = btn.getAttribute("data-game");
    const binder = ensureDefaultBinder(game);
    toast(`${formatGame(game)} selected.`);
    location.href = `form.html?game=${encodeURIComponent(game)}&binder=${encodeURIComponent(binder.id)}`;
  });
});

newBinderForm?.addEventListener("submit", (e)=>{
  e.preventDefault();
  const game = qs("#binderGame").value;
  const name = qs("#binderName").value.trim();
  const layout = qs("#layout").value;
  const accent = qs("#accent").value;
  const coverColor = qs("#coverColor").value;
  const pageColor = qs("#pageColor").value;

  if(!game || name.length < 2){
    toast("Choose a game and enter a binder name.");
    return;
  }
  const binder = createBinder({game, name, layout, accent, coverColor, pageColor});
  toast("Binder created!");
  location.href = `form.html?game=${encodeURIComponent(game)}&binder=${encodeURIComponent(binder.id)}`;
});

renderBinderList();
