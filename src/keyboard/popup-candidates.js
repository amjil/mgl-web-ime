/**
 * Long-press popup candidates — ported from
 * virtual-keyboard.popup-key-candidates / popup-key (m-v-k).
 */

import {
  Mongol,
  fromCodes,
  isInitial,
  getPreviousChar,
  isMvsPrecedingChar,
  isVowel,
} from "../utils/mongol.js";

/**
 * @typedef {{ text: string, display?: string, capsText?: string }} PopupKey
 * @typedef {{ text: string, start: number }} EditingContext
 */

/** Latin layout accent popups (shift uses capsText). */
export const EN_POPUP_KEYS = {
  a: [
    { text: "ª", capsText: "ª" },
    { text: "æ", capsText: "Æ" },
    { text: "à", capsText: "À" },
    { text: "á", capsText: "Á" },
    { text: "â", capsText: "Â" },
    { text: "ä", capsText: "Ä" },
    { text: "ā", capsText: "Ā" },
    { text: "å", capsText: "Å" },
  ],
  c: [
    { text: "ć", capsText: "Ć" },
    { text: "č", capsText: "Č" },
    { text: "ĉ", capsText: "Ĉ" },
    { text: "ċ", capsText: "Ċ" },
    { text: "ç", capsText: "Ç" },
  ],
  e: [
    { text: "ë", capsText: "Ë" },
    { text: "é", capsText: "É" },
    { text: "è", capsText: "È" },
    { text: "ê", capsText: "Ê" },
    { text: "ę", capsText: "Ę" },
    { text: "ē", capsText: "Ē" },
    { text: "ė", capsText: "Ė" },
  ],
  i: [
    { text: "į", capsText: "Į" },
    { text: "ī", capsText: "Ī" },
    { text: "ï", capsText: "Ï" },
    { text: "ì", capsText: "Ì" },
    { text: "î", capsText: "Î" },
    { text: "í", capsText: "Í" },
  ],
  n: [
    { text: "ñ", capsText: "Ñ" },
    { text: "ń", capsText: "Ń" },
    { text: "ǹ", capsText: "Ǹ" },
    { text: "ň", capsText: "Ň" },
  ],
  o: [
    { text: "œ", capsText: "Œ" },
    { text: "ø", capsText: "Ø" },
    { text: "º", capsText: "ᴼ" },
    { text: "ō", capsText: "Ō" },
    { text: "ö", capsText: "Ö" },
    { text: "ò", capsText: "Ò" },
    { text: "ô", capsText: "Ô" },
    { text: "õ", capsText: "Õ" },
    { text: "ó", capsText: "Ó" },
  ],
  s: [
    { text: "ŝ", capsText: "Ŝ" },
    { text: "ś", capsText: "Ś" },
    { text: "ß", capsText: "ß" },
  ],
  u: [
    { text: "ū", capsText: "Ū" },
    { text: "ù", capsText: "Ù" },
    { text: "ú", capsText: "Ú" },
    { text: "û", capsText: "Û" },
    { text: "ü", capsText: "Ü" },
  ],
};

/** @param {EditingContext|null} ctx */
function forE(ctx) {
  /** @type {PopupKey[]} */
  const out = [];
  const prev = getPreviousChar(ctx);
  if (
    !isInitial(ctx) &&
    prev != null &&
    isMvsPrecedingChar(prev) &&
    prev !== Mongol.qa &&
    prev !== Mongol.ga
  ) {
    out.push({
      text: fromCodes(Mongol.mvs, Mongol.e),
      display: fromCodes(Mongol.nirugu, prev, Mongol.mvs, Mongol.e),
    });
  }
  if (!isInitial(ctx)) {
    out.push({
      text: fromCodes(Mongol.e, Mongol.fvs1),
      display: fromCodes(Mongol.nirugu, Mongol.e, Mongol.fvs1),
    });
  }
  return out;
}

/** @param {EditingContext|null} ctx */
function forT(ctx) {
  if (isInitial(ctx)) return [];
  return [
    {
      text: fromCodes(Mongol.ta, Mongol.fvs1),
      display: fromCodes(Mongol.nirugu, Mongol.ta, Mongol.fvs1, Mongol.nirugu),
    },
  ];
}

/** @param {EditingContext|null} ctx */
function forY(ctx) {
  if (!isInitial(ctx)) return [];
  return [
    {
      text: fromCodes(Mongol.ya, Mongol.fvs1),
      display: fromCodes(Mongol.nirugu, Mongol.ya, Mongol.fvs1, Mongol.nirugu),
    },
  ];
}

