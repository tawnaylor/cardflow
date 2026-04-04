// main.js — app bootstrap
import './nav.js';

document.addEventListener('DOMContentLoaded', () => {
  if (window.nav && typeof window.nav.init === 'function') window.nav.init();
});
