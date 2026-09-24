/**
 * Profile detection — desktop vs mobile.
 */

export function isTouchDevice() {
  if (typeof window === "undefined") return false;
  return (
    "ontouchstart" in window ||
    (navigator.maxTouchPoints ?? 0) > 0 ||
    (navigator.msMaxTouchPoints ?? 0) > 0
  );
}

export function isMobileUA() {
  if (typeof navigator === "undefined") return false;
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile/i.test(
    navigator.userAgent
  );
}

/**
 * @param {"auto"|"desktop"|"mobile"} [profile]
 * @returns {"desktop"|"mobile"}
 */
export function detectProfile(profile = "auto") {
  if (profile === "desktop" || profile === "mobile") return profile;
  // Prefer UA for tablets that also have mouse
  if (isMobileUA()) return "mobile";
  if (isTouchDevice() && typeof window !== "undefined" && window.innerWidth < 900) {
    return "mobile";
  }
  return "desktop";
}

/**
 * @param {"auto"|"system"|"virtual"} keyboardMode
 * @param {"desktop"|"mobile"} profile
 * @returns {"system"|"virtual"}
 */
export function resolveKeyboardMode(keyboardMode, profile) {
  if (keyboardMode === "system" || keyboardMode === "virtual") return keyboardMode;
  return profile === "mobile" ? "virtual" : "system";
}