/** @param {EditingContext|null} ctx */
function forU(ctx) {
  if (isInitial(ctx)) {
    return [{ text: fromCodes(Mongol.ue, Mongol.fvs1) }];
  }
  return [
    {
      text: fromCodes(Mongol.ue, Mongol.fvs1),
      display: fromCodes(Mongol.nirugu, Mongol.ue, Mongol.fvs1, Mongol.nirugu),
    },
    {
      text: fromCodes(Mongol.ue, Mongol.fvs2),
      display: fromCodes(Mongol.nirugu, Mongol.ue, Mongol.fvs2, Mongol.nirugu),
    },
  ];
}

/** @param {EditingContext|null} ctx */
function forI(ctx) {
  /** @type {PopupKey[]} */
  const out = [];
  if (!isInitial(ctx)) {
    out.push({
      text: fromCodes(Mongol.i, Mongol.fvs1),
      display: fromCodes(Mongol.nirugu, Mongol.i, Mongol.fvs1, Mongol.nirugu),
    });
  }
  if (!isInitial(ctx) && isVowel(getPreviousChar(ctx))) {
    out.push({
      text: fromCodes(Mongol.i, Mongol.fvs2),
      display: fromCodes(Mongol.nirugu, Mongol.i, Mongol.nirugu),
    });
  }
  return out;
}

/** @param {EditingContext|null} ctx */
function forO(ctx) {
  if (isInitial(ctx)) return [];
  return [
    {
      text: fromCodes(Mongol.oe, Mongol.fvs2),
      display: fromCodes(Mongol.nirugu, Mongol.oe, Mongol.fvs2, Mongol.nirugu),
    },
    {
      text: fromCodes(Mongol.oe, Mongol.fvs1),
      display: fromCodes(Mongol.nirugu, Mongol.oe, Mongol.fvs1),
    },
  ];
}

/** @param {EditingContext|null} ctx */
function forA(ctx) {
  if (isInitial(ctx)) {
    return [{ text: fromCodes(Mongol.a, Mongol.fvs1) }];
  }
  /** @type {PopupKey[]} */
  const out = [];
  const prev = getPreviousChar(ctx);
  if (isMvsPrecedingChar(prev)) {
    out.push({
      text: fromCodes(Mongol.mvs, Mongol.a),
      display: fromCodes(Mongol.nirugu, prev, Mongol.mvs, Mongol.a),
    });
  }
  out.push({
    text: fromCodes(Mongol.a, Mongol.fvs1),
    display: fromCodes(Mongol.nirugu, Mongol.a, Mongol.fvs1, Mongol.nirugu),
  });
  return out;
}

/** @param {EditingContext|null} ctx */
function forS(ctx) {
  if (isInitial(ctx)) return [];
  return [
    {
      text: fromCodes(Mongol.sa, Mongol.fvs1),
      display: fromCodes(Mongol.nirugu, Mongol.sa, Mongol.fvs1),
    },
  ];
}

/** @param {EditingContext|null} ctx */
function forD(ctx) {
  const prev = getPreviousChar(ctx);
  if (prev === Mongol.mvs) {
    return [{ text: fromCodes(Mongol.da, Mongol.da) }];
  }
  if (isInitial(ctx)) {
    return [
      {
        text: fromCodes(Mongol.da, Mongol.fvs1) + fromCodes(Mongol.da),
      },
    ];
  }
  return [
    {
      text: fromCodes(Mongol.da, Mongol.fvs1),
      display: fromCodes(Mongol.nirugu, Mongol.da, Mongol.fvs1),
    },
  ];
}

/** @param {EditingContext|null} ctx */
function forG(ctx) {
  if (isInitial(ctx)) return [];
  return [
    {
      text: fromCodes(Mongol.ga, Mongol.fvs1),
      display: fromCodes(Mongol.nirugu, Mongol.ga, Mongol.fvs1),
    },
    {
      text: fromCodes(Mongol.ga, Mongol.fvs2),
      display: fromCodes(Mongol.nirugu, Mongol.ga, Mongol.fvs2),
    },
    {
      text: fromCodes(Mongol.ga, Mongol.fvs3),
      display: fromCodes(Mongol.nirugu, Mongol.ga, Mongol.fvs3, Mongol.nirugu),
    },
  ];
}

