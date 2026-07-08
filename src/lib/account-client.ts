"use client";

// Thin client wrapper around the `deleteAccount` Cloud Function (functions/src/index.ts) —
// same "plain client-SDK call, enforcement happens server-side" pattern as
// emailVerification-client.ts.
import { httpsCallable, FunctionsError } from "firebase/functions";
import { functions } from "@/lib/firebase/client";

export { FunctionsError };

/** Deletes the current signed-in user's account (Firestore profile, handle, and Auth user) as the
 * current signed-in user. Throws `FunctionsError` on failure. Caller is responsible for signing
 * out / redirecting afterward — this doesn't touch the client-side auth session. */
export async function deleteAccountCall(): Promise<void> {
  const call = httpsCallable(functions, "deleteAccount");
  await call();
}
