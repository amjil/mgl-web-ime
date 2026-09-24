/**
 * Key descriptor helpers.
 */

import { ACTION_KEYS, normalizeKey } from "./layout.js";

export { normalizeKey, ACTION_KEYS };

/**
 * Map action name to IME command.
 * @param {string} action
 */
export function actionToCommand(action) {
  switch (action) {
    case "backspace":
      return "backspace";
    case "enter":
      return "enter";
    case "space":
      return "space";
    case "suffix":
      return "suffix";
    case "shift":
      return "shift";
    default:
      return action;
  }
}
