const DB_NAME = "CardFlowDB";
const STORE_NAME = "binders";
let db;

const request = indexedDB.open(DB_NAME, 1);

request.onupgradeneeded = (e) => {
  db = e.target.result;
  if (!db.objectStoreNames.contains(STORE_NAME)) {
    db.createObjectStore(STORE_NAME, { keyPath: "id", autoIncrement: true });
  }
};

request.onsuccess = (e) => {
  db = e.target.result;
  render(); 
};

document.addEventListener("DOMContentLoaded", () => {
  // --- MOBILE NAV TOGGLE ---
  const navToggle = document.querySelector(".nav-toggle");
  const navMenu = document.querySelector(".nav");

  if (navToggle && navMenu) {
    navToggle.addEventListener("click", () => {
      // This toggles the 'active' class which your CSS should handle
      navMenu.classList.toggle("active");
    });
  }

  // --- BINDER ELEMENTS ---
  const binderList = document.getElementById("binderList");
  const saveBinderBtn = document.getElementById("saveBinder");
  const clearAllBtn = document.getElementById("clearAll");
  const binderNameInput = document.getElementById("binderName");
  const binderDescInput = document.getElementById("binderDesc");
  const binderImageInput = document.getElementById("binderImage");

  window.render = function() {
    if (!db) return;

    const transaction = db.transaction([STORE_NAME], "readonly");
    const store = transaction.objectStore(STORE_NAME);
    const getAllRequest = store.getAll();

    getAllRequest.onsuccess = () => {
      const binders = getAllRequest.result;
      binderList.innerHTML = "";

      if (!binders.length) {
        binderList.innerHTML = "<p class='empty-msg'>No binders found. Create one above!</p>";
        return;
      }

      const allCards = JSON.parse(localStorage.getItem("cardflow_cards_v1") || "[]");

      binders.forEach((b) => {
        const div = document.createElement("div");
        div.className = "binder-item";

        const binderCards = allCards.filter(card => Number(card.binderId) === Number(b.id));
        const totalQty = binderCards.reduce((sum, card) => sum + (Number(card.qty) || 0), 0);

        let imgUrl = 'https://via.placeholder.com/300x400?text=No+Image';
        if (b.image) {
          imgUrl = URL.createObjectURL(b.image);
        }

        div.innerHTML = `
          <div class="binder-card">
            <div class="binder-img-container">
              <img src="${imgUrl}" alt="${b.name}">
            </div>
            <div class="binder-info">
              <h3 class="binder-name">${b.name}</h3>
              <p class="binder-desc">${b.description || "No description provided."}</p>
              <p class="card-count" style="color: #00f2ff; font-weight: bold; margin-top: 5px;">
                Unique: ${binderCards.length} | Total Quantity: ${totalQty}
              </p>
            </div>
          </div>
        `;
        binderList.appendChild(div);
      });
    };
  };

  saveBinderBtn.addEventListener("click", () => {
    const name = binderNameInput.value.trim();
    if (!name) return alert("Please enter a name.");

    const transaction = db.transaction([STORE_NAME], "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    const newBinder = {
      name: name,
      description: binderDescInput.value.trim(),
      image: binderImageInput.files?.[0] || null,
      createdAt: Date.now()
    };

    store.add(newBinder).onsuccess = () => {
      binderNameInput.value = "";
      binderDescInput.value = "";
      binderImageInput.value = "";
      render(); 
    };
  });

  clearAllBtn.addEventListener("click", () => {
    if (!confirm("Delete all binders?")) return;
    db.transaction([STORE_NAME], "readwrite").objectStore(STORE_NAME).clear().onsuccess = () => render();
  });
});