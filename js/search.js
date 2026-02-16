import { upsertCard, getCards, fileToDataUrl } from './storage.js';

const input = document.getElementById('searchInput');
const results = document.getElementById('searchResults');

// helper slugify (same idea as elsewhere)
function slugify(s) {
  return String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

async function loadJson(path) {
  try {
    const r = await fetch(path);
    if (!r.ok) return null;
    return await r.json();
  } catch (e) {
    return null;
  }
}

let imagesIndex = {}; // { setSlug: { number: "path/to/file.jpg" } }
let expansionsMap = {}; // { slug: { series, name } }

async function init() {
  imagesIndex = (await loadJson('./database/pkmn-images/index.json')) || {};

  const ds = await loadJson('./database/cardflow-pokemon-dataset.json');
  if (ds && Array.isArray(ds.expansions)) {
    for (const e of ds.expansions) {
      const key = slugify(e.name || e.set_abb || e.set_no || e.series || '');
      expansionsMap[key] = { series: e.series || '', name: e.name || '' };
    }
  }
}

function nameFromFilename(fname) {
  if (!fname) return '';
  const base = fname.split('/').pop().split('\\').pop();
  return base.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ');
}

function renderResultItem(item) {
  const el = document.createElement('div');
  el.className = 'binder-item';

  const left = document.createElement('div');
  left.style.display = 'flex';
  left.style.gap = '12px';
  left.style.alignItems = 'center';

  const thumb = document.createElement('div');
  thumb.style.width = '64px';
  thumb.style.height = '80px';
  thumb.style.overflow = 'hidden';
  thumb.style.display = 'grid';
  thumb.style.placeItems = 'center';
  thumb.style.background = '#f3f3f3';

  if (item.imgPath) {
    const img = document.createElement('img');
    img.src = item.imgPath;
    img.alt = item.name || 'card';
    img.style.maxWidth = '100%';
    img.style.maxHeight = '100%';
    img.style.objectFit = 'contain';
    img.onerror = () => { img.style.display = 'none'; };
    thumb.appendChild(img);
  } else {
    const ph = document.createElement('div');
    ph.className = 'ph';
    ph.textContent = 'No image';
    thumb.appendChild(ph);
  }

  const info = document.createElement('div');
  info.innerHTML = `<strong>${escapeHtml(item.name || 'Untitled')}</strong><br/><small>${escapeHtml(item.series || '')} • ${escapeHtml(item.expansion || '')} • #${item.number || ''}</small>`;

  left.appendChild(thumb);
  left.appendChild(info);

  const right = document.createElement('div');
  const btn = document.createElement('button');
  btn.className = 'btn primary';
  btn.textContent = 'Add to Binder';
  btn.addEventListener('click', async () => {
    // convert imgPath to data url if present
    let imageDataUrl = item.imageDataUrl || '';
    if (!imageDataUrl && item.imgPath) {
      try {
        const r = await fetch(item.imgPath);
        if (r.ok) {
          const blob = await r.blob();
          if (blob.type && blob.type.startsWith('image/')) imageDataUrl = await fileToDataUrl(blob);
        }
      } catch (e) {
        console.warn('failed to fetch image', e);
      }
    }

    const payload = {
      name: item.name,
      series: item.series,
      expansion: item.expansion,
      rarity: item.rarity || 'Common',
      number: item.number || '',
      qty: 1,
      imageDataUrl
    };

    const res = upsertCard(payload);
    btn.textContent = res.merged ? `Merged x${res.card.qty}` : 'Added';
    btn.disabled = true;
  });

  right.appendChild(btn);

  el.appendChild(left);
  el.appendChild(right);

  return el;
}

function escapeHtml(str) {
  return String(str ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

async function search(query) {
  const q = String(query || '').trim().toLowerCase();
  results.innerHTML = '';
  if (!q) return;

  const found = [];

  // search stored cards
  const stored = getCards();
  for (const c of stored) {
    if ((c.name || '').toLowerCase().includes(q)) {
      found.push({
        name: c.name,
        series: c.series,
        expansion: c.expansion,
        number: c.number,
        imageDataUrl: c.imageDataUrl
      });
    }
  }

  // search local images index
  for (const [setSlug, map] of Object.entries(imagesIndex || {})) {
    for (const [num, relPath] of Object.entries(map || {})) {
      const nm = nameFromFilename(relPath) || '';
      if (nm.toLowerCase().includes(q)) {
        const sl = String(setSlug || '');
        const em = expansionsMap[slugify(sl)] || {};
        found.push({
          name: nm,
          series: em.series || '',
          expansion: em.name || sl,
          number: num,
          imgPath: relPath
        });
      }
    }
  }

  if (!found.length) {
    results.innerHTML = '<div class="muted">No matches found.</div>';
    return;
  }

  for (const item of found.slice(0, 50)) {
    results.appendChild(renderResultItem(item));
  }
}

input?.addEventListener('input', (e) => {
  search(e.target.value);
});

init();
