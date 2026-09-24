/**
 * MglIME — high-level JS API + <mgl-ime> Web Component.
 */

import { ImeCore } from "../core/ime.js";
import { ContentEditableAdapter } from "../adapters/contenteditable.js";
import { TextareaAdapter } from "../adapters/textarea.js";
import { InputAdapter } from "../adapters/input.js";
import { createCustomAdapter } from "../adapters/custom.js";
import { createDefaultProvider } from "../api/candidate-provider.js";
import { detectProfile, resolveKeyboardMode } from "../profiles/detect.js";
import { attachDesktopController } from "../profiles/desktop.js";
import { attachMobileController } from "../profiles/mobile.js";
import "./mgl-candidates.js";
import "./mgl-keyboard.js";
import "./mgl-ime-toggle.js";
import "./mgl-emoji-picker.js";

/**
 * Resolve target element from selector / element.
 * @param {string|HTMLElement} target
 */
function resolveTarget(target) {
  if (!target) return null;
  if (typeof target === "string") return document.querySelector(target);
  return target;
}

/**
 * Build adapter for a DOM node.
 * @param {HTMLElement} el
 * @param {import("../adapters/custom.js").EditorAdapter} [custom]
 */
export function adapterForElement(el, custom) {
  if (custom) return custom;
  if (!el) throw new Error("MglIME requires target or adapter");
  if (el instanceof HTMLTextAreaElement) return TextareaAdapter(el);
  if (el instanceof HTMLInputElement) return InputAdapter(el);
  return ContentEditableAdapter(el);
}

export class MglIME {
  /**
   * @param {object} options
   * @param {string|HTMLElement} [options.target]
   * @param {import("../adapters/custom.js").EditorAdapter} [options.adapter]
   * @param {"auto"|"desktop"|"mobile"} [options.profile]
   * @param {"auto"|"system"|"virtual"} [options.keyboard]
   * @param {string} [options.mode]
   * @param {import("../api/candidate-provider.js").CandidateProvider} [options.provider]
   * @param {object} [options.remote] — RemoteCandidateProvider options
   * @param {string} [options.theme]
   * @param {HTMLElement} [options.mount] — where to attach UI hosts
   * @param {boolean} [options.candidates=true]
   */
  constructor(options = {}) {
    this.options = options;
    this._listeners = new Map();
    this._destroyed = false;

    this.profileSetting = options.profile ?? "auto";
    this.keyboardSetting = options.keyboard ?? "auto";
    this.profile = detectProfile(this.profileSetting);
    this.keyboardMode = resolveKeyboardMode(this.keyboardSetting, this.profile);

    this.targetEl = resolveTarget(options.target);
    this.adapter = adapterForElement(this.targetEl, options.adapter);

    this.provider =
      options.provider ??
      createDefaultProvider({
        baseUrl: options.remote?.baseUrl ?? options.baseUrl ?? "http://dev1:3003",
        ...options.remote,
      });

    this.core = new ImeCore({
      adapter: this.adapter,
      provider: this.provider,
      mode: options.mode ?? "mongol",
      profile: this.profile,
      emit: (type, detail) => this._emit(type, detail),
    });

    this.mount = options.mount ?? document.body;
    this._setupUI();
    this._attachProfile();
    this._boundState = (state) => this._onState(state);
    this.on("state", this._boundState);

    this._emit("mgl-ime-ready", { profile: this.profile, keyboardMode: this.keyboardMode });
  }

  _setupUI() {
    this.candidatesEl = document.createElement("mgl-candidates");
    this.candidatesEl.setAttribute(
      "variant",
      this.profile === "mobile" ? "bar" : "popup"
    );
    this.mount.appendChild(this.candidatesEl);

    this.keyboardEl = document.createElement("mgl-keyboard");
    this.mount.appendChild(this.keyboardEl);
    this.keyboardEl.getEditingContext = () => {
      try {
        const text = this.adapter.getText?.() ?? "";
        const { start } = this.adapter.getSelection?.() ?? { start: text.length };
        return { text, start };
      } catch {
        return null;
      }
    };

    this.candidatesEl.addEventListener("mgl-candidate-select", async (e) => {
      const { index, word } = e.detail;
      if (this.profile === "mobile") {
        await this.core.pickCandidateMobile(word);
      } else {
        await this.core.selectCandidate(index, { addSpaceAfter: true });
      }
    });

    this.keyboardEl.addEventListener("mgl-keyboard-event", async (e) => {
      if (this._mobile?.onKeyboardEvent) {
        await this._mobile.onKeyboardEvent(e.detail);
      } else {
        await this.core.handleEvent(e.detail);
      }
    });

    this.emojiPickerEl = document.createElement("mgl-emoji-picker");
    this.mount.appendChild(this.emojiPickerEl);
    this.emojiPickerEl.addEventListener("mgl-emoji-select", async (e) => {
      const emoji = e.detail?.emoji;
      if (!emoji) return;
      await this.core.handleEvent({ type: "command", command: "insert-plain", key: emoji });
      this.adapter.focus?.();
    });

    if (this.keyboardMode === "virtual") {
      this.showKeyboard();
    }
  }

