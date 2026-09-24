/**
 * IME state factory & helpers.
 */

/**
 * @typedef {Object} ImeState
 * @property {boolean} enabled
 * @property {string} mode - "mongol" | "latin"
 * @property {string} profile - "desktop" | "mobile"
 * @property {boolean} composing
 * @property {string} composition - Latin buffer (desktop phonetic)
 * @property {string} preview - Mongolian preview currently in editor
 * @property {number} previewLen - code-point length of preview in editor
 * @property {string[]} candidates
 * @property {number} selectedCandidate - absolute index
 * @property {number} pageIndex
 * @property {number} pageSize
 * @property {boolean} keyboardVisible
 * @property {boolean} candidateVisible
 * @property {boolean} pendingSuffixDelete
 */

/** @returns {ImeState} */
export function createInitialState(overrides = {}) {
  return {
    enabled: true,
    mode: "mongol",
    profile: "desktop",
    composing: false,
    composition: "",
    preview: "",
    previewLen: 0,
    candidates: [],
    selectedCandidate: 0,
    pageIndex: 0,
    pageSize: 5,
    keyboardVisible: false,
    candidateVisible: false,
    pendingSuffixDelete: false,
    ...overrides,
  };
}

/** @param {ImeState} state */
export function totalPages(state) {
  const c = state.candidates.length;
  const ps = state.pageSize || 5;
  if (!c) return 0;
  return Math.ceil(c / ps);
}

/** @param {ImeState} state */
export function pageCandidates(state) {
  const start = state.pageIndex * state.pageSize;
  return state.candidates.slice(start, start + state.pageSize);
}

/** @param {ImeState} state */
export function currentCandidate(state) {
  const idx = state.pageIndex * state.pageSize;
  return state.candidates[idx] ?? null;
}

/** @param {ImeState} state */
export function clearCompositionFields(state) {
  return {
    ...state,
    composing: false,
    composition: "",
    preview: "",
    previewLen: 0,
    candidates: [],
    selectedCandidate: 0,
    pageIndex: 0,
    candidateVisible: false,
    pendingSuffixDelete: false,
  };
}
