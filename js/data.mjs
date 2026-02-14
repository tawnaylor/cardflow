export async function loadJSON(path){
  const res = await fetch(path);
  if(!res.ok) throw new Error(`Failed to load ${path}`);
  return res.json();
}

export async function loadAllData(){
  const [pokemon, mtg] = await Promise.all([
    loadJSON('data/pokemon_sets.json'),
    loadJSON('data/mtg_sets.json')
  ]);
  return { pokemon, mtg };
}
