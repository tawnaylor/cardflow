const fs = require('fs');

function normalize(s){ return String(s||"").toLowerCase().replace(/[^a-z0-9]/g,""); }
function levenshtein(a,b){
  a = String(a||""); b = String(b||"");
  const m = a.length, n = b.length;
  const d = Array.from({length: m+1}, () => new Array(n+1).fill(0));
  for(let i=0;i<=m;i++) d[i][0]=i;
  for(let j=0;j<=n;j++) d[0][j]=j;
  for(let i=1;i<=m;i++){
    for(let j=1;j<=n;j++){
      const cost = a[i-1] === b[j-1] ? 0 : 1;
      d[i][j] = Math.min(d[i-1][j]+1, d[i][j-1]+1, d[i-1][j-1]+cost);
    }
  }
  return d[m][n];
}

const demo = JSON.parse(fs.readFileSync('data/demo_cards.json','utf8'));
const candidates = demo.map(c => ({
  name: c.pokemon?.name || c.mtg?.name || '',
  number: c.pokemon?.cardNumber || c.mtg?.collectorNumber || '',
  setName: c.setName || '',
  image: c.imageDataUrl || ''
}));

const query = process.argv[2] || 'Pikachu';
const qNorm = normalize(query);
const scored = candidates.map(c => {
  const nNorm = normalize(c.name || '');
  let score = 1000;
  if (nNorm === qNorm) score = 0;
  else if (nNorm.includes(qNorm)) score = 10 + (nNorm.length - qNorm.length);
  else score = 200 + levenshtein(nNorm, qNorm);
  return { card: c, score };
}).sort((a,b) => a.score - b.score).slice(0,10);

console.log('Top matches for', query);
for(const s of scored){
  console.log('-', s.card.name, '|', s.card.setName, '|', s.card.number, '| score:', s.score);
}
