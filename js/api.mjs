// Small wrapper for pokemontcg.io calls using the provided API key
export const POKEMON_API_KEY = "8203d4cb-15eb-4222-bcfe-90e6712b6236";

// Fetch wrapper with timeout and retry logic to improve resilience against
// transient network or remote API issues.
export async function pokemontcgFetch(path, opts = {}){
  const retries = Number(opts.retries ?? 2);
  const timeout = Number(opts.timeout ?? 7000);
  const headers = Object.assign({
    "X-Api-Key": POKEMON_API_KEY,
    "Accept": "application/json"
  }, opts.headers || {});

  const url = `https://api.pokemontcg.io/v2/${path}`;

  for (let attempt = 0; attempt <= retries; attempt++){
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);
    try{
      const res = await fetch(url, Object.assign({}, opts, { headers, signal: controller.signal }));
      clearTimeout(id);
      if (!res.ok) {
        // For 5xx errors allow retry, otherwise throw
        if (res.status >= 500 && attempt < retries) {
          await new Promise(r => setTimeout(r, 400 * (attempt + 1)));
          continue;
        }
        throw new Error(`Pokémon TCG API error: ${res.status}`);
      }
      return res.json();
    }catch(err){
      clearTimeout(id);
      // If aborted or other network error, retry if attempts remain
      if (attempt < retries){
        await new Promise(r => setTimeout(r, 400 * (attempt + 1)));
        continue;
      }
      throw err;
    }
  }
  // Should not reach here
  throw new Error('pokemontcgFetch: exhausted retries');
}
