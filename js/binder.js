// binder.js — binder management stubs
export function createBinder(name){
  const binders = JSON.parse(localStorage.getItem('binders')||'[]');
  binders.push({id: Date.now(), name});
  localStorage.setItem('binders', JSON.stringify(binders));
  return binders;
}

export function listBinders(){
  return JSON.parse(localStorage.getItem('binders')||'[]');
}
