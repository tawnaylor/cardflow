const API_KEY = "56915f12-a262-4f7d-92fc-e2fe08a918ac";

export async function loadSetsFromApi() {
  const res = await fetch("https://api.pokemontcg.io/v2/sets?pageSize=250&orderBy=releaseDate", {
    headers: { "X-Api-Key": API_KEY }
  });
  if (!res.ok) throw new Error("Failed to load sets from API");
  const json = await res.json();
  return json.data || [];
}

export function buildSeriesMap(sets) {
  const bySeries = new Map();
  for (const s of sets) {
    const seriesName = s.series || "Unknown Series";
    if (!bySeries.has(seriesName)) bySeries.set(seriesName, []);
    bySeries.get(seriesName).push(s);
  }

  for (const [series, list] of bySeries.entries()) {
    list.sort((a, b) => (a.releaseDate || "").localeCompare(b.releaseDate || "") || (a.name || "").localeCompare(b.name || ""));
    bySeries.set(series, list);
  }

  return [...bySeries.entries()].sort((a, b) => {
    const aFirst = a[1][0]?.releaseDate || "";
    const bFirst = b[1][0]?.releaseDate || "";
    return aFirst.localeCompare(bFirst) || a[0].localeCompare(b[0]);
  });
}

export function populateSeriesAndExpansions({ seriesSelect, expansionSelect, seriesEntries }) {
  seriesSelect.innerHTML = `<option value="">Select series...</option>`;
  for (const [seriesName] of seriesEntries) {
    const opt = document.createElement("option");
    opt.value = seriesName;
    opt.textContent = seriesName;
    seriesSelect.appendChild(opt);
  }

  function refillExpansions(seriesName) {
    expansionSelect.innerHTML = `<option value="">Select expansion...</option>`;
    const match = seriesEntries.find(([name]) => name === seriesName);
    const sets = match?.[1] || [];
    for (const s of sets) {
      const opt = document.createElement("option");
      opt.value = s.name;
      opt.textContent = s.releaseDate ? `${s.name} (${s.releaseDate})` : s.name;
      expansionSelect.appendChild(opt);
    }
  }

  seriesSelect.addEventListener("change", () => refillExpansions(seriesSelect.value));
  refillExpansions(seriesSelect.value);
}
