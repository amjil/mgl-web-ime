/**
 * IME Core — profile/UI/editor agnostic.
 * Logic mirrors shared-ime.controller (desktop phonetic) + mobile commit paths.
 */

import {
  createInitialState,
  clearCompositionFields,
  currentCandidate,
  pageCandidates,
} from "./state.js";
import {
  appendToBuffer,
  backspaceBuffer,
  previewFromBuffer,
  isCompositionChar,
} from "./composition.js";
import {
  createCandidateSession,
  withCandidates,
  shiftPage,
  candidateAtPageIndex,
} from "./candidate.js";
import { translate, directCharFromKey } from "./mapping.js";
import { getSuffixCandidates, isKnownSuffix } from "./suffix.js";
import { getLastWord, trailingMongolWord } from "../utils/unicode.js";
import { Mongol } from "../utils/mongol.js";
import { LocalCandidateProvider } from "../api/candidate-provider.js";

/**
 * @typedef {Object} ImeCoreOptions
 * @property {import("../adapters/custom.js").EditorAdapter} adapter
 * @property {import("../api/candidate-provider.js").CandidateProvider} [provider]
 * @property {string} [mode]
 * @property {string} [profile]
 * @property {number} [pageSize]
 * @property {(event: string, detail?: object) => void} [emit]
 */

export class ImeCore {
  /** @param {ImeCoreOptions} options */
  constructor(options) {
    if (!options?.adapter) throw new Error("ImeCore requires an adapter");
    this.adapter = options.adapter;
    this.provider = options.provider ?? new LocalCandidateProvider();
    this.emit = options.emit ?? (() => {});
    this._session = createCandidateSession();
    this.state = createInitialState({
      mode: options.mode ?? "mongol",
      profile: options.profile ?? "desktop",
      pageSize: options.pageSize ?? 5,
    });
  }

  getState() {
    return { ...this.state, pageCandidates: pageCandidates(this.state) };
  }

  setState(patch) {
    this.state = { ...this.state, ...patch };
    this.emit("state", this.getState());
  }

  enable() {
    this.setState({ enabled: true });
  }

  disable() {
    this.cancelComposition();
    this.setState({ enabled: false });
  }

  setMode(mode) {
    this.cancelComposition();
    this.setState({ mode });
    this.emit("mgl-ime-mode-change", { mode });
  }

  setProfile(profile) {
    this.setState({ profile });
  }

  setProvider(provider) {
    this.provider = provider;
  }

  setAdapter(adapter) {
    this.cancelComposition();
    this.adapter = adapter;
  }

  /**
   * Sync predicate used by desktop keydown to call preventDefault
   * before any await — mirrors _handleKey without side effects.
   * @param {{ key?: string, code?: string, shiftKey?: boolean, ctrlKey?: boolean }} ev
   */
  willHandleKey(ev) {
    if (!this.state.enabled) return false;
    const latinMode = this.state.mode === "latin";
    const { key, code, shiftKey, ctrlKey } = ev;
    const hasComp =
      this.state.composition.length > 0 || this.state.candidates.length > 0;

    if (ctrlKey && (key === " " || code === "Space")) return true;
    if (ctrlKey) return false;

    if (
      key === "_" ||
      key === "\u2014" ||
      key === "\u2013" ||
      key === "\uFF0D" ||
      (shiftKey && (key === "-" || code === "Minus"))
    ) {
      return true;
    }

    if (latinMode && key && /^[\x20-\x7E]$/.test(key)) return true;

    if (key === "Escape" && hasComp) return true;

    if (directCharFromKey({ key, code, shiftKey, latinMode }) != null) {
      return true;
    }

    if (hasComp && !shiftKey && (key === "-" || code === "Minus")) return true;
    if (hasComp && (key === "=" || key === "+" || code === "Equal")) return true;

    if (!latinMode && key && isCompositionChar(key)) return true;
    if (!latinMode && (key === "Backspace" || code === "Backspace")) return true;

    // Commit then let caret move — do not claim (returns false in handler)
    if (hasComp && (key === "ArrowLeft" || key === "ArrowRight")) return false;

    if (!latinMode && (key === " " || code === "Space")) return true;

    if (key && /^[1-5]$/.test(key) && hasComp) return true;
    if (hasComp && (key === "ArrowDown" || key === "PageDown")) return true;
    if (hasComp && (key === "ArrowUp" || key === "PageUp")) return true;
    if (key === "Enter") return true;

    return false;
  }

  // ─── Composition / preview ─────────────────────────────────

