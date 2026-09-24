/**
 * <mgl-keyboard> — mobile Mongolian virtual keyboard.
 * Long-press popup variants ported from m-v-k keyboard-overlay / keyboard-key.
 */

import { VirtualKeyboard } from "../keyboard/keyboard.js";
import {
  resolvePopupKeys,
  popupIndexFromDx,
} from "../keyboard/popup-candidates.js";
import { EMOJI_CATEGORIES } from "../keyboard/emoji.js";

const ACTION_LABEL = {
  shift: "⇧",
  backspace: "⌫",
  enter: "↵",
  space: " ",
  special: "123",
  "other-special": "#+=",
  abc: "ABC",
  suffix: "ᠳᠠᠭᠠᠪᠤᠷᠢ",
  emoji: "😊",
};

const LONG_PRESS_MS = 420;

function buildTemplate() {
  const TEMPLATE = document.createElement("template");
  TEMPLATE.innerHTML = `
  <style>
    :host {
      display: none;
      position: fixed;
      left: 0; right: 0; bottom: 0;
      z-index: 9999;
      font-family: var(--mgl-ime-font, "Oyun Qagan Tig", "Noto Sans Mongolian", "Mongolian Baiti", system-ui, sans-serif);
      color: var(--mgl-ime-text, #1c1c1c);
      --bg: var(--mgl-ime-background, #e8e4dc);
      --key-bg: var(--mgl-ime-key-background, #faf8f4);
      --key-action: var(--mgl-ime-key-action, #d2cdc3);
      --key-active: var(--mgl-ime-key-active, #c5d8ef);
      --border: var(--mgl-ime-border, #bdb6a8);
      --popup-selected: var(--mgl-ime-accent, #3d6b9a);
      padding-bottom: env(safe-area-inset-bottom, 0);
      user-select: none;
      -webkit-user-select: none;
      touch-action: manipulation;
    }
    :host([visible]) { display: block; }
    .wrap {
      background: var(--bg);
      border-top: 1px solid var(--border);
      padding: 6px 4px 10px;
      position: relative;
    }
    .row {
      display: flex;
      justify-content: center;
      align-items: stretch;
      gap: 4px;
      margin: 4px 0;
      height: 52px;
    }
    button.key {
      flex: 1 1 0;
      min-width: 0;
      /* Same height for Mongol / Latin / symbol layouts */
      min-height: 52px;
      height: 52px;
      border: none;
      border-radius: 8px;
      background: var(--key-bg);
      box-shadow: 0 1px 0 rgba(0,0,0,.08);
      font: inherit;
      font-size: 20px;
      color: inherit;
      padding: 0 2px;
      position: relative;
      box-sizing: border-box;
    }
    button.key.action {
      background: var(--key-action);
      flex: 1.35 1 0;
      font-size: 13px;
      font-weight: 600;
      letter-spacing: .02em;
    }
    button.key.space { flex: 3.2 1 0; }
    button.key:active,
    button.key.pressed { background: var(--key-active); }
    button.key.mongol {
      writing-mode: vertical-lr;
      text-orientation: mixed;
      font-size: 22px;
    }
    .hint {
      position: absolute;
      top: 3px; left: 4px;
      font-size: 9px;
      opacity: .45;
      writing-mode: horizontal-tb;
      pointer-events: none;
    }
    .label-action { writing-mode: horizontal-tb; }

    .popup {
      display: none;
      position: fixed;
      z-index: 10050;
      padding: 4px;
      background: var(--key-bg);
      border-radius: 10px;
      box-shadow: 0 3px 10px rgba(0,0,0,.28);
      pointer-events: none;
    }
    .popup[open] { display: flex; }
    .popup-item {
      min-width: 36px;
      min-height: 44px;
      padding: 8px 10px;
      border-radius: 6px;
      display: flex;
      align-items: center;
      justify-content: center;
      font: inherit;
      font-size: 22px;
      color: inherit;
    }
    .popup-item.mongol {
      writing-mode: vertical-lr;
      text-orientation: mixed;
    }
    .popup-item.selected {
      background: var(--popup-selected);
      color: #fff;
    }

    /* Match letter keyboard: 4 rows × (52px + 8px vertical margin) */
    .emoji-panel {
      display: flex;
      flex-direction: column;
      gap: 4px;
      height: 240px;
      box-sizing: border-box;
    }
    .emoji-cats {
      display: flex;
      gap: 4px;
      flex: 0 0 36px;
      height: 36px;
      overflow-x: auto;
      -webkit-overflow-scrolling: touch;
      scrollbar-width: none;
    }
    .emoji-cats::-webkit-scrollbar { display: none; }
    .emoji-cats button {
      flex: 0 0 36px;
      height: 36px;
      border: none;
      border-radius: 8px;
      background: var(--key-action);
      font-size: 18px;
      line-height: 1;
      font-family: "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif;
      color: inherit;
      padding: 0;
    }
    .emoji-cats button.active { background: var(--key-active); }
    .emoji-grid {
      display: grid;
      grid-template-columns: repeat(8, 1fr);
      grid-template-rows: repeat(3, minmax(0, 1fr));
      gap: 4px;
      flex: 1 1 auto;
      min-height: 0;
    }
    .emoji-grid button {
      border: none;
      border-radius: 8px;
      background: var(--key-bg);
      box-shadow: 0 1px 0 rgba(0,0,0,.08);
      font-size: 22px;
      line-height: 1;
      font-family: "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif;
      color: inherit;
      padding: 0;
    }
    .emoji-grid button:active { background: var(--key-active); }
    .emoji-nav {
      display: flex;
      gap: 4px;
      flex: 0 0 52px;
      height: 52px;
      align-items: stretch;
    }
    .emoji-nav button {
      flex: 1 1 0;
      border: none;
      border-radius: 8px;
      background: var(--key-action);
      font: inherit;
      font-size: 16px;
      font-weight: 600;
      color: inherit;
    }
    .emoji-nav button:active { background: var(--key-active); }
    .emoji-nav button:disabled { opacity: .4; }
    .emoji-nav .page {
      flex: 1.1 1 0;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 13px;
      font-weight: 600;
      writing-mode: horizontal-tb;
    }
  </style>
  <div class="wrap" part="keyboard"></div>
  <div class="popup" part="popup" aria-hidden="true"></div>
`;
  return TEMPLATE;
}

