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
  const binderList = document.getElementById("binderList");
  const saveBinderBtn = document.getElementById("saveBinder");
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

      const allCards = JSON.parse(localStorage.getItem("cardflow_cards") || "[]");

      binders.forEach((b) => {
        const div = document.createElement("div");
        div.className = "binder-item";

        // Filter cards for this binder
        const binderCards = allCards.filter(card => String(card.binderId) === String(b.id));

        // NEW: Sum of all quantities for a "Total Count"
        const totalQty = binderCards.reduce((sum, card) => sum + (parseInt(card.qty) || 0), 0);

        // Persistent Image Handling (Blobs)
        let imgUrl = 'https://via.placeholder.com/300x400?text=No+Image';
        if (b.image) {
          imgUrl = (typeof b.image === 'string') ? b.image : URL.createObjectURL(b.image);
        }

        div.innerHTML = `
          <div class="binder-card">
            <img src="${imgUrl}" alt="${b.name}">
            <div class="binder-info">
              <h3>${b.name}</h3>
              <p>${b.description || "No description."}</p>
              <p class="card-count" style="color: #00f2ff; font-weight: bold;">
                Total Cards: ${totalQty}
              </p>
              <p style="font-size: 0.8rem; opacity: 0.8;">Unique Entries: ${binderCards.length}</p>
            </div>
          </div>
        `;
        binderList.appendChild(div);
      });
    };
  };

  saveBinderBtn.addEventListener("click", () => {
    const name = binderNameInput.value.trim();
    if (!name) return alert("Name required");

    const transaction = db.transaction([STORE_NAME], "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    store.add({
      name,
      description: binderDescInput.value.trim(),
      image: binderImageInput.files[0] || null,
      createdAt: new Date().getTime()
    }).onsuccess = () => {
      render();
      document.getElementById("binderForm").reset();
    };
  });
});