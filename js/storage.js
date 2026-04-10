const STORAGE_KEY = "cardflow_cards";

export function getCards() {
  const data = localStorage.getItem(STORAGE_KEY);
  try {
    return data ? JSON.parse(data) : [];
  } catch (e) {
    return [];
  }
}

export function saveCards(cards) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cards));
}

export function upsertCard(newCard) {
  const cards = getCards();
  
  // Ensure the incoming quantity is a number
  const addedQty = parseInt(newCard.qty) || 1;

  // Find if this card exists in the specific binder
  const existingIndex = cards.findIndex(c => 
    c.name === newCard.name && 
    c.number === newCard.number && 
    String(c.binderId) === String(newCard.binderId)
  );

  if (existingIndex > -1) {
    // Math logic: Existing Amount + New Amount
    const currentQty = parseInt(cards[existingIndex].qty) || 0;
    cards[existingIndex].qty = currentQty + addedQty;
    
    saveCards(cards);
    return { merged: true, card: cards[existingIndex] };
  } else {
    // Register the amount for a brand new entry
    newCard.qty = addedQty;
    cards.push(newCard);
    saveCards(cards);
    return { merged: false, card: newCard };
  }
}