// form.js — form handling helpers
export function showFieldError(fieldEl, message){
  let small = fieldEl.parentElement.querySelector('small.error');
  if (!small){
    small = document.createElement('small');
    small.className = 'error';
    fieldEl.parentElement.appendChild(small);
  }
  small.textContent = message;
}

export function clearFieldError(fieldEl){
  const small = fieldEl.parentElement.querySelector('small.error');
  if (small) small.textContent = '';
}
