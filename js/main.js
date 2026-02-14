import app from './modules/app.js';
console.log('main.js loaded');
if (app && typeof app.init === 'function') app.init();
