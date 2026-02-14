import { qs, toast } from './modules/app.js';

console.log('main.js loaded');

qs("#addBtn")?.addEventListener("click", () => {
  location.href = "choose.html";
});

toast("Welcome back!");
