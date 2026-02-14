import app from './modules/app.js';
console.log('main.js loaded');
if (app && typeof app.init === 'function') app.init();
import { qs, toast } from "./modules/app.js";

qs("#addBtn")?.addEventListener("click", () => {
  location.href = "choose.html";
});

toast("Welcome back!");
