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

export function normalize(s) {
  return String(s ?? "").trim().toLowerCase();
}

export function getParam(name) {
  const url = new URL(window.location.href);
  return url.searchParams.get(name);
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
