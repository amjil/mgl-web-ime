/**
 * Keyboard layouts — ported from virtual-keyboard.keyboard-layouts (m-v-k).
 * Letters may include nirugu (᠊) for display; value is the first code point.
 */

/** Latin hint row for Mongol layout (desktop phonetic ids). */
export const MN_INDEX_LAYOUT = [
  ["q", "w", "e", "r", "t", "y", "u", "i", "o", "p"],
  ["a", "s", "d", "f", "g", "h", "j", "k", "l", "ng"],
  ["-", "z", "x", "c", "v", "b", "n", "m", "_"],
];

export const LAYOUTS = {
  mongol: [
    ["ᠴ᠊", "ᠸ᠊", "ᠡ", "ᠷ᠊", "ᠲ᠊", "ᠶ᠊", "ᠦ᠊", "ᠢ", "ᠥ", "ᠫ᠊"],
    ["ᠠ", "ᠰ᠊", "ᠳ", "ᠹ᠊", "ᠭ᠊", "ᠬ᠊", "ᠵ᠊", "ᠺ᠊", "ᠯ᠊", "ᠩ"],
    ["shift", "ᠽ᠊", "ᠱ᠊", "ᠣ", "ᠤ᠊", "ᠪ᠊", "ᠨ᠊", "ᠮ᠊", "backspace"],
    ["special", "emoji", "abc", "suffix", "᠂", "space", "᠃", "enter"],
  ],

  "mongol-special": [
    ["᠑", "᠒", "᠓", "᠔", "᠕", "᠖", "᠗", "᠘", "᠙", "᠐"],
    ["@", "#", "€", "_", "&", "－", "+", "（", "）", "/"],
    ["other-special", "※", "᠁", "︑", "︓", "；", "！", "？", "backspace"],
    ["special", "emoji", "abc", ",", "space", ".", "enter"],
  ],

  "mongol-other-special": [
    ["～", '"', "|", "·", "√", "∏", "÷", "᠅", "¶", "△"],
    ["£", "¥", "$", "¢", "⁉", "⁈", "=", "❴", "❵", "\\"],
    ["other-special", "᠄", "᠆", "…", "᠁", "［", "］", "backspace"],
    ["special", "emoji", "abc", ",", "space", ".", "enter"],
  ],

  latin: [
    ["q", "w", "e", "r", "t", "y", "u", "i", "o", "p"],
    ["a", "s", "d", "f", "g", "h", "j", "k", "l"],
    ["shift", "z", "x", "c", "v", "b", "n", "m", "backspace"],
    ["special", "emoji", "abc", ",", "space", ".", "enter"],
  ],

  "latin-special": [
    ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"],
    ["@", "#", "€", "_", "&", "-", "+", "(", ")", "/"],
    ["other-special", "*", '"', "'", ":", ";", "!", "?", "backspace"],
    ["special", "emoji", "abc", ",", "space", ".", "enter"],
  ],
};

export const ACTION_KEYS = new Set([
  "shift",
  "backspace",
  "enter",
  "space",
  "special",
  "other-special",
  "abc",
  "suffix",
  "emoji",
]);

/**
 * @param {string} item
 * @param {{ rowIndex?: number, colIndex?: number, layoutName?: string }} [pos]
 */
export function normalizeKey(item, pos = {}) {
  if (ACTION_KEYS.has(item)) {
    return { type: "action", action: item, label: item };
  }
  // Mongol display may include nirugu — emit first char
  const value = Array.from(item)[0] ?? item;
  const cp = value.codePointAt(0);
  const mongolLetter = cp >= 0x1820 && cp <= 0x1842;
  const mongol = cp >= 0x1800 && cp <= 0x18af;
  /** @type {string|null} */
  let id = null;
  // Phonetic ids only on main Mongol letter layout (mirrors m-v-k mn-index-layout)
  if (
    mongolLetter &&
    (pos.layoutName === "mongol" || pos.layoutName == null) &&
    pos.rowIndex != null &&
    pos.colIndex != null
  ) {
    id = MN_INDEX_LAYOUT[pos.rowIndex]?.[pos.colIndex] ?? null;
  } else if (!mongol) {
    id = value.toLowerCase();
  }
  return {
    type: "key",
    value,
    label: item,
    id,
    mongol,
  };
}

/**
 * @param {string} name
 */
export function getLayout(name = "mongol") {
  return LAYOUTS[name] ?? LAYOUTS.mongol;
}

/**
 * Resolve active layout name from keyboard UI state.
 */
export function resolveLayoutName({ base = "mongol", special = false, otherSpecial = false, latin = false }) {
  if (latin) {
    if (otherSpecial) return "latin-special";
    if (special) return "latin-special";
    return "latin";
  }
  if (otherSpecial) return "mongol-other-special";
  if (special) return "mongol-special";
  return base;
}
