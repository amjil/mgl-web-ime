/**
 * mgl-web-ime — public entry.
 *
 * Core modules are safe in Node. DOM custom elements register only when
 * `customElements` exists (browser).
 */

export { ImeCore } from "./core/ime.js";
export { translate, LATIN_TO_MONGOL, directCharFromKey } from "./core/mapping.js";
export {
  createInitialState,
  totalPages,
  pageCandidates,
  currentCandidate,
} from "./core/state.js";

export {
  CandidateProvider,
  LocalCandidateProvider,
  RemoteCandidateProvider,
  HybridCandidateProvider,
  createDefaultProvider,
} from "./api/candidate-provider.js";

export { ContentEditableAdapter } from "./adapters/contenteditable.js";
export { TextareaAdapter } from "./adapters/textarea.js";
export { InputAdapter } from "./adapters/input.js";
export { createCustomAdapter } from "./adapters/custom.js";

export { detectProfile, resolveKeyboardMode } from "./profiles/detect.js";
export { attachDesktopController } from "./profiles/desktop.js";
export { attachMobileController } from "./profiles/mobile.js";

export { VirtualKeyboard } from "./keyboard/keyboard.js";
export { LAYOUTS, getLayout, normalizeKey } from "./keyboard/layout.js";
export {
  EMOJI_CATEGORIES,
  getEmojiCategory,
  getEmojiPage,
  pageEmoji,
  MOBILE_EMOJI_PAGE_SIZE,
} from "./keyboard/emoji.js";
export {
  resolvePopupKeys,
  mongolPopupCandidates,
  EN_POPUP_KEYS,
} from "./keyboard/popup-candidates.js";

export { measureCaretRect } from "./utils/caret-rect.js";
export { placeNearCaret } from "./utils/popup-position.js";

export { MglIME, MglImeElement, adapterForElement } from "./components/mgl-ime.js";
export { MglCandidates } from "./components/mgl-candidates.js";
export { MglKeyboard } from "./components/mgl-keyboard.js";
export { MglImeToggle } from "./components/mgl-ime-toggle.js";
export { MglEmojiPicker } from "./components/mgl-emoji-picker.js";

export { default } from "./components/mgl-ime.js";
