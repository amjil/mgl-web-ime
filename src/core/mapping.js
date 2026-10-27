/**
 * Latin → Mongolian Unicode mapping.
 * Ported from shared-ime.mapping (m-h-k).
 */

export const LATIN_TO_MONGOL = {
  a: "\u1820",
  e: "\u1821",
  i: "\u1822",
  c: "\u1823", // ᠣ
  v: "\u1824", // ᠤ
  o: "\u1825", // ᠥ
  u: "\u1826", // ᠦ

  n: "\u1828",
  b: "\u182a",
  p: "\u182b",
  h: "\u182c",
  g: "\u182d",
  m: "\u182e",
  l: "\u182f",
  s: "\u1830",
  x: "\u1831",
  t: "\u1832",
  d: "\u1833",
  q: "\u1834",
  j: "\u1835",
  k: "\u183a",
  y: "\u1836",
  r: "\u1837",
  w: "\u1838",
  z: "\u183d",

  // Uppercase (shift strokes)
  A: "\u1820",
  G: "\u182d",
  N: "\u1829",
  H: "\u183e",
  Q: "\u1842",
  C: "\u183c",
  R: "\u183f",
  Z: "\u1841",
  L: "\u1840",

  // MVS
  "-": "\u180e",
  "=": "\u180e",
  "\\": "\u180e",

  // FVS
  "[": "\u180b",
  "]": "\u180c",
  "|": "\u180d",

  // Punctuation
  ",": "\u1802",
  ".": "\u1803",
  "?": "\uff1f",
  "!": "\uff01",
};

/**
 * Translate Latin buffer to Mongolian lookup / preview string.
 * @param {string} latinStr
 */
export function translate(latinStr) {
  if (!latinStr) return "";
  let out = "";
  for (const ch of latinStr) {
    out += LATIN_TO_MONGOL[ch] ?? LATIN_TO_MONGOL[ch.toLowerCase()] ?? ch;
  }
  return out;
}

/**
 * Direct injection chars (desktop hardware keys) when not composing.
 * @param {{ key: string, code?: string, shiftKey?: boolean, latinMode?: boolean }} ev
 * @returns {string|null}
 */
export function directCharFromKey(ev) {
  if (ev.latinMode) return null;
  const { key, code, shiftKey } = ev;

  if (shiftKey && (key === " " || code === "Space")) return "\u202f"; // NNBSP
  if (code === "BracketLeft" || key === "[") return "\u180b";
  if (code === "BracketRight" || key === "]" || key === "}") {
    if (shiftKey) return "\u180a"; // nirugu ᠊
    return "\u180c"; // FVS2
  }
  // | (Shift+\) → FVS3. Bare \ is MVS via phonetic composition (not direct).
  if (key === "|" || (code === "Backslash" && shiftKey)) return "\u180d";
  // Shift+, / Shift+. (< / > on US QWERTY) → Mongolian double quotes 《 》 (KBDMONMO / m-h-k).
  if (
    shiftKey &&
    (key === "<" || key === "\u300a" || key === "\u3008" || code === "Comma")
  ) {
    return "\u300a";
  }
  if (
    shiftKey &&
    (key === ">" || key === "\u300b" || key === "\u3009" || code === "Period")
  ) {
    return "\u300b";
  }
  if (key === "," || code === "Comma") return "\u1802";
  if (key === "." || code === "Period") return "\u1803";
  if (
    key === "?" ||
    key === "\uff1f" ||
    code === "Slash" && shiftKey
  ) {
    return "\uff1f";
  }
  if (
    key === "!" ||
    key === "\uff01" ||
    (code === "Digit1" && shiftKey)
  ) {
    return "\uff01";
  }
  return null;
}
