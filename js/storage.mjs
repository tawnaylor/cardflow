const STORAGE_KEY = 'cardflow.collection'

export function saveCard(card){
  const col = loadCollection();
  col.push(card);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(col));
}

export function loadCollection(){
  try{
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  }catch(e){
    return [];
  }
}
