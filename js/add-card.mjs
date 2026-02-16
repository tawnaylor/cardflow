import { storage } from './storage.mjs';

export function initAddCard(){
  console.log('initAddCard');
  // placeholder logic for add-card page
}

if(document.readyState !== 'loading') initAddCard(); else document.addEventListener('DOMContentLoaded', initAddCard);
