const binderList = document.getElementById("binderList");
const clearAllBtn = document.getElementById("clearAll");

const saveBinderBtn = document.getElementById("saveBinder");
const binderNameInput = document.getElementById("binderName");
const binderDescInput = document.getElementById("binderDesc");
const binderImageInput = document.getElementById("binderImage");

let binders = [];

// Render binders
function renderBinders() {
  binderList.innerHTML = "";
  binders.forEach((b) => {
    const div = document.createElement("div");
    div.className = "binder-item";
    div.innerHTML = `
      <img src="${b.image || 'https://via.placeholder.com/220x150'}" alt="${b.name}" style="width:150px; border-radius:6px;">
      <div>
        <strong>${b.name}</strong>
        <p>${b.desc}</p>
      </div>
    `;
    binderList.appendChild(div);
  });
}

// Save binder
saveBinderBtn.addEventListener("click", () => {
  const name = binderNameInput.value.trim();
  const desc = binderDescInput.value.trim();
  const image = binderImageInput.value.trim();
  if (!name) return alert("Binder name is required!");
  binders.push({ name, desc, image });
  binderNameInput.value = "";
  binderDescInput.value = "";
  binderImageInput.value = "";
  renderBinders();
});

// Clear all binders
clearAllBtn.addEventListener("click", () => {
  binders = [];
  renderBinders();
});