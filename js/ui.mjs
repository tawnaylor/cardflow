export function renderApp(data){
  const root = document.getElementById('app') || document.body;
  root.innerHTML = '';
  const h2 = document.createElement('h2');
  h2.textContent = 'Collections';
  root.appendChild(h2);
  const pre = document.createElement('pre');
  pre.textContent = JSON.stringify(data, null, 2);
  root.appendChild(pre);
}
