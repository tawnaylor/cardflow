async function loadJSON(path){
  const res = await fetch(path);
  if (!res.ok) throw new Error(`Failed to load ${path}`);
  return res.json();
}

export async function loadSets(){
  const [pokemon, mtg] = await Promise.all([
    loadJSON("./data/pokemon_sets.json"),
    loadJSON("./data/mtg_sets.json")
  ]);
  return { pokemon, mtg };
}

export function flattenSets(db){
  // returns [{label, value, code, year, series}]
  const out = [];
  for (const s of (db.series || [])){
    for (const e of (s.expansions || [])){
      const label = `${e.releaseYear} — ${s.name}: ${e.name} (${e.code})`;
      out.push({
        label,
        value: `${e.code}::${e.name}`,
        code: e.code,
        year: e.releaseYear,
        series: s.name
      });
    }
  }
  // newest first
  out.sort((a,b) => (b.year - a.year) || a.label.localeCompare(b.label));
  return out;
}
