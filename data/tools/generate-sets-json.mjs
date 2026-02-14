// tools/generate-sets-json.mjs
import fs from "fs/promises";
import path from "path";

const OUT_PATH = path.join(process.cwd(), "data", "sets.json");

// ---------- helpers ----------
const toYear = (dateStr) => {
  if (!dateStr) return 0;
  const y = Number(String(dateStr).slice(0, 4));
  return Number.isFinite(y) ? y : 0;
};

const uniq = (arr) => [...new Set(arr)];

const sortNewestFirst = (a, b) => {
  // Prefer year desc, then name asc
  const ay = a.year ?? 0;
  const by = b.year ?? 0;
  if (by !== ay) return by - ay;
  return String(a.name ?? "").localeCompare(String(b.name ?? ""));
};

const pokemonDefaultRarities = [
  "Common",
  "Uncommon",
  "Rare",
  "Holo Rare",
  "Ultra Rare",
  "Secret Rare"
];

const mtgDefaultRarities = [
  "Common",
  "Uncommon",
  "Rare",
  "Mythic Rare",
  "Special"
];

// ---------- fetchers ----------
async function fetchJson(url) {
  const res = await fetch(url, {
    headers: { "Accept": "application/json" }
  });
  if (!res.ok) throw new Error(`Fetch failed ${res.status} ${res.statusText}: ${url}`);
  return res.json();
}

async function getPokemonSets1999to2026() {
  // Pokémon TCG API supports pagination; pageSize max is typically 250/500.
  // We'll loop pages until we stop receiving results.
  const pageSize = 250;
  let page = 1;
  let all = [];

  while (true) {
    const url = `https://api.pokemontcg.io/v2/sets?page=${page}&pageSize=${pageSize}&orderBy=-releaseDate`;
    const data = await fetchJson(url);
    const chunk = data?.data ?? [];
    if (!chunk.length) break;
    all.push(...chunk);
    page += 1;
    // Safety stop for runaway loops
    if (page > 50) break;
  }

  // Filter 1999–2026 inclusive (English-era coverage begins 1999).
  const filtered = all.filter(s => {
    const y = toYear(s.releaseDate);
    return y >= 1999 && y <= 2026;
  });

  // Pokémon "series" field is already the high-level grouping (Base, Neo, EX, etc.)
  const bySeries = new Map();
  for (const s of filtered) {
    const series = s.series || "Unknown";
    const code = s.ptcgoCode || s.id || s.name; // use ptcgoCode if present
    const year = toYear(s.releaseDate);

    const entry = {
      name: s.name,
      code,
      year,
      rarities: pokemonDefaultRarities
    };

    if (!bySeries.has(series)) bySeries.set(series, []);
    bySeries.get(series).push(entry);
  }

  // Determine "current" series based on max year in dataset
  const seriesObjs = [...bySeries.entries()].map(([seriesName, expansions]) => {
    const deduped = uniq(expansions.map(e => JSON.stringify(e))).map(x => JSON.parse(x));
    deduped.sort(sortNewestFirst);

    const newestYear = deduped[0]?.year ?? 0;
    return { name: seriesName, current: false, newestYear, expansions: deduped };
  });

  const maxYear = Math.max(...seriesObjs.map(s => s.newestYear), 0);
  for (const s of seriesObjs) {
    if (s.newestYear === maxYear) s.current = true;
  }

  // Sort series: current first, then newestYear desc, then name
  seriesObjs.sort((a, b) => {
    const ac = a.current ? 1 : 0;
    const bc = b.current ? 1 : 0;
    if (bc !== ac) return bc - ac;
    if ((b.newestYear ?? 0) !== (a.newestYear ?? 0)) return (b.newestYear ?? 0) - (a.newestYear ?? 0);
    return String(a.name).localeCompare(String(b.name));
  });

  // Strip helper
  return seriesObjs.map(({ newestYear, ...rest }) => rest);
}

async function getMtgSets1993to2026() {
  const data = await fetchJson("https://api.scryfall.com/sets");
  const sets = data?.data ?? [];

  const filtered = sets.filter(s => {
    const y = toYear(s.released_at);
    return y >= 1993 && y <= 2026;
  });

  // Group by "set_type" (expansion/core/masters/commander/etc.)
  const byType = new Map();
  for (const s of filtered) {
    const type = s.set_type || "unknown";
    const code = (s.code || "").toUpperCase();
    const year = toYear(s.released_at);

    const entry = {
      name: s.name,
      code: code || s.id || s.name,
      year,
      rarities: mtgDefaultRarities
    };

    if (!byType.has(type)) byType.set(type, []);
    byType.get(type).push(entry);
  }

  const seriesObjs = [...byType.entries()].map(([typeName, expansions]) => {
    const deduped = uniq(expansions.map(e => JSON.stringify(e))).map(x => JSON.parse(x));
    deduped.sort(sortNewestFirst);
    const newestYear = deduped[0]?.year ?? 0;
    return { name: typeName, current: false, newestYear, expansions: deduped };
  });

  const maxYear = Math.max(...seriesObjs.map(s => s.newestYear), 0);
  for (const s of seriesObjs) {
    if (s.newestYear === maxYear) s.current = true;
  }

  seriesObjs.sort((a, b) => {
    const ac = a.current ? 1 : 0;
    const bc = b.current ? 1 : 0;
    if (bc !== ac) return bc - ac;
    if ((b.newestYear ?? 0) !== (a.newestYear ?? 0)) return (b.newestYear ?? 0) - (a.newestYear ?? 0);
    return String(a.name).localeCompare(String(b.name));
  });

  return seriesObjs.map(({ newestYear, ...rest }) => rest);
}

// ---------- main ----------
(async function main() {
  const [pokemonSeries, mtgSeries] = await Promise.all([
    getPokemonSets1999to2026(),
    getMtgSets1993to2026()
  ]);

  const out = {
    pokemon: { label: "Pokémon", series: pokemonSeries },
    mtg: { label: "Magic: The Gathering", series: mtgSeries }
  };

  await fs.mkdir(path.dirname(OUT_PATH), { recursive: true });
  await fs.writeFile(OUT_PATH, JSON.stringify(out, null, 2), "utf-8");

  console.log(`✅ Wrote ${OUT_PATH}`);
})();
