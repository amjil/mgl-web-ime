/**
 * Candidate list helpers — pagination & stale-query guard.
 */

import { totalPages } from "./state.js";

export function createCandidateSession() {
  let gen = 0;
  return {
    next() {
      gen += 1;
      return gen;
    },
    isStale(token) {
      return token !== gen;
    },
    current() {
      return gen;
    },
  };
}

/**
 * @param {import("./state.js").ImeState} state
 * @param {string[]} candidates
 */
export function withCandidates(state, candidates) {
  return {
    ...state,
    candidates: candidates ?? [],
    pageIndex: 0,
    selectedCandidate: 0,
    candidateVisible: (candidates?.length ?? 0) > 0,
  };
}

/**
 * @param {import("./state.js").ImeState} state
 * @param {number} delta
 */
export function shiftPage(state, delta) {
  const pages = totalPages(state);
  if (!pages) return state;
  const next = Math.min(Math.max(0, state.pageIndex + delta), pages - 1);
  return {
    ...state,
    pageIndex: next,
    selectedCandidate: next * state.pageSize,
  };
}

/**
 * Absolute index within current page (0..pageSize-1) → commit word.
 * @param {import("./state.js").ImeState} state
 * @param {number} pageLocalIndex
 */
export function candidateAtPageIndex(state, pageLocalIndex) {
  const idx = state.pageIndex * state.pageSize + pageLocalIndex;
  return state.candidates[idx] ?? null;
}
