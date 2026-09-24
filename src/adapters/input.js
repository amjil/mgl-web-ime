/**
 * <input type="text"> adapter.
 */

import { TextareaAdapter } from "./textarea.js";

/**
 * @param {HTMLInputElement} el
 */
export function InputAdapter(el) {
  if (!el) throw new Error("InputAdapter requires an input element");
  // Same selection/value surface as textarea
  return TextareaAdapter(/** @type {any} */ (el));
}

export default InputAdapter;
