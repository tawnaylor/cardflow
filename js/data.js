let brandCache = null;
let marketCache = null;

export async function fetchBrandSeries() {
  if (brandCache) return brandCache;
  const res = await fetch("./data/brands-series.json");
  if (!res.ok) throw new Error("Failed to load brands-series.json");
  brandCache = await res.json();
  return brandCache;
}

export async function fetchMarketSample() {
  if (marketCache) return marketCache;
  const res = await fetch("./data/market-sample.json");
  if (!res.ok) {
    marketCache = {}; // optional file
    return marketCache;
  }
  marketCache = await res.json();
  return marketCache;
}

export function getBrandOptions(data) {
  return (data?.brands ?? []).map((b) => ({ id: b.id, name: b.name }));
}

export function getSeriesForBrand(data, brandId) {
  const b = (data?.brands ?? []).find((x) => x.id === brandId);
  return (b?.series ?? []).map((s) => ({ id: s, name: s }));
}

export function getBrandName(data, brandId) {
  return (data?.brands ?? []).find((b) => b.id === brandId)?.name ?? "Unknown";
}

export function getSeriesName(data, brandId, seriesId) {
  const b = (data?.brands ?? []).find((b) => b.id === brandId);
  if (!b) return "Unknown";
  return (b.series ?? []).find((s) => s.id === seriesId)?.name ?? "Unknown";
}