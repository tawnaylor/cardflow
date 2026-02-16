export function initBinders(){
  console.log('initBinders');
}

if(document.readyState !== 'loading') initBinders(); else document.addEventListener('DOMContentLoaded', initBinders);
