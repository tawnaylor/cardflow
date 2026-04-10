import { getCards } from "./storage.js";
import { escapeAttr, escapeHtml } from "./utils.js";

console.log("🔥 binders.js: Persistent Storage & Card Count Fix");

// 1. DATABASE CONFIGURATION
const DB_NAME = "CardFlowDB";
const STORE_NAME = "binders";
let db;
const navToggle = document.querySelector(".nav-toggle");
const navMenu = document.querySelector(".nav");
const binderList = document.getElementById("binderList");
const clearAllBtn = document.getElementById("clearAll");
const saveBinderBtn = document.getElementById("saveBinder");
const binderNameInput = document.getElementById("binderName");
const binderDescInput = document.getElementById("binderDesc");
const binderImageInput = document.getElementById("binderImage");

function render() {
  if (!db || !binderList) return;

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

      const binderCards = allCards.filter(card => String(card.binderId) === String(b.id));
      const binderQtyTotal = binderCards.reduce((sum, card) => sum + Number(card.quantity || 1), 0);
      const accentHue = 180 + ((Number(b.id) * 23) % 120);
      const featureCard = binderCards[0] || null;
      const featureImage = featureCard ? featureCard.imageUrl || featureCard.imageDataUrl || featureCard.externalImageUrl || '' : '';
      const subtitle = binderCards.length
        ? `${binderCards.length} unique cards • ${binderQtyTotal} total`
        : 'Empty binder';

      let imgUrl = 'https://via.placeholder.com/300x400?text=No+Image';
      if (b.image) {
        imgUrl = URL.createObjectURL(b.image);
      }

      div.innerHTML = `
        <a class="binder-book" href="binder-detail.html?id=${encodeURIComponent(b.id)}" aria-label="Open binder ${escapeAttr(b.name)}" style="--binder-hue:${accentHue};">
          <span class="binder-book__spine"></span>
          <span class="binder-book__pages"></span>
          <span class="binder-book__cover">
            <span class="binder-book__badge">Binder</span>
            <span class="binder-book__title">${escapeHtml(b.name)}</span>
            <span class="binder-book__subtitle">${escapeHtml(subtitle)}</span>
            <span class="binder-book__description">${escapeHtml(b.description || 'Open this binder to browse the cards inside.')}</span>
            <span class="binder-book__art">${featureImage
              ? `<img src="${escapeAttr(featureImage)}" alt="${escapeAttr(featureCard?.name || b.name)}">`
              : `<img src="${escapeAttr(imgUrl)}" alt="${escapeAttr(b.name)}">`}</span>
          </span>
        </a>
      `;
      binderList.appendChild(div);
    });
  };
}

function saveBinder() {
  if (!db || !binderNameInput || !binderDescInput || !binderImageInput) return;

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
    name,
    description: desc,
    image: file || null,
    createdAt: Date.now()
  };

  const addRequest = store.add(newBinder);
  addRequest.onsuccess = () => {
    binderNameInput.value = "";
    binderDescInput.value = "";
    binderImageInput.value = "";
    render();
  };
}

function clearAllBinders() {
  if (!db) return;
  if (!confirm("Delete all binders?")) return;
  const transaction = db.transaction([STORE_NAME], "readwrite");
  const store = transaction.objectStore(STORE_NAME);
  store.clear().onsuccess = () => render();
}

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

if (navToggle && navMenu) {
  navToggle.addEventListener("click", () => {
    navMenu.classList.toggle("active");
  });
}

saveBinderBtn?.addEventListener("click", saveBinder);
clearAllBtn?.addEventListener("click", clearAllBinders);