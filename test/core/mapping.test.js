import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  translate,
  LATIN_TO_MONGOL,
  directCharFromKey,
} from "../../src/core/mapping.js";
import {
  createInitialState,
  totalPages,
  pageCandidates,
  currentCandidate,
} from "../../src/core/state.js";
import {
  appendToBuffer,
  previewFromBuffer,
  isCompositionChar,
} from "../../src/core/composition.js";
import { shiftPage, withCandidates } from "../../src/core/candidate.js";
import { getLastWord } from "../../src/utils/unicode.js";
import { LocalCandidateProvider } from "../../src/api/candidate-provider.js";
import { ImeCore } from "../../src/core/ime.js";
import { createCustomAdapter } from "../../src/adapters/custom.js";

function memoryAdapter(initial = "") {
  let text = initial;
  return createCustomAdapter({
    getText: () => text,
    getSelection: () => {
      const n = Array.from(text).length;
      return { start: n, end: n };
    },
    insertText: (t) => {
      text += t ?? "";
    },
    replaceBeforeCaret: (n, t) => {
      const cps = Array.from(text);
      text = cps.slice(0, Math.max(0, cps.length - n)).join("") + (t ?? "");
    },
    getTextBeforeCaret: () => text,
    deleteBackward: () => {
      const cps = Array.from(text);
      cps.pop();
      text = cps.join("");
    },
  });
}

describe("mapping", () => {
  it("maps latin vowels to mongol", () => {
    assert.equal(translate("a"), "\u1820");
    assert.equal(translate("sain"), "\u1830\u1820\u1822\u1828");
    assert.equal(LATIN_TO_MONGOL.c, "\u1823");
  });

  it("maps MVS and punctuation", () => {
    assert.equal(translate("-"), "\u180e");
    assert.equal(translate("\\"), "\u180e");
    assert.equal(translate("|"), "\u180d");
    assert.equal(translate(","), "\u1802");
    assert.equal(translate(";"), "\u1801");
    assert.equal(translate(":"), "\u1804");
  });

  it("directCharFromKey maps | to FVS3; bare \\ stays phonetic", () => {
    assert.equal(directCharFromKey({ key: "\\", code: "Backslash" }), null);
    assert.equal(
      directCharFromKey({ key: "|", code: "Backslash", shiftKey: true }),
      "\u180d"
    );
  });

  it("directCharFromKey maps ] to FVS2 and Shift+] to nirugu", () => {
    assert.equal(
      directCharFromKey({ key: "]", code: "BracketRight" }),
      "\u180c"
    );
    assert.equal(
      directCharFromKey({ key: "}", code: "BracketRight", shiftKey: true }),
      "\u180a"
    );
  });

  it("directCharFromKey maps Shift+, / Shift+. to Mongolian double quotes", () => {
    assert.equal(
      directCharFromKey({ key: "<", code: "Comma", shiftKey: true }),
      "\u300a"
    );
    assert.equal(
      directCharFromKey({ key: ">", code: "Period", shiftKey: true }),
      "\u300b"
    );
    assert.equal(directCharFromKey({ key: ",", code: "Comma" }), "\u1802");
    assert.equal(directCharFromKey({ key: ".", code: "Period" }), "\u1803");
  });

  it("directCharFromKey maps ; to ellipsis and Shift+; to Mongolian colon", () => {
    assert.equal(directCharFromKey({ key: ";", code: "Semicolon" }), "\u1801");
    assert.equal(
      directCharFromKey({ key: ":", code: "Semicolon", shiftKey: true }),
      "\u1804"
    );
  });
});

describe("MVS composition continuity", () => {
  it("treats \\ as a composition char", () => {
    assert.equal(isCompositionChar("\\"), true);
  });

  it("getLastWord does not break on MVS", () => {
    assert.equal(getLastWord("ᠠ\u180eᠠ"), "ᠠ\u180eᠠ");
  });

  it("keeps \\ inside the buffer so candidates cover the whole word", async () => {
    const adapter = memoryAdapter();
    const queries = [];
    const core = new ImeCore({
      adapter,
      provider: {
        getCandidates: async (input) => {
          queries.push(input);
          return [input];
        },
        getNextWords: async () => [],
      },
    });

    await core.handleEvent({ type: "key", key: "a", code: "KeyA" });
    await core.handleEvent({
      type: "key",
      key: "\\",
      code: "Backslash",
    });
    await core.handleEvent({ type: "key", key: "a", code: "KeyA" });

    assert.equal(core.state.composition, "a\\a");
    assert.equal(core.state.preview, "ᠠ\u180eᠠ");
    assert.equal(core.state.composing, true);
    assert.ok(queries.includes("ᠠ\u180eᠠ"));
  });
});

describe("composition", () => {
  it("appends and previews", () => {
    const b = appendToBuffer("sa", "i");
    assert.equal(b, "sai");
    assert.equal(previewFromBuffer(b), translate("sai"));
  });

  it("maps + to = for MVS", () => {
    assert.equal(appendToBuffer("a", "+"), "a=");
  });
});

describe("state / candidates", () => {
  it("paginates", () => {
    let s = createInitialState({ pageSize: 5 });
    s = withCandidates(s, ["a", "b", "c", "d", "e", "f"]);
    assert.equal(totalPages(s), 2);
    assert.deepEqual(pageCandidates(s), ["a", "b", "c", "d", "e"]);
    assert.equal(currentCandidate(s), "a");
    s = shiftPage(s, 1);
    assert.deepEqual(pageCandidates(s), ["f"]);
  });
});

describe("unicode helpers", () => {
  it("getLastWord respects NNBSP", () => {
    assert.equal(getLastWord("ᠰᠠᠢᠨ\u202fᠤᠨ"), "ᠤᠨ");
  });
});

describe("local provider", () => {
  it("returns mapped preview", async () => {
    const p = new LocalCandidateProvider();
    const c = await p.getCandidates("sai");
    assert.equal(c[0], translate("sai"));
  });
});
