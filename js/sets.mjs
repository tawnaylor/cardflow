export async function loadSets(){
  // placeholder: load set list from data/pokemon_sets_1993_2026.json
  try{
    const res = await fetch('../data/pokemon_sets_1993_2026.json');
    return await res.json();
  }catch(e){ return [] }
}
