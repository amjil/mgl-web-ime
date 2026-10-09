import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  getLayout,
  normalizeKey,
  shouldRotateSymbolDisplay,
} from "../../src/keyboard/layout.js";

function labels(layoutName) {
  return getLayout(layoutName)
    .flat()
    .map((item, i) => normalizeKey(item, { rowIndex: 0, colIndex: i, layoutName }))
    .filter((key) => key.type === "key")
    .map((key) => key.value);
}

describe("Mongol symbol key display", () => {
  it("rotates question and exclamation marks on the Mongol symbol keyboard", () => {
    assert.equal(shouldRotateSymbolDisplay("！", "mongol-special"), true);
    assert.equal(shouldRotateSymbolDisplay("？", "mongol-special"), true);
    assert.equal(shouldRotateSymbolDisplay("⁉", "mongol-other-special"), true);
    assert.equal(shouldRotateSymbolDisplay("⁈", "mongol-other-special"), true);
    const special = labels("mongol-special");
    assert.ok(special.includes("！"));
    assert.ok(special.includes("？"));
  });

  it("leaves marks the font already draws upright", () => {
    for (const ch of ["；", "※", "@", ",", ".", "…", "᠐", "᠁", "︑", "︓", "᠄"]) {
      assert.equal(shouldRotateSymbolDisplay(ch, "mongol-special"), false, ch);
      assert.equal(shouldRotateSymbolDisplay(ch, "mongol-other-special"), false, ch);
    }
  });

  it("does not rotate the Latin symbol keyboard", () => {
    for (const ch of labels("latin-special")) {
      assert.equal(shouldRotateSymbolDisplay(ch, "latin-special"), false, ch);
    }
  });
});
