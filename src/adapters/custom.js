/**
 * Editor adapter contract + helpers.
 */

/**
 * @typedef {Object} Selection
 * @property {number} start
 * @property {number} end
 */

/**
 * @typedef {Object} EditorAdapter
 * @property {() => string} getText
 * @property {() => Selection} getSelection
 * @property {(sel: Selection) => void} setSelection
 * @property {(text: string) => void} insertText
 * @property {() => void} deleteBackward
 * @property {() => void} deleteForward
 * @property {(text: string) => void} replaceSelection
 * @property {(deleteLen: number, text: string) => void} [replaceBeforeCaret]
 * @property {() => string} [getTextBeforeCaret]
 * @property {() => void} [selectAll]
 * @property {() => DOMRect|null} [getCaretRect]
 * @property {() => HTMLElement|null} [getElement]
 * @property {() => void} [focus]
 * @property {() => void} [blur]
 */

/**
 * Wrap a plain object as an adapter, filling optional methods.
 * @param {Partial<EditorAdapter>} methods
 * @returns {EditorAdapter}
 */
export function createCustomAdapter(methods) {
  const adapter = {
    getText: () => "",
    getSelection: () => ({ start: 0, end: 0 }),
    setSelection: () => {},
    insertText: () => {},
    deleteBackward: () => {},
    deleteForward: () => {},
    replaceSelection: (text) => adapter.insertText(text),
    ...methods,
  };

  if (!adapter.replaceBeforeCaret) {
    adapter.replaceBeforeCaret = (deleteLen, text) => {
      const full = adapter.getText();
      const sel = adapter.getSelection();
      const start = Math.max(0, sel.start - deleteLen);
      // Use code-point aware slice via Array.from
      const cps = Array.from(full);
      const before = cps.slice(0, start).join("");
      const after = cps.slice(sel.end).join("");
      // Fallback path when adapter only exposes insert/delete
      if (typeof methods.getText !== "function") {
        for (let i = 0; i < deleteLen; i++) adapter.deleteBackward();
        adapter.insertText(text);
        return;
      }
      // Prefer replaceSelection after adjusting selection
      adapter.setSelection({ start, end: sel.end });
      adapter.replaceSelection(text);
      // If host ignored setSelection, still try insert
      void before;
      void after;
    };
  }

  if (!adapter.getTextBeforeCaret) {
    adapter.getTextBeforeCaret = () => {
      const text = adapter.getText();
      const { start } = adapter.getSelection();
      return Array.from(text).slice(0, start).join("");
    };
  }

  return /** @type {EditorAdapter} */ (adapter);
}
