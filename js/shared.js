let seriesCache = null;

export function uid() {
  return crypto.randomUUID
    ? crypto.randomUUID()
    : `id_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

export function money(n) {
  const num = Number(n);
  const safe = Number.isFinite(num) ? num : 0;
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(safe);
}

export function getParam(name) {
  return new URL(location.href).searchParams.get(name);
}

export function escapeHtml(s) {
  return String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

export async function fetchPokemonSeries() {
  if (seriesCache) return seriesCache;
  const res = await fetch("./data/pokemon-series.json");
  if (!res.ok) throw new Error("Could not load pokemon-series.json");
  seriesCache = await res.json();
  return seriesCache;
}
