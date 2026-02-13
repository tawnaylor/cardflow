export function validate(values) {
  const errors = {};

  if (!values.game) errors.game = "Game is required.";
  if (!values.name.trim()) errors.name = "Card name is required.";
  if (!values.set) errors.set = "Set is required.";

  const qty = Number(values.qty);
  if (!Number.isInteger(qty) || qty < 1) errors.qty = "Quantity must be an integer ≥ 1.";

  const valueRaw = values.value.trim();
  if (valueRaw !== "") {
    const v = Number(valueRaw);
    if (!Number.isFinite(v) || v < 0) errors.value = "Value must be a number ≥ 0.";
  }

  const img = values.img.trim();
  if (img) {
    try { new URL(img); } catch { errors.img = "Image URL must be valid (include https://)."; }
  }

  return { ok: Object.keys(errors).length === 0, errors };
}
