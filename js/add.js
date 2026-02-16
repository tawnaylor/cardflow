import { upsertCard, fileToDataUrl, getCards } from "./storage.js";

const form = document.getElementById("cardForm");
const status = document.getElementById("status");
const imageInput = document.getElementById("imageInput");
const imageUrlInput = document.getElementById("imageUrl");
const seedBtn = document.getElementById("seedDemo");

function setStatus(msg) {
  status.textContent = msg;
}

function validate(formEl) {
  const name = formEl.elements.name;
  const series = formEl.elements.series;
  const expansion = formEl.elements.expansion;
  const rarity = formEl.elements.rarity;
  const number = formEl.elements.number;

  const problems = [];

  if (!name.value.trim() || name.value.trim().length < 2) problems.push("Card name is required (min 2 chars).");
  if (!series.value.trim()) problems.push("Series is required.");
  if (!expansion.value.trim()) problems.push("Series expansion is required.");
  if (!rarity.value) problems.push("Rarity is required.");
  if (!/^[0-9]{1,4}$/.test(number.value.trim())) problems.push("Card number must be 1–4 digits.");

  return problems;
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  setStatus("");

  const problems = validate(form);
  if (problems.length) {
    setStatus(problems.join(" "));
    return;
  }

  // Priority: file input (local upload) -> image URL (fetch & convert) -> empty
  const file = imageInput.files?.[0] || null;
  let imageDataUrl = "";

  if (file) {
    imageDataUrl = await fileToDataUrl(file);
  } else if (imageUrlInput && imageUrlInput.value.trim()) {
    const url = imageUrlInput.value.trim();
    try {
      const resp = await fetch(url, { mode: 'cors' });
      if (!resp.ok) throw new Error('Network response not ok');
      const blob = await resp.blob();
      // ensure it's an image
      if (blob.type && blob.type.startsWith('image/')) {
        imageDataUrl = await fileToDataUrl(blob);
      } else {
        setStatus('Fetched resource is not an image; ignoring.');
      }
    } catch (err) {
      console.warn('Failed to fetch image URL:', err);
      setStatus('Unable to fetch image URL — it may be blocked by CORS. Upload a file instead.');
    }
  }

  const payload = {
    name: form.elements.name.value,
    series: form.elements.series.value,
    expansion: form.elements.expansion.value,
    rarity: form.elements.rarity.value,
    number: form.elements.number.value,
    qty: form.elements.qty.value,
    imageDataUrl
  };

  const result = upsertCard(payload);

  if (result.merged) {
    setStatus(`Merged quantity! Now x${result.card.qty} for #${result.card.number} (${result.card.series} → ${result.card.expansion}).`);
  } else {
    setStatus(`Added! "${result.card.name}" saved to your binder.`);
  }

  form.reset();
  form.elements.qty.value = 1;
});

seedBtn.addEventListener("click", () => {
  const existing = getCards();
  if (existing.length > 0) {
    setStatus("You already have cards. Clear them on the Binders page if you want a fresh demo.");
    return;
  }

  const demo = [
    { name:"Pikachu", series:"Scarlet & Violet", expansion:"Paldea Evolved", rarity:"Rare", number:"1", qty:2, imageDataUrl:"" },
    { name:"Charizard", series:"Scarlet & Violet", expansion:"Obsidian Flames", rarity:"Ultra Rare", number:"2", qty:2, imageDataUrl:"" },
    { name:"Gengar", series:"Sword & Shield", expansion:"Lost Origin", rarity:"Holo Rare", number:"3", qty:1, imageDataUrl:"" },
    { name:"Mewtwo", series:"Sun & Moon", expansion:"Unified Minds", rarity:"Rare", number:"4", qty:1, imageDataUrl:"" },
    { name:"Eevee", series:"Sword & Shield", expansion:"Evolving Skies", rarity:"Uncommon", number:"5", qty:1, imageDataUrl:"" },
    { name:"Snorlax", series:"Sun & Moon", expansion:"Team Up", rarity:"Rare", number:"6", qty:1, imageDataUrl:"" },
    { name:"Lucario", series:"Diamond & Pearl", expansion:"Majestic Dawn", rarity:"Holo Rare", number:"7", qty:1, imageDataUrl:"" },
    { name:"Infernape", series:"Diamond & Pearl", expansion:"Stormfront", rarity:"Rare", number:"8", qty:1, imageDataUrl:"" },
    { name:"Blastoise", series:"Base Set", expansion:"Base Set", rarity:"Rare Holo", number:"9", qty:1, imageDataUrl:"" },
    { name:"Venusaur", series:"Base Set", expansion:"Base Set", rarity:"Rare Holo", number:"10", qty:1, imageDataUrl:"" },
  ];

  for (const c of demo) upsertCard(c);
  setStatus("Demo seeded! Check your Binders page to see the cards.");
});