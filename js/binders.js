document.addEventListener("DOMContentLoaded", () => {
  const binderList = document.getElementById("binderList");
  const clearAllBtn = document.getElementById("clearAll");
  const saveBinderBtn = document.getElementById("saveBinder");
  const binderNameInput = document.getElementById("binderName");
  const binderDescInput = document.getElementById("binderDesc");
  const binderImageInput = document.getElementById("binderImage");

  if (!binderList || !saveBinderBtn || !binderNameInput) {
    console.error("Missing binder DOM elements");
    return;
  }

  let binders = JSON.parse(localStorage.getItem("binders") || "[]");

  function saveToStorage() {
    localStorage.setItem("binders", JSON.stringify(binders));
  }

  function renderBinders() {
    binderList.innerHTML = "";

    if (binders.length === 0) {
      binderList.innerHTML = `<p style="opacity:.7">No binders yet. Create one above.</p>`;
      return;
    }

    binders.forEach((binder, index) => {
      const card = document.createElement("div");
      card.className = "binder-item";

      const img = binder.image?.trim()
        ? binder.image
        : "https://via.placeholder.com/300x400";

      card.innerHTML = `
        <img src="${img}" alt="${binder.name}">
        <h3>${binder.name}</h3>
        <p>${binder.description || ""}</p>
      `;

      card.addEventListener("dblclick", () => {
        if (confirm(`Delete "${binder.name}"?`)) {
          binders.splice(index, 1);
          saveToStorage();
          renderBinders();
        }
      });

      binderList.appendChild(card);
    });
  }

  saveBinderBtn.addEventListener("click", () => {
    const name = binderNameInput.value.trim();
    const desc = binderDescInput.value.trim();
    const file = binderImageInput.files?.[0];

    if (!name) {
      alert("Binder name is required");
      return;
    }

    function addBinder(imageData = "") {
      binders.push({
        name,
        description: desc,
        image: imageData
      });

      saveToStorage();
      renderBinders();

      binderNameInput.value = "";
      binderDescInput.value = "";
      binderImageInput.value = "";
    }

    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => addBinder(e.target.result);
      reader.readAsDataURL(file);
    } else {
      addBinder("");
    }
  });

  clearAllBtn.addEventListener("click", () => {
    if (confirm("Clear all binders?")) {
      binders = [];
      saveToStorage();
      renderBinders();
    }
  });

  // NAV
  const navToggle = document.querySelector(".nav-toggle");
  const nav = document.querySelector(".nav");

  if (navToggle && nav) {
    navToggle.addEventListener("click", () => {
      nav.classList.toggle("show");
    });
  }

  renderBinders();
});