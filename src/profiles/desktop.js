/**
 * Desktop profile — physical keyboard → IME Core → candidate popup.
 *
 * Critical: preventDefault and the composition DOM write must run during
 * keydown. Deferring handleEvent with queue.then() lets beforeinput/input
 * (or host IME) insert first, then our preview appends again → ᠠᠠᠠᠰ.
 */

/**
 * @param {import("../core/ime.js").ImeCore} core
 * @param {object} [options]
 * @param {HTMLElement|Window} [options.target] — key listener root (default window)
 * @param {HTMLElement} [options.editorEl] — for beforeinput guard
 * @param {() => boolean} [options.shouldHandle]
 */
export function attachDesktopController(core, options = {}) {
  const target = options.target ?? window;
  const editorEl = options.editorEl ?? null;
  const textField =
    editorEl instanceof HTMLInputElement || editorEl instanceof HTMLTextAreaElement;
  const shouldHandle = options.shouldHandle ?? (() => true);

  let shiftAlone = false;
  let shiftDownTime = 0;
  /** Serialize overlapping async tails (network candidates, etc.). */
  let chain = Promise.resolve();
  /** Keys currently being handled (sync body + async tail). */
  let inFlight = 0;

  /** Keep editor preview; clear unfinished composition / candidate UI. */
  const dismissCompositionKeepPreview = () => {
    if (!core.state.composing && !core.state.candidates.length) return;
    core._session.next();
    core.setState({
      composing: false,
      composition: "",
      preview: "",
      previewLen: 0,
      candidates: [],
      candidateVisible: false,
      selectedCandidate: 0,
      pageIndex: 0,
    });
  };

  /** Mouse caret reposition inside the editor ends the current composition. */
  const onEditorPointerDown = () => {
    dismissCompositionKeepPreview();
  };

  /** Click outside editor + candidate panel closes the candidate UI. */
  const onWindowPointerDown = (e) => {
    if (
      editorEl &&
      !editorEl.contains(e.target) &&
      !e.target.closest?.("mgl-candidates")
    ) {
      dismissCompositionKeepPreview();
    }
  };

  /** @param {object} ev */
  const handle = (ev) =>
    Promise.resolve(core.handleEvent(ev)).catch((err) => {
      console.error("[mgl-web-ime]", err);
    });

  /** @param {KeyboardEvent} e */
  const onKeyDown = (e) => {
    if (!shouldHandle()) return;
    if (!core.state.enabled) return;
    if (e.isComposing || e.key === "Process") return;

    // Never steal browser edit shortcuts (Ctrl/Cmd+C/V/X/A/Z/…).
    // Only Ctrl/Cmd+Space is an IME chord; everything else must reach the page.
    const mod = e.ctrlKey || e.metaKey;
    if (mod && e.key !== " " && e.code !== "Space") return;

    const ev = {
      type: "key",
      key: e.key,
      code: e.code,
      shiftKey: e.shiftKey,
      ctrlKey: mod,
      altKey: e.altKey,
    };

    if (!core.willHandleKey(ev)) return;

    // Must be synchronous — otherwise Latin / host IME leaks into the editor.
    e.preventDefault();
    e.stopPropagation();

    // Idle: call handleEvent now so replaceBeforeCaret runs inside keydown
    // (before beforeinput). Busy: serialize behind the in-flight key.
    if (inFlight === 0) {
      inFlight++;
      chain = handle(ev).finally(() => {
        inFlight--;
      });
    } else {
      inFlight++;
      chain = chain.then(() => handle(ev)).finally(() => {
        inFlight--;
      });
    }
  };

  // Block every browser insert while we own the editor in mongol mode.
  // Host / system IMEs may send Mongolian data; Latin-only checks miss them.
  /** @param {InputEvent} e */
  const onBeforeInput = (e) => {
    // Native <input>/<textarea>: keydown owns inserts; blocking beforeinput here
    // can swallow keys willHandleKey skips (dead keys, some layouts).
    if (textField) return;
    if (!shouldHandle() || !core.state.enabled) return;
    if (core.state.mode === "latin") return;
    if (e.isComposing) return;
    const type = e.inputType || "";
    // Paste / drop must reach the field; only block typed composition inserts.
    if (
      type.startsWith("insert") &&
      type !== "insertFromPaste" &&
      type !== "insertFromDrop" &&
      type !== "insertFromYank"
    ) {
      e.preventDefault();
    }
  };

  const onKeyDownShift = (e) => {
    if (e.key === "Shift" && !e.repeat) {
      shiftAlone = true;
      shiftDownTime = performance.now();
    } else if (e.key !== "Shift") {
      shiftAlone = false;
    }
  };
  const onKeyUp = (e) => {
    if (!shouldHandle() || !core.state.enabled) return;
    // Toggle mode only on a short tap (<300ms) with no other keys in between.
    if (
      e.key === "Shift" &&
      shiftAlone &&
      performance.now() - shiftDownTime < 300
    ) {
      shiftAlone = false;
      core.setMode(core.state.mode === "mongol" ? "latin" : "mongol");
    } else if (e.key === "Shift") {
      shiftAlone = false;
    }
  };

  // Mouse activity while holding Shift should not count as a lone Shift tap.
  const onPointerDownShiftGuard = () => {
    shiftAlone = false;
  };

  target.addEventListener("keydown", onKeyDownShift, true);
  target.addEventListener("keydown", onKeyDown, true);
  target.addEventListener("keyup", onKeyUp, true);
  editorEl?.addEventListener("beforeinput", onBeforeInput, true);
  editorEl?.addEventListener("pointerdown", onEditorPointerDown);
  window.addEventListener("pointerdown", onWindowPointerDown);
  window.addEventListener("pointerdown", onPointerDownShiftGuard, true);

  return {
    profile: "desktop",
    virtualKeyboard: false,
    candidatePopup: true,
    detach() {
      target.removeEventListener("keydown", onKeyDownShift, true);
      target.removeEventListener("keydown", onKeyDown, true);
      target.removeEventListener("keyup", onKeyUp, true);
      editorEl?.removeEventListener("beforeinput", onBeforeInput, true);
      editorEl?.removeEventListener("pointerdown", onEditorPointerDown);
      window.removeEventListener("pointerdown", onWindowPointerDown);
      window.removeEventListener("pointerdown", onPointerDownShiftGuard, true);
    },
  };
}

export default attachDesktopController;
