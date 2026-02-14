/**
 * Build full /data/pokemon_sets.json and /data/mtg_sets.json
 * Schema matches your existing app:
 * { game, range, series: [{ name, startYear, expansions: [{name, code, releaseYear}] }] }
 *
 * Usage:
 *   node ./tools/build_sets.mjs
 */

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "..");
const OUT_POKEMON = path.join(ROOT, "data", "pokemon_sets.json");
const OUT_MTG = path.join(ROOT, "data", "mtg_sets.json");

const YEAR_MIN = 1992;
const YEAR_MAX = 2026;

function yearOf(dateStr) {
  if (!dateStr) return null;
  const y = Number(String(dateStr).slice(0, 4));
  return Number.isFinite(y) ? y : null;
}

function clampYear(y) {
  if (!Number.isFinite(y)) return null;
  if (y < YEAR_MIN) return null;
  if (y > YEAR_MAX) return null;
  return y;
}

function groupBy(arr, keyFn) {
  const m = new Map();
  for (const item of arr) {
    const k = keyFn(item);
    if (!m.has(k)) m.set(k, []);
    m.get(k).push(item);
  }
  return m;
}

async function delay(ms){ return new Promise(r => setTimeout(r, ms)); }

async function fetchJSON(url, opts = {}, { retries = 3, backoff = 500 } = {}) {
  let attempt = 0;
  let lastErr = null;
  while (attempt < retries) {
    try {
      const res = await fetch(url, opts);
      if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText} for ${url}`);
      return res.json();
    } catch (err) {
      lastErr = err;
      attempt++;
      if (attempt >= retries) break;
      const wait = backoff * Math.pow(2, attempt - 1);
      console.warn(`fetchJSON failed (attempt ${attempt}) for ${url}: ${err.message}. Retrying in ${wait}ms.`);
      await delay(wait);
    }
  }
  throw lastErr;
}

/* ----------------------------- MTG (Scryfall) ----------------------------- */

function normalizeMtgSetTypeToSeriesName(set_type) {
  // Scryfall set types: core, expansion, masters, commander, draft_innovation, fun, starter, etc.
  // You wanted "series and expansions". We'll group by set_type as "series".
  const map = {
    core: "Core Sets",
    expansion: "Expansions",
    masters: "Masters",
    commander: "Commander",
    draft_innovation: "Draft Innovation",
    archenemy: "Archenemy",
    planechase: "Planechase",
    duel_deck: "Duel Decks",
    from_the_vault: "From the Vault",
    premium_deck: "Premium Deck",
    starter: "Starter",
    box: "Boxed Sets",
    funny: "Un-sets & Funny",
    token: "Tokens",
    memorabilia: "Memorabilia",
    alchemy: "Alchemy",
    minigame: "Minigame",
    vanguard: "Vanguard",
  };
  return map[set_type] || `Other (${set_type || "unknown"})`;
}

async function buildMtg() {
  const all = await fetchJSON("https://api.scryfall.com/sets"); // :contentReference[oaicite:2]{index=2}
  const sets = Array.isArray(all?.data) ? all.data : [];

  const expansions = [];
  for (const s of sets) {
    const y = clampYear(yearOf(s.released_at));
    if (!y) continue;

    // Use Scryfall "code" as primary code; if missing, skip
    if (!s.code || !s.name) continue;

    expansions.push({
      name: s.name,
      code: String(s.code).toUpperCase(),
      releaseYear: y,
      seriesKey: normalizeMtgSetTypeToSeriesName(s.set_type),
    });
  }

  // Group by "seriesKey"
  const grouped = groupBy(expansions, (x) => x.seriesKey);
  const series = [];

  for (const [seriesName, items] of grouped.entries()) {
    items.sort((a, b) => (a.releaseYear - b.releaseYear) || a.name.localeCompare(b.name));
    const startYear = items[0]?.releaseYear ?? YEAR_MIN;

    series.push({
      name: seriesName,
      startYear,
      expansions: items.map(({ name, code, releaseYear }) => ({ name, code, releaseYear })),
    });
  }

  // Stable order: by startYear then name
  series.sort((a, b) => (a.startYear - b.startYear) || a.name.localeCompare(b.name));

  return {
    game: "mtg",
    range: `${YEAR_MIN}-${YEAR_MAX}`,
    series,
  };
}

/* -------------------------- Pokémon (pokemontcg.io) ------------------------- */

async function buildPokemon() {
  // Endpoint documented here: GET https://api.pokemontcg.io/v2/sets :contentReference[oaicite:3]{index=3}
  // Try official API with retries; if that fails, try a public GitHub mirror of sets
  let all = null;
  try {
    all = await fetchJSON("https://api.pokemontcg.io/v2/sets", {}, { retries: 4, backoff: 800 });
  } catch (err) {
    console.warn("Primary pokemontcg.io fetch failed:", err.message);
    // Fallback: try GitHub mirror repository (raw JSON). This is a best-effort fallback.
    const gh = "https://raw.githubusercontent.com/PokemonTCG/pokemon-tcg-data/master/json/sets.json";
    try {
      all = await fetchJSON(gh, {}, { retries: 3, backoff: 500 });
      // The GitHub JSON format may be an array; normalize to { data: [...] }
      if (Array.isArray(all)) all = { data: all };
    } catch (err2) {
      console.warn("Fallback GitHub fetch failed:", err2.message);
      throw err; // rethrow original error to be handled by caller
    }
  }
  const sets = Array.isArray(all?.data) ? all.data : [];

  const expansions = [];
  for (const s of sets) {
    // pokemontcg.io uses "releaseDate" like "1999/01/09"
    const y = clampYear(yearOf(String(s.releaseDate || "").replaceAll("/", "-")));
    if (!y) continue;

    // We want:
    // series name -> s.series (e.g., "Sword & Shield")
    // expansion name -> s.name (e.g., "Evolving Skies")
    // code -> s.ptcgoCode if available, else s.id
    const seriesName = s.series || "Other";
    const code = (s.ptcgoCode || s.id || "").toString().toUpperCase();
    if (!s.name || !code) continue;

    expansions.push({
      name: s.name,
      code,
      releaseYear: y,
      seriesName,
    });
  }

  const grouped = groupBy(expansions, (x) => x.seriesName);
  const series = [];

  for (const [seriesName, items] of grouped.entries()) {
    items.sort((a, b) => (a.releaseYear - b.releaseYear) || a.name.localeCompare(b.name));
    const startYear = items[0]?.releaseYear ?? YEAR_MIN;

    series.push({
      name: seriesName,
      startYear,
      expansions: items.map(({ name, code, releaseYear }) => ({ name, code, releaseYear })),
    });
  }

  series.sort((a, b) => (a.startYear - b.startYear) || a.name.localeCompare(b.name));

  return {
    game: "pokemon",
    range: `${YEAR_MIN}-${YEAR_MAX}`,
    series,
  };
}

/* ---------------------------------- Main ---------------------------------- */

async function main() {
  await fs.mkdir(path.join(ROOT, "data"), { recursive: true });

  console.log("Building MTG sets from Scryfall…");
  const mtg = await buildMtg();
  await fs.writeFile(OUT_MTG, JSON.stringify(mtg, null, 2), "utf8");
  console.log(`Wrote: ${OUT_MTG}`);

  console.log("Building Pokémon sets from pokemontcg.io…");
  const pokemon = await buildPokemon();
  await fs.writeFile(OUT_POKEMON, JSON.stringify(pokemon, null, 2), "utf8");
  console.log(`Wrote: ${OUT_POKEMON}`);

  console.log("Done.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