  _attachProfile() {
    this._desktop?.detach?.();
    this._mobile?.detach?.();
    this._desktop = null;
    this._mobile = null;

    if (this.profile === "desktop") {
      this._desktop = attachDesktopController(this.core, {
        // Capture on window so we always see keydown before the editor inserts.
        target: window,
        editorEl: this.targetEl,
        shouldHandle: () => {
          if (!this.core.state.enabled) return false;
          if (!this.targetEl) return true;
          return (
            document.activeElement === this.targetEl ||
            this.targetEl.contains?.(document.activeElement)
          );
        },
      });
      this.candidatesEl.setAttribute("variant", "popup");
      this._clearMobileCandidatePosition();
      if (this.keyboardMode !== "virtual") this.hideKeyboard();
    } else {
      this._mobile = attachMobileController(this.core, {
        editorEl: this.targetEl,
      });
      // Same vertical Mongolian popup look as desktop; fixed above keyboard center
      this.candidatesEl.setAttribute("variant", "bar");
      this._positionMobileCandidates();
      if (this.keyboardMode === "virtual") this.showKeyboard();
    }
  }

  /** Fixed, horizontally centered, just above the virtual keyboard. */
  _positionMobileCandidates() {
    if (!this.candidatesEl) return;
    const kbH = this.keyboardEl?.offsetHeight || 240;
    const gap = 8;
    const el = this.candidatesEl;
    el.style.position = "fixed";
    el.style.left = "50%";
    el.style.right = "auto";
    el.style.transform = "translateX(-50%)";
    el.style.bottom = `${kbH + gap}px`;
    el.style.top = "auto";
    // Leave width to CSS (min(92vw, 520px)) so the strip can scroll horizontally.
    el.style.width = "";
  }

  /** Clear mobile positioning when switching to desktop. */
  _clearMobileCandidatePosition() {
    if (!this.candidatesEl) return;
    const el = this.candidatesEl;
    el.style.position = "";
    el.style.left = "";
    el.style.right = "";
    el.style.transform = "";
    el.style.bottom = "";
    el.style.top = "";
    el.style.width = "";
  }

  _onState(state) {
    this.candidatesEl?.update(state);
    if (this.profile === "desktop" && state.candidateVisible && state.candidates?.length) {
      this._clearMobileCandidatePosition();
      const rect = this.adapter.getCaretRect?.();
      if (rect) {
        this.candidatesEl.positionNear(rect);
      } else if (this.targetEl) {
        this.candidatesEl.positionNear(this.targetEl.getBoundingClientRect());
      }
      // Reposition after layout (vertical Mongolian caret rect settles).
      requestAnimationFrame(() => {
        const r = this.adapter.getCaretRect?.();
        if (r) this.candidatesEl.positionNear(r);
      });
    }
    if (this.profile === "mobile") {
      this._positionMobileCandidates();
    }
  }

  // ─── Public API ────────────────────────────────────────────

  enable() {
    this.core.enable();
  }

  disable() {
    this.hideEmojiPicker();
    this.core.disable();
  }

  show() {
    if (this.keyboardMode === "virtual") this.showKeyboard();
    this.candidatesEl.visible = true;
  }

  hide() {
    this.hideKeyboard();
    this.hideEmojiPicker();
    this.candidatesEl.visible = false;
  }

  focus() {
    this.adapter.focus?.();
  }

  blur() {
    this.adapter.blur?.();
  }

  setProfile(profile) {
    this.profileSetting = profile;
    this.profile = detectProfile(profile);
    this.keyboardMode = resolveKeyboardMode(this.keyboardSetting, this.profile);
    this.core.setProfile(this.profile);
    if (this.profile !== "desktop") this.hideEmojiPicker();
    this._attachProfile();
  }

  setMode(mode) {
    this.core.setMode(mode);
  }

  showKeyboard() {
    this.keyboardEl?.show();
    this.core.setState({ keyboardVisible: true });
    if (this.profile === "mobile") {
      // Keyboard height may change after becoming visible — remeasure next frame.
      requestAnimationFrame(() => this._positionMobileCandidates());
    }
  }

  hideKeyboard() {
    this.keyboardEl?.hide();
    this.core.setState({ keyboardVisible: false });
  }

  setKeyboardMode(mode) {
    this.keyboardSetting = mode;
    this.keyboardMode = resolveKeyboardMode(mode, this.profile);
    if (this.keyboardMode === "virtual") this.showKeyboard();
    else this.hideKeyboard();
  }