let _template;
const Base = typeof HTMLElement !== "undefined" ? HTMLElement : class {};

export class MglKeyboard extends Base {
  constructor() {
    super();
    if (!_template) _template = buildTemplate();
    this.attachShadow({ mode: "open" }).appendChild(_template.content.cloneNode(true));
    this._wrap = this.shadowRoot.querySelector(".wrap");
    this._popup = this.shadowRoot.querySelector(".popup");
    /** @type {(() => ({text:string,start:number}|null))|null} */
    this.getEditingContext = null;
    this._press = null;
    this._needsRender = false;
    this._vk = new VirtualKeyboard({
      onEvent: (ev) => {
        this.dispatchEvent(
          new CustomEvent("mgl-keyboard-event", {
            detail: ev,
            bubbles: true,
            composed: true,
          })
        );
        this._needsRender = true;
        if (!this._press) this._flushRender();
      },
    });
  }

  static get observedAttributes() {
    return ["visible", "layout"];
  }

  attributeChangedCallback(name, _o, v) {
    if (name === "layout" && v) {
      this._vk.baseLayout = v;
      this.render();
    }
  }

  get visible() {
    return this.hasAttribute("visible");
  }

  set visible(v) {
    if (v) this.setAttribute("visible", "");
    else this.removeAttribute("visible");
  }

  show() {
    this.visible = true;
    this._vk.show();
    this.render();
    this.dispatchEvent(
      new CustomEvent("mgl-ime-keyboard-show", { bubbles: true, composed: true })
    );
  }

  hide() {
    this._cancelPress();
    this._vk.emoji = false;
    this.visible = false;
    this._vk.hide();
    this.dispatchEvent(
      new CustomEvent("mgl-ime-keyboard-hide", { bubbles: true, composed: true })
    );
  }

  connectedCallback() {
    this.render();
  }

  disconnectedCallback() {
    this._cancelPress();
  }

  _emitKeyValue(value) {
    this._vk.onEvent({ type: "key", key: value });
    if (this._vk.shift) this._vk.shift = false;
    this._needsRender = true;
    if (!this._press) this._flushRender();
  }

  _emitPlain(value) {
    this.dispatchEvent(
      new CustomEvent("mgl-keyboard-event", {
        detail: { type: "command", command: "insert-plain", key: value },
        bubbles: true,
        composed: true,
      })
    );
  }

  /** Keep editor focused — same as letter keys. */
  _guardTap(e, fn) {
    if (e.button != null && e.button !== 0) return;
    e.preventDefault();
    fn();
  }

  _flushRender() {
    if (!this._needsRender) return;
    this._needsRender = false;
    this.render();
  }

