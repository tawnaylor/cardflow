export async function getSets() {
  const res = await fetch("./data/sets.json", { cache: "no-store" });
  if (!res.ok) throw new Error("Could not load sets.json");
  return res.json();
}
