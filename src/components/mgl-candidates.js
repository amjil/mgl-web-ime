/**
 * <mgl-candidates> — desktop caret popup / mobile popup above keyboard.
 */

import { placeNearCaret } from "../utils/popup-position.js";

function buildTemplate() {
  const TEMPLATE = document.createElement("template");
  TEMPLATE.innerHTML = `
  <style>
    :host {
      display: none;
      position: fixed;
      z-index: 10000;
      font-family: var(--mgl-ime-font, "Oyun Qagan Tig", "Noto Sans Mongolian", "Mongolian Baiti", serif);
      color: var(--mgl-ime-text, #1a1a1a);
      --bg: var(--mgl-ime-candidate-background, #f7f5f0);
      --border: var(--mgl-ime-border, #c8c2b4);
      --active: var(--mgl-ime-key-active, #d4e4f7);
      --accent: var(--mgl-ime-accent, #3d6b9a);
    }
    :host([visible]) { display: block; }
    :host([variant="popup"]) .panel,
    :host([variant="bar"]) .panel {
      background: var(--bg);
      border: 1px solid var(--border);
      border-radius: 10px;
      box-shadow: 0 8px 28px rgba(0,0,0,.14);
      padding: 8px 10px 6px;
      max-width: min(92vw, 520px);
    }
    /* Mobile: fixed-width strip above keyboard; swipe horizontally for more */
    :host([variant="bar"]) {
      width: min(92vw, 520px);
      max-width: min(92vw, 520px);
    }
    :host([variant="bar"]) .panel {
      overflow-x: auto;
      overflow-y: hidden;
      -webkit-overflow-scrolling: touch;
      overscroll-behavior-x: contain;
      touch-action: pan-x;
      scrollbar-width: thin;
    }
    :host([variant="bar"]) .panel::-webkit-scrollbar {
      height: 3px;
    }
    :host([variant="bar"]) .row {
      width: max-content;
      flex-wrap: nowrap;
    }
    :host([variant="bar"]) .item {
      flex-shrink: 0;
    }
    :host([variant="bar"]) .meta {
      display: none;
    }
    .row {
      display: flex;
      flex-direction: row;
      align-items: flex-start;
      gap: 0;
    }
    .item {
      display: flex;
      flex-direction: column;
      align-items: center;
      min-width: 44px;
      padding: 4px 10px;
      cursor: pointer;
      border-radius: 8px;
      border: none;
      background: transparent;
      color: inherit;
      font: inherit;
    }
    .item[aria-selected="true"],
    .item:hover { background: var(--active); }

    .idx {
      writing-mode: horizontal-tb;
      font-size: 11px;
      font-weight: 600;
      width: 18px; height: 18px;
      border-radius: 9px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      background: color-mix(in srgb, var(--accent) 22%, transparent);
      color: var(--accent);
      margin-bottom: 4px;
      flex-shrink: 0;
    }

    .word {
      writing-mode: vertical-lr;
      text-orientation: mixed;
      font-size: var(--mgl-ime-candidate-size, 22px);
      line-height: 1.2;
      max-height: 7em;
      overflow: hidden;
    }
    .meta {
      writing-mode: horizontal-tb;
      font-size: 11px;
      opacity: .55;
      text-align: center;
      margin-top: 4px;
    }
    .empty { display: none; }
  </style>
  <div class="panel" part="panel">
    <div class="row" part="list" role="listbox"></div>
    <div class="meta" part="meta"></div>
  </div>
`;
  return TEMPLATE;
}

let _template;
const Base = typeof HTMLElement !== "undefined" ? HTMLElement : class {};

export class MglCandidates extends Base {
  constructor() {
    super();
    if (!_template) _template = buildTemplate();
    this.attachShadow({ mode: "open" }).appendChild(_template.content.cloneNode(true));
    this._candidates = [];
    this._pageIndex = 0;
    this._pageSize = 5;
    this._selected = 0;
    this._list = this.shadowRoot.querySelector(".row");
    this._meta = this.shadowRoot.querySelector(".meta");
  }

  static get observedAttributes() {
    return ["variant", "visible", "placement"];
  }

  connectedCallback() {
    if (!this.hasAttribute("variant")) this.setAttribute("variant", "popup");
  }

  get visible() {
    return this.hasAttribute("visible");
  }

  set visible(v) {
    if (v) this.setAttribute("visible", "");
    else this.removeAttribute("visible");
  }

