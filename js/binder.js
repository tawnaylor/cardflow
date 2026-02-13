export const PAGE_SIZE = 9;

export function pageCount(items) {
  return Math.max(1, Math.ceil(items.length / PAGE_SIZE));
}

export function clampPageIndex(index, totalPages) {
  const max = Math.max(0, totalPages - 1);
  return Math.min(Math.max(0, index), max);
}

export function slicePage(items, pageIndex) {
  const start = pageIndex * PAGE_SIZE;
  return items.slice(start, start + PAGE_SIZE);
}
