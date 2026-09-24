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
  const shouldHandle = options.shouldHandle ?? (() => true);

  let shiftAlone = false;
  /** Serialize overlapping async tails (network candidates, etc.). */
  let chain = Promise.resolve();
  /** Keys currently being handled (sync body + async tail). */
  let inFlight = 0;

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

    const ev = {
      type: "key",
      key: e.key,
      code: e.code,
      shiftKey: e.shiftKey,
      ctrlKey: e.ctrlKey || e.metaKey,
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
    if (!shouldHandle() || !core.state.enabled) return;
    if (core.state.mode === "latin") return;
    if (e.isComposing) return;
    const type = e.inputType || "";
    if (type.startsWith("insert")) {
      e.preventDefault();
    }
  };

  const onKeyDownShift = (e) => {
    if (e.key === "Shift") shiftAlone = true;
    else shiftAlone = false;
  };
  const onKeyUp = (e) => {
    if (!shouldHandle() || !core.state.enabled) return;
    if (e.key === "Shift" && shiftAlone) {
      shiftAlone = false;
      core.setMode(core.state.mode === "mongol" ? "latin" : "mongol");
    }
  };

  target.addEventListener("keydown", onKeyDownShift, true);
  target.addEventListener("keydown", onKeyDown, true);
  target.addEventListener("keyup", onKeyUp, true);
  editorEl?.addEventListener("beforeinput", onBeforeInput, true);

  return {
    profile: "desktop",
    virtualKeyboard: false,
    candidatePopup: true,
    detach() {
      target.removeEventListener("keydown", onKeyDownShift, true);
      target.removeEventListener("keydown", onKeyDown, true);
      target.removeEventListener("keyup", onKeyUp, true);
      editorEl?.removeEventListener("beforeinput", onBeforeInput, true);
    },
  };
}

export default attachDesktopController;
