/**
 * Mongolian grammatical suffixes — ported from mongol_code Suffix +
 * ime-core.linguistics/get-suffix-candidates (used by m-v-k).
 *
 * Leading U+180E (MVS) matches mongol_code; browsers render it more reliably
 * than NNBSP (U+202F) tofu.
 */

import {
  Mongol,
  isMongolianLetter,
  isVowel,
  isMasculineVowel,
  isFeminineVowel,
} from "../utils/mongol.js";
import { getLastWord } from "../utils/unicode.js";

const MVS = String.fromCodePoint(Mongol.mvs);

/** @param {...number} codes */
function s(...codes) {
  return String.fromCodePoint(Mongol.mvs, ...codes);
}

export const Suffix = {
  YIN: s(Mongol.ya, Mongol.i, Mongol.na),
  UN: s(Mongol.u, Mongol.na),
  UEN: s(Mongol.ue, Mongol.na),
  U: s(Mongol.u),
  UE: s(Mongol.ue),
  I: s(Mongol.i),
  YI: s(Mongol.ya, Mongol.i),
  DU: s(Mongol.da, Mongol.u),
  DUE: s(Mongol.da, Mongol.ue),
  TU: s(Mongol.ta, Mongol.u),
  TUE: s(Mongol.ta, Mongol.ue),
  DUR: s(Mongol.da, Mongol.u, Mongol.ra),
  DUER: s(Mongol.da, Mongol.ue, Mongol.ra),
  TUR: s(Mongol.ta, Mongol.u, Mongol.ra),
  TUER: s(Mongol.ta, Mongol.ue, Mongol.ra),
  DAQI: s(Mongol.da, Mongol.a, Mongol.qa, Mongol.i),
  DEQI: s(Mongol.da, Mongol.e, Mongol.qa, Mongol.i),
  TAQI: s(Mongol.ta, Mongol.a, Mongol.qa, Mongol.i),
  TEQI: s(Mongol.ta, Mongol.e, Mongol.qa, Mongol.i),
  ACHA: s(Mongol.a, Mongol.cha, Mongol.a),
  ECHE: s(Mongol.e, Mongol.cha, Mongol.e),
  BAR: s(Mongol.ba, Mongol.a, Mongol.ra),
  BER: s(Mongol.ba, Mongol.e, Mongol.ra),
  IYAR: s(Mongol.i, Mongol.ya, Mongol.a, Mongol.ra),
  IYER: s(Mongol.i, Mongol.ya, Mongol.e, Mongol.ra),
  TAI: s(Mongol.ta, Mongol.a, Mongol.i),
  TEI: s(Mongol.ta, Mongol.e, Mongol.i),
  LUGA: `${MVS}${String.fromCodePoint(Mongol.la, Mongol.u, Mongol.ga, Mongol.mvs, Mongol.a)}`,
  LUEGE: s(Mongol.la, Mongol.ue, Mongol.ga, Mongol.e),
  BAN: s(Mongol.ba, Mongol.a, Mongol.na),
  BEN: s(Mongol.ba, Mongol.e, Mongol.na),
  IYAN: s(Mongol.i, Mongol.ya, Mongol.a, Mongol.na),
  IYEN: s(Mongol.i, Mongol.ya, Mongol.e, Mongol.na),
  YUGAN: s(Mongol.ya, Mongol.u, Mongol.ga, Mongol.a, Mongol.na),
  YUEGEN: s(Mongol.ya, Mongol.ue, Mongol.ga, Mongol.e, Mongol.na),
  DAGAN: s(Mongol.da, Mongol.a, Mongol.ga, Mongol.a, Mongol.na),
  DEGEN: s(Mongol.da, Mongol.e, Mongol.ga, Mongol.e, Mongol.na),
  TAGAN: s(Mongol.ta, Mongol.a, Mongol.ga, Mongol.a, Mongol.na),
  TEGEN: s(Mongol.ta, Mongol.e, Mongol.ga, Mongol.e, Mongol.na),
  ACHAGAN: s(Mongol.a, Mongol.cha, Mongol.a, Mongol.ga, Mongol.a, Mongol.na),
  ECHEGEN: s(Mongol.e, Mongol.cha, Mongol.e, Mongol.ga, Mongol.e, Mongol.na),
  UD: s(Mongol.u, Mongol.da),
  UED: s(Mongol.ue, Mongol.da),
  NUGUD: s(Mongol.na, Mongol.u, Mongol.ga, Mongol.u, Mongol.da),
  NUEGUED: s(Mongol.na, Mongol.ue, Mongol.ga, Mongol.ue, Mongol.da),
  NAR: s(Mongol.na, Mongol.a, Mongol.ra),
  NER: s(Mongol.na, Mongol.e, Mongol.ra),
  UU: s(Mongol.u, Mongol.u),
  UEUE: s(Mongol.ue, Mongol.ue),
  DA: s(Mongol.da, Mongol.a),
  DE: s(Mongol.da, Mongol.e),
  CHU: s(Mongol.cha, Mongol.u),
  CHUE: s(Mongol.cha, Mongol.ue),
};

