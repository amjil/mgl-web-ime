/**
 * Unicode / grapheme helpers for Mongolian text.
 */

const MONGOL_LETTER_RE = /[\u1800-\u18AF]/u;
const MONGOL_WORD_TAIL_RE = /([\u1800-\u18AF\u202F\u180E\u200C\u200D]+)$/u;

/** @param {string} text */
export function codePoints(text) {
  return Array.from(text ?? "");
}

/** @param {string} text */
export function graphemes(text) {
  if (typeof Intl !== "undefined" && Intl.Segmenter) {
    const seg = new Intl.Segmenter(undefined, { granularity: "grapheme" });
    return [...seg.segment(text ?? "")].map((s) => s.segment);
  }
  return codePoints(text);
}

/**
 * Delete one grapheme from the end of `text`.
 * @param {string} text
 */
export function deleteLastGrapheme(text) {
  const parts = graphemes(text);
  if (!parts.length) return "";
  parts.pop();
  return parts.join("");
}

/**
 * Extract trailing Mongolian word (letters + NNBSP/MVS/ZWJ).
 * @param {string} text
 */
export function trailingMongolWord(text) {
  const m = (text ?? "").match(MONGOL_WORD_TAIL_RE);
  return m ? m[1] : "";
}

/**
 * Last word before cursor — NNBSP and Mongolian punctuation break words.
 * Mirrors ime-core.linguistics/get-last-word.
 * @param {string} text
 */
export function getLastWord(text) {
  if (!text || !text.trim()) return "";
  const normalized = text
    .replace(/᠂/g, " ")
    .replace(/᠃/g, " ")
    .replace(/\*/g, " ")
    .replace(/\[/g, " ")
    .replace(/\]/g, " ");
  const parts = normalized.split(/[\s\n\u202F]+/);
  return parts[parts.length - 1] || "";
}

/** @param {number} code */
export function isMongolianLetter(code) {
  return code >= 0x1820 && code <= 0x1842;
}

/** @param {string} ch */
export function isMongolianChar(ch) {
  if (!ch) return false;
  const code = ch.codePointAt(0);
  return (
    (code >= 0x1800 && code <= 0x18af) ||
    code === 0x202f ||
    code === 0x180e ||
    code === 0x200c ||
    code === 0x200d
  );
}

export { MONGOL_LETTER_RE, MONGOL_WORD_TAIL_RE };
