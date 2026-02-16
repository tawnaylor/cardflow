export function initCardDetails(){
  console.log('initCardDetails');
}

if(document.readyState !== 'loading') initCardDetails(); else document.addEventListener('DOMContentLoaded', initCardDetails);