  _hidePopup() {
    this._popup.removeAttribute("open");
    this._popup.innerHTML = "";
    this._popup.setAttribute("aria-hidden", "true");
  }

  /**
   * @param {HTMLElement} btn
   * @param {import("../keyboard/popup-candidates.js").PopupKey[]} keys
   * @param {boolean} mongol
   * @param {number} selected
   */
  _showPopup(btn, keys, mongol, selected) {
    this._popup.innerHTML = "";
    keys.forEach((k, i) => {
      const el = document.createElement("div");
      el.className = "popup-item" + (mongol ? " mongol" : "");
      if (i === selected) el.classList.add("selected");
      el.textContent = k.display ?? k.text;
      this._popup.appendChild(el);
    });

    const rect = btn.getBoundingClientRect();
    this._popup.setAttribute("open", "");
    this._popup.setAttribute("aria-hidden", "false");

    // Measure after open
    const pRect = this._popup.getBoundingClientRect();
    const vw = window.innerWidth;
    let left = rect.left;
    if (rect.left + rect.width / 2 > vw / 2) {
      left = rect.right - pRect.width;
    }
    left = Math.max(8, Math.min(left, vw - pRect.width - 8));
    const top = Math.max(8, rect.top - pRect.height - 10);
    this._popup.style.left = `${left}px`;
    this._popup.style.top = `${top}px`;
  }

  /** @param {number} selected */
  _updatePopupSelection(selected) {
    [...this._popup.children].forEach((el, i) => {
      el.classList.toggle("selected", i === selected);
    });
  }

  _cancelPress() {
    if (this._press?.timer) clearTimeout(this._press.timer);
    if (this._press?.btn) this._press.btn.classList.remove("pressed");
    this._press = null;
    this._hidePopup();
    this._flushRender();
  }

  /**
   * @param {PointerEvent} e
   * @param {object} key
   * @param {HTMLButtonElement} btn
   */
  _onPointerDown(e, key, btn) {
    if (e.button != null && e.button !== 0) return;
    e.preventDefault();
    btn.setPointerCapture?.(e.pointerId);
    btn.classList.add("pressed");

    this._cancelPress();
    this._press = {
      key,
      btn,
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      dx: 0,
      popup: false,
      selected: 0,
      /** @type {import("../keyboard/popup-candidates.js").PopupKey[]} */
      popupKeys: [],
      timer: null,
    };

    if (key.type === "action") {
      // Actions fire immediately (no long-press variants).
      this._vk.press(key);
      // Ensure redraw even if a layout action somehow skipped onEvent.
      this._needsRender = true;
      this._cancelPress();
      return;
    }

    this._press.timer = setTimeout(() => {
      if (!this._press || this._press.key !== key) return;
      const ctx = this.getEditingContext?.() ?? null;
      const popupKeys = resolvePopupKeys(key, ctx, { shift: this._vk.shift });
      if (!popupKeys.length) return;
      this._press.popup = true;
      this._press.popupKeys = popupKeys;
      this._press.selected = 0;
      this._showPopup(btn, popupKeys, !!key.mongol, 0);
    }, LONG_PRESS_MS);
  }

  /**
   * @param {PointerEvent} e
   */
  _onPointerMove(e) {
    const p = this._press;
    if (!p || !p.popup) return;
    p.dx = e.clientX - p.startX;
    const idx = popupIndexFromDx(p.dx, p.popupKeys.length);
    if (idx !== p.selected) {
      p.selected = idx;
      this._updatePopupSelection(idx);
    }
  }

  /**
   * @param {PointerEvent} e
   */
  _onPointerUp(e) {
    const p = this._press;
    if (!p) return;
    if (p.timer) clearTimeout(p.timer);

    if (p.popup && p.popupKeys.length) {
      const chosen = p.popupKeys[p.selected] ?? p.popupKeys[0];
      if (chosen?.text) {
        this._emitKeyValue(chosen.text);
      }
    } else if (p.key.type === "key") {
      // Normal tap
      this._vk.press(p.key);
    }

    p.btn.classList.remove("pressed");
    try {
      p.btn.releasePointerCapture?.(e.pointerId);
    } catch {
      /* ignore */
    }
    this._press = null;
    this._hidePopup();
    this._flushRender();
  }

  _renderEmojiPanel() {
    const panel = document.createElement("div");
    panel.className = "emoji-panel";

    const cats = document.createElement("div");
    cats.className = "emoji-cats";
    EMOJI_CATEGORIES.forEach((cat) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.textContent = cat.label;
      if (cat.id === this._vk.emojiCategory) btn.classList.add("active");
      btn.addEventListener("pointerdown", (e) =>
        this._guardTap(e, () => {
          this._vk.setEmojiCategory(cat.id);
          this.render();
        })
      );
      cats.appendChild(btn);
    });
    panel.appendChild(cats);