/** @param {EditingContext|null} ctx */
function forC(ctx) {
  if (isInitial(ctx)) return [];
  return [
    {
      text: fromCodes(Mongol.o, Mongol.fvs1),
      display: fromCodes(Mongol.nirugu, Mongol.o, Mongol.fvs1, Mongol.nirugu),
    },
  ];
}

/** @param {EditingContext|null} ctx */
function forV(ctx) {
  if (isInitial(ctx)) return [];
  return [
    {
      text: fromCodes(Mongol.u, Mongol.fvs1),
      display: fromCodes(Mongol.nirugu, Mongol.u, Mongol.fvs1, Mongol.nirugu),
    },
  ];
}

/** @param {EditingContext|null} ctx */
function forN(ctx) {
  if (isInitial(ctx)) return [];
  return [
    {
      text: fromCodes(Mongol.na, Mongol.nirugu),
      display: fromCodes(Mongol.nirugu, Mongol.na, Mongol.nirugu),
    },
    {
      text: fromCodes(Mongol.na, Mongol.fvs1),
      display: fromCodes(Mongol.nirugu, Mongol.na, Mongol.fvs1, Mongol.nirugu),
    },
    {
      text: fromCodes(Mongol.na, Mongol.fvs2),
      display: fromCodes(Mongol.nirugu, Mongol.na, Mongol.fvs2, Mongol.nirugu),
    },
  ];
}

/**
 * Mongolian long-press variants by phonetic key id (q/w/e/…).
 * @param {EditingContext|null} ctx
 * @param {string} id
 * @returns {PopupKey[]}
 */
export function mongolPopupCandidates(ctx, id) {
  if (!id) return [];
  switch (id) {
    case "q":
      return [{ text: fromCodes(Mongol.chi) }];
    case "w":
      return [];
    case "e":
      return forE(ctx);
    case "r":
      return [{ text: fromCodes(Mongol.zra) }];
    case "t":
      return forT(ctx);
    case "y":
      return forY(ctx);
    case "u":
      return forU(ctx);
    case "i":
      return forI(ctx);
    case "o":
      return forO(ctx);
    case "p":
      return [];
    case "a":
      return forA(ctx);
    case "s":
      return forS(ctx);
    case "d":
      return forD(ctx);
    case "f":
      return [];
    case "g":
      return forG(ctx);
    case "h":
      return [{ text: fromCodes(Mongol.haa) }];
    case "j":
      return [{ text: fromCodes(Mongol.zhi) }];
    case "k":
      return [];
    case "l":
      return [{ text: fromCodes(Mongol.lha) }];
    case "ng":
      return [];
    case "z":
      return [{ text: fromCodes(Mongol.tsa) }];
    case "x":
      return [];
    case "c":
      return forC(ctx);
    case "v":
      return forV(ctx);
    case "b":
      return [];
    case "n":
      return forN(ctx);
    case "m":
      return [];
    case "!":
      return [{ text: fromCodes(Mongol.exclamationQuestion) }];
    case "?":
      return [{ text: fromCodes(Mongol.questionExclamation) }];
    default:
      return [];
  }
}

/**
 * Resolve popup keys for a virtual key.
 * @param {object} key — normalized key from layout
 * @param {EditingContext|null} ctx
 * @param {{ shift?: boolean }} [opts]
 * @returns {PopupKey[]}
 */
export function resolvePopupKeys(key, ctx, opts = {}) {
  if (!key || key.type !== "key") return [];

  if (key.mongol && key.id) {
    return mongolPopupCandidates(ctx, key.id);
  }

  // Latin / special: accent variants or !/?
  const ch = (key.value ?? "").toLowerCase();
  if (ch === "!" || ch === "?") {
    return mongolPopupCandidates(ctx, ch);
  }
  const list = EN_POPUP_KEYS[ch];
  if (!list?.length) return [];
  if (opts.shift) {
    return list.map((k) => ({
      text: k.capsText ?? k.text.toUpperCase(),
      display: k.capsText ?? k.text.toUpperCase(),
    }));
  }
  return list.map((k) => ({ text: k.text, display: k.text }));
}

/**
 * Index from horizontal drag distance (mirrors keyboard-overlay).
 * @param {number} dx
 * @param {number} count
 * @param {number} [itemWidth=36]
 */
export function popupIndexFromDx(dx, count, itemWidth = 36) {
  if (!count) return 0;
  const offset = Math.trunc(dx / itemWidth);
  return Math.max(0, Math.min(count - 1, offset));
}
