/**
 * Editing helpers used by adapters / profiles.
 */

import { graphemes } from "../utils/unicode.js";

/**
 * Replace `deleteLen` code points before `caret` with `text`.
 * @param {string} full
 * @param {number} caret
 * @param {number} deleteLen
 * @param {string} text
 */
export function replaceBefore(full, caret, deleteLen, text) {
  const cps = Array.from(full ?? "");
  const del = Math.min(deleteLen, caret);
  const next =
    cps.slice(0, caret - del).join("") + (text ?? "") + cps.slice(caret).join("");
  const newCaret = caret - del + Array.from(text ?? "").length;
  return { text: next, caret: newCaret };
}

/**
 * @param {string} text
 * @param {number} caret
 */
export function deleteGraphemeBefore(text, caret) {
  const before = text.slice(0, caret);
  const after = text.slice(caret);
  const parts = graphemes(before);
  parts.pop();
  const nextBefore = parts.join("");
  return {
    text: nextBefore + after,
    caret: nextBefore.length,
  };
}
