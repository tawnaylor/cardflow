import { findCardById, deleteCard, updateCard, fileToDataUrl } from "./storage.js";

const params = new URLSearchParams(location.search);
const id = params.get("id");

const bigImg = document.getElementById("bigImg");
const dName = document.getElementById("dName");
const dMeta = document.getElementById("dMeta");
const dQty = document.getElementById("dQty");
const dSeries = document.getElementById("dSeries");
const dExpansion = document.getElementById("dExpansion");
const dRarity = document.getElementById("dRarity");
const dNumber = document.getElementById("dNumber");
const status = document.getElementById("status");

const backBtn = document.getElementById("back");
const deleteBtn = document.getElementById("delete");
const editBtn = document.getElementById('edit');
const saveBtn = document.getElementById('save');
const cancelBtn = document.getElementById('cancel');
const editForm = document.getElementById('editForm');
const editName = document.getElementById('editName');
const editSeries = document.getElementById('editSeries');
const editExpansion = document.getElementById('editExpansion');
const editRarity = document.getElementById('editRarity');
const editNumber = document.getElementById('editNumber');
const editQty = document.getElementById('editQty');
const editImageUrl = document.getElementById('editImageUrl');
const editImageFile = document.getElementById('editImageFile');

if (backBtn) backBtn.addEventListener("click", () => history.back());
if (deleteBtn) deleteBtn.addEventListener("click", () => {
  if (!confirm("Delete this card entry?")) return;
  deleteCard(id);
  location.href = "./index.html";
});

if (editBtn) editBtn.addEventListener('click', () => {
  const card = findCardById(id);
  if (!card) return;
  // populate edit form
  editName.value = card.name || '';
  editSeries.value = card.series || '';
  editExpansion.value = card.expansion || '';
  editRarity.value = card.rarity || 'Common';
  editNumber.value = card.number || '';
  editQty.value = card.qty || 1;
  editImageUrl.value = '';
  if (editForm) editForm.style.display = '';
  if (saveBtn) saveBtn.style.display = '';
  if (cancelBtn) cancelBtn.style.display = '';
  if (editBtn) editBtn.style.display = 'none';
});

if (cancelBtn) cancelBtn.addEventListener('click', () => {
  if (editForm) editForm.style.display = 'none';
  if (saveBtn) saveBtn.style.display = 'none';
  if (cancelBtn) cancelBtn.style.display = 'none';
  if (editBtn) editBtn.style.display = '';
});

if (saveBtn) saveBtn.addEventListener('click', async () => {
  const card = findCardById(id);
  if (!card) return;

  // collect updates
  const updates = {
    name: editName.value || card.name,
    series: editSeries.value || card.series,
    expansion: editExpansion.value || card.expansion,
    rarity: editRarity.value || card.rarity,
    number: editNumber.value || card.number,
    qty: Math.max(1, Number(editQty.value || card.qty || 1))
  };

  // handle image: file preferred, then url
  try {
    const file = editImageFile.files?.[0] || null;
    if (file) {
      updates.imageDataUrl = await fileToDataUrl(file);
    } else if (editImageUrl && editImageUrl.value.trim()) {
      try {
        const resp = await fetch(editImageUrl.value.trim(), { mode: 'cors' });
        if (resp.ok) {
          const blob = await resp.blob();
          if (blob.type && blob.type.startsWith('image/')) updates.imageDataUrl = await fileToDataUrl(blob);
        }
      } catch (e) { console.warn('failed to fetch image URL', e); }
    }
  } catch (err) {
    console.warn('image handling failed', err);
  }

  const updated = updateCard(id, updates);
  if (updated) {
    render();
    setTimeout(() => {
      if (editForm) editForm.style.display = 'none';
      if (saveBtn) saveBtn.style.display = 'none';
      if (cancelBtn) cancelBtn.style.display = 'none';
      if (editBtn) editBtn.style.display = '';
    }, 100);
  }
});

function formatNum(numStr) {
  const n = String(numStr || "").padStart(3, "0");
  return `#${n}`;
}

function escapeHtml(str) {
  return String(str ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function render() {
  if (!status) return;

  if (!id) {
    status.textContent = "Missing id in the URL. Example: card.html?id=...";
    return;
  }

  const card = findCardById(id);
  if (!card) {
    status.textContent = "Card not found. It may have been deleted.";
    return;
  }

  status.textContent = "";

  if (bigImg) {
    // ensure container (parent) is available for placeholder fallbacks
    const container = bigImg.parentElement || bigImg;
    // remove any existing placeholders added previously
    const existingPh = container.querySelector('.ph');
    if (existingPh) existingPh.remove();

    if (card.imageDataUrl) {
      bigImg.style.display = '';
      bigImg.src = card.imageDataUrl;
      bigImg.alt = escapeHtml(card.name || 'Card image');
      bigImg.loading = 'lazy';
      bigImg.onerror = function () {
        this.style.display = 'none';
        const d = document.createElement('div');
        d.className = 'ph';
        d.textContent = 'Image';
        container.appendChild(d);
      };
    } else {
      bigImg.style.display = 'none';
      const d = document.createElement('div');
      d.className = 'ph';
      d.textContent = 'Image';
      container.appendChild(d);
    }
  }

  if (dName) dName.innerHTML = escapeHtml(card.name || "Untitled");

  const metaParts = [];
  if (card.series) metaParts.push(escapeHtml(card.series));
  if (card.expansion) metaParts.push(escapeHtml(card.expansion));
  if (card.rarity) metaParts.push(escapeHtml(card.rarity));
  if (card.number) metaParts.push(formatNum(card.number));
  if (dMeta) dMeta.innerHTML = metaParts.join(" • ");

  if (dQty) dQty.textContent = `Quantity: x${Number(card.qty || 1)}`;
  if (dSeries) dSeries.textContent = card.series || "";
  if (dExpansion) dExpansion.textContent = card.expansion || "";
  if (dRarity) dRarity.textContent = card.rarity || "";
  if (dNumber) dNumber.textContent = card.number ? formatNum(card.number) : "";
}

window.addEventListener("storage", render);
render();
