function cleanLines(text) {
  return String(text || "")
    .split(/\r?\n/)
    .map(l => l.trim())
    .filter(Boolean);
}

function guessGame(text) {
  const t = String(text || "").toLowerCase();
  if (/deckmaster|instant|sorcery|creature|artifact|enchantment/.test(t)) return "mtg";
  if (/pokemon|weakness|resistance|retreat|hp|pokedex/i.test(t)) return "pokemon";
  return null;
}

function extractMtgName(lines) {
  return lines.find(l => l.length >= 3 && !/^[0-9{}|•]+$/.test(l)) || "";
}

function extractPokemonName(lines) {
  const candidate = lines.find(l => !/hp/i.test(l) && l.length >= 3);
  return candidate || "";
}

function extractPokemonHP(text) {
  const m = String(text || "").match(/\bHP\s*([0-9]{2,4})\b/i);
  return m ? m[1] : "";
}

function extractPokemonNumber(text) {
  const m = String(text || "").match(/\b([0-9]{1,3})\s*\/\s*([0-9]{2,4})\b/);
  return m ? `${m[1]}/${m[2]}` : "";
}

export async function lookupMtgByName(name) {
  if (!name) return null;
  try {
    const url = `https://api.scryfall.com/cards/named?fuzzy=${encodeURIComponent(name)}`;
    const res = await fetch(url);
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

import { pokemontcgFetch } from "./api.mjs";

export async function lookupPokemonByNameAndNumber(name, number) {
  if (!name) return null;
  try {
    const numOnly = String(number || "").split("/")[0] || "";
    const q = [`name:"${String(name).replaceAll('"','') }"`];
    if (numOnly) q.push(`number:"${numOnly}"`);
    const path = `cards?q=${encodeURIComponent(q.join(" "))}`;
    const json = await pokemontcgFetch(path);
    return json?.data?.[0] || null;
  } catch (e) {
    return null;
  }
}

export async function recognizeCardFromText(ocrText, { allowOnlineLookup = true } = {}) {
  const lines = cleanLines(ocrText);
  const gameGuess = guessGame(ocrText) || "pokemon";

  if (gameGuess === "mtg") {
    const name = extractMtgName(lines);
    let scry = null;
    if (allowOnlineLookup && name) scry = await lookupMtgByName(name);

    return {
      game: "mtg",
      extracted: { name },
      resolved: scry ? {
        name: scry.name,
        manaCost: scry.mana_cost || "",
        cardType: scry.type_line || "",
        rulesText: scry.oracle_text || "",
        flavorText: scry.flavor_text || "",
        powerToughness: scry.power && scry.toughness ? `${scry.power}/${scry.toughness}` : "",
        artist: scry.artist || "",
        collectorNumber: scry.collector_number || "",
        setCode: (scry.set || "").toUpperCase(),
        rarity: scry.rarity || "",
        setName: scry.set_name || ""
      } : null
    };
  }

  const name = extractPokemonName(lines);
  const hp = extractPokemonHP(ocrText);
  const cardNumber = extractPokemonNumber(ocrText);

  let poke = null;
  if (allowOnlineLookup && name) {
    poke = await lookupPokemonByNameAndNumber(name, cardNumber);
  }

  return {
    game: "pokemon",
    extracted: { name, hp, cardNumber },
    resolved: poke ? {
      name: poke.name || name,
      hp: poke.hp || hp,
      type: (poke.types && poke.types[0]) || "",
      rarity: poke.rarity || "",
      illustrator: poke.artist || "",
      cardNumber: poke.number ? `${poke.number}/${poke.set?.printedTotal || ""}`.replace(/\/$/, "") : cardNumber,
      setCode: (poke.set?.ptcgoCode || poke.set?.id || "").toUpperCase(),
      setName: poke.set?.name || ""
    } : null
  };
}
