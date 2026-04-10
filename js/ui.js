// js/ui.js — Shared UI utilities: modal, nav, toast notifications

// ── Modal ──────────────────────────────────────────────────────────────
export function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (!modal) return;
  modal.classList.add('modal--open');
  modal.setAttribute('aria-hidden', 'false');
  // Trap focus on first focusable element
  const focusable = modal.querySelector('input, button, textarea, select, [tabindex]');
  if (focusable) focusable.focus();
}

export function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (!modal) return;
  modal.classList.remove('modal--open');
  modal.setAttribute('aria-hidden', 'true');
}

export function initModalCloseHandlers() {
  document.querySelectorAll('[data-close-modal]').forEach(btn => {
    btn.addEventListener('click', () => closeModal(btn.dataset.closeModal));
  });
  // Close on backdrop click
  document.querySelectorAll('.modal').forEach(modal => {
    modal.addEventListener('click', e => {
      if (e.target === modal) closeModal(modal.id);
    });
  });
  // Close on Escape
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      document.querySelectorAll('.modal--open').forEach(m => closeModal(m.id));
    }
  });
}

// ── Toast Notifications ────────────────────────────────────────────────
export function showToast(message, type = 'success') {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.setAttribute('aria-live', 'polite');
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast toast--${type}`;
  toast.textContent = message;
  container.appendChild(toast);

  // Trigger animation
  requestAnimationFrame(() => toast.classList.add('toast--visible'));

  setTimeout(() => {
    toast.classList.remove('toast--visible');
    toast.addEventListener('transitionend', () => toast.remove());
  }, 3000);
}

// ── Hamburger Nav ──────────────────────────────────────────────────────
export function initHamburgerNav() {
  const toggle = document.querySelector('.nav-toggle');
  const nav = document.querySelector('.nav-links');
  if (!toggle || !nav) return;
  toggle.addEventListener('click', () => {
    const open = toggle.getAttribute('aria-expanded') === 'true';
    toggle.setAttribute('aria-expanded', String(!open));
    nav.classList.toggle('nav-links--open');
  });
}

// ── URL Params helper ──────────────────────────────────────────────────
export function getParam(key) {
  return new URLSearchParams(window.location.search).get(key);
}