/**
 * Caret rectangle from a live Range.
 *
 * Collapsed carets are often 0×0 (especially in vertical Mongolian), which
 * used to make hosts fall back to the whole editor — the candidate popup
 * then sat below the input, off-screen.
 *
 * @param {Range|null} range
 * @param {Element} [fallbackEl]
 * @returns {DOMRect|null}
 */
export function measureCaretRect(range, fallbackEl) {
  if (range) {
    const rects = range.getClientRects();
    for (let i = 0; i < rects.length; i++) {
      const r = rects[i];
      if (r.width || r.height) return r;
    }
    const union = range.getBoundingClientRect();
    if (union.width || union.height) return union;
    try {
      const mirror = range.cloneRange();
      const span = document.createElement("span");
      span.textContent = "\u200b";
      mirror.insertNode(span);
      const r = span.getBoundingClientRect();
      span.parentNode?.removeChild(span);
      if (r.width || r.height || r.top || r.left) return r;
    } catch {
      // Range is not in a live tree.
    }
  }
  return fallbackEl?.getBoundingClientRect?.() ?? null;
}
