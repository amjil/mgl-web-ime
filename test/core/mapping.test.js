import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { translate, LATIN_TO_MONGOL } from "../../src/core/mapping.js";
import {
  createInitialState,
  totalPages,
  pageCandidates,
  currentCandidate,
} from "../../src/core/state.js";
import { appendToBuffer, previewFromBuffer } from "../../src/core/composition.js";
import { shiftPage, withCandidates } from "../../src/core/candidate.js";
import { getLastWord } from "../../src/utils/unicode.js";
import { LocalCandidateProvider } from "../../src/api/candidate-provider.js";

describe("mapping", () => {
  it("maps latin vowels to mongol", () => {
    assert.equal(translate("a"), "\u1820");
    assert.equal(translate("sain"), "\u1830\u1820\u1822\u1828");
    assert.equal(LATIN_TO_MONGOL.c, "\u1823");
  });

  it("maps MVS and punctuation", () => {
    assert.equal(translate("-"), "\u180e");
    assert.equal(translate(","), "\u1802");
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

