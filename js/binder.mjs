import { escapeText } from "./ui.mjs";

const SLOTS_PER_PAGE = 9;

function cardTitle(card){
  return card.game === "pokemon" ? (card.pokemon?.name || "Pokémon") : (card.mtg?.name || "MTG");
}

function cardBadgeRight(card){
  const setName = card.setName || "";
  const num = card.game === "pokemon" ? (card.pokemon?.cardNumber || "") : (card.mtg?.collectorNumber || "");
  const tail = [setName, num].filter(Boolean).join(" • ");
  return tail || "";
}

function buildSleeve(card){
  const rarity = card.rarity || "common";
  const img = card.imageDataUrl;

  const sleeve = document.createElement("button");
  sleeve.type = "button";
  sleeve.className = "sleeve";
  sleeve.dataset.rarity = rarity;
  sleeve.setAttribute("aria-label", `${cardTitle(card)} card`);

  if (img){
    const image = document.createElement("img");
    image.className = "card-img";
    image.alt = `${cardTitle(card)} image`;
    image.src = img;
    sleeve.appendChild(image);
  } else {
    const empty = document.createElement("div");
    empty.className = "empty";
    empty.textContent = "No image";
    sleeve.appendChild(empty);
  }

  const meta = document.createElement("div");
  meta.className = "meta";

  const left = document.createElement("div");
  left.className = "badge";
  left.innerHTML = escapeText(cardTitle(card));

  const right = document.createElement("div");
  right.className = "small";
  right.textContent = cardBadgeRight(card);

  meta.append(left, right);
  sleeve.appendChild(meta);

  // Navigate to full card details when clicked
  sleeve.addEventListener("click", () => {
    window.location.href = `./card.html?id=${encodeURIComponent(card.id)}`;
  });

  return sleeve;
}

function buildPage(cards){
  const page = document.createElement("div");
  page.className = "page";

  const pockets = document.createElement("div");
  pockets.className = "pockets";

  for (let i=0; i<SLOTS_PER_PAGE; i++){
    const c = cards[i];
    if (c) pockets.appendChild(buildSleeve(c));
    else{
      const sleeve = document.createElement("div");
      sleeve.className = "sleeve";
      sleeve.dataset.rarity = "common";
      const empty = document.createElement("div");
      empty.className = "empty";
      empty.textContent = "Empty slot";
      sleeve.appendChild(empty);
      pockets.appendChild(sleeve);
    }
  }

  page.appendChild(pockets);
  return page;
}

export function renderBinder(binderEl, cardsForBinder, pageIndex, flipDir){
  binderEl.innerHTML = "";

  const start = pageIndex * (SLOTS_PER_PAGE * 2);
  const leftCards = cardsForBinder.slice(start, start + SLOTS_PER_PAGE);
  const rightCards = cardsForBinder.slice(start + SLOTS_PER_PAGE, start + SLOTS_PER_PAGE * 2);

  const inner = document.createElement("div");
  inner.className = "binder-inner";

  const left = buildPage(leftCards);
  const right = buildPage(rightCards);

  if (flipDir === "left"){ left.classList.add("flip-left"); right.classList.add("flip-left"); }
  if (flipDir === "right"){ left.classList.add("flip-right"); right.classList.add("flip-right"); }

  inner.append(left, right);
  binderEl.appendChild(inner);

  const totalSlots = cardsForBinder.length;
  const totalPages = Math.max(1, Math.ceil(totalSlots / (SLOTS_PER_PAGE * 2)));
  return { totalPages };
}
