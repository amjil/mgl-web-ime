/**
 * contenteditable adapter — Selection / Range based.
 */

import { deleteLastGrapheme, graphemes } from "../utils/unicode.js";
import { measureCaretRect } from "../utils/caret-rect.js";
import { createCustomAdapter } from "./custom.js";

/**
 * @param {HTMLElement} el
 */
export function ContentEditableAdapter(el) {
  if (!el) throw new Error("ContentEditableAdapter requires an element");

  const getRange = () => {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return null;
    const range = sel.getRangeAt(0);
    if (!el.contains(range.commonAncestorContainer)) return null;
    return range;
  };

  /** Absolute offsets within el.textContent */
  const offsetsFromRange = (range) => {
    const pre = range.cloneRange();
    pre.selectNodeContents(el);
    pre.setEnd(range.startContainer, range.startOffset);
    const start = pre.toString().length;
    const end = start + range.toString().length;
    return { start, end };
  };

  const setOffsets = (start, end) => {
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    let pos = 0;
    let startNode = null;
    let startOff = 0;
    let endNode = null;
    let endOff = 0;
    let node;
    while ((node = walker.nextNode())) {
      const len = node.textContent.length;
      if (!startNode && pos + len >= start) {
        startNode = node;
        startOff = start - pos;
      }
      if (!endNode && pos + len >= end) {
        endNode = node;
        endOff = end - pos;
        break;
      }
      pos += len;
    }
    if (!startNode) {
      el.focus();
      return;
    }
    if (!endNode) {
      endNode = startNode;
      endOff = startOff;
    }
    const range = document.createRange();
    range.setStart(startNode, Math.min(startOff, startNode.textContent.length));
    range.setEnd(endNode, Math.min(endOff, endNode.textContent.length));
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
  };

  const insertAtCaret = (text) => {
    el.focus();
    const range = getRange();
    if (!range) {
      el.appendChild(document.createTextNode(text));
      return;
    }
    range.deleteContents();
    const node = document.createTextNode(text);
    range.insertNode(node);
    range.setStartAfter(node);
    range.collapse(true);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
  };

  return createCustomAdapter({
    getElement: () => el,

    focus: () => el.focus(),
    blur: () => el.blur(),

    getText: () => el.textContent ?? "",

    getSelection: () => {
      const range = getRange();
      if (!range) {
        const len = (el.textContent ?? "").length;
        return { start: len, end: len };
      }
      return offsetsFromRange(range);
    },

    setSelection: ({ start, end }) => setOffsets(start, end ?? start),

    insertText: (text) => insertAtCaret(text ?? ""),

    replaceSelection: (text) => insertAtCaret(text ?? ""),

    deleteBackward: () => {
      el.focus();
      const range = getRange();
      if (!range) return;
      if (!range.collapsed) {
        range.deleteContents();
        return;
      }
      const { start } = offsetsFromRange(range);
      if (start <= 0) return;
      const text = el.textContent ?? "";
      const before = text.slice(0, start);
      const after = text.slice(start);
      const nextBefore = deleteLastGrapheme(before);
      const deleted = before.length - nextBefore.length;
      el.textContent = nextBefore + after;
      setOffsets(start - deleted, start - deleted);
    },

    deleteForward: () => {
      el.focus();
      const range = getRange();
      if (!range) return;
      if (!range.collapsed) {
        range.deleteContents();
        return;
      }
      const { start } = offsetsFromRange(range);
      const text = el.textContent ?? "";
      if (start >= text.length) return;
      const after = text.slice(start);
      const parts = graphemes(after);
      parts.shift();
      el.textContent = text.slice(0, start) + parts.join("");
      setOffsets(start, start);
    },

    replaceBeforeCaret: (deleteLen, text) => {
      // Read the selection first; do not focus() yet — refocusing after blur often
      // moves the caret to the start, so deleteLen is clamped to 0 and replace becomes append.
      const full = el.textContent ?? "";
      const range = getRange();
      const { start, end } = range
        ? offsetsFromRange(range)
        : { start: full.length, end: full.length };
      const before = full.slice(0, start);
      const after = full.slice(end);
      const beforeCps = Array.from(before);
      const del = Math.min(deleteLen ?? 0, beforeCps.length);
      const nextBefore = beforeCps.slice(0, beforeCps.length - del).join("");
      const insert = text ?? "";
      el.textContent = nextBefore + insert + after;
      const caret = (nextBefore + insert).length;
      setOffsets(caret, caret);
    },

    getTextBeforeCaret: () => {
      const full = el.textContent ?? "";
      const range = getRange();
      if (!range) return full;
      const { start } = offsetsFromRange(range);
      return full.slice(0, start);
    },

    selectAll: () => {
      el.focus();
      const range = document.createRange();
      range.selectNodeContents(el);
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
    },

    getCaretRect: () => measureCaretRect(getRange(), el),
  });
}

export default ContentEditableAdapter;
