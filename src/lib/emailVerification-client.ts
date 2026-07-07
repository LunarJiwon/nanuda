"use client";

// Thin client wrapper around the `sendVerificationEmail` Cloud Function (functions/src/index.ts),
// following the same "plain client-SDK calls, enforcement happens server-side" pattern as
// comments-client.ts / likes-client.ts / posts-client.ts — except here the "server side" is a
// Cloud Function's own auth/rate-limit checks rather than firestore.rules.
import { httpsCallable, FunctionsError } from "firebase/functions";
import { functions } from "@/lib/firebase/client";

export { FunctionsError };

/**
 * sessionStorage key set when the auto-send-on-signup call (see auth-context.tsx's `signUpEmail`)
 * fails. `signUpEmail` can't show a message itself — the login page navigates to `/` the moment
 * it resolves — so it hands the failure off via this flag, and EmailVerificationBanner picks it
 * up on its next mount (the banner is already the on-brand, globally-visible place for this,
 * rather than building a separate one-off toast system).
 */
export const VERIFICATION_SEND_FAILED_KEY = "nanuda:verification-send-failed";

/** Calls `sendVerificationEmail` as the current signed-in user. Throws `FunctionsError` on failure. */
export async function sendVerificationEmailCall(): Promise<void> {
  const call = httpsCallable(functions, "sendVerificationEmail");
  await call();
}
