const binderList = document.getElementById("binderList");
const clearAllBtn = document.getElementById("clearAll");
const saveBinderBtn = document.getElementById("saveBinder");
const binderNameInput = document.getElementById("binderName");
const binderDescInput = document.getElementById("binderDesc");
const binderImageInput = document.getElementById("binderImage");

let binders = JSON.parse(localStorage.getItem("binders") || "[]");

function saveBinders(){
  localStorage.setItem("binders", JSON.stringify(binders));
}

function renderBinders(){
  binderList.innerHTML = "";

  binders.forEach((binder, index) => {

    const div = document.createElement("div");
    div.className = "binder-item";

    let imgSrc = binder.image || "https://via.placeholder.com/200";

    div.innerHTML = `
      <img src="${imgSrc}" alt="${binder.name} binder cover" onerror="this.src='https://via.placeholder.com/200'">
      <h3>${binder.name}</h3>
      <p>${binder.description}</p>
    `;

    div.addEventListener("dblclick", () => {
      if(confirm(`Delete binder "${binder.name}"?`)){
        binders.splice(index,1);
        saveBinders();
        renderBinders();
      }
    });

    binderList.appendChild(div);

  });

}

// Save binder
saveBinderBtn.addEventListener("click", () => {

  const name = binderNameInput.value.trim();
  const desc = binderDescInput.value.trim();
  const file = binderImageInput.files[0];

  if(!name){
    alert("Please enter a binder name.");
    return;
  }

  if(file){

    const reader = new FileReader();

    reader.onload = (e)=>{

      binders.push({
        name:name,
        description:desc,
        image:e.target.result
      });

      saveBinders();
      renderBinders();

      binderNameInput.value="";
      binderDescInput.value="";
      binderImageInput.value="";
    }

    reader.readAsDataURL(file);

  }else{

    binders.push({
      name:name,
      description:desc,
      image:""
    });

    saveBinders();
    renderBinders();

    binderNameInput.value="";
    binderDescInput.value="";
    binderImageInput.value="";

  }

});

// Clear binders
clearAllBtn.addEventListener("click", () => {

  if(confirm("Clear all binders?")){
    binders=[];
    saveBinders();
    renderBinders();
  }

});


// --------------------
// NAVBAR DROPDOWN
// --------------------

const navToggle = document.querySelector(".nav-toggle");
const nav = document.querySelector(".nav");

navToggle.addEventListener("click", () => {
  nav.classList.toggle("show");
});


// Initial render
renderBinders();