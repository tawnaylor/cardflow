import { setupHeaderFooter } from './header-footer.mjs';

document.addEventListener('DOMContentLoaded', () => {
  setupHeaderFooter();
  console.log('Cardflow app initialized');
});
import { injectHeaderFooter } from "./header-footer.mjs";
injectHeaderFooter();
