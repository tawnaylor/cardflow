export function injectHeaderFooter() {
  const header = document.getElementById("siteHeader");
  const footer = document.getElementById("siteFooter");

  if (header) {
    header.innerHTML = `
      <div class="brand">
        <img src="assets/logo.svg" alt="CardFlow logo" />
        <div class="name">CardFlow</div>
      </div>
      <nav class="top-nav" aria-label="Primary">
        <a href="index.html">Home</a>
        <a href="add-card.html">Add Cards</a>
        <a href="binders.html">Binders</a>
      </nav>
    `;
  }

  if (footer) {
    footer.innerHTML = `<div class="small">CardFlow • Local-only demo (localStorage)</div>`;
  }
}

// Backwards-compatible alias
export { injectHeaderFooter as setupHeaderFooter };
