/**
 * <mgl-emoji-picker> — desktop emoji popover.
 */

import { EMOJI_CATEGORIES, getEmojiCategory } from "../keyboard/emoji.js";

function buildTemplate() {
  const TEMPLATE = document.createElement("template");
  TEMPLATE.innerHTML = `
  <style>
    :host {
      display: none;
      position: fixed;
      z-index: 10020;
      font-family: system-ui, sans-serif;
      color: var(--mgl-ime-text, #1c1c1c);
      --bg: var(--mgl-ime-candidate-background, #f7f5f0);
      --border: var(--mgl-ime-border, #bdb6a8);
      --key-bg: var(--mgl-ime-key-background, #faf8f4);
      --active: var(--mgl-ime-key-active, #c5d8ef);
    }
    :host([open]) { display: block; }
    .panel {
      width: min(360px, calc(100vw - 16px));
      height: min(380px, calc(100vh - 24px));
      background: var(--bg);
      border: 1px solid var(--border);
      border-radius: 12px;
      box-shadow: 0 10px 32px rgba(0,0,0,.16);
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }
    .cats {
      display: flex;
      flex: 0 0 44px;
      height: 44px;
      gap: 2px;
      padding: 4px 4px 0;
      box-sizing: border-box;
      border-bottom: 1px solid var(--border);
      overflow: hidden;
    }
    .cats button {
      flex: 1 1 0;
      min-width: 0;
      height: 40px;
      border: none;
      border-radius: 8px 8px 0 0;
      background: transparent;
      font-size: 18px;
      font-family: "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif;
      cursor: pointer;
      color: inherit;
    }
    .cats button.active { background: var(--key-bg); }
    .grid {
      display: grid;
      grid-template-columns: repeat(8, minmax(0, 1fr));
      gap: 2px;
      padding: 8px;
      flex: 1 1 auto;
      min-height: 0;
      min-width: 0;
      overflow-x: hidden;
      overflow-y: auto;
      background: var(--key-bg);
    }
    .grid button {
      width: 100%;
      min-width: 0;
      height: 36px;
      border: none;
      border-radius: 6px;
      background: transparent;
      font-size: 22px;
      line-height: 1;
      font-family: "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif;
      cursor: pointer;
      color: inherit;
    }
    .grid button:hover { background: var(--active); }
  </style>
  <div class="panel" part="panel">
    <div class="cats" part="cats"></div>
    <div class="grid" part="grid"></div>
  </div>
`;
  return TEMPLATE;
}

let _template;
const Base = typeof HTMLElement !== "undefined" ? HTMLElement : class {};

export class MglEmojiPicker extends Base {
  constructor() {
    super();
    if (!_template) _template = buildTemplate();
    this.attachShadow({ mode: "open" }).appendChild(_template.content.cloneNode(true));
    this._cats = this.shadowRoot.querySelector(".cats");
    this._grid = this.shadowRoot.querySelector(".grid");
    this._category = "smileys";
    /** @type {EventTarget|null} */
    this._ignore = null;
    this._onDocPointer = (e) => this._handleDocPointer(e);
    this._onDocKey = (e) => {
      if (e.key === "Escape" && this.open) {
        e.preventDefault();
        this.hide();
      }
    };
  }

  get open() {
    return this.hasAttribute("open");
  }

  set open(v) {
    if (v) this.setAttribute("open", "");
    else this.removeAttribute("open");
  }

  connectedCallback() {
    this._render();
  }

  disconnectedCallback() {
    this._unbindDoc();
  }

  /**
   * @param {{ ignore?: EventTarget|null }} [opts]
   */
  show(opts = {}) {
    this._ignore = opts.ignore ?? null;
    this.open = true;
    this._render();
    requestAnimationFrame(() => this._bindDoc());
    this.dispatchEvent(new CustomEvent("mgl-emoji-open", { bubbles: true, composed: true }));
  }

  hide() {
    if (!this.open) return;
    this.open = false;
    this._unbindDoc();
    this.dispatchEvent(new CustomEvent("mgl-emoji-close", { bubbles: true, composed: true }));
  }

  /**
   * @param {{ ignore?: EventTarget|null }} [opts]
   */
  toggle(opts = {}) {
    if (this.open) this.hide();
    else this.show(opts);
  }

  /**
   * @param {Element|{left:number,top:number,right?:number,bottom?:number,width?:number,height?:number}|null} anchor
   */
  positionNear(anchor) {
    if (!anchor) return;
    const rect =
      typeof anchor.getBoundingClientRect === "function"
        ? anchor.getBoundingClientRect()
        : anchor;
    const panel = this.shadowRoot.querySelector(".panel");
    const pRect = panel?.getBoundingClientRect() ?? { width: 360, height: 320 };
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const margin = 8;
    let left = rect.left;
    if (left + pRect.width > vw - margin) left = vw - margin - pRect.width;
    if (left < margin) left = margin;
    let top = (rect.bottom ?? rect.top + (rect.height ?? 0)) + margin;
    if (top + pRect.height > vh - margin) {
      top = (rect.top ?? 0) - pRect.height - margin;
    }
    if (top < margin) top = margin;
    this.style.left = `${Math.round(left)}px`;
    this.style.top = `${Math.round(top)}px`;
  }

  _bindDoc() {
    document.addEventListener("pointerdown", this._onDocPointer, true);
    document.addEventListener("keydown", this._onDocKey, true);
  }

  _unbindDoc() {
    document.removeEventListener("pointerdown", this._onDocPointer, true);
    document.removeEventListener("keydown", this._onDocKey, true);
  }

  /** @param {PointerEvent} e */
  _handleDocPointer(e) {
    const path = e.composedPath();
    if (path.includes(this)) return;
    if (this._ignore && path.includes(this._ignore)) return;
    this.hide();
  }

  _select(emoji) {
    this.dispatchEvent(
      new CustomEvent("mgl-emoji-select", {
        detail: { emoji },
        bubbles: true,
        composed: true,
      })
    );
  }

  _render() {
    const cat = getEmojiCategory(this._category);
    this._category = cat.id;
    this._cats.innerHTML = "";
    EMOJI_CATEGORIES.forEach((c) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.textContent = c.label;
      if (c.id === cat.id) btn.classList.add("active");
      btn.addEventListener("mousedown", (e) => e.preventDefault());
      btn.addEventListener("click", () => {
        this._category = c.id;
        this._render();
      });
      this._cats.appendChild(btn);
    });

    this._grid.innerHTML = "";
    cat.items.forEach((emoji) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.textContent = emoji;
      btn.addEventListener("mousedown", (e) => e.preventDefault());
      btn.addEventListener("click", () => this._select(emoji));
      this._grid.appendChild(btn);
    });
  }
}

if (typeof customElements !== "undefined" && !customElements.get("mgl-emoji-picker")) {
  customElements.define("mgl-emoji-picker", MglEmojiPicker);
}

export default MglEmojiPicker;
