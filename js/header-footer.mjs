export function setupHeaderFooter(){
  const header = document.getElementById('site-header');
  const footer = document.getElementById('site-footer');
  if(header){
    header.innerHTML = `\n      <a href="index.html"><img src="../assets/logo.svg" alt="Cardflow" class="logo"></a>\n      <nav><a href="add-card.html">Add Card</a> | <a href="binders.html">Binders</a></nav>\n    `;
  }
  if(footer){
    footer.innerHTML = `<p>&copy; ${new Date().getFullYear()} Cardflow</p>`;
  }
}