  /**
   * @param {object} state
   */
  update(state = {}) {
    const prev = this._candidates;
    this._candidates = state.candidates ?? [];
    this._pageIndex = state.pageIndex ?? 0;
    this._pageSize = state.pageSize ?? 5;
    this._selected = state.selectedCandidate ?? 0;

    const isBar = this.getAttribute("variant") === "bar";
    // Mobile: show all candidates in a swipeable row; desktop keeps paging.
    const list = isBar
      ? this._candidates
      : this._candidates.slice(
          this._pageIndex * this._pageSize,
          this._pageIndex * this._pageSize + this._pageSize
        );
    const listChanged =
      prev.length !== this._candidates.length ||
      prev.some((w, i) => w !== this._candidates[i]);

    this.visible = list.length > 0 && (state.candidateVisible !== false);
    this._render(list, { absoluteIndex: isBar });

    if (isBar) {
      this._meta.textContent = "";
      if (listChanged) {
        const panel = this.shadowRoot.querySelector(".panel");
        if (panel) panel.scrollLeft = 0;
      }
    } else {
      const pages = Math.ceil(this._candidates.length / this._pageSize) || 0;
      this._meta.textContent = pages > 1 ? `${this._pageIndex + 1}/${pages}` : "";
    }
  }

  /**
   * Place the desktop popup at the caret's bottom-right when it fits, then
   * bottom-left or top-left. Never overlap the caret — viewport clamping must
   * not slide the panel over the insertion point.
   * @param {{left:number, top:number, bottom?:number, right?:number, width?:number, height?:number}} rect
   */
  positionNear(rect, placement = "auto") {
    // Mobile bar is positioned by MglIME above the keyboard (centered).
    if (this.getAttribute("variant") === "bar") return;

    const panel = this.shadowRoot.querySelector(".panel");
    const pRect = panel ? panel.getBoundingClientRect() : null;
    const { left, top } = placeNearCaret(
      rect,
      { width: pRect?.width ?? 0, height: pRect?.height ?? 0 },
      { width: window.innerWidth, height: window.innerHeight },
      { placement },
    );

    this.style.right = "auto";
    this.style.bottom = "auto";
    this.style.left = `${left}px`;
    this.style.top = `${top}px`;
  }

  /**
   * @param {string[]} page
   * @param {{ absoluteIndex?: boolean }} [opts]
   */
  _render(page, opts = {}) {
    this._list.innerHTML = "";
    const isBar = this.getAttribute("variant") === "bar";
    page.forEach((word, i) => {
      const abs = opts.absoluteIndex ? i : this._pageIndex * this._pageSize + i;
      const btn = document.createElement("button");
      btn.type = "button";
      btn.tabIndex = -1;
      btn.className = "item";
      btn.setAttribute("role", "option");
      btn.setAttribute("aria-selected", String(abs === this._selected));
      // Desktop: page-local 1..n for number keys; mobile: sequential absolute index
      btn.innerHTML = `<span class="idx">${i + 1}</span><span class="word"></span>`;
      btn.querySelector(".word").textContent = word;

      // Commit on pointerdown and preventDefault so the candidate button does not
      // steal focus; losing focus breaks contenteditable getRange and turns replace into append.
      let committed = false;
      const commitCandidate = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (committed) return;
        committed = true;
        this.dispatchEvent(
          new CustomEvent("mgl-candidate-select", {
            detail: { index: abs, word },
            bubbles: true,
            composed: true,
          })
        );
      };

      btn.addEventListener("mousedown", commitCandidate);

      if (isBar) {
        // Allow horizontal pan; only commit on tap (not swipe).
        let startX = 0;
        let startY = 0;
        let moved = false;
        btn.addEventListener(
          "touchstart",
          (e) => {
            const t = e.touches[0];
            startX = t.clientX;
            startY = t.clientY;
            moved = false;
          },
          { passive: true }
        );
        btn.addEventListener(
          "touchmove",
          (e) => {
            const t = e.touches[0];
            if (
              Math.abs(t.clientX - startX) > 10 ||
              Math.abs(t.clientY - startY) > 10
            ) {
              moved = true;
            }
          },
          { passive: true }
        );
        btn.addEventListener(
          "touchend",
          (e) => {
            if (moved) return;
            commitCandidate(e);
          },
          { passive: false }
        );
      } else {
        btn.addEventListener("touchstart", commitCandidate, { passive: false });
      }

      this._list.appendChild(btn);
    });
  }
}

if (typeof customElements !== "undefined" && !customElements.get("mgl-candidates")) {
  customElements.define("mgl-candidates", MglCandidates);
}

export default MglCandidates;