  async updateComposition(buffer) {
    const preview = previewFromBuffer(buffer);
    const prevLen = this.state.previewLen;
    this.adapter.replaceBeforeCaret?.(prevLen, preview);

    // Show local preview as interim candidates immediately (don't wait on network).
    const interim = preview ? [preview] : [];
    this.setState({
      composition: buffer,
      preview,
      previewLen: Array.from(preview).length,
      composing: buffer.length > 0,
      pageIndex: 0,
      selectedCandidate: 0,
      candidates: interim,
      candidateVisible: interim.length > 0,
    });
    this.emit("mgl-ime-composition-update", { composition: buffer, preview });
    // Do not await — keep key queue responsive while remote candidates load.
    void this.queryCandidates(preview || buffer, "typing");
  }

  async queryCandidates(input, trigger = "typing") {
    const gen = this._session.next();
    if (!input) {
      this.setState(withCandidates(this.state, []));
      return;
    }
    try {
      const list = await this.provider.getCandidates(input, {
        trigger,
        composition: this.state.composition,
      });
      if (this._session.isStale(gen)) return;
      this.setState(withCandidates(this.state, list));
      this.emit("mgl-ime-candidates", { candidates: list, trigger });
    } catch {
      if (this._session.isStale(gen)) return;
      const fallback = previewFromBuffer(this.state.composition) || input;
      this.setState(withCandidates(this.state, fallback ? [fallback] : []));
    }
  }

  async queryNextWords(word) {
    const gen = this._session.next();
    if (!word || !this.provider.getNextWords) {
      this.setState(withCandidates(this.state, []));
      return;
    }
    try {
      const list = await this.provider.getNextWords(word);
      if (this._session.isStale(gen)) return;
      this.setState(withCandidates(this.state, list));
      this.emit("mgl-ime-candidates", { candidates: list, trigger: "commit" });
    } catch {
      if (this._session.isStale(gen)) return;
      this.setState(withCandidates(this.state, []));
    }
  }

  /**
   * Commit selected / preview text into the editor.
   * @param {string} text
   * @param {{ addSpaceAfter?: boolean }} [opts]
   */
  async commit(text, opts = {}) {
    const { addSpaceAfter = false } = opts;
    let base = (text ?? "").replace(/^ +/, "");
    const mvsPrefix = base.startsWith("\u180e");
    const ctx = this.adapter.getTextBeforeCaret?.() ?? "";
    const dropPrevSpace =
      mvsPrefix &&
      this.state.previewLen === 0 &&
      ctx.length > 0 &&
      ctx[ctx.length - 1] === " ";
    const deleteLen = this.state.previewLen + (dropPrevSpace ? 1 : 0);
    const finalText = addSpaceAfter ? `${base} ` : base;
    const wordForPredict = text.trim();

    this.adapter.replaceBeforeCaret?.(deleteLen, finalText);
    this.setState(clearCompositionFields(this.state));
    this.emit("mgl-ime-commit", { text: finalText });
    this.emit("mgl-ime-composition-end", { text: finalText });
    this.emit("mgl-ime-input", { text: finalText });

    if (wordForPredict) {
      await this.queryNextWords(wordForPredict);
    }
  }

  cancelComposition() {
    if (this.state.previewLen > 0) {
      this.adapter.replaceBeforeCaret?.(this.state.previewLen, "");
    }
    this._session.next();
    this.setState(clearCompositionFields(this.state));
    this.emit("mgl-ime-composition-end", { text: "", cancelled: true });
  }

  // ─── Candidate navigation ──────────────────────────────────

  nextPage() {
    this.setState(shiftPage(this.state, 1));
  }

  previousPage() {
    this.setState(shiftPage(this.state, -1));
  }

  nextCandidate() {
    const max = this.state.candidates.length - 1;
    if (max < 0) return;
    const next = Math.min(this.state.selectedCandidate + 1, max);
    const pageIndex = Math.floor(next / this.state.pageSize);
    this.setState({ selectedCandidate: next, pageIndex });
  }

  previousCandidate() {
    if (!this.state.candidates.length) return;
    const next = Math.max(this.state.selectedCandidate - 1, 0);
    const pageIndex = Math.floor(next / this.state.pageSize);
    this.setState({ selectedCandidate: next, pageIndex });
  }

  async selectCandidate(index, opts = {}) {
    const word = this.state.candidates[index];
    if (!word) return;
    await this.commit(word, { addSpaceAfter: opts.addSpaceAfter ?? true });
  }

  async selectPageCandidate(pageLocalIndex, opts = {}) {
    const word = candidateAtPageIndex(this.state, pageLocalIndex);
    if (!word) return;
    await this.commit(word, { addSpaceAfter: opts.addSpaceAfter ?? true });
  }

  async commitCurrent(opts = {}) {
    const word =
      currentCandidate(this.state) ||
      (this.state.composition ? translate(this.state.composition) : null);
    if (!word) return;
    await this.commit(word, opts);
  }

