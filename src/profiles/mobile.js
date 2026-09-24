/**
 * Mobile profile — virtual keyboard → IME Core → candidate bar.
 */

/**
 * @param {import("../core/ime.js").ImeCore} core
 * @param {object} [options]
 * @param {HTMLElement} [options.editorEl]
 */
export function attachMobileController(core, options = {}) {
  const editorEl = options.editorEl ?? core.adapter.getElement?.();

  // Prefer keeping system VK hidden when using our virtual keyboard
  if (editorEl) {
    editorEl.setAttribute("inputmode", "none");
    editorEl.setAttribute("virtualkeyboardpolicy", "manual");
    // contenteditable / textarea
    if ("readOnly" in editorEl) {
      // keep focusable but discourage OS keyboard on some browsers
    }
  }

  return {
    profile: "mobile",
    virtualKeyboard: true,
    candidateBar: true,
    /**
     * Forward virtual-keyboard events into core.
     * @param {{ type: string, key?: string, command?: string }} ev
     */
    async onKeyboardEvent(ev) {
      if (ev.type === "key" && ev.key) {
        // Mobile mongol / latin keys insert directly
        return core.handleEvent({ type: "command", command: "insert", key: ev.key });
      }
      if (ev.type === "command") {
        // Virtual-keyboard layout switches (ABC / 123) — sync IME mode, skip core.
        if (ev.command === "layout") {
          const next = ev.latin ? "latin" : "mongol";
          if (core.state.mode !== next) core.setMode(next);
          return true;
        }
        if (ev.command === "shift") return false;
        return core.handleEvent(ev);
      }
      return false;
    },
    detach() {
      if (editorEl) {
        editorEl.removeAttribute("inputmode");
        editorEl.removeAttribute("virtualkeyboardpolicy");
      }
    },
  };
}

export default attachMobileController;
