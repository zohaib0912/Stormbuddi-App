/**
 * Keeps the first row per `id`. Drops duplicates (e.g. same API id twice in one page).
 */
export function dedupeById(items) {
  if (!Array.isArray(items)) {
    return [];
  }
  const seen = new Set();
  const out = [];
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (item == null) {
      continue;
    }
    const key =
      item.id !== undefined && item.id !== null
        ? String(item.id)
        : `__no_id_${i}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    out.push(item);
  }
  return out;
}
