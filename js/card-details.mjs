import { getCard, updateCard, deleteCard } from "./storage.mjs";

function getIdFromUrl() {
  const params = new URLSearchParams(location.search);
  return params.get("id");
}

export function initCardDetailsPage() {
  const host = document.getElementById("cardDetails");
  const id = getIdFromUrl();

  if (!id) {
    host.textContent = "Missing ?id= in URL.";
    return;
  }

  const card = getCard(id);
  if (!card) {
    host.textContent = "Card not found.";
    return;
  }

  host.innerHTML = `
    <div class="inline-preview">
      <div class="preview-img">
        <img src="${card.imageDataUrl || card.imageUrl || "assets/placeholder-card.png"}" alt="${card.name || "Card"}" />
      </div>
      <div class="form-wrap">
        <div><strong>Name:</strong> ${card.name || ""}</div>
        <div><strong>Series:</strong> ${card.series || ""}</div>
        <div><strong>Expansion:</strong> ${card.expansion || ""}</div>
        <div><strong>Number:</strong> ${card.number || ""}</div>
        <div><strong>Rarity:</strong> ${card.rarity || ""}</div>
        <div><strong>Quantity:</strong> <span class="badge">x${card.qty || 1}</span></div>

        <fieldset>
          <legend>Edit</legend>
          <div class="row">
            <label>
              Rarity
              <input id="editRarity" type="text" value="${card.rarity || ""}" />
            </label>
            <label>
              Quantity
              <input id="editQty" type="number" min="1" value="${card.qty || 1}" />
            </label>
          </div>

          <div class="actions">
            <button id="btnSaveEdit" type="button">Save</button>
            <button id="btnDelete" type="button">Delete</button>
          </div>

          <div id="status" class="small" aria-live="polite"></div>
        </fieldset>
      </div>
    </div>
  `;

  const editRarity = document.getElementById("editRarity");
  const editQty = document.getElementById("editQty");
  const btnSaveEdit = document.getElementById("btnSaveEdit");
  const btnDelete = document.getElementById("btnDelete");
  const status = document.getElementById("status");

  btnSaveEdit.addEventListener("click", () => {
    const qty = Math.max(1, parseInt(editQty.value || "1", 10));
    const updated = updateCard(id, { rarity: editRarity.value.trim(), qty });
    status.textContent = updated ? "Saved." : "Failed to save.";
  });

  btnDelete.addEventListener("click", () => {
    const ok = deleteCard(id);
    if (ok) location.href = "binders.html";
  });
}
