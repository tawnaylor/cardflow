const fs = require('fs');
const path = require('path');
const https = require('https');

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); } catch (e) { reject(e); }
      });
    }).on('error', reject);
  });
}

(async function() {
  const setsUrl = 'https://api.pokemontcg.io/v2/sets?pageSize=500';
  console.log('Fetching PTCG sets...');
  const api = await fetchJson(setsUrl);
  const apiSets = api.data || [];
  const file = path.join(__dirname, '..', 'data', 'pokemon-tcg-sets.json');
  const raw = fs.readFileSync(file, 'utf8');
  const local = JSON.parse(raw);

  const normalize = (s) => (s || '').toString().toLowerCase().replace(/[:\-–—\s]+/g, ' ').trim();

  const apiMap = new Map(apiSets.map(s => [normalize(s.name), s]));

  for (const entry of local) {
    const name = normalize(entry.name);
    let found = apiMap.get(name);
    if (!found) {
      // try contains match
      found = apiSets.find(s => normalize(s.name).includes(name) || name.includes(normalize(s.name)));
    }
    if (found) {
      entry.ptcgId = found.id;
      entry.ptcgName = found.name;
    }
  }

  fs.writeFileSync(file, JSON.stringify(local, null, 2), 'utf8');
  console.log('Updated', file);
})();
