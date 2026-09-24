/**
 * Candidate providers — IME Core does not depend on HTTP directly.
 * Remote provider matches m-i-c/backend:
 *   POST /api/next_word/candidates  { word }
 *   POST /api/next_word/list        { word }
 */

import { translate } from "../core/mapping.js";

export class CandidateProvider {
  /**
   * @param {string} input
   * @param {object} [context]
   * @returns {Promise<string[]>}
   */
  async getCandidates(_input, _context = {}) {
    return [];
  }

  /**
   * @param {string} word
   * @returns {Promise<string[]>}
   */
  async getNextWords(_word) {
    return [];
  }
}

/** Local fallback: mapped Mongol preview as sole candidate. */
export class LocalCandidateProvider extends CandidateProvider {
  async getCandidates(input) {
    if (!input) return [];
    const mongol = /[\u1800-\u18AF]/.test(input) ? input : translate(input);
    return mongol ? [mongol] : [];
  }
}

/**
 * Remote JSON provider for Go backend.
 * @typedef {Object} RemoteOptions
 * @property {string} [baseUrl] default http://dev1:3003
 * @property {string} [candidatesPath] default /api/next_word/candidates
 * @property {string} [nextWordsPath] default /api/next_word/list
 * @property {number} [timeoutMs]
 * @property {number} [cacheSize]
 */

export class RemoteCandidateProvider extends CandidateProvider {
  /** @param {RemoteOptions} [options] */
  constructor(options = {}) {
    super();
    this.baseUrl = (options.baseUrl ?? "http://dev1:3003").replace(/\/+$/, "");
    this.candidatesPath = options.candidatesPath ?? "/api/next_word/candidates";
    this.nextWordsPath = options.nextWordsPath ?? "/api/next_word/list";
    this.timeoutMs = options.timeoutMs ?? 2500;
    this._cache = new Map();
    this._cacheSize = options.cacheSize ?? 256;

    // AbortController per API path; abort the previous request on the same path
    this._controllers = new Map();
  }

  /** @param {string} path @param {string} word @param {string} field */
  async _post(path, word, field) {
    if (!word) return [];

    // Backend caps word at 256 Unicode code points; Array.from avoids splitting surrogates
    const cps = Array.from(word);
    const safeWord = cps.length > 256 ? cps.slice(0, 256).join("") : word;

    const cacheKey = `${path}:${safeWord}`;
    if (this._cache.has(cacheKey)) return this._cache.get(cacheKey);

    // Cancel the previous in-flight request on this path (avoids out-of-order results while typing)
    if (this._controllers.has(path)) {
      this._controllers.get(path).abort();
    }

    const ctrl = new AbortController();
    this._controllers.set(path, ctrl);
    const timer = setTimeout(() => ctrl.abort(), this.timeoutMs);

    try {
      const res = await fetch(`${this.baseUrl}${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json; charset=UTF-8" },
        body: JSON.stringify({ word: safeWord }),
        signal: ctrl.signal,
      });

      if (!res.ok) return [];
      const data = await res.json();
      const raw = data?.[field] ?? [];
      const words = raw
        .map((item) => (typeof item === "string" ? item : item?.[0]))
        .filter((s) => typeof s === "string" && s.trim());

      this._putCache(cacheKey, words);
      return words;
    } catch {
      // Ignore AbortError from cancel / timeout
      return [];
    } finally {
      clearTimeout(timer);
      if (this._controllers.get(path) === ctrl) {
        this._controllers.delete(path);
      }
    }
  }

  _putCache(key, value) {
    if (this._cache.size >= this._cacheSize) {
      const first = this._cache.keys().next().value;
      this._cache.delete(first);
    }
    this._cache.set(key, value);
  }

  /**
   * @param {string} input - Mongolian lookup key (or Latin; will be mapped by Hybrid)
   */
  async getCandidates(input) {
    return this._post(this.candidatesPath, input, "candidates");
  }

  async getNextWords(word) {
    return this._post(this.nextWordsPath, word, "nextWords");
  }
}

/**
 * Remote first, fall back to local mapping on empty/error.
 */
export class HybridCandidateProvider extends CandidateProvider {
  /**
   * @param {CandidateProvider} remote
   * @param {CandidateProvider} [local]
   */
  constructor(remote, local = new LocalCandidateProvider()) {
    super();
    this.remote = remote;
    this.local = local;
  }

  async getCandidates(input, context = {}) {
    const remote = await this.remote.getCandidates(input, context);
    if (remote.length) return remote;
    return this.local.getCandidates(input, context);
  }

  async getNextWords(word) {
    return this.remote.getNextWords(word);
  }
}

/**
 * @param {RemoteOptions & { hybrid?: boolean }} [options]
 */
export function createDefaultProvider(options = {}) {
  const remote = new RemoteCandidateProvider(options);
  if (options.hybrid === false) return remote;
  return new HybridCandidateProvider(remote);
}
