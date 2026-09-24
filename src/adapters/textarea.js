/**
 * <textarea> adapter.
 */

import { deleteLastGrapheme, graphemes } from "../utils/unicode.js";
import { createCustomAdapter } from "./custom.js";

/**
 * @param {HTMLTextAreaElement} el
 */
export function TextareaAdapter(el) {
  if (!el) throw new Error("TextareaAdapter requires a textarea");

  return createCustomAdapter({
    getElement: () => el,
    focus: () => el.focus(),
    blur: () => el.blur(),

    getText: () => el.value ?? "",

    getSelection: () => ({
      start: el.selectionStart ?? 0,
      end: el.selectionEnd ?? 0,
    }),

    setSelection: ({ start, end }) => {
      el.setSelectionRange(start, end ?? start);
    },

    insertText: (text) => {
      const start = el.selectionStart;
      const end = el.selectionEnd;
      const v = el.value;
      el.value = v.slice(0, start) + text + v.slice(end);
      const caret = start + text.length;
      el.setSelectionRange(caret, caret);
      el.dispatchEvent(new Event("input", { bubbles: true }));
    },

    replaceSelection: (text) => {
      const start = el.selectionStart;
      const end = el.selectionEnd;
      el.value = el.value.slice(0, start) + text + el.value.slice(end);
      const caret = start + text.length;
      el.setSelectionRange(caret, caret);
      el.dispatchEvent(new Event("input", { bubbles: true }));
    },

    deleteBackward: () => {
      const start = el.selectionStart;
      const end = el.selectionEnd;
      if (start !== end) {
        el.value = el.value.slice(0, start) + el.value.slice(end);
        el.setSelectionRange(start, start);
      } else if (start > 0) {
        const before = el.value.slice(0, start);
        const next = deleteLastGrapheme(before);
        const deleted = before.length - next.length;
        el.value = next + el.value.slice(start);
        el.setSelectionRange(start - deleted, start - deleted);
      }
      el.dispatchEvent(new Event("input", { bubbles: true }));
    },

    deleteForward: () => {
      const start = el.selectionStart;
      const end = el.selectionEnd;
      if (start !== end) {
        el.value = el.value.slice(0, start) + el.value.slice(end);
        el.setSelectionRange(start, start);
      } else {
        const after = el.value.slice(start);
        const parts = graphemes(after);
        parts.shift();
        el.value = el.value.slice(0, start) + parts.join("");
        el.setSelectionRange(start, start);
      }
      el.dispatchEvent(new Event("input", { bubbles: true }));
    },

    replaceBeforeCaret: (deleteLen, text) => {
      const start = el.selectionStart ?? 0;
      const end = el.selectionEnd ?? start;
      const before = el.value.slice(0, start);
      const after = el.value.slice(end);
      const beforeCps = Array.from(before);
      const del = Math.min(deleteLen ?? 0, beforeCps.length);
      const nextBefore = beforeCps.slice(0, beforeCps.length - del).join("");
      const insert = text ?? "";
      el.value = nextBefore + insert + after;
      const caret = (nextBefore + insert).length;
      el.setSelectionRange(caret, caret);
      el.dispatchEvent(new Event("input", { bubbles: true }));
    },

    getTextBeforeCaret: () => el.value.slice(0, el.selectionStart),

    selectAll: () => el.select(),

    getCaretRect: () => el.getBoundingClientRect(),
  });
}

export default TextareaAdapter;
