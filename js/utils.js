// utils.js — small DOM & format helpers
export const $ = sel => document.querySelector(sel);
export const $$ = sel => Array.from(document.querySelectorAll(sel));

export function el(tag, props={}, ...children){
  const e = document.createElement(tag);
  Object.assign(e, props);
  children.flat().forEach(c => e.append(typeof c === 'string' ? document.createTextNode(c) : c));
  return e;
}

export function formatDate(d){
  const dt = new Date(d);
  return isNaN(dt) ? '' : dt.toLocaleDateString();
}
