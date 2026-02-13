import { getCard } from "./storage.js";
import { getParam, money } from "./shared.js";

const view = document.getElementById("view");
const id = getParam("id");

if (!view) throw new Error("Missing #view element");

if (!id) {
  renderNotFound();
} else {
  const card = getCard(id);
  if (!card) renderNotFound();
  else renderCard(card);
}

function clearView() {
  view.textContent = "";
}

function makeKv(keyText, valueText) {
  const wrap = document.createElement("div");
  wrap.className = "kv";

  const k = document.createElement("div");
  k.className = "k";
  k.textContent = keyText;

  const v = document.createElement("div");
  v.className = "v";
  v.textContent = valueText;

  wrap.append(k, v);
  return wrap;
}

function renderCard(c) {
  clearView();

  const imgWrap = document.createElement("div");
  imgWrap.className = "dp-img";
  if (c.imageDataUrl) {
    const img = document.createElement("img");
    img.alt = c.name ?? "";
    img.src = c.imageDataUrl;
    imgWrap.appendChild(img);
  } else {
    imgWrap.textContent = "No image";
  }

  const body = document.createElement("div");
  body.className = "dp-body";

  const h2 = document.createElement("h2");
  h2.style.margin = "0";
  h2.textContent = c.name ?? "";

  const series = document.createElement("div");
  series.className = "muted";
  series.textContent = `Series: ${c.series ?? ""}`;

  const kvMarket = makeKv("Market Value", money(c.marketValue || 0));
  const kvDetails = makeKv("Details", c.details ?? "");

  body.append(h2, series, kvMarket, kvDetails);
  view.append(imgWrap, body);
}

function renderNotFound() {
  clearView();
  const h2 = document.createElement("h2");
  h2.textContent = "Card not found";

  const p = document.createElement("p");
  p.className = "muted";
  const code = document.createElement("code");
  code.textContent = "?id";
  p.append("Missing or invalid ", code, ".");

  view.append(h2, p);
}