/** Full baseline list (linguistics/all-suffixes). */
export const ALL_SUFFIXES = [
  Suffix.YIN,
  Suffix.UN,
  Suffix.UEN,
  Suffix.U,
  Suffix.UE,
  Suffix.I,
  Suffix.YI,
  Suffix.DU,
  Suffix.DUE,
  Suffix.TU,
  Suffix.TUE,
  Suffix.DUR,
  Suffix.DUER,
  Suffix.TUR,
  Suffix.TUER,
  Suffix.DAQI,
  Suffix.DEQI,
  Suffix.TAQI,
  Suffix.TEQI,
  Suffix.ACHA,
  Suffix.ECHE,
  Suffix.BAR,
  Suffix.BER,
  Suffix.IYAR,
  Suffix.IYER,
  Suffix.TAI,
  Suffix.TEI,
  Suffix.LUGA,
  Suffix.LUEGE,
  Suffix.BAN,
  Suffix.BEN,
  Suffix.IYAN,
  Suffix.IYEN,
  Suffix.YUGAN,
  Suffix.YUEGEN,
  Suffix.DAGAN,
  Suffix.DEGEN,
  Suffix.TAGAN,
  Suffix.TEGEN,
  Suffix.ACHAGAN,
  Suffix.ECHEGEN,
  Suffix.UD,
  Suffix.UED,
  Suffix.NUGUD,
  Suffix.NUEGUED,
  Suffix.NAR,
  Suffix.NER,
  Suffix.UU,
  Suffix.UEUE,
  Suffix.DA,
  Suffix.DE,
  Suffix.CHU,
  Suffix.CHUE,
];

const ALL_SUFFIX_SET = new Set(ALL_SUFFIXES);

/** @param {string} text */
export function isKnownSuffix(text) {
  return ALL_SUFFIX_SET.has(text);
}

/** @typedef {"masculine"|"feminine"|"neuter"} Gender */

/**
 * Vowel harmony gender — mirrors ime-core.linguistics/get-gender
 * (first non-i vowel from the start).
 * @param {string} word
 * @returns {Gender}
 */
export function getGender(word) {
  for (const ch of word ?? "") {
    const c = ch.codePointAt(0);
    if (!isVowel(c) || c === Mongol.i) continue;
    if (isMasculineVowel(c)) return "masculine";
    if (isFeminineVowel(c)) return "feminine";
  }
  return "neuter";
}

/** @param {number} code */
function isBGDRS(code) {
  return (
    code === Mongol.ba ||
    code === Mongol.ga ||
    code === Mongol.da ||
    code === Mongol.ra ||
    code === Mongol.sa
  );
}

/**
 * @param {Gender} gender
 * @param {number} lastChar
 * @returns {string[]}
 */
function buildSuffixCandidatesForWord(gender, lastChar) {
  const masc = gender === "masculine";
  return [
    // yinUnU
    isVowel(lastChar)
      ? Suffix.YIN
      : lastChar === Mongol.na
        ? masc
          ? Suffix.U
          : Suffix.UE
        : masc
          ? Suffix.UN
          : Suffix.UEN,
    // tuDu
    isBGDRS(lastChar)
      ? masc
        ? Suffix.TU
        : Suffix.TUE
      : masc
        ? Suffix.DU
        : Suffix.DUE,
    // taganDagan
    isBGDRS(lastChar)
      ? masc
        ? Suffix.TAGAN
        : Suffix.TEGEN
      : masc
        ? Suffix.DAGAN
        : Suffix.DEGEN,
    // taqiDaqi
    isBGDRS(lastChar)
      ? masc
        ? Suffix.TAQI
        : Suffix.TEQI
      : masc
        ? Suffix.DAQI
        : Suffix.DEQI,
    // yiI
    isVowel(lastChar) ? Suffix.YI : Suffix.I,
    // barIyar
    isVowel(lastChar)
      ? masc
        ? Suffix.BAR
        : Suffix.BER
      : masc
        ? Suffix.IYAR
        : Suffix.IYER,
    // banIyan
    isVowel(lastChar)
      ? masc
        ? Suffix.BAN
        : Suffix.BEN
      : masc
        ? Suffix.IYAN
        : Suffix.IYEN,
    // achaEche
    masc ? Suffix.ACHA : Suffix.ECHE,
    // taiTei
    masc ? Suffix.TAI : Suffix.TEI,
    // uu
    masc ? Suffix.UU : Suffix.UEUE,
    // ud
    masc ? Suffix.UD : Suffix.UED,
    // nugud
    masc ? Suffix.NUGUD : Suffix.NUEGUED,
    // chu
    masc ? Suffix.CHU : Suffix.CHUE,
  ];
}

/**
 * @param {string} textBeforeCursor text immediately before caret
 * @returns {string[]}
 */
export function getSuffixCandidates(textBeforeCursor = "") {
  if (!textBeforeCursor) return [...ALL_SUFFIXES];
  const lastWord = getLastWord(textBeforeCursor);
  if (!lastWord) return [...ALL_SUFFIXES];
  const chars = Array.from(lastWord);
  const lastChar = chars[chars.length - 1].codePointAt(0);
  if (!isMongolianLetter(lastChar)) return [...ALL_SUFFIXES];
  return buildSuffixCandidatesForWord(getGender(lastWord), lastChar);
}