    const { items, page, pages } = this._vk.getEmojiPage();
    const grid = document.createElement("div");
    grid.className = "emoji-grid";
    items.forEach((emoji) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.textContent = emoji;
      btn.addEventListener("pointerdown", (e) =>
        this._guardTap(e, () => this._emitPlain(emoji))
      );
      grid.appendChild(btn);
    });
    panel.appendChild(grid);

    const nav = document.createElement("div");
    nav.className = "emoji-nav";

    const back = document.createElement("button");
    back.type = "button";
    back.textContent = this._vk.latin ? "ABC" : "mgl";
    back.addEventListener("pointerdown", (e) =>
      this._guardTap(e, () => this._vk.press({ type: "action", action: "emoji" }))
    );
    nav.appendChild(back);

    const prev = document.createElement("button");
    prev.type = "button";
    prev.textContent = "◀";
    prev.disabled = page <= 0;
    prev.addEventListener("pointerdown", (e) =>
      this._guardTap(e, () => {
        this._vk.prevEmojiPage();
        this.render();
      })
    );
    nav.appendChild(prev);

    const meta = document.createElement("div");
    meta.className = "page";
    meta.textContent = `${page + 1}/${pages}`;
    nav.appendChild(meta);

    const next = document.createElement("button");
    next.type = "button";
    next.textContent = "▶";
    next.disabled = page >= pages - 1;
    next.addEventListener("pointerdown", (e) =>
      this._guardTap(e, () => {
        this._vk.nextEmojiPage();
        this.render();
      })
    );
    nav.appendChild(next);

    const del = document.createElement("button");
    del.type = "button";
    del.textContent = ACTION_LABEL.backspace;
    del.addEventListener("pointerdown", (e) =>
      this._guardTap(e, () => this._vk.press({ type: "action", action: "backspace" }))
    );
    nav.appendChild(del);

    panel.appendChild(nav);
    this._wrap.appendChild(panel);
  }

  render() {
    this._wrap.innerHTML = "";
    if (this._vk.emoji) {
      this._renderEmojiPanel();
      return;
    }
    const rows = this._vk.getLayoutRows();
    const isMongolLayout = !this._vk.latin && !this._vk.special && !this._vk.otherSpecial;
    rows.forEach((row) => {
      const rowEl = document.createElement("div");
      rowEl.className = "row";
      row.forEach((key) => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "key";
        if (key.type === "action") {
          btn.classList.add("action");
          if (key.action === "space") btn.classList.add("space");
          const label = document.createElement("span");
          label.className = "label-action";
          if (key.action === "abc") {
            // On Latin layout, show Mongol label to switch back.
            label.textContent = this._vk.latin ? "mgl" : "ABC";
          } else if (key.action === "special" && (this._vk.special || this._vk.otherSpecial)) {
            label.textContent = this._vk.latin ? "ABC" : "mgl";
          } else {
            label.textContent = ACTION_LABEL[key.action] ?? key.action;
          }
          if (key.action === "suffix") {
            label.style.writingMode = "vertical-lr";
            label.style.fontSize = "14px";
          }
          if (key.action === "emoji") {
            label.style.fontFamily =
              '"Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif';
            label.style.fontSize = "18px";
          }
          btn.appendChild(label);
        } else {
          if (key.mongol) btn.classList.add("mongol");
          if (isMongolLayout && key.id && !["ng", "-", "_"].includes(key.id)) {
            const hint = document.createElement("span");
            hint.className = "hint";
            hint.textContent = key.id;
            btn.appendChild(hint);
          }
          const label = document.createElement("span");
          label.textContent = key.label;
          btn.appendChild(label);
        }

        btn.addEventListener("pointerdown", (ev) => this._onPointerDown(ev, key, btn));
        btn.addEventListener("pointermove", (ev) => this._onPointerMove(ev));
        btn.addEventListener("pointerup", (ev) => this._onPointerUp(ev));
        btn.addEventListener("pointercancel", () => this._cancelPress());

        rowEl.appendChild(btn);
      });
      this._wrap.appendChild(rowEl);
    });
  }
}

if (typeof customElements !== "undefined" && !customElements.get("mgl-keyboard")) {
  customElements.define("mgl-keyboard", MglKeyboard);
}

export default MglKeyboard;
