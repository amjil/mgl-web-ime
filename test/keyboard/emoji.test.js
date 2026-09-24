import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  EMOJI_CATEGORIES,
  getEmojiCategory,
  getEmojiPage,
  pageEmoji,
  MOBILE_EMOJI_PAGE_SIZE,
} from "../../src/keyboard/emoji.js";
import { VirtualKeyboard } from "../../src/keyboard/keyboard.js";
import { LAYOUTS, ACTION_KEYS } from "../../src/keyboard/layout.js";
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

describe("emoji catalog", () => {
  it("pages a category into mobile-sized grids", () => {
    const smileys = getEmojiCategory("smileys");
    const first = pageEmoji(smileys.items, 0, MOBILE_EMOJI_PAGE_SIZE);
    assert.equal(first.items.length, MOBILE_EMOJI_PAGE_SIZE);
    assert.equal(first.page, 0);
    assert.ok(first.pages > 1);

    const last = pageEmoji(smileys.items, 99, MOBILE_EMOJI_PAGE_SIZE);
    assert.equal(last.page, first.pages - 1);
    assert.ok(last.items.length > 0);
    assert.notEqual(last.items[0], first.items[0]);
  });

  it("falls back to smileys for unknown categories", () => {
    assert.equal(getEmojiCategory("nope").id, "smileys");
    assert.equal(getEmojiPage("nope").category.id, "smileys");
    assert.ok(EMOJI_CATEGORIES.length >= 8);
  });

  it("covers a full-ish catalog without broken glyphs", () => {
    const ids = EMOJI_CATEGORIES.map((c) => c.id);
    assert.ok(ids.includes("activities"));
    assert.ok(ids.includes("flags"));
    const all = EMOJI_CATEGORIES.flatMap((c) => c.items);
    assert.ok(all.length > 1400);
    assert.equal(all.some((e) => e.includes("\uFFFD") || /[A-Za-z]{3,}/.test(e)), false);
    assert.ok(getEmojiCategory("flags").items.length > 200);
  });
});

describe("virtual keyboard emoji mode", () => {
  it("exposes an emoji action on letter layouts", () => {
    assert.equal(ACTION_KEYS.has("emoji"), true);
    for (const name of Object.keys(LAYOUTS)) {
      const last = LAYOUTS[name][LAYOUTS[name].length - 1];
      assert.ok(last.includes("emoji"), `${name} missing emoji key`);
    }
  });

  it("toggles the in-keyboard emoji panel", () => {
    const events = [];
    const vk = new VirtualKeyboard({ onEvent: (ev) => events.push(ev) });
    vk.press({ type: "action", action: "emoji" });
    assert.equal(vk.emoji, true);
    assert.equal(vk.special, false);
    assert.equal(events.at(-1).emoji, true);

    vk.setEmojiCategory("food");
    assert.equal(vk.emojiCategory, "food");
    assert.equal(vk.emojiPage, 0);
    vk.nextEmojiPage();
    assert.equal(vk.emojiPage, 1);
    vk.prevEmojiPage();
    assert.equal(vk.emojiPage, 0);

    vk.press({ type: "action", action: "abc" });
    assert.equal(vk.emoji, false);
    assert.equal(vk.latin, true);
  });
});

describe("insert-plain", () => {
  it("inserts without querying the last word", async () => {
    const adapter = memoryAdapter("ᠰᠠᠢᠨ");
    const core = new ImeCore({
      adapter,
      provider: { getCandidates: async () => ["SHOULD_NOT_RUN"] },
    });
    const ok = await core.handleEvent({
      type: "command",
      command: "insert-plain",
      key: "😀",
    });
    assert.equal(ok, true);
    assert.equal(adapter.getText(), "ᠰᠠᠢᠨ😀");
    assert.deepEqual(core.state.candidates, []);
  });

  it("commits an active composition first", async () => {
    const adapter = memoryAdapter("ᠰᠠᠢᠨ");
    const core = new ImeCore({ adapter });
    core.setState({
      composing: true,
      composition: "sai",
      preview: "ᠰᠠᠢᠨ",
      previewLen: 4,
    });
    await core.handleEvent({
      type: "command",
      command: "insert-plain",
      key: "🎉",
    });
    assert.equal(adapter.getText().endsWith("🎉"), true);
    assert.equal(core.state.composition, "");
  });
});
