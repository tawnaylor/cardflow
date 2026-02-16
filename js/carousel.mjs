import { listCards } from "./storage.mjs";

function isRarest(rarityRaw) {
  const r = (rarityRaw || "").toLowerCase();
  return (
    r.includes("rare secret") ||
    r.includes("rare rainbow") ||
    r.includes("rare shiny") ||
    r.includes("rare hyper") ||
    r.includes("rare ultra") ||
    r.includes("rare holo") ||
    r.includes("amazing rare") ||
    r.includes("legend") ||
    r.includes("gx") ||
    r.includes("ex") ||
    r.includes("vmax") ||
    r.includes("vstar")
  );
}

export function renderCarousel() {
  const host = document.getElementById("rarityCarousel");
  if (!host) return;

  const rarest = listCards().filter(c => isRarest(c.rarity)).slice(0, 20);
  if (rarest.length === 0) {
    host.innerHTML = `<div class="notice">No rarest cards yet. Add Ultra/Secret/Shiny/etc. to see them here.</div>`;
    return;
  }

  const items = [...rarest, ...rarest];

  host.innerHTML = `
    <div class="carousel" aria-label="Rarest cards carousel">
      <div class="carousel-track">
        ${items.map(c => `
          <a class="carousel-item" href="card.html?id=${encodeURIComponent(c.id)}">
            <img src="${c.imageDataUrl || c.imageUrl || "assets/placeholder-card.png"}" alt="${c.name || "Card image"}" loading="lazy" />
            <div class="label">
              <div><strong>${c.name || "Unknown"}</strong> <span class="badge">x${c.qty || 1}</span></div>
              <div class="small">${c.rarity || "Unknown rarity"}</div>
            </div>
          </a>
        `).join("")}
      </div>
    </div>
  `;
}
