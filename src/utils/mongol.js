/**
 * Mongolian Unicode constants + light linguistics helpers.
 * Ported from mongol_code / ime-core.linguistics (m-v-k / m-i-c).
 */

export const Mongol = {
  nirugu: 0x180a,
  fvs1: 0x180b,
  fvs2: 0x180c,
  fvs3: 0x180d,
  mvs: 0x180e,
  a: 0x1820,
  e: 0x1821,
  i: 0x1822,
  o: 0x1823,
  u: 0x1824,
  oe: 0x1825,
  ue: 0x1826,
  ee: 0x1827,
  na: 0x1828,
  ang: 0x1829,
  ba: 0x182a,
  pa: 0x182b,
  qa: 0x182c,
  ga: 0x182d,
  ma: 0x182e,
  la: 0x182f,
  sa: 0x1830,
  sha: 0x1831,
  ta: 0x1832,
  da: 0x1833,
  cha: 0x1834,
  ja: 0x1835,
  ya: 0x1836,
  ra: 0x1837,
  wa: 0x1838,
  tsa: 0x183c,
  haa: 0x183e,
  zra: 0x183f,
  lha: 0x1840,
  zhi: 0x1841,
  chi: 0x1842,
  questionExclamation: 0x2048,
  exclamationQuestion: 0x2049,
};

const NNBSP = 0x202f;
const FVS_OR_MVS = new Set([0x180b, 0x180c, 0x180d, 0x180e, 0x180f]);

/** @param {...number} codes */
export function fromCodes(...codes) {
  return String.fromCodePoint(...codes);
}

/** @param {number|null|undefined} code */
export function isMongolianLetter(code) {
  return code != null && code >= Mongol.a && code <= Mongol.chi;
}

/** @param {number|null|undefined} code */
export function isMvsPrecedingChar(code) {
  if (code == null) return false;
  return (
    code === Mongol.na ||
    code === Mongol.qa ||
    code === Mongol.ga ||
    code === Mongol.ma ||
    code === Mongol.la ||
    code === Mongol.ja ||
    code === Mongol.ya ||
    code === Mongol.ra ||
    code === Mongol.wa ||
    code === Mongol.o ||
    code === Mongol.u ||
    code === Mongol.oe ||
    code === Mongol.ue
  );
}

/** @param {number|null|undefined} code */
export function isVowel(code) {
  return code != null && code >= Mongol.a && code <= Mongol.ee;
}

/** @param {number|null|undefined} code */
export function isMasculineVowel(code) {
  return code === Mongol.a || code === Mongol.o || code === Mongol.u;
}

/** @param {number|null|undefined} code */
export function isFeminineVowel(code) {
  return (
    code === Mongol.e ||
    code === Mongol.ee ||
    code === Mongol.oe ||
    code === Mongol.ue
  );
}

/**
 * @param {string} s
 * @returns {boolean}
 */
function joiningMongolianFromEnd(s) {
  if (!s) return false;
  for (let i = s.length - 1; i >= 0; i--) {
    const c = s.codePointAt(i);
    if (c === NNBSP) return false;
    if (FVS_OR_MVS.has(c)) {
      // BMP only in this set
      continue;
    }
    if (isMongolianLetter(c)) return true;
    return false;
  }
  return false;
}

/**
 * @param {string} s
 * @returns {boolean}
 */
function joiningMongolianFromStart(s) {
  if (!s) return false;
  for (let i = 0; i < s.length; ) {
    const c = s.codePointAt(i);
    const w = c > 0xffff ? 2 : 1;
    if (c === NNBSP) return false;
    if (FVS_OR_MVS.has(c)) {
      i += w;
      continue;
    }
    if (isMongolianLetter(c)) return true;
    return false;
  }
  return false;
}

/**
 * @param {{ text: string, start: number }|null|undefined} ctx
 * @returns {boolean}
 */
export function isInitial(ctx) {
  if (!ctx || ctx.text == null || ctx.start == null || ctx.start < 0) return true;
  const text = ctx.text;
  if (!text) return true;
  const start = Math.min(ctx.start, text.length);
  const before = text.slice(Math.max(start - 2, 0), start);
  const after = text.slice(start, Math.min(start + 2, text.length));
  const prev = joiningMongolianFromEnd(before);
  const next = joiningMongolianFromStart(after);
  // isol or init → treat as "initial" for popup variants (mirrors m-v-k)
  return !prev;
}

/**
 * Code unit / code point immediately before caret.
 * @param {{ text: string, start: number }|null|undefined} ctx
 * @returns {number|null}
 */
export function getPreviousChar(ctx) {
  if (!ctx?.text || !ctx.start || ctx.start <= 0) return null;
  const before = ctx.text.slice(0, ctx.start);
  const cps = Array.from(before);
  if (!cps.length) return null;
  return cps[cps.length - 1].codePointAt(0);
}
