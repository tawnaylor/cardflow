import { escapeHtml, money } from "./utils.js";
import { getBrandName } from "./data.js";

export function setSelectOptions(selectEl, options, placeholder = "Select…") {
  selectEl.innerHTML =
    `<option value="">${placeholder}</option>` +
    options.map((o) => `<option value="${escapeHtml(o.id)}">${escapeHtml(o.name)}</option>`).join("");
}

export function renderGrid(gridEl, cards, selectedId) {
  gridEl.innerHTML = "";

  for (const c of cards) {
    const item = document.createElement("button");
    item.type = "button";
    item.className = `card${c.id === selectedId ? " selected" : ""}`;
    item.setAttribute("role", "listitem");
    item.setAttribute("data-id", c.id);
    item.setAttribute("aria-label", `Select ${c.name}`);

    const img = document.createElement("div");
    img.className = "card-img";
    img.innerHTML = c.imageDataUrl
      ? `<img alt="${escapeHtml(c.name)}" src="${escapeHtml(c.imageDataUrl)}" />`
      : "No image";

    const meta = document.createElement("div");
    meta.className = "card-meta";
    meta.innerHTML = `
      <p class="card-name">${escapeHtml(c.name)}</p>
      <div class="card-sub">
        <span class="badge">${escapeHtml(c.brandLabel ?? c.brand)}</span>
        <span class="badge">${escapeHtml(c.series)}</span>
      </div>
    `;

    item.append(img, meta);
    gridEl.appendChild(item);
  }
}

export function renderEmpty(emptyEl, show) {
  emptyEl.hidden = !show;
}

export function renderDetails({ imageEl, fieldsEl, linkEl, deleteBtn, card, brandData }) {
  if (!card) {
    imageEl.textContent = "Select a card";
    fieldsEl.querySelectorAll(".v").forEach((v) => (v.textContent = "—"));
    linkEl.setAttribute("aria-disabled", "true");
    linkEl.href = "./card.html";
    deleteBtn.disabled = true;
    return;
  }

  imageEl.innerHTML = card.imageDataUrl
    ? `<img alt="${escapeHtml(card.name)}" src="${escapeHtml(card.imageDataUrl)}" />`
    : "No image";

  const brandLabel = card.brandLabel ?? getBrandName(brandData, card.brand);
  const values = [
    card.name,
    brandLabel,
    card.series,
    card.expansion ?? "",
    card.setCode ?? "",
    card.details,
    money(card.marketValue ?? 0)
  ];

  const vs = fieldsEl.querySelectorAll(".v");
  vs.forEach((node, i) => (node.textContent = values[i] ?? "—"));

  linkEl.setAttribute("aria-disabled", "false");
  linkEl.href = `./card.html?id=${encodeURIComponent(card.id)}`;
  deleteBtn.disabled = false;
}

export function togglePanel(panelEl, open) {
  panelEl.hidden = !open;
}
