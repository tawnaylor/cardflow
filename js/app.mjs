import { setupHeaderFooter } from './header-footer.mjs';
import { renderCarousel } from './carousel.mjs';
import { initAddCardPage } from './add-card.mjs';
import { initBinderPage } from './binders.mjs';
import { initCardDetailsPage } from './card-details.mjs';

function routeInit() {
  const path = (location.pathname || '').split('/').pop() || 'index.html';
  switch (path) {
    case 'index.html':
    case '':
      renderCarousel();
      break;
    case 'add-card.html':
      initAddCardPage();
      break;
    case 'binders.html':
      initBinderPage();
      break;
    case 'card.html':
      initCardDetailsPage();
      break;
    default:
      // no-op for unknown pages
      break;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  setupHeaderFooter();
  routeInit();
  console.log('Cardflow app initialized');
});
