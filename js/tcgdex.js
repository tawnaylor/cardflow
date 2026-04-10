import TCGdex from 'https://esm.sh/@tcgdex/sdk?bundle';

const tcgdex = new TCGdex('en');
const TCGDEX_API_BASE = 'https://api.tcgdex.net/v2/en';

let tcgdexCardCatalogPromise;

export async function fetchTcgdexCardCatalog() {
  if (!tcgdexCardCatalogPromise) {
    tcgdexCardCatalogPromise = fetch(`${TCGDEX_API_BASE}/cards`)
      .then(async response => {
        if (!response.ok) {
          throw new Error('Unable to load the TCGdex card catalog.');
        }

        const cards = await response.json();
        if (!Array.isArray(cards)) {
          throw new Error('Unexpected response while loading the TCGdex card catalog.');
        }

        return cards
          .filter(card => card?.id && card?.name)
          .map(card => ({
            id: String(card.id),
            name: String(card.name),
            localId: String(card.localId || '').trim(),
          }))
          .sort((left, right) => {
            const byName = left.name.localeCompare(right.name);
            if (byName !== 0) return byName;

            const byNumber = left.localId.localeCompare(right.localId);
            if (byNumber !== 0) return byNumber;

            return left.id.localeCompare(right.id);
          });
      })
      .catch(error => {
        tcgdexCardCatalogPromise = undefined;
        throw error;
      });
  }

  return tcgdexCardCatalogPromise;
}

export async function fetchTcgdexCard(cardId) {
  const normalizedId = String(cardId || '').trim().toLowerCase();
  if (!normalizedId) throw new Error('Enter a TCGdex card ID first.');

  const card = await tcgdex.card.get(normalizedId);
  if (!card) throw new Error(`No card found for "${normalizedId}".`);

  let setDetails = null;
  let serieDetails = null;

  if (typeof card.getSet === 'function') {
    try {
      setDetails = await card.getSet();
    } catch {
      setDetails = null;
    }
  }

  if (setDetails && typeof setDetails.getSerie === 'function') {
    try {
      serieDetails = await setDetails.getSerie();
    } catch {
      serieDetails = null;
    }
  }

  let imageUrl = '';
  if (typeof card.getImageURL === 'function') {
    imageUrl = card.getImageURL('high', 'webp') || card.getImageURL('high', 'png') || '';
  }

  return {
    id: card.id || normalizedId,
    name: card.name || '',
    number: card.localId || '',
    rarity: card.rarity || '',
    expansion: setDetails?.name || card.set?.name || '',
    series: serieDetails?.name || setDetails?.serie?.name || '',
    imageUrl,
  };
}