// nav.js — render site header and highlight active link
(function(){
  const headerHtml = `
    <div class="topbar">
      <div class="brand">
        <div class="logo" aria-hidden="true"><img src="./images/cardflow%20logo.jpeg" alt="CardFlow logo"></div>
        <span class="brand-name">CardFlow</span>
      </div>
      <nav class="nav">
        <a class="nav-link" href="./index.html">Home</a>
        <a class="nav-link" href="./add-card.html">Add Cards</a>
        <a class="nav-link" href="./binders.html">Binders</a>
      </nav>
    </div>`;

  function setActiveLinks(container){
    const links = container.querySelectorAll('.nav-link');
    const path = location.pathname.split('/').pop() || 'index.html';
    links.forEach(a => a.classList.toggle('active', a.getAttribute('href') === `./${path}`));
  }

  window.nav = {
    init(){
      const target = document.getElementById('site-header');
      if (target){
        target.innerHTML = headerHtml;
        setActiveLinks(target);
      }
    }
  };
})();
