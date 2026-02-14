import { loadAllData } from './data.mjs';
import { renderApp } from './ui.mjs';

async function init(){
  const data = await loadAllData();
  renderApp(data);
}

init();