  // ─── Unified command / key handling ────────────────────────

  /**
   * Handle a normalized command from desktop or virtual keyboard.
   * @param {{ type: string, key?: string, command?: string, shiftKey?: boolean, ctrlKey?: boolean, code?: string }} ev
   * @returns {Promise<boolean>} handled?
   */
  async handleEvent(ev) {
    if (!this.state.enabled) return false;

    if (ev.type === "command") {
      return this._handleCommand(ev.command, ev);
    }
    if (ev.type === "key") {
      return this._handleKey(ev);
    }
    return false;
  }

  async _handleCommand(command, ev = {}) {
    switch (command) {
      case "backspace":
        return this._backspace();
      case "delete":
        this.adapter.deleteForward();
        return true;
      case "space":
        return this._space();
      case "enter":
        return this._enter();
      case "escape":
        if (this.state.composition || this.state.candidates.length) {
          this.cancelComposition();
          return true;
        }
        return false;
      case "candidate-next":
        this.nextPage();
        return true;
      case "candidate-prev":
        this.previousPage();
        return true;
      case "shift":
        return false;
      case "mode":
        this.setMode(this.state.mode === "mongol" ? "latin" : "mongol");
        return true;
      case "suffix":
        return this._showSuffixes();
      case "nnbsp":
        await this._injectDirect("\u202f");
        return true;
      case "insert":
        if (ev.key) return this._insertDirectMobile(ev.key);
        return false;
      case "insert-plain":
        if (ev.key) return this._insertPlain(ev.key);
        return false;
      default:
        return false;
    }
  }

  async _handleKey(ev) {
    const latinMode = this.state.mode === "latin";
    const { key, code, shiftKey, ctrlKey } = ev;
    const hasComp =
      this.state.composition.length > 0 || this.state.candidates.length > 0;

    // Ctrl/Cmd+Space → toggle
    if (ctrlKey && (key === " " || code === "Space")) {
      this.setState({ enabled: !this.state.enabled });
      return true;
    }

    if (ctrlKey) return false;

    // Shift+- → suffix menu
    if (
      key === "_" ||
      key === "\u2014" ||
      key === "\u2013" ||
      key === "\uFF0D" ||
      (shiftKey && (key === "-" || code === "Minus"))
    ) {
      return this._showSuffixes();
    }

    if (latinMode && key && /^[\x20-\x7E]$/.test(key)) {
      this.adapter.insertText(key);
      return true;
    }

    if (key === "Escape") {
      return this._handleCommand("escape");
    }

    // Direct punctuation / FVS / NNBSP
    const direct = directCharFromKey({ key, code, shiftKey, latinMode });
    if (direct != null) {
      await this._injectDirect(direct);
      return true;
    }

    // Pagination when candidates visible
    if (hasComp && !shiftKey && (key === "-" || code === "Minus")) {
      this.previousPage();
      return true;
    }
    if (hasComp && (key === "=" || key === "+" || code === "Equal")) {
      this.nextPage();
      return true;
    }

    // Phonetic typing
    if (!latinMode && key && isCompositionChar(key)) {
      if (!this.state.composing) {
        this.emit("mgl-ime-composition-start", {});
      }
      const nb = appendToBuffer(this.state.composition, key);
      await this.updateComposition(nb);
      return true;
    }

    if (!latinMode && (key === "Backspace" || code === "Backspace")) {
      return this._backspace();
    }

    if (hasComp && (key === "ArrowLeft" || key === "ArrowRight")) {
      await this.commitCurrent({ addSpaceAfter: false });
      return false; // let caret move
    }

    if (!latinMode && (key === " " || code === "Space")) {
      return this._space();
    }

    if (key && /^[1-5]$/.test(key) && hasComp) {
      await this.selectPageCandidate(Number(key) - 1, { addSpaceAfter: true });
      return true;
    }

    if (hasComp && (key === "ArrowDown" || key === "PageDown")) {
      this.nextPage();
      return true;
    }
    if (hasComp && (key === "ArrowUp" || key === "PageUp")) {
      this.previousPage();
      return true;
    }

    if (key === "Enter") {
      return this._enter();
    }

    return false;
  }

  async _backspace() {
    if (this.state.composition) {
      const nb = backspaceBuffer(this.state.composition);
      await this.updateComposition(nb);
      return true;
    }
    // Delete trailing Mongol word when present (desktop behavior)
    const ctx = this.adapter.getTextBeforeCaret?.() ?? "";
    const word = trailingMongolWord(ctx);
    if (word) {
      this.adapter.replaceBeforeCaret?.(Array.from(word).length, "");
      this.setState({
        ...withCandidates(this.state, []),
        pendingSuffixDelete: false,
      });
      return true;
    }
    this.adapter.deleteBackward();
    this.setState({
      ...withCandidates(this.state, []),
      pendingSuffixDelete: false,
    });
    return true;
  }

