// Lightweight symbol lists + icon helpers (SVG-as-data-URI)
export const POKEMON_TYPES = [
  { key: "Colorless", label: "Colorless" },
  { key: "Darkness", label: "Darkness" },
  { key: "Dragon", label: "Dragon" },
  { key: "Fairy", label: "Fairy" },
  { key: "Fighting", label: "Fighting" },
  { key: "Fire", label: "Fire" },
  { key: "Grass", label: "Grass" },
  { key: "Lightning", label: "Lightning" },
  { key: "Metal", label: "Metal" },
  { key: "Psychic", label: "Psychic" },
  { key: "Water", label: "Water" }
];

export const RARITIES = [
  { key: "common", label: "Common", symbol: "●" },
  { key: "uncommon", label: "Uncommon", symbol: "◆" },
  { key: "rare", label: "Rare", symbol: "★" },
  { key: "holo", label: "Holo", symbol: "✦" },
  { key: "ultra", label: "Ultra Rare", symbol: "✷" },
  { key: "secret", label: "Secret Rare", symbol: "✹" }
];

export const SET_SYMBOL_PRESETS = [
  { key: "none", label: "— (none)" },
  { key: "generic", label: "Generic Set Mark" },
  { key: "promo", label: "Promo" },
  { key: "special", label: "Special / Event" }
];

function svgData(svg) {
  const encoded = encodeURIComponent(svg)
    .replaceAll("'", "%27")
    .replaceAll('"', "%22");
  return `data:image/svg+xml;charset=UTF-8,${encoded}`;
}

const ENERGY_SVGS = {
  Fire: svgData(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
    <path fill="white" d="M34 2c2 10-4 14-4 20 0 6 6 8 6 14 0 6-5 10-11 10S14 42 14 34c0-9 8-15 12-24-1 10 8 10 8 20 0-8 6-10 0-28z"/>
  </svg>`),
  Water: svgData(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
    <path fill="white" d="M32 4C22 18 14 28 14 40c0 10 8 20 18 20s18-10 18-20C50 28 42 18 32 4z"/>
  </svg>`),
  Grass: svgData(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
    <path fill="white" d="M48 6C30 10 16 28 16 42c0 10 8 16 16 16 16 0 24-18 16-52z"/>
  </svg>`),
  Lightning: svgData(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
    <path fill="white" d="M36 2 10 36h18L22 62l32-40H36z"/>
  </svg>`),
  Psychic: svgData(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
    <path fill="white" d="M32 10c-12 0-22 10-22 22 0 9 6 17 14 21-3-5-2-12 3-16 7-6 16-1 18 7 7-4 9-13 5-20-4-9-9-14-18-14z"/>
  </svg>`),
  Fighting: svgData(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
    <path fill="white" d="M14 34c6-12 14-18 22-18 10 0 18 8 18 18 0 12-10 22-22 22S14 46 14 34z"/>
  </svg>`),
  Darkness: svgData(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
    <path fill="white" d="M40 6c-8 2-14 10-14 20 0 14 10 24 24 24 4 0 8-1 10-3-4 9-14 15-26 15C18 62 6 50 6 34 6 20 20 6 40 6z"/>
  </svg>`),
  Metal: svgData(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
    <path fill="white" d="M32 6 10 20v24l22 14 22-14V20L32 6zm0 14a12 12 0 1 1 0 24 12 12 0 0 1 0-24z"/>
  </svg>`),
  Dragon: svgData(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
    <path fill="white" d="M46 12c-10 0-18 8-18 18 0 6 3 11 8 14l-4 14 10-10c10-1 18-9 18-20 0-9-6-16-14-16z"/>
  </svg>`),
  Fairy: svgData(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
    <path fill="white" d="M32 8l6 14 14 6-14 6-6 14-6-14-14-6 14-6 6-14z"/>
  </svg>`),
  Colorless: svgData(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
    <circle cx="32" cy="32" r="18" fill="white"/>
  </svg>`)
};

const RARITY_SVGS = {
  common: svgData(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><circle cx="32" cy="32" r="10" fill="white"/></svg>`),
  uncommon: svgData(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><path fill="white" d="M32 12 52 32 32 52 12 32z"/></svg>`),
  rare: svgData(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><path fill="white" d="M32 10l6 14 14 2-10 10 2 14-12-6-12 6 2-14-10-10 14-2z"/></svg>`),
  holo: svgData(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><path fill="white" d="M32 8l10 18 18 10-18 10-10 18-10-18-18-10 18-10 10-18z"/></svg>`),
  ultra: svgData(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><path fill="white" d="M32 6l8 18 20 2-16 12 6 20-18-10-18 10 6-20-16-12 20-2z"/></svg>`),
  secret: svgData(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><path fill="white" d="M32 4l7 16 17 7-17 7-7 16-7-16-17-7 17-7z"/><circle cx="32" cy="32" r="6" fill="white"/></svg>`)
};

export function iconForEnergy(typeKey) {
  return ENERGY_SVGS[typeKey] || "";
}
export function iconForRarity(rarityKey) {
  return RARITY_SVGS[rarityKey] || "";
}
