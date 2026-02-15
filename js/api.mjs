// Small wrapper for pokemontcg.io calls using the provided API key
export const POKEMON_API_KEY = "8203d4cb-15eb-4222-bcfe-90e6712b6236";

export async function pokemontcgFetch(path, opts = {}){
  const headers = Object.assign({
    "X-Api-Key": POKEMON_API_KEY,
    "Accept": "application/json"
  }, opts.headers || {});

  const res = await fetch(`https://api.pokemontcg.io/v2/${path}`, Object.assign({}, opts, { headers }));
  if (!res.ok) throw new Error(`Pokémon TCG API error: ${res.status}`);
  return res.json();
}
