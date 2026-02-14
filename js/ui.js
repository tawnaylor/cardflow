const UI = {
  init() {
    const app = document.getElementById('app');
    app.innerHTML = '<h1>Cardflow</h1><div id="cards"></div>';
    this.renderCards();
  },
  renderCards() {
    const container = document.getElementById('cards');
    const cards = Storage.load('cardflow.cards', CARD_DATA);
    container.innerHTML = cards.map(c => `<article class="card"><h2>${c.front}</h2><p>${c.back}</p></article>`).join('\n');
  }
};
const rarityRank = { common: 1, rare: 2, holo: 3, secret: 4 };

export function money(n) {
  const v = Number(n || 0);
  return v.toLocaleString(undefined, { style: "currency", currency: "USD" });
}

export function buildFloaters(container) {
  const specs = [
    { top: "10%", left: "52%", rot: "-10deg", dur: "4.4s", opacity: 0.85 },
    { top: "32%", left: "72%", rot: "8deg", dur: "5.1s", opacity: 0.78 },
    { top: "14%", left: "78%", rot: "16deg", dur: "4.7s", opacity: 0.72 },
    { top: "52%", left: "56%", rot: "-6deg", dur: "5.6s", opacity: 0.70 },
  ];

  container.innerHTML = "";
  specs.forEach((s) => {
    const d = document.createElement("div");
    d.className = "floater";
    d.style.top = s.top;
    d.style.left = s.left;
    d.style.setProperty("--rot", s.rot);
    d.style.setProperty("--dur", s.dur);
    d.style.opacity = String(s.opacity);
    container.appendChild(d);
  });
}

export function sortCards(cards, mode) {
  const arr = [...cards];
  if (mode === "value") {
    arr.sort((a, b) => (Number(b.value) || 0) - (Number(a.value) || 0));
    return arr;
  }
  if (mode === "rarity") {
    arr.sort((a, b) => (rarityRank[b.rarity] || 0) - (rarityRank[a.rarity] || 0));
    return arr;
  }
  arr.sort((a, b) => (Number(b.addedAt) || 0) - (Number(a.addedAt) || 0));
  return arr;
}

export function filterCards(cards, game) {
  if (game === "all") return cards;
  return cards.filter((c) => c.game === game);
}

export function renderGrid9(gridEl, cards, onInspect) {
  gridEl.innerHTML = "";
  const page = cards.slice(0, 9);

  for (let i = 0; i < 9; i++) {
    const slot = document.createElement("div");
    slot.className = "slot";
    slot.setAttribute("role", "listitem");

    const card = page[i];
    if (!card) {
      gridEl.appendChild(slot);
      continue;
    }

    const tile = document.createElement("button");
    tile.type = "button";
    tile.className = `tile rarity-${card.rarity || "common"}`;
    tile.setAttribute("aria-label", `${card.name} (${card.game}) — ${card.set} ${card.number}`);

    const art = document.createElement("div");
    art.className = "tile__art";
    art.style.background = artBg(card);

    const bottom = document.createElement("div");
    bottom.className = "tile__bottom";

    const name = document.createElement("div");
    name.className = "tile__name";
    name.textContent = card.name;

    const meta = document.createElement("div");
    meta.className = "tile__meta";
    meta.innerHTML = `<span>${card.setCode || ""}</span><span>#${card.number}</span>`;

    const badgeRow = document.createElement("div");
    badgeRow.className = "badgeRow";

    const badge = document.createElement("div");
    badge.className = "badge";
    badge.textContent = (card.rarity || "common").toUpperCase();

    const value = document.createElement("div");
    value.className = "value";
    value.textContent = money(card.value);

    badgeRow.append(badge, value);
    bottom.append(name, meta, badgeRow);

    tile.append(art, bottom);
    tile.addEventListener("click", () => onInspect(card));

    slot.appendChild(tile);
    gridEl.appendChild(slot);
  }
}

function artBg(card) {
  // Pokémon = brighter blue/pink. MTG = purple/blue.
  const base = card.game === "pokemon"
    ? "linear-gradient(135deg, rgba(0,194,255,.20), rgba(255,56,213,.14))"
    : "linear-gradient(135deg, rgba(157,0,255,.18), rgba(0,194,255,.12))";

  const rarityGlow = card.rarity === "secret"
    ? "radial-gradient(circle at 30% 25%, rgba(255,215,0,.24), transparent 55%)"
    : card.rarity === "holo"
      ? "radial-gradient(circle at 30% 25%, rgba(0,194,255,.24), transparent 55%)"
      : card.rarity === "rare"
        ? "radial-gradient(circle at 30% 25%, rgba(255,255,255,.14), transparent 55%)"
        : "radial-gradient(circle at 30% 25%, rgba(255,255,255,.10), transparent 55%)";

  return `${rarityGlow}, ${base}, linear-gradient(180deg, rgba(0,0,0,.10), rgba(0,0,0,.34))`;
}

export function openInspectModal(modal, card) {
  const $ = (id) => document.getElementById(id);

  $("#mGame").textContent = card.game === "pokemon" ? "Pokémon" : "Magic: The Gathering";
  $("#mName").textContent = card.name;
  $("#mSet").textContent = `${card.set} (${card.setCode || "—"})`;
  $("#mNum").textContent = card.number;
  $("#mRarity").textContent = (card.rarity || "common").toUpperCase();
  $("#mValue").textContent = money(card.value);

  const preview = document.getElementById("modalPreview");
  preview.style.background = artBg(card);

  modal.showModal();
}

export function flipBinderAnimation() {
  const left = document.querySelector(".page--left");
  const right = document.querySelector(".page--right");

  left.classList.add("is-visible");
  right.classList.add("is-visible");

  right.classList.remove("is-flipping");
  void right.offsetWidth; // restart animation
  right.classList.add("is-flipping");

  window.setTimeout(() => {
    left.classList.remove("is-visible");
    right.classList.remove("is-visible");
    right.classList.remove("is-flipping");
  }, 850);
}

export function computeStats(cards) {
  const total = cards.reduce((sum, c) => sum + (Number(c.value) || 0), 0);
  const newest = [...cards].sort((a,b) => (Number(b.addedAt)||0) - (Number(a.addedAt)||0))[0];
  return {
    count: cards.length,
    totalValue: total,
    newestName: newest ? newest.name : "—"
  };
}
