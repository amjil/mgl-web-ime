/**
 * Desktop candidate popup placement relative to the caret.
 *
 * Preferred order: bottom-right, then bottom-left, then top-left.
 * Never overlap the caret; viewport clamping must not slide the panel
 * over the insertion point. Oversized rects (whole editor) are shrunk to a
 * caret-sized origin so the popup is not pushed below the input.
 */

const DEFAULT_GAP = 8;
const DEFAULT_MARGIN = 8;
/** Real carets are a short bar. Larger boxes are the editor — pin to the start. */
const MAX_CARET_EXTENT = 36;

/**
 * @param {{left:number, top:number, right?:number, bottom?:number, width?:number, height?:number}} rect
 */
function normalizeCaret(rect) {
  const left = rect.left;
  const top = rect.top;
  let right = rect.right ?? left + (rect.width ?? 0);
  let bottom = rect.bottom ?? top + (rect.height ?? 0);
  if (right - left > MAX_CARET_EXTENT) right = left + MAX_CARET_EXTENT;
  if (bottom - top > MAX_CARET_EXTENT) bottom = top + MAX_CARET_EXTENT;
  return { left, top, right, bottom };
}

/**
 * @param {{left:number, top:number, right?:number, bottom?:number, width?:number, height?:number}} rect
 * @param {{width:number, height:number}} panel
 * @param {{width:number, height:number}} viewport
 * @param {{gap?:number, margin?:number, placement?:string}} [opts]
 * @returns {{left:number, top:number}}
 */
export function placeNearCaret(rect, panel, viewport, opts = {}) {
  const gap = opts.gap ?? DEFAULT_GAP;
  const margin = opts.margin ?? DEFAULT_MARGIN;
  const placement = opts.placement ?? "auto";
  const pWidth = panel.width > 0 ? panel.width : 200;
  const pHeight = panel.height > 0 ? panel.height : 60;
  const vw = viewport.width;
  const vh = viewport.height;

  const caret = normalizeCaret(rect);

  const anchors = {
    "below-right": { left: caret.right + gap, top: caret.bottom + gap },
    "below-left": { left: caret.left - gap - pWidth, top: caret.bottom + gap },
    "above-left": { left: caret.left - gap - pWidth, top: caret.top - gap - pHeight },
    "above-right": { left: caret.right + gap, top: caret.top - gap - pHeight },
  };
  const order =
    placement === "left"
      ? ["below-left", "above-left", "below-right", "above-right"]
      : placement === "top"
        ? ["above-left", "above-right", "below-right", "below-left"]
        : placement === "right"
          ? ["below-right", "above-right", "below-left", "above-left"]
          : ["below-right", "below-left", "above-left", "above-right"];

  const overflow = (left, top) => {
    const ox =
      Math.max(0, margin - left) + Math.max(0, left + pWidth - (vw - margin));
    const oy =
      Math.max(0, margin - top) + Math.max(0, top + pHeight - (vh - margin));
    return ox + oy;
  };
  const overlapsCaret = (left, top) =>
    left < caret.right + gap &&
    left + pWidth > caret.left - gap &&
    top < caret.bottom + gap &&
    top + pHeight > caret.top - gap;

  let best = null;
  let bestOverflow = Infinity;
  for (const name of order) {
    const pos = anchors[name];
    if (!pos || overlapsCaret(pos.left, pos.top)) continue;
    const ov = overflow(pos.left, pos.top);
    if (ov === 0) {
      best = pos;
      break;
    }
    if (ov < bestOverflow) {
      best = pos;
      bestOverflow = ov;
    }
  }

  let left = best ? best.left : caret.right + gap;
  let top = best ? best.top : caret.bottom + gap;

  const shiftLeft = vw - margin - pWidth;
  if (left + pWidth > vw - margin && shiftLeft >= caret.right + gap) {
    left = shiftLeft;
  } else if (left < margin && margin + pWidth <= caret.left - gap) {
    left = margin;
  }
  const shiftTop = vh - margin - pHeight;
  if (top + pHeight > vh - margin && shiftTop >= caret.bottom + gap) {
    top = shiftTop;
  } else if (top < margin && margin + pHeight <= caret.top - gap) {
    top = margin;
  }

  return { left, top };
}
