/** Shared handle validation used by signup, onboarding, and profile editing. */

export const HANDLE_REGEX = /^[a-z0-9_]{3,20}$/;

/**
 * Words that already collide with real routes (`/edit`, `/login`, `/post/...`, etc.) — reserved
 * so nobody can claim `/profile/edit` or similar as their own `@handle`.
 */
export const RESERVED_HANDLES: ReadonlySet<string> = new Set([
  "edit",
  "settings",
  "login",
  "signup",
  "admin",
  "api",
  "post",
  "editor",
  "daily",
  "info",
  "art",
  "quote",
  "archive",
  "about",
]);

export function isValidHandleFormat(handle: string): boolean {
  return HANDLE_REGEX.test(handle);
}

export function isReservedHandle(handle: string): boolean {
  return RESERVED_HANDLES.has(handle.toLowerCase());
}

/** Full client-side validity check (format + not reserved). Availability (Firestore) is separate. */
export function isClaimableHandle(handle: string): boolean {
  return isValidHandleFormat(handle) && !isReservedHandle(handle);
}
