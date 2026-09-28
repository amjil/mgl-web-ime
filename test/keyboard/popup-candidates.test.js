import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  popupIndexFromDx,
  popupIndexFromClientX,
} from "../../src/keyboard/popup-candidates.js";

describe("popupIndexFromDx", () => {
  it("starts at the left item and moves right", () => {
    assert.equal(popupIndexFromDx(0, 3, 36, 0), 0);
    assert.equal(popupIndexFromDx(36, 3, 36, 0), 1);
    assert.equal(popupIndexFromDx(80, 3, 36, 0), 2);
  });

  it("from a right-aligned anchor, sliding left selects earlier items", () => {
    assert.equal(popupIndexFromDx(0, 3, 36, 2), 2);
    assert.equal(popupIndexFromDx(-36, 3, 36, 2), 1);
    assert.equal(popupIndexFromDx(-80, 3, 36, 2), 0);
  });

  it("clamps to the list", () => {
    assert.equal(popupIndexFromDx(-200, 3, 36, 0), 0);
    assert.equal(popupIndexFromDx(400, 3, 36, 0), 2);
  });
});

describe("popupIndexFromClientX", () => {
  const rects = [
    { left: 10, right: 46 },
    { left: 46, right: 82 },
    { left: 82, right: 118 },
  ];

  it("returns the item that contains the pointer", () => {
    assert.equal(popupIndexFromClientX(rects, 20), 0);
    assert.equal(popupIndexFromClientX(rects, 60), 1);
    assert.equal(popupIndexFromClientX(rects, 100), 2);
  });

  it("falls back to the nearest center when outside the row", () => {
    assert.equal(popupIndexFromClientX(rects, 0), 0);
    assert.equal(popupIndexFromClientX(rects, 200), 2);
  });

  it("returns 0 for an empty list", () => {
    assert.equal(popupIndexFromClientX([], 50), 0);
  });
});
