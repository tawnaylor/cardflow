import { getCards } from "./storage.js";
import { escapeAttr, escapeHtml } from "./utils.js";

console.log("🔥 binders.js: Persistent Storage & Card Count Fix");

// 1. DATABASE CONFIGURATION
const DB_NAME = "CardFlowDB";
const STORE_NAME = "binders";
let db;

// Initialize IndexedDB
const request = indexedDB.open(DB_NAME, 1);

request.onupgradeneeded = (e) => {
  db = e.target.result;
  if (!db.objectStoreNames.contains(STORE_NAME)) {
    db.createObjectStore(STORE_NAME, { keyPath: "id", autoIncrement: true });
  }
};

// This ensures binders appear automatically every time the page loads
request.onsuccess = (e) => {
  db = e.target.result;
  console.log("Database connected.");
  render(); 
};

request.onerror = (e) => console.error("Database error:", e.target.error);

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
  const clearAllBtn = document.getElementById("clearAll");
  const saveBinderBtn = document.getElementById("saveBinder");
  const binderNameInput = document.getElementById("binderName");
  const binderDescInput = document.getElementById("binderDesc");
  const binderImageInput = document.getElementById("binderImage");

  if (!binderList || !clearAllBtn || !saveBinderBtn || !binderNameInput || !binderDescInput || !binderImageInput) {
    return;
  }

  // Made global so it can be called by the Database success event
  window.render = function() {
    if (!db) return;

    const transaction = db.transaction([STORE_NAME], "readonly");
    const store = transaction.objectStore(STORE_NAME);
    const getAllRequest = store.getAll();

    getAllRequest.onsuccess = () => {
      const binders = getAllRequest.result;
      binderList.innerHTML = "";

    if (binders.length === 0) {
      binderList.innerHTML = `<p style="opacity:.7">No binders yet. Create one above.</p>`;
      return;
    }

      const allCards = getCards();

      binders.forEach((b) => {
        const div = document.createElement("div");
        div.className = "binder-item";

        // FIX: Ensure we compare IDs as Strings to avoid "0" counts
        const binderCards = allCards.filter(card => String(card.binderId) === String(b.id));
        const binderQtyTotal = binderCards.reduce((sum, card) => sum + Number(card.quantity || card.qty || 1), 0);
        const cardPreviewMarkup = binderCards.length
          ? `
            <div class="binder-card-list">
              ${binderCards.slice(0, 4).map(card => {
                const imageSrc = card.imageUrl || card.imageDataUrl || card.externalImageUrl || '';
                return `
                  <a class="binder-card-preview" href="card-detail.html?id=${encodeURIComponent(card.id)}" aria-label="Open ${escapeAttr(card.name)} details">
                    <div class="binder-card-preview__thumb">${imageSrc
                      ? `<img src="${escapeAttr(imageSrc)}" alt="${escapeAttr(card.name)}">`
                      : '<div class="binder-card__placeholder">No image</div>'}</div>
                    <div class="binder-card-preview__body">
                      <h4>${escapeHtml(card.name)}</h4>
                      <p>${escapeHtml(card.setId || card.expansion || 'No set')}</p>
                      <span class="qty-pill">x${Number(card.quantity || card.qty || 1)}</span>
                    </div>
                  </a>
                `;
              }).join('')}
            </div>`
          : '<p class="binder-empty-copy">No cards in this binder yet.</p>';

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
                Cards in Binder: ${binderQtyTotal}
              </p>
              ${cardPreviewMarkup}
            </div>
          </div>
        `;
        binderList.appendChild(div);
      });
    };
  };

  saveBinderBtn.addEventListener("click", () => {
    const name = binderNameInput.value.trim();
    const desc = binderDescInput.value.trim();
    const file = binderImageInput.files?.[0];

    if (!name) {
      alert("Please enter a binder name.");
      return;
    }

    const transaction = db.transaction([STORE_NAME], "readwrite");
    const store = transaction.objectStore(STORE_NAME);

    const newBinder = {
      name: name,
      description: desc,
      image: file || null,
      createdAt: new Date().getTime()
    };

    const addRequest = store.add(newBinder);
    addRequest.onsuccess = () => {
      binderNameInput.value = "";
      binderDescInput.value = "";
      binderImageInput.value = "";
      render();
    };
  });

  clearAllBtn.addEventListener("click", () => {
    if (!confirm("Delete all binders?")) return;
    const transaction = db.transaction([STORE_NAME], "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    store.clear().onsuccess = () => render();
  });
});