  async _space() {
    // Active composition OR any candidates (incl. next-word): Space commits
    // the current/first candidate. Plain spaces only when the list is empty
    // (dismiss with Esc, then Space Space for multiple trailing spaces).
    const hasComp =
      this.state.composition.length > 0 || this.state.candidates.length > 0;
    if (hasComp) {
      await this.commitCurrent({ addSpaceAfter: true });
      return true;
    }
    this.adapter.insertText(" ");
    this.setState({ pendingSuffixDelete: false });
    return true;
  }

  async _enter() {
    const hasComp =
      this.state.composition.length > 0 || this.state.candidates.length > 0;
    if (hasComp) {
      await this.commitCurrent({ addSpaceAfter: false });
      return true;
    }
    this.adapter.insertText("\n");
    return true;
  }

  async _injectDirect(ch) {
    if (this.state.composition || this.state.candidates.length) {
      await this.commitCurrent({ addSpaceAfter: false });
    }
    this.adapter.replaceBeforeCaret?.(this.state.previewLen, ch);
    this.setState(clearCompositionFields(this.state));
  }

  /**
   * Insert emoji / other literal text without candidate lookup.
   * Commits an active phonetic composition first; leaves next-word /
   * suffix lists alone (they are cleared after insert).
   * @param {string} ch
   */
  async _insertPlain(ch) {
    if (this.state.composition) {
      await this.commitCurrent({ addSpaceAfter: false });
    }
    this.adapter.insertText(ch);
    this.setState(clearCompositionFields(this.state));
    this.emit("mgl-ime-input", { text: ch });
    return true;
  }

  /** Mobile: insert Mongol char and refresh candidates from last word. */
  async _insertDirectMobile(ch) {
    this.adapter.insertText(ch);
    // Typing clears suffix-attach mode (m-v-k on-key-press :string).
    this.setState({ pendingSuffixDelete: false });
    if (this.state.mode === "latin") {
      if (this.state.candidates.length) this.setState(clearCompositionFields(this.state));
      return true;
    }
    const ctx = this.adapter.getTextBeforeCaret?.() ?? this.adapter.getText();
    const last = getLastWord(ctx);
    if (last) await this.queryCandidates(last, "typing");
    return true;
  }

  /**
   * Show suffix candidates — mirrors m-v-k `:suffix-candidates`.
   * Does NOT mutate the buffer; only sets pendingSuffixDelete so the next
   * pick deletes the trailing space / separator before inserting the suffix.
   */
  async _showSuffixes() {
    if (this.state.previewLen > 0) {
      this.adapter.replaceBeforeCaret?.(this.state.previewLen, "");
    }
    this.setState({
      ...clearCompositionFields(this.state),
      pendingSuffixDelete: true,
    });
    // Query uses rtrimmed text (ASCII whitespace only), same as m-v-k.
    const raw = this.adapter.getTextBeforeCaret?.() ?? "";
    const query = raw.replace(/\s+$/u, "");
    const list = getSuffixCandidates(query);
    this._session.next();
    this.setState(withCandidates(this.state, list));
    this.emit("mgl-ime-candidates", { candidates: list, trigger: "suffix" });
    return true;
  }

  /**
   * Mobile candidate pick — mirrors m-v-k `on-candidates-clicked`.
   * Suffix path: delete one char (trailing space) then insert suffix + space.
   * Otherwise replace the last word.
   * @param {string} text
   */
  async pickCandidateMobile(text) {
    const withSpace = `${text} `;
    const suffixDelete = this.state.pendingSuffixDelete;
    const mvs = String.fromCodePoint(Mongol.mvs);
    const isSuffix =
      suffixDelete ||
      isKnownSuffix(text) ||
      text.startsWith(mvs);
    this.setState({ pendingSuffixDelete: false });

    if (isSuffix) {
      this.adapter.deleteBackward();
      this.adapter.insertText(withSpace);
    } else {
      const ctx = this.adapter.getTextBeforeCaret?.() ?? "";
      const last = getLastWord(ctx);
      if (last) {
        this.adapter.replaceBeforeCaret?.(Array.from(last).length, withSpace);
      } else {
        this.adapter.insertText(withSpace);
      }
    }

    this.emit("mgl-ime-commit", { text: withSpace });
    await this.queryNextWords(text.trim());
  }

  destroy() {
    this.cancelComposition();
    this._session.next();
  }
}

export default ImeCore;
