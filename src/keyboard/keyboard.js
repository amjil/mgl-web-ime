/**
 * Virtual keyboard controller (logic only — UI lives in <mgl-keyboard>).
 */

import {
  getLayout,
  normalizeKey,
  resolveLayoutName,
} from "./layout.js";
import { actionToCommand } from "./key.js";
import { getEmojiCategory, getEmojiPage, MOBILE_EMOJI_PAGE_SIZE } from "./emoji.js";

export class VirtualKeyboard {
  /**
   * @param {object} [options]
   * @param {(ev: object) => void} [options.onEvent]
   * @param {string} [options.layout]
   */
  constructor(options = {}) {
    this.onEvent = options.onEvent ?? (() => {});
    this.baseLayout = options.layout ?? "mongol";
    this.shift = false;
    this.special = false;
    this.otherSpecial = false;
    this.latin = false;
    this.emoji = false;
    this.emojiCategory = "smileys";
    this.emojiPage = 0;
    this.visible = false;
  }

  getEmojiPage() {
    return getEmojiPage(this.emojiCategory, this.emojiPage, MOBILE_EMOJI_PAGE_SIZE);
  }

  setEmojiCategory(id) {
    const next = getEmojiCategory(id).id;
    this.emojiCategory = next;
    this.emojiPage = 0;
  }

  nextEmojiPage() {
    const { pages } = this.getEmojiPage();
    if (this.emojiPage < pages - 1) this.emojiPage += 1;
  }

  prevEmojiPage() {
    if (this.emojiPage > 0) this.emojiPage -= 1;
  }

  _leaveEmoji() {
    this.emoji = false;
    this.emojiPage = 0;
  }

  getLayoutRows() {
    const name = resolveLayoutName({
      base: this.baseLayout,
      special: this.special,
      otherSpecial: this.otherSpecial,
      latin: this.latin,
    });
    return getLayout(name).map((row, rowIndex) =>
      row.map((item, colIndex) =>
        normalizeKey(item, { rowIndex, colIndex, layoutName: name })
      )
    );
  }

  show() {
    this.visible = true;
  }

  hide() {
    this.visible = false;
  }

  toggle() {
    this.visible = !this.visible;
  }

  /**
   * @param {{ type: string, value?: string, action?: string }} key
   */
  press(key) {
    if (key.type === "key") {
      let value = key.value;
      if (this.shift && !key.mongol && value) {
        value = value.toUpperCase();
        this.shift = false;
      }
      this.onEvent({ type: "key", key: value });
      return;
    }

    const action = key.action;
    switch (action) {
      case "shift":
        this.shift = !this.shift;
        this.onEvent({ type: "command", command: "shift", shift: this.shift });
        break;
      case "special":
        this.special = !this.special;
        this.otherSpecial = false;
        this._leaveEmoji();
        this.onEvent({
          type: "command",
          command: "layout",
          latin: this.latin,
          special: this.special,
          otherSpecial: this.otherSpecial,
        });
        break;
      case "other-special":
        this.otherSpecial = !this.otherSpecial;
        this._leaveEmoji();
        this.onEvent({
          type: "command",
          command: "layout",
          latin: this.latin,
          special: this.special,
          otherSpecial: this.otherSpecial,
        });
        break;
      case "abc":
        this.latin = !this.latin;
        this.special = false;
        this.otherSpecial = false;
        this._leaveEmoji();
        this.onEvent({
          type: "command",
          command: "layout",
          latin: this.latin,
          special: this.special,
          otherSpecial: this.otherSpecial,
        });
        break;
      case "emoji":
        this.emoji = !this.emoji;
        if (this.emoji) {
          this.special = false;
          this.otherSpecial = false;
          this.emojiPage = 0;
        }
        this.onEvent({
          type: "command",
          command: "layout",
          latin: this.latin,
          special: this.special,
          otherSpecial: this.otherSpecial,
          emoji: this.emoji,
        });
        break;
      default:
        this.onEvent({ type: "command", command: actionToCommand(action) });
    }
  }
}

export default VirtualKeyboard;
