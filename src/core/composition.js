/**
 * Composition helpers — Latin buffer ↔ Mongol preview.
 */

import { translate } from "./mapping.js";

/**
 * @param {string} buffer
 * @param {string} char
 */
export function appendToBuffer(buffer, char) {
  const mapped = char === "+" ? "=" : char;
  return (buffer ?? "") + mapped;
}

/**
 * @param {string} buffer
 */
export function backspaceBuffer(buffer) {
  if (!buffer) return "";
  return buffer.slice(0, -1);
}

/**
 * @param {string} buffer
 */
export function previewFromBuffer(buffer) {
  return translate(buffer ?? "");
}

/**
 * True if char participates in phonetic composition.
 * @param {string} char
 */
export function isCompositionChar(char) {
  return typeof char === "string" && /^[a-zA-Z\-=+]$/.test(char);
}
