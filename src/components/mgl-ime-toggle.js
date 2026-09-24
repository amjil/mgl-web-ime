/**
 * <mgl-ime-toggle> — simple on/off & mode indicator.
 */

function buildTemplate() {
  const TEMPLATE = document.createElement("template");
  TEMPLATE.innerHTML = `
  <style>
    :host { display: inline-flex; gap: 6px; font-family: system-ui, sans-serif; }
    button {
      border: 1px solid var(--mgl-ime-border, #bdb6a8);
      background: var(--mgl-ime-key-background, #faf8f4);
      border-radius: 8px;
      padding: 6px 10px;
      font-size: 13px;
      cursor: pointer;
    }
    button[aria-pressed="true"] {
      background: var(--mgl-ime-key-active, #c5d8ef);
    }
    button[data-act="emoji"] {
      font-family: "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif;
    }
  </style>
  <button type="button" part="enable" data-act="enable">IME</button>
  <button type="button" part="mode" data-act="mode">MN</button>
  <button type="button" part="keyboard" data-act="keyboard" hidden>⌨</button>
  <button type="button" part="emoji" data-act="emoji" hidden>😊</button>
`;
  return TEMPLATE;
}

let _template;
const Base = typeof HTMLElement !== "undefined" ? HTMLElement : class {};

export class MglImeToggle extends Base {
  constructor() {
    super();
    if (!_template) _template = buildTemplate();
    this.attachShadow({ mode: "open" }).appendChild(_template.content.cloneNode(true));
    this._enableBtn = this.shadowRoot.querySelector('[data-act="enable"]');
    this._modeBtn = this.shadowRoot.querySelector('[data-act="mode"]');
    this._kbBtn = this.shadowRoot.querySelector('[data-act="keyboard"]');
    this._emojiBtn = this.shadowRoot.querySelector('[data-act="emoji"]');
  }

  connectedCallback() {
    this.shadowRoot.addEventListener("click", (e) => {
      const act = e.target?.dataset?.act;
      if (!act) return;
      this.dispatchEvent(
        new CustomEvent("mgl-toggle", {
          detail: { action: act },
          bubbles: true,
          composed: true,
        })
      );
    });
  }

  /**
   * @param {{ enabled?: boolean, mode?: string, showKeyboardButton?: boolean, showEmojiButton?: boolean }} state
   */
  sync(state = {}) {
    this._enableBtn.setAttribute("aria-pressed", String(!!state.enabled));
    this._enableBtn.textContent = state.enabled ? "IME ON" : "IME OFF";
    this._modeBtn.textContent = state.mode === "latin" ? "LAT" : "MN";
    this._kbBtn.hidden = !state.showKeyboardButton;
    this._emojiBtn.hidden = !state.showEmojiButton;
  }
}

if (typeof customElements !== "undefined" && !customElements.get("mgl-ime-toggle")) {
  customElements.define("mgl-ime-toggle", MglImeToggle);
}

export default MglImeToggle;
