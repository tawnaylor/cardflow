import { uid, fileToDataUrl } from "./utils.js";
import { addCard } from "./storage.js";
import { fetchBrandSeries, fetchMarketSample, getBrandOptions, getSeriesForBrand, getBrandName } from "./data.js";
import { setSelectOptions } from "./ui.js";

const els = {
  form: document.getElementById("cardForm"),
  cardName: document.getElementById("cardName"),
  brand: document.getElementById("brand"),
  series: document.getElementById("series"),
  marketValue: document.getElementById("marketValue"),
  cardDetails: document.getElementById("cardDetails"),
  imageFile: document.getElementById("imageFile"),
  imgPreview: document.getElementById("imgPreview"),
  resetBtn: document.getElementById("resetBtn")
};

let brandData = null;
let marketSample = {};

init().catch(console.error);

async function init() {
  brandData = await fetchBrandSeries();
  marketSample = await fetchMarketSample();

  setSelectOptions(els.brand, getBrandOptions(brandData), "Select…");

  els.brand.addEventListener("change", () => {
    const b = els.brand.value;
    const options = getSeriesForBrand(brandData, b);
    setSelectOptions(els.series, options, "Select…");
  });

  els.imageFile.addEventListener("change", async () => {
    const file = els.imageFile.files?.[0];
    if (!file) {
      els.imgPreview.textContent = "Image preview";
      return;
    }
    const url = await fileToDataUrl(file);
    els.imgPreview.innerHTML = `<img alt="Preview" src="${url}" />`;
  });

  els.resetBtn.addEventListener("click", () => {
    els.form.reset();
    els.imgPreview.textContent = "Image preview";
    clearErrors();
    setSelectOptions(els.series, [], "Select brand first…");
  });

  els.form.addEventListener("submit", onSubmit);
}

async function onSubmit(e) {
  e.preventDefault();
  clearErrors();

  const file = els.imageFile.files?.[0] ?? null;

  const data = {
    name: els.cardName.value.trim(),
    brand: els.brand.value,
    series: els.series.value,
    details: els.cardDetails.value.trim(),
    marketValue: els.marketValue.value === "" ? "" : Number(els.marketValue.value),
    imageFile: file
  };

  const errors = validate(data);
  if (Object.keys(errors).length) {
    for (const [k, msg] of Object.entries(errors)) showError(k, msg);
    return;
  }

  const imageDataUrl = await fileToDataUrl(file);

  // Market value: use entered value if provided; otherwise try JSON lookup
  const brandLabel = getBrandName(brandData, data.brand);
  const key = `${data.brand}|${data.series}|${data.name}`;
  const lookup = Number(marketSample[key]);
  const finalMarketValue =
    data.marketValue !== "" && Number.isFinite(data.marketValue)
      ? data.marketValue
      : (Number.isFinite(lookup) ? lookup : 0);

  const card = {
    id: uid(),
    name: data.name,
    brand: data.brand,
    brandLabel,
    series: data.series,
    details: data.details,
    marketValue: finalMarketValue,
    imageDataUrl,
    createdAt: Date.now(),
    updatedAt: Date.now()
  };

  addCard(card);

  // Go back to binder and auto-select the new card
  window.location.href = `./index.html?selected=${encodeURIComponent(card.id)}`;
}

function validate(d) {
  const errs = {};
  if (!d.name) errs.cardName = "Card name is required.";
  if (!d.brand) errs.brand = "Brand is required.";
  if (!d.series) errs.series = "Series is required.";
  if (!d.details) errs.cardDetails = "Card details are required.";
  if (!d.imageFile) errs.imageFile = "An image is required.";

  if (d.marketValue !== "" && (!Number.isFinite(d.marketValue) || d.marketValue < 0)) {
    errs.marketValue = "Market value must be a number ≥ 0.";
  }
  return errs;
}

function clearErrors() {
  document.querySelectorAll(".error").forEach((e) => (e.textContent = ""));
}

function showError(fieldId, msg) {
  const el = document.querySelector(`.error[data-for="${fieldId}"]`);
  if (el) el.textContent = msg;
}