  showCandidates() {
    this.candidatesEl.visible = true;
  }

  hideCandidates() {
    this.candidatesEl.visible = false;
  }

  /**
   * @param {Element|{left:number,top:number}|null} [anchor]
   */
  showEmojiPicker(anchor) {
    const el = this.emojiPickerEl;
    if (!el) return;
    el.show({ ignore: anchor instanceof Element ? anchor : null });
    const target =
      anchor ??
      this.adapter.getCaretRect?.() ??
      this.targetEl?.getBoundingClientRect?.();
    if (target) {
      requestAnimationFrame(() => el.positionNear(target));
    }
    this.adapter.focus?.();
  }

  hideEmojiPicker() {
    this.emojiPickerEl?.hide();
  }

  /**
   * @param {Element|{left:number,top:number}|null} [anchor]
   */
  toggleEmojiPicker(anchor) {
    if (this.emojiPickerEl?.open) this.hideEmojiPicker();
    else this.showEmojiPicker(anchor);
  }

  nextCandidate() {
    this.core.nextCandidate();
  }

  previousCandidate() {
    this.core.previousCandidate();
  }

  selectCandidate(index) {
    return this.core.selectCandidate(index);
  }

  getState() {
    return this.core.getState();
  }

  on(type, fn) {
    if (!this._listeners.has(type)) this._listeners.set(type, new Set());
    this._listeners.get(type).add(fn);
    return () => this.off(type, fn);
  }

  off(type, fn) {
    this._listeners.get(type)?.delete(fn);
  }

  _emit(type, detail) {
    this._listeners.get(type)?.forEach((fn) => {
      try {
        fn(detail);
      } catch (err) {
        console.error(err);
      }
    });
    this._listeners.get("*")?.forEach((fn) => fn(type, detail));
  }

  destroy() {
    if (this._destroyed) return;
    this._destroyed = true;
    this._desktop?.detach?.();
    this._mobile?.detach?.();
    this.core.destroy();
    this.candidatesEl?.remove();
    this.keyboardEl?.remove();
    this.emojiPickerEl?.remove();
    this._listeners.clear();
  }
}

/**
 * Web Component wrapper.
 */
const HtmlBase = typeof HTMLElement !== "undefined" ? HTMLElement : class {};

export class MglImeElement extends HtmlBase {
  constructor() {
    super();
    this._ime = null;
    /** Skip attribute rebuilds until connectedCallback has booted once. */
    this._booted = false;
  }

  static get observedAttributes() {
    return ["target", "profile", "keyboard", "mode", "theme", "disabled", "base-url"];
  }

  connectedCallback() {
    // Upgrade order: attributeChangedCallback(s) → connectedCallback.
    // Boot only here so we don't attach multiple window keydown listeners.
    this._ime?.destroy();
    this._boot();
  }

  disconnectedCallback() {
    this._ime?.destroy();
    this._ime = null;
    this._booted = false;
  }

  attributeChangedCallback(_name, oldValue, newValue) {
    if (!this._booted || !this.isConnected) return;
    if (oldValue === newValue) return;
    this._ime?.destroy();
    this._boot();
  }

  _boot() {
    const target = this.getAttribute("target");
    if (!target && !this._adapter) return;

    this._ime = new MglIME({
      target,
      adapter: this._adapter,
      profile: this.getAttribute("profile") || "auto",
      keyboard: this.getAttribute("keyboard") || "auto",
      mode: this.getAttribute("mode") || "mongol",
      theme: this.getAttribute("theme") || "auto",
      baseUrl: this.getAttribute("base-url") || undefined,
      mount: this.parentElement ?? document.body,
    });
    this._booted = true;

    if (this.hasAttribute("disabled")) this._ime.disable();

    // Re-dispatch core events on the element
    const events = [
      "mgl-ime-ready",
      "mgl-ime-input",
      "mgl-ime-composition-start",
      "mgl-ime-composition-update",
      "mgl-ime-composition-end",
      "mgl-ime-candidates",
      "mgl-ime-commit",
      "mgl-ime-mode-change",
    ];
    events.forEach((name) => {
      this._ime.on(name, (detail) => {
        this.dispatchEvent(
          new CustomEvent(name, { detail, bubbles: true, composed: true })
        );
      });
    });
  }

  /** Allow setting a custom adapter from JS before connect. */
  set adapter(a) {
    this._adapter = a;
  }

  get ime() {
    return this._ime;
  }
}

if (typeof customElements !== "undefined" && !customElements.get("mgl-ime")) {
  customElements.define("mgl-ime", MglImeElement);
}

export {
  ImeCore,
  ContentEditableAdapter,
  TextareaAdapter,
  InputAdapter,
  createCustomAdapter,
  createDefaultProvider,
};

export default MglIME;
