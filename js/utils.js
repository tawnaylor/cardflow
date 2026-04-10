export function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

export function escapeAttr(value) {
  return escapeHtml(value).replaceAll('`', '&#096;');
}

export function formatCurrency(value) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })
    .format(Number(value || 0));
}

export function getParam(key) {
  return new URLSearchParams(window.location.search).get(key);
}

export function showToast(message) {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = message;
  toast.hidden = false;
  toast.classList.add('is-visible');
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => {
    toast.classList.remove('is-visible');
    toast.hidden = true;
  }, 2500);
}

export function initNav() {
  const toggle = document.querySelector('.nav-toggle');
  const nav = document.querySelector('#main-nav .nav-links');
  if (!toggle || !nav) return;
  toggle.addEventListener('click', () => {
    const open = toggle.getAttribute('aria-expanded') === 'true';
    toggle.setAttribute('aria-expanded', String(!open));
    nav.classList.toggle('nav-links--open');
  });
  document.addEventListener('click', e => {
    if (!nav.contains(e.target) && !toggle.contains(e.target)) {
      toggle.setAttribute('aria-expanded', 'false');
      nav.classList.remove('nav-links--open');
    }
  });
}