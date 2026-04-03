import TCGdex from 'https://esm.sh/@tcgdex/sdk?bundle';

const tcgdex = new TCGdex('en');

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