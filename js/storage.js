// Simple localStorage helpers for Cardflow
const Storage = {
  key: 'cardflow.cards',
  get() {
    try { return JSON.parse(localStorage.getItem(this.key) || '[]'); }
    catch { return []; }
  },
  set(cards){ localStorage.setItem(this.key, JSON.stringify(cards || [])); }
};
