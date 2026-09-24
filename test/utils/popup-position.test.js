import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { placeNearCaret } from "../../src/utils/popup-position.js";

const panel = { width: 200, height: 120 };
const viewport = { width: 800, height: 600 };
const gap = 8;

function box(pos) {
  return {
    left: pos.left,
    top: pos.top,
    right: pos.left + panel.width,
    bottom: pos.top + panel.height,
  };
}

function overlaps(a, b) {
  return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
}

describe("placeNearCaret", () => {
  it("prefers bottom-right of the caret when there is room", () => {
    const caret = { left: 100, top: 80, right: 118, bottom: 84 };
    const pos = placeNearCaret(caret, panel, viewport);
    assert.deepEqual(pos, {
      left: caret.right + gap,
      top: caret.bottom + gap,
    });
    assert.equal(overlaps(box(pos), caret), false);
  });

  it("falls back to bottom-left when the right side overflows", () => {
    const caret = { left: 720, top: 80, right: 740, bottom: 84 };
    const pos = placeNearCaret(caret, panel, viewport);
    assert.deepEqual(pos, {
      left: caret.left - gap - panel.width,
      top: caret.bottom + gap,
    });
    assert.equal(overlaps(box(pos), caret), false);
  });

  it("falls back to top-left when below the caret overflows", () => {
    const caret = { left: 720, top: 520, right: 740, bottom: 530 };
    const pos = placeNearCaret(caret, panel, viewport);
    assert.deepEqual(pos, {
      left: caret.left - gap - panel.width,
      top: caret.top - gap - panel.height,
    });
    assert.equal(overlaps(box(pos), caret), false);
  });

  it("does not slide the panel over the caret to stay in the viewport", () => {
    const caret = { left: 390, top: 290, right: 410, bottom: 310 };
    const pos = placeNearCaret(caret, panel, { width: 420, height: 330 });
    assert.equal(overlaps(box(pos), {
      left: caret.left - gap,
      top: caret.top - gap,
      right: caret.right + gap,
      bottom: caret.bottom + gap,
    }), false);
  });

  it("does not place the popup below a tall editor-sized rect", () => {
    const editor = { left: 620, top: 40, right: 800, bottom: 560 };
    const pos = placeNearCaret(editor, panel, viewport);
    assert.ok(pos.top + panel.height < editor.bottom, "must stay above the field bottom");
    assert.ok(pos.top < editor.top + 80, "must stay near the field start, not the foot");
    assert.equal(overlaps(box(pos), {
      left: editor.left,
      top: editor.top,
      right: editor.left + 36,
      bottom: editor.top + 36,
    }), false);
  });
});